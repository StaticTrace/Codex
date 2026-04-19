function filterEntries(entries, filters) {
    const searchTerm = (filters.searchTerm || "").toLowerCase();
    const tag = (filters.tag || "").toLowerCase();
    const favoritesOnly = Boolean(filters.favoritesOnly);

    return entries.filter(entry => {
        if (favoritesOnly && !entry.favorite) {
            return false;
        }

        if (searchTerm) {
            const haystack = [
                entry.title || "",
                entry.description || "",
                entry.notes || "",
                (entry.tags || []).join(", ")
            ]
                .join(" ")
                .toLowerCase();
            if (!haystack.includes(searchTerm)) {
                return false;
            }
        }

        if (tag) {
            const tags = Array.isArray(entry.tags) ? entry.tags : [];
            const hasTag = tags.some(t => t.toLowerCase() === tag);
            if (!hasTag) {
                return false;
            }
        }

        return true;
    });
}

function getAllTags(entries) {
    const set = new Set();
    entries.forEach(entry => {
        const tags = Array.isArray(entry.tags) ? entry.tags : [];
        tags.forEach(tag => {
            const trimmed = String(tag).trim();
            if (trimmed) {
                set.add(trimmed);
            }
        });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}
