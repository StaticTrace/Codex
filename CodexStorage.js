const CodexStorage = (() => {
    const STORAGE_KEY = "codex";

    function getDefaultData() {
        const now = new Date().toISOString();
        return {
            entries: [],
            essences: [
                {
                    id: Date.now(),
                    title: "Essence of the Blank",
                    type: "Essence",
                    effect: "Limitless Potential",
                    description:
                        "By taking this essence, you gain but one benefit:\n\n" +
                        "Your potential becomes limitless. You can learn any discipline or skillset, even if you shouldn't be capable of it, without forgetting it and practice them into mastery, no matter how many you learn. Any abilities you have from other Essences will increase where possible and develop in ways beyond their initial purposes.",
                    tags: ["foundational", "growth"],
                    favorite: false,
                    created: now
                }
            ],
            items: [],
            traits: [],
            mutations: []
        };
    }

    function loadAll() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const def = getDefaultData();
            saveAll(def);
            return def;
        }
        try {
            const parsed = JSON.parse(raw);
            const def = getDefaultData();
            return {
                entries: parsed.entries || def.entries,
                essences: parsed.essences || def.essences,
                items: parsed.items || def.items,
                traits: parsed.traits || def.traits,
                mutations: parsed.mutations || def.mutations
            };
        } catch {
            const def = getDefaultData();
            saveAll(def);
            return def;
        }
    }

    function saveAll(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadCategory(categoryKey) {
        const all = loadAll();
        return all[categoryKey] || [];
    }

    function saveCategory(categoryKey, items) {
        const all = loadAll();
        all[categoryKey] = items;
        saveAll(all);
    }

    function addItem(categoryKey, data, supportsFavorite, supportsTags) {
        const items = loadCategory(categoryKey);
        const now = new Date().toISOString();
        const id = Date.now() + Math.floor(Math.random() * 1000);

        const base = { id, created: now };

        if (supportsFavorite) {
            base.favorite = false;
        }

        if (supportsTags) {
            base.tags = Array.isArray(data.tags) ? data.tags : [];
        }

        Object.keys(data).forEach(key => {
            if (key !== "tags") {
                base[key] = data[key];
            }
        });

        items.push(base);
        saveCategory(categoryKey, items);
        return base;
    }

    function updateItem(categoryKey, id, updates, supportsTags) {
        const items = loadCategory(categoryKey);
        const item = items.find(i => i.id === id);
        if (!item) return;

        Object.keys(updates).forEach(key => {
            if (key === "tags" && supportsTags) {
                item.tags = Array.isArray(updates.tags) ? updates.tags : item.tags;
            } else if (key !== "tags") {
                item[key] = updates[key];
            }
        });

        saveCategory(categoryKey, items);
    }

    function deleteItem(categoryKey, id) {
        const items = loadCategory(categoryKey).filter(i => i.id !== id);
        saveCategory(categoryKey, items);
    }

    function toggleFavorite(categoryKey, id) {
        const items = loadCategory(categoryKey);
        const item = items.find(i => i.id === id);
        if (!item) return;
        if (typeof item.favorite !== "boolean") return;
        item.favorite = !item.favorite;
        saveCategory(categoryKey, items);
    }

    return {
        loadCategory,
        addItem,
        updateItem,
        deleteItem,
        toggleFavorite
    };
})();
