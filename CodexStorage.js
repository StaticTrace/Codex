// CodexStorage.js
// Handles persistent storage of Codex entries using IndexedDB with localStorage migration + offline sync queue.

(function () {
    const DB_NAME = "CodexDB";
    const ENTRIES_STORE = "entries";
    const QUEUE_STORE = "syncQueue";
    const STORAGE_KEY = "codexEntries"; // legacy localStorage key (for migration only)
    const SCHEMA_VERSION = 2;

    let db = null;
    let memoryStore = [];

    function generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    }

    function validateEntry(entry) {
        const now = new Date().toISOString();
        const safe = {
            id: entry.id || generateId(),
            title: (entry.title || "").trim(),
            category: (entry.category || "").trim(),
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            content: (entry.content || "").toString(),
            favorite: Boolean(entry.favorite),
            archived: Boolean(entry.archived),
            pinned: Boolean(entry.pinned),
            createdAt: entry.createdAt || now,
            updatedAt: entry.updatedAt || now,
            schemaVersion: SCHEMA_VERSION
        };
        return safe;
    }

    function normalizeEntries(entries) {
        if (!Array.isArray(entries)) return [];
        return entries.map(validateEntry);
    }

    function getDB() {
        if (db) return Promise.resolve(db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 2);
            request.onupgradeneeded = (e) => {
                const dbInstance = e.target.result;
                if (!dbInstance.objectStoreNames.contains(ENTRIES_STORE)) {
                    dbInstance.createObjectStore(ENTRIES_STORE, { keyPath: "id" });
                }
                if (!dbInstance.objectStoreNames.contains(QUEUE_STORE)) {
                    dbInstance.createObjectStore(QUEUE_STORE, { keyPath: "id" });
                }
            };
            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function migrateFromLocalStorage() {
        const raw = window.StorageHelper.safeGetItem(STORAGE_KEY);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            const entries = normalizeEntries(parsed);
            window.StorageHelper.safeRemoveItem(STORAGE_KEY);
            return entries;
        } catch (e) {
            console.warn("Migration failed:", e);
            return null;
        }
    }

    async function loadEntries() {
        const dbInstance = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction(ENTRIES_STORE, "readonly");
            const store = transaction.objectStore(ENTRIES_STORE);
            const request = store.getAll();
            request.onsuccess = async () => {
                let entries = request.result || [];
                if (entries.length === 0) {
                    let loaded = false;
                    const migrated = await migrateFromLocalStorage();
                    if (migrated && migrated.length > 0) {
                        entries = migrated;
                        await saveEntries(entries);
                        loaded = true;
                    }
                    if (!loaded) {
                        // Load default entries from static JSON file on first run
                        try {
                            const response = await fetch("default-entries.json");
                            if (response.ok) {
                                const defaultData = await response.json();
                                const normalizedDefaults = normalizeEntries(defaultData);
                                if (normalizedDefaults.length > 0) {
                                    entries = normalizedDefaults;
                                    await saveEntries(entries);
                                    console.log("[CodexStorage] Loaded default entries from default-entries.json");
                                    loaded = true;
                                }
                            }
                        } catch (err) {
                            console.warn("[CodexStorage] Could not load default entries:", err);
                        }
                    }
                }
                const normalized = normalizeEntries(entries);
                memoryStore = normalized.slice();
                resolve(normalized);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function saveEntries(entries) {
        const normalized = normalizeEntries(entries);
        memoryStore = normalized.slice();
        const dbInstance = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = dbInstance.transaction(ENTRIES_STORE, "readwrite");
            const store = transaction.objectStore(ENTRIES_STORE);
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => {
                if (normalized.length === 0) {
                    resolve();
                    return;
                }
                // === INDEXEDDB TRANSACTION OPTIMIZATION ===
                // Parallel puts using Promise.all instead of recursive sequential calls.
                // This dramatically improves performance for large entry sets while staying inside a single transaction.
                const putPromises = normalized.map(entry => {
                    return new Promise((res, rej) => {
                        const putRequest = store.put(entry);
                        putRequest.onsuccess = () => res();
                        putRequest.onerror = () => rej(putRequest.error);
                    });
                });
                Promise.all(putPromises)
                    .then(() => resolve())
                    .catch(err => reject(err));
            };
            clearRequest.onerror = () => reject(clearRequest.error);
        });
    }

    // === OFFLINE SYNC QUEUE ===
    async function addToSyncQueue(operation) {
        const dbInstance = await getDB();
        return new Promise((resolve, reject) => {
            const tx = dbInstance.transaction(QUEUE_STORE, "readwrite");
            const store = tx.objectStore(QUEUE_STORE);
            const op = {
                id: generateId(),
                type: operation.type, // 'create' | 'update' | 'delete' | 'favorite' | 'archive'
                payload: operation.payload,
                timestamp: Date.now()
            };
            const req = store.put(op);
            req.onsuccess = () => resolve(op.id);
            req.onerror = () => reject(req.error);
        });
    }

    async function processSyncQueue() {
        const dbInstance = await getDB();
        return new Promise((resolve, reject) => {
            const tx = dbInstance.transaction(QUEUE_STORE, "readwrite");
            const store = tx.objectStore(QUEUE_STORE);
            const getAllReq = store.getAll();
            getAllReq.onsuccess = async () => {
                const queue = getAllReq.result;
                if (queue.length === 0) {
                    resolve([]);
                    return;
                }
                // For local-only Codex: no server → just clear queue (demo of sync completion)
                // In a real app with backend: send each op to server here
                console.log(`[CodexStorage] Processing ${queue.length} queued operations (local-only demo)`);
                await store.clear();
                resolve(queue);
            };
            getAllReq.onerror = () => reject(getAllReq.error);
        });
    }

    async function exportEntries() {
        const entries = await loadEntries();
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "codex-entries.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importEntriesFromFile(file, options) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    const imported = normalizeEntries(parsed);
                    const current = await loadEntries();
                    let merged;
                    if (options && options.merge) {
                        const byId = new Map();
                        current.forEach(e => byId.set(e.id, e));
                        imported.forEach(e => byId.set(e.id, e));
                        merged = Array.from(byId.values());
                    } else {
                        merged = imported;
                    }
                    await saveEntries(merged);
                    resolve(merged);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    window.CodexStorage = {
        SCHEMA_VERSION,
        validateEntry,
        normalizeEntries,
        loadEntries,
        saveEntries,
        exportEntries,
        importEntriesFromFile,
        addToSyncQueue,
        processSyncQueue
    };
})();