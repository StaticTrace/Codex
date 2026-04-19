// CodexUI.js
// Handles Codex UI: listing, filters, editing, autosave, markdown, highlighting.

(function () {
    const AUTOSAVE_KEY = "codexDraft";
    const FILTERS_KEY = "codexFilters";

    const state = {
        entries: [],
        filters: {
            search: "",
            tag: "",
            category: "",
            favoritesOnly: false,
            sort: "updatedAtDesc"
        },
        draft: {
            title: "",
            category: "",
            tags: "",
            content: ""
        }
    };

    /* -----------------------------
       AUTOSAVE DRAFT
    ----------------------------- */

    function safeLoadDraft() {
        try {
            const raw = window.StorageHelper.safeGetItem(AUTOSAVE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            state.draft = {
                title: parsed.title || "",
                category: parsed.category || "",
                tags: parsed.tags || "",
                content: parsed.content || ""
            };
        } catch (e) {
            console.warn("Failed to load draft:", e);
        }
    }

    function safeSaveDraft() {
        try {
            window.StorageHelper.safeSetItem(AUTOSAVE_KEY, JSON.stringify(state.draft));
        } catch (e) {
            console.warn("Failed to save draft:", e);
        }
    }

    function clearDraft() {
        state.draft = { title: "", category: "", tags: "", content: "" };
        try {
            window.StorageHelper.safeRemoveItem(AUTOSAVE_KEY);
        } catch (e) {
            console.warn("Failed to clear draft:", e);
        }
    }

    /* -----------------------------
       PERSIST FILTERS (user-specific)
    ----------------------------- */

    function loadFilters() {
        const raw = window.StorageHelper.safeGetItem(FILTERS_KEY);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            state.filters.search = parsed.search || "";
            state.filters.tag = parsed.tag || "";
            state.filters.category = parsed.category || "";
            state.filters.favoritesOnly = Boolean(parsed.favoritesOnly);
            if (parsed.sort && ["titleAsc", "createdAtDesc", "updatedAtDesc", "favoriteDesc"].includes(parsed.sort)) {
                state.filters.sort = parsed.sort;
            }
        } catch (e) {
            console.warn("Failed to load filters:", e);
        }
    }

    function saveFilters() {
        try {
            window.StorageHelper.safeSetItem(FILTERS_KEY, JSON.stringify(state.filters));
        } catch (e) {
            console.warn("Failed to save filters:", e);
        }
    }

    /* -----------------------------
       TAG NORMALIZATION
    ----------------------------- */

    function normalizeTags(tagString) {
        if (!tagString) return [];
        const parts = tagString
            .split(",")
            .map(t => t.trim())
            .filter(t => t.length > 0);
        return Array.from(new Set(parts));
    }

    /* -----------------------------
       SEARCH HIGHLIGHTING
    ----------------------------- */

    function highlightText(text, query) {
        if (!query) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "gi");
        return text.replace(regex, match => `<mark>${match}</mark>`);
    }

    /* -----------------------------
       MARKDOWN RENDERING
    ----------------------------- */

    function renderMarkdown(content) {
        if (typeof window.marked === "function") {
            return window.marked(content);
        }
        return content.replace(/\n/g, "<br>");
    }

    /* -----------------------------
       FILTERING + SORTING
    ----------------------------- */

    function applyFilters(entries) {
        let filtered = entries.slice();
        const { search, tag, category, favoritesOnly } = state.filters;

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.content.toLowerCase().includes(q) ||
                e.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        if (tag) {
            filtered = filtered.filter(e => e.tags.includes(tag));
        }

        if (category) {
            filtered = filtered.filter(e => e.category === category);
        }

        if (favoritesOnly) {
            filtered = filtered.filter(e => e.favorite);
        }

        switch (state.filters.sort) {
            case "titleAsc":
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case "createdAtDesc":
                filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                break;
            case "updatedAtDesc":
                filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                break;
            case "favoriteDesc":
                filtered.sort((a, b) => Number(b.favorite) - Number(a.favorite));
                break;
            default:
                filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }

        return filtered;
    }

    function getAllTags(entries) {
        const set = new Set();
        entries.forEach(e => e.tags.forEach(t => set.add(t)));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    function getAllCategories(entries) {
        const set = new Set();
        entries.forEach(e => {
            if (e.category) set.add(e.category);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    /* -----------------------------
       RENDER FILTERS
    ----------------------------- */

    function renderFilters() {
        const filtersContainer = document.getElementById("codex-filters");
        if (!filtersContainer) return;

        filtersContainer.innerHTML = "";

        const searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.placeholder = "Search entries…";
        searchInput.value = state.filters.search;
        searchInput.setAttribute("aria-label", "Search entries");
        searchInput.addEventListener("input", () => {
            state.filters.search = searchInput.value;
            saveFilters();
            renderList();
        });

        const tagSelect = document.createElement("select");
        const tagDefault = document.createElement("option");
        tagDefault.value = "";
        tagDefault.textContent = "All tags";
        tagSelect.appendChild(tagDefault);

        getAllTags(state.entries).forEach(tag => {
            const opt = document.createElement("option");
            opt.value = tag;
            opt.textContent = tag;
            tagSelect.appendChild(opt);
        });
        tagSelect.value = state.filters.tag;
        tagSelect.setAttribute("aria-label", "Filter by tag");
        tagSelect.addEventListener("change", () => {
            state.filters.tag = tagSelect.value;
            saveFilters();
            renderList();
        });

        const categorySelect = document.createElement("select");
        const catDefault = document.createElement("option");
        catDefault.value = "";
        catDefault.textContent = "All categories";
        categorySelect.appendChild(catDefault);

        getAllCategories(state.entries).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
        categorySelect.value = state.filters.category;
        categorySelect.setAttribute("aria-label", "Filter by category");
        categorySelect.addEventListener("change", () => {
            state.filters.category = categorySelect.value;
            saveFilters();
            renderList();
        });

        const favoritesToggle = document.createElement("label");
        favoritesToggle.className = "codex-toggle";
        const favCheckbox = document.createElement("input");
        favCheckbox.type = "checkbox";
        favCheckbox.checked = state.filters.favoritesOnly;
        favCheckbox.addEventListener("change", () => {
            state.filters.favoritesOnly = favCheckbox.checked;
            saveFilters();
            renderList();
        });
        const favSpan = document.createElement("span");
        favSpan.textContent = "Favorites only";
        favoritesToggle.appendChild(favCheckbox);
        favoritesToggle.appendChild(favSpan);

        const sortSelect = document.createElement("select");
        sortSelect.setAttribute("aria-label", "Sort entries");
        const sortOptions = [
            { value: "updatedAtDesc", label: "Recently updated" },
            { value: "createdAtDesc", label: "Recently created" },
            { value: "titleAsc", label: "Title (A–Z)" },
            { value: "favoriteDesc", label: "Favorites first" }
        ];
        sortOptions.forEach(optData => {
            const opt = document.createElement("option");
            opt.value = optData.value;
            opt.textContent = optData.label;
            sortSelect.appendChild(opt);
        });
        sortSelect.value = state.filters.sort;
        sortSelect.addEventListener("change", () => {
            state.filters.sort = sortSelect.value;
            saveFilters();
            renderList();
        });

        filtersContainer.appendChild(searchInput);
        filtersContainer.appendChild(tagSelect);
        filtersContainer.appendChild(categorySelect);
        filtersContainer.appendChild(favoritesToggle);
        filtersContainer.appendChild(sortSelect);
    }

    /* -----------------------------
       RENDER TOOLS
    ----------------------------- */

    function renderTools() {
        const toolsContainer = document.getElementById("codex-tools");
        if (!toolsContainer) return;

        toolsContainer.innerHTML = "";

        const exportButton = document.createElement("button");
        exportButton.textContent = "Export entries";
        exportButton.addEventListener("click", () => {
            window.CodexStorage.exportEntries();
        });

        const importLabel = document.createElement("label");
        importLabel.className = "codex-import-label";
        importLabel.textContent = "Import entries";
        const importInput = document.createElement("input");
        importInput.type = "file";
        importInput.accept = "application/json";
        importInput.addEventListener("change", () => {
            const file = importInput.files[0];
            if (!file) return;
            window.CodexStorage.importEntriesFromFile(file, { merge: true })
                .then(entries => {
                    state.entries = entries;
                    renderFilters();
                    renderList();
                })
                .catch(err => {
                    console.error("Import failed:", err);
                    alert("Failed to import entries.");
                });
        });
        importLabel.appendChild(importInput);

        const deleteAllButton = document.createElement("button");
        deleteAllButton.textContent = "Delete all entries";
        deleteAllButton.addEventListener("click", () => {
            if (!confirm("Are you sure you want to delete all entries? This cannot be undone.")) {
                return;
            }
            state.entries = [];
            window.CodexStorage.saveEntries(state.entries);
            renderFilters();
            renderList();
        });

        toolsContainer.appendChild(exportButton);
        toolsContainer.appendChild(importLabel);
        toolsContainer.appendChild(deleteAllButton);
    }

    /* -----------------------------
       RENDER NEW ENTRY FORM
    ----------------------------- */

    function renderNewForm() {
        const newContainer = document.getElementById("codex-new");
        if (!newContainer) return;

        newContainer.innerHTML = "";

        const form = document.createElement("form");
        form.className = "codex-new-form";

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.placeholder = "Title";
        titleInput.required = true;
        titleInput.value = state.draft.title;
        titleInput.setAttribute("aria-label", "New entry title");

        const categoryInput = document.createElement("input");
        categoryInput.type = "text";
        categoryInput.placeholder = "Category";
        categoryInput.value = state.draft.category;
        categoryInput.setAttribute("aria-label", "New entry category");

        const tagsInput = document.createElement("input");
        tagsInput.type = "text";
        tagsInput.placeholder = "Tags (comma-separated)";
        tagsInput.value = state.draft.tags;
        tagsInput.setAttribute("aria-label", "New entry tags");

        const contentTextarea = document.createElement("textarea");
        contentTextarea.placeholder = "Content (Markdown supported)";
        contentTextarea.rows = 6;
        contentTextarea.value = state.draft.content;
        contentTextarea.setAttribute("aria-label", "New entry content");

        function updateDraft() {
            state.draft.title = titleInput.value;
            state.draft.category = categoryInput.value;
            state.draft.tags = tagsInput.value;
            state.draft.content = contentTextarea.value;
            safeSaveDraft();
        }

        [titleInput, categoryInput, tagsInput, contentTextarea].forEach(el => {
            el.addEventListener("input", updateDraft);
        });

        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.textContent = "Add entry";

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const title = titleInput.value.trim();
            const category = categoryInput.value.trim();
            const tags = normalizeTags(tagsInput.value);
            const content = contentTextarea.value;

            if (!title) {
                alert("Title is required.");
                return;
            }

            const now = new Date().toISOString();
            const entry = window.CodexStorage.validateEntry({
                title,
                category,
                tags,
                content,
                favorite: false,
                createdAt: now,
                updatedAt: now
            });

            state.entries.push(entry);
            window.CodexStorage.saveEntries(state.entries);

            titleInput.value = "";
            categoryInput.value = "";
            tagsInput.value = "";
            contentTextarea.value = "";
            clearDraft();

            renderFilters();
            renderList();
        });

        form.appendChild(titleInput);
        form.appendChild(categoryInput);
        form.appendChild(tagsInput);
        form.appendChild(contentTextarea);
        form.appendChild(submitButton);

        newContainer.appendChild(form);
    }

    /* -----------------------------
       RENDER ENTRY LIST
    ----------------------------- */

    function renderList() {
        const listContainer = document.getElementById("codex-list");
        if (!listContainer) return;

        listContainer.innerHTML = "";

        const filtered = applyFilters(state.entries);
        const searchQuery = state.filters.search;

        if (filtered.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No entries match your filters.";
            listContainer.appendChild(empty);
            return;
        }

        filtered.forEach(entry => {
            const card = document.createElement("article");
            card.className = "codex-card";
            card.tabIndex = 0;
            card.setAttribute("role", "article");
            card.setAttribute("aria-label", entry.title);

            const header = document.createElement("header");
            header.className = "codex-card-header";

            const title = document.createElement("h3");
            title.className = "codex-card-title";
            title.innerHTML = highlightText(entry.title, searchQuery);

            const meta = document.createElement("div");
            meta.className = "codex-card-meta";

            if (entry.category) {
                const catSpan = document.createElement("span");
                catSpan.className = "codex-card-category";
                catSpan.textContent = entry.category;
                meta.appendChild(catSpan);
            }

            if (entry.tags && entry.tags.length > 0) {
                const tagsSpan = document.createElement("span");
                tagsSpan.className = "codex-card-tags";
                tagsSpan.innerHTML = entry.tags
                    .map(t => `<span class="codex-tag">${highlightText(t, searchQuery)}</span>`)
                    .join(" ");
                meta.appendChild(tagsSpan);
            }

            const favoriteButton = document.createElement("button");
            favoriteButton.className = "codex-favorite-button";
            favoriteButton.setAttribute("aria-label", entry.favorite ? "Unfavorite entry" : "Favorite entry");
            favoriteButton.textContent = entry.favorite ? "★" : "☆";
            favoriteButton.addEventListener("click", () => {
                entry.favorite = !entry.favorite;
                entry.updatedAt = new Date().toISOString();
                window.CodexStorage.saveEntries(state.entries);
                renderList();
            });

            header.appendChild(title);
            header.appendChild(meta);
            header.appendChild(favoriteButton);

            const body = document.createElement("div");
            body.className = "codex-card-body";
            body.innerHTML = renderMarkdown(entry.content);

            const footer = document.createElement("footer");
            footer.className = "codex-card-footer";

            const dates = document.createElement("span");
            dates.className = "codex-card-dates";
            dates.textContent = `Created: ${entry.createdAt} • Updated: ${entry.updatedAt}`;

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.setAttribute("aria-label", "Delete entry");
            deleteButton.addEventListener("click", () => {
                if (!confirm("Delete this entry?")) return;
                state.entries = state.entries.filter(e => e.id !== entry.id);
                window.CodexStorage.saveEntries(state.entries);
                renderFilters();
                renderList();
            });

            footer.appendChild(dates);
            footer.appendChild(deleteButton);

            card.appendChild(header);
            card.appendChild(body);
            card.appendChild(footer);

            listContainer.appendChild(card);
        });
    }

    /* -----------------------------
       INITIALIZATION
    ----------------------------- */

    function initCodexUI() {
        state.entries = window.CodexStorage.loadEntries();
        safeLoadDraft();
        loadFilters();

        renderFilters();
        renderTools();
        renderNewForm();
        renderList();
    }

    document.addEventListener("DOMContentLoaded", initCodexUI);
})();