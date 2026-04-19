function filterEntries(entries, filters) {
    const searchTerm = (filters.searchTerm || "").toLowerCase();
    const tag = (filters.tag || "").toLowerCase();
    const category = (filters.category || "").toLowerCase();
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
                (entry.tags || []).join(", "),
                entry.category || ""
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

        if (category) {
            const entryCategory = (entry.category || "").toLowerCase();
            if (entryCategory !== category) {
                return false;
            }
        }

        return true;
    });
}

function sortEntries(entries, sortKey) {
    const list = [...entries];

    switch (sortKey) {
        case "titleAsc":
            list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
            break;
        case "createdAtDesc":
            list.sort((a, b) => {
                const aTime = Date.parse(a.createdAt || "") || 0;
                const bTime = Date.parse(b.createdAt || "") || 0;
                return bTime - aTime;
            });
            break;
        case "updatedAtDesc":
            list.sort((a, b) => {
                const aTime = Date.parse(a.updatedAt || "") || 0;
                const bTime = Date.parse(b.updatedAt || "") || 0;
                return bTime - aTime;
            });
            break;
        case "favoriteDesc":
            list.sort((a, b) => {
                if (a.favorite === b.favorite) {
                    return (a.title || "").localeCompare(b.title || "");
                }
                return a.favorite ? -1 : 1;
            });
            break;
        default:
            list.sort((a, b) => {
                const aTime = Date.parse(a.updatedAt || "") || 0;
                const bTime = Date.parse(b.updatedAt || "") || 0;
                return bTime - aTime;
            });
            break;
    }

    return list;
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

function getAllCategories(entries) {
    const set = new Set();
    entries.forEach(entry => {
        const category = String(entry.category || "").trim();
        if (category) {
            set.add(category);
        }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}
