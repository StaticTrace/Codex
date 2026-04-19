const CODEX_STORAGE_KEY = "codexEntries";
const CODEX_SCHEMA_VERSION = 1;

function validateEntry(raw) {
    const safe = typeof raw === "object" && raw !== null ? raw : {};
    const id = typeof safe.id === "string" && safe.id.trim() ? safe.id : crypto.randomUUID();
    const title = typeof safe.title === "string" ? safe.title : "";
    const description = typeof safe.description === "string" ? safe.description : "";
    const notes = typeof safe.notes === "string" ? safe.notes : "";
    const favorite = typeof safe.favorite === "boolean" ? safe.favorite : false;
    const tags = Array.isArray(safe.tags)
        ? safe.tags.map(t => String(t).trim()).filter(t => t.length > 0)
        : [];
    return {
        id,
        title,
        description,
        notes,
        favorite,
        tags,
        schemaVersion: CODEX_SCHEMA_VERSION
    };
}

function normalizeEntries(entries) {
    if (!Array.isArray(entries)) {
        return [];
    }
    return entries.map(validateEntry);
}

function loadEntries() {
    const raw = localStorage.getItem(CODEX_STORAGE_KEY);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        return normalizeEntries(parsed);
    } catch {
        localStorage.removeItem(CODEX_STORAGE_KEY);
        return [];
    }
}

function saveEntries(entries) {
    const normalized = normalizeEntries(entries);
    localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function exportEntries() {
    const entries = loadEntries();
    const data = JSON.stringify(entries, null, 4);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codex-entries.json";
    a.click();
    URL.revokeObjectURL(url);
}

function importEntriesFromFile(file, options = { merge: true }) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                const imported = normalizeEntries(parsed);
                const existing = loadEntries();
                let combined;
                if (options.merge) {
                    const byId = new Map();
                    existing.forEach(entry => byId.set(entry.id, entry));
                    imported.forEach(entry => byId.set(entry.id, entry));
                    combined = Array.from(byId.values());
                } else {
                    combined = imported;
                }
                const saved = saveEntries(combined);
                resolve(saved);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}
