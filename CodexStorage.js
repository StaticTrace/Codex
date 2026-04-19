// CodexStorage.js
// Handles persistent storage of Codex entries with safe localStorage access.

(function () {
    const STORAGE_KEY = "codexEntries";
    const SCHEMA_VERSION = 2;

    let memoryStore = [];

    function safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn("localStorage getItem failed, using memory store:", e);
            return null;
        }
    }

    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn("localStorage setItem failed, using memory store:", e);
        }
    }

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

    function loadEntries() {
        const raw = safeGetItem(STORAGE_KEY);
        if (!raw) {
            return memoryStore.slice();
        }
        try {
            const parsed = JSON.parse(raw);
            const normalized = normalizeEntries(parsed);
            memoryStore = normalized.slice();
            return normalized;
        } catch (e) {
            console.error("Failed to parse stored entries:", e);
            return memoryStore.slice();
        }
    }

    function saveEntries(entries) {
        const normalized = normalizeEntries(entries);
        memoryStore = normalized.slice();
        try {
            safeSetItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
            console.error("Failed to save entries:", e);
        }
    }

    function exportEntries() {
        const entries = loadEntries();
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
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    const imported = normalizeEntries(parsed);
                    const current = loadEntries();
                    let merged;
                    if (options && options.merge) {
                        const byId = new Map();
                        current.forEach(e => byId.set(e.id, e));
                        imported.forEach(e => byId.set(e.id, e));
                        merged = Array.from(byId.values());
                    } else {
                        merged = imported;
                    }
                    saveEntries(merged);
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
        importEntriesFromFile
    };
})();
