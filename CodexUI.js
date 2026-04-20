// CodexUI.js
// Handles Codex UI: listing, filters, editing, autosave, markdown, highlighting + PWA offline sync strategies.
// IMPROVED: debounced search, toast notifications, enhanced empty state, better responsive UX.
// NEW: Command palette (Ctrl+K), internal [[links]], smart tag autocomplete, archive/soft-delete, markdown toolbar, templates, pinned entries, analytics hooks.

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
            showArchived: false,
            sort: "updatedAtDesc"
        },
        draft: {
            title: "",
            category: "",
            tags: "",
            content: ""
        },
        editingId: null,
        isOffline: !navigator.onLine,
        commandPaletteOpen: false
    };

    /* ----------------------------- 
       TOAST NOTIFICATIONS 
    ----------------------------- */
    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    /* ----------------------------- 
       DEBOUNCE 
    ----------------------------- */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /* ----------------------------- 
       CLEAR FILTERS 
    ----------------------------- */
    function clearAllFilters() {
        state.filters = {
            search: "",
            tag: "",
            category: "",
            favoritesOnly: false,
            showArchived: false,
            sort: "updatedAtDesc"
        };
        saveFilters();
        renderFilters();
        renderList();
        showToast("Filters cleared", "success");
    }
    window.clearAllFilters = clearAllFilters;

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
       PERSIST FILTERS 
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
            state.filters.showArchived = Boolean(parsed.showArchived);
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
       ENHANCED MARKDOWN + INTERNAL LINKS 
    ----------------------------- */
    function renderMarkdown(content) {
        if (!content) return "";
        let html = typeof window.marked === "function" ? window.marked(content) : content.replace(/\n/g, "<br>");
        // Internal [[Entry Title]] links
        html = html.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
            const entry = state.entries.find(e => e.title.toLowerCase() === title.toLowerCase().trim());
            if (entry) {
                return `<a href="#" onclick="window.editEntry('${entry.id}'); return false;" class="internal-link">${title}</a>`;
            }
            return match;
        });
        return html;
    }

    window.editEntry = function (id) {
        state.editingId = id;
        renderList();
        // Close palette if open
        const palette = document.getElementById("command-palette");
        if (palette) palette.remove();
        state.commandPaletteOpen = false;
    };

    /* ----------------------------- 
       FILTERING + SORTING + PINNED/ARCHIVED 
    ----------------------------- */
    function applyFilters(entries) {
        let filtered = entries.slice();
        const { search, tag, category, favoritesOnly, showArchived } = state.filters;

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.content.toLowerCase().includes(q) ||
                e.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        if (tag) filtered = filtered.filter(e => e.tags.includes(tag));
        if (category) filtered = filtered.filter(e => e.category === category);
        if (favoritesOnly) filtered = filtered.filter(e => e.favorite);

        // Archive filter
        if (!showArchived) {
            filtered = filtered.filter(e => !e.archived);
        }

        // Sort: pinned first, then selected order
        filtered.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            switch (state.filters.sort) {
                case "titleAsc": return a.title.localeCompare(b.title);
                case "createdAtDesc": return b.createdAt.localeCompare(a.createdAt);
                case "updatedAtDesc": return b.updatedAt.localeCompare(a.updatedAt);
                case "favoriteDesc": return Number(b.favorite) - Number(a.favorite);
                default: return b.updatedAt.localeCompare(a.updatedAt);
            }
        });

        return filtered;
    }

    function getAllTags(entries) {
        const set = new Set();
        entries.forEach(e => e.tags.forEach(t => set.add(t)));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    function getAllCategories(entries) {
        const set = new Set();
        entries.forEach(e => { if (e.category) set.add(e.category); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    /* ----------------------------- 
       COMMAND PALETTE (Ctrl/Cmd + K) 
    ----------------------------- */
    function showCommandPalette() {
        if (state.commandPaletteOpen) return;
        state.commandPaletteOpen = true;

        const palette = document.createElement("div");
        palette.id = "command-palette";
        palette.className = "command-palette";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Search commands or entries...";
        input.className = "command-palette-input";
        palette.appendChild(input);

        const list = document.createElement("div");
        list.className = "command-palette-list";
        palette.appendChild(list);

        document.body.appendChild(palette);
        input.focus();

        const commands = [
            { label: "New Entry", icon: "📝", action: () => { palette.remove(); state.commandPaletteOpen = false; document.getElementById("codex-new").scrollIntoView({ behavior: "smooth" }); } },
            { label: "Open Settings", icon: "⚙️", action: () => { palette.remove(); state.commandPaletteOpen = false; document.getElementById("settings-button").click(); } },
            { label: "Clear Filters", icon: "🧹", action: () => { palette.remove(); state.commandPaletteOpen = false; clearAllFilters(); } },
            { label: "Toggle Compact Mode", icon: "📐", action: () => { palette.remove(); state.commandPaletteOpen = false; const toggle = document.getElementById("compact-mode-toggle"); if (toggle) toggle.click(); } }
        ];

        function renderPaletteResults(term) {
            list.innerHTML = "";
            // Commands
            commands.forEach(cmd => {
                if (term && !cmd.label.toLowerCase().includes(term)) return;
                const item = document.createElement("div");
                item.className = "command-palette-item";
                item.innerHTML = `<span>${cmd.icon}</span><span>${cmd.label}</span>`;
                item.addEventListener("click", () => {
                    cmd.action();
                });
                list.appendChild(item);
            });
            // Matching entries
            const matches = state.entries.filter(e => 
                e.title.toLowerCase().includes(term) && !e.archived
            ).slice(0, 8);
            matches.forEach(entry => {
                const item = document.createElement("div");
                item.className = "command-palette-item";
                item.innerHTML = `<span>📄</span><span>${highlightText(entry.title, term)}</span>`;
                item.addEventListener("click", () => {
                    palette.remove();
                    state.commandPaletteOpen = false;
                    window.editEntry(entry.id);
                });
                list.appendChild(item);
            });
            if (list.children.length === 0) {
                list.innerHTML = `<div style="padding:16px;color:#888;text-align:center;">No results</div>`;
            }
        }

        input.addEventListener("input", debounce(() => renderPaletteResults(input.value.toLowerCase()), 120));

        // Close on Esc or click outside
        const closePalette = (e) => {
            if (e.key === "Escape" || (e.type === "click" && !palette.contains(e.target))) {
                palette.remove();
                state.commandPaletteOpen = false;
                document.removeEventListener("keydown", closePalette);
                document.removeEventListener("click", closePalette);
            }
        };
        document.addEventListener("keydown", closePalette);
        setTimeout(() => document.addEventListener("click", closePalette), 10);
    }

    /* ----------------------------- 
       OFFLINE BANNER 
    ----------------------------- */
    function renderOfflineBanner() {
        let banner = document.getElementById("offline-banner");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "offline-banner";
            banner.className = "offline-banner";
            banner.innerHTML = `
                <span>📴 Offline — All changes saved locally</span>
                <span style="margin-left:8px;font-size:0.9em;">(Background sync will run when online)</span>
            `;
            document.body.appendChild(banner);
        }
        if (state.isOffline) {
            banner.classList.add("show");
        } else {
            banner.classList.remove("show");
        }
    }

    async function queueOperation(type, payload) {
        try {
            await window.CodexStorage.addToSyncQueue({ type, payload });
        } catch (e) {
            console.error("Failed to queue operation:", e);
        }
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
        const debouncedSearch = debounce(() => {
            state.filters.search = searchInput.value;
            saveFilters();
            renderList();
        }, 280);
        searchInput.addEventListener("input", debouncedSearch);

        // Tag select
        const tagSelect = document.createElement("select");
        tagSelect.appendChild(new Option("All tags", ""));
        getAllTags(state.entries).forEach(tag => tagSelect.appendChild(new Option(tag, tag)));
        tagSelect.value = state.filters.tag;
        tagSelect.addEventListener("change", () => { state.filters.tag = tagSelect.value; saveFilters(); renderList(); });

        // Category select
        const categorySelect = document.createElement("select");
        categorySelect.appendChild(new Option("All categories", ""));
        getAllCategories(state.entries).forEach(cat => categorySelect.appendChild(new Option(cat, cat)));
        categorySelect.value = state.filters.category;
        categorySelect.addEventListener("change", () => { state.filters.category = categorySelect.value; saveFilters(); renderList(); });

        // Favorites
        const favoritesToggle = document.createElement("label");
        favoritesToggle.className = "codex-toggle";
        const favCheckbox = document.createElement("input");
        favCheckbox.type = "checkbox";
        favCheckbox.checked = state.filters.favoritesOnly;
        favCheckbox.addEventListener("change", () => { state.filters.favoritesOnly = favCheckbox.checked; saveFilters(); renderList(); });
        favoritesToggle.append(favCheckbox, document.createTextNode(" Favorites only"));

        // Archived
        const archivedToggle = document.createElement("label");
        archivedToggle.className = "codex-toggle";
        const archCheckbox = document.createElement("input");
        archCheckbox.type = "checkbox";
        archCheckbox.checked = state.filters.showArchived;
        archCheckbox.addEventListener("change", () => { state.filters.showArchived = archCheckbox.checked; saveFilters(); renderList(); });
        archivedToggle.append(archCheckbox, document.createTextNode(" Show archived"));

        // Sort
        const sortSelect = document.createElement("select");
        const sortOptions = [
            { value: "updatedAtDesc", label: "Recently updated" },
            { value: "createdAtDesc", label: "Recently created" },
            { value: "titleAsc", label: "Title (A–Z)" },
            { value: "favoriteDesc", label: "Favorites first" }
        ];
        sortOptions.forEach(o => {
            const opt = new Option(o.label, o.value);
            sortSelect.appendChild(opt);
        });
        sortSelect.value = state.filters.sort;
        sortSelect.addEventListener("change", () => { state.filters.sort = sortSelect.value; saveFilters(); renderList(); });

        filtersContainer.append(searchInput, tagSelect, categorySelect, favoritesToggle, archivedToggle, sortSelect);
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
        exportButton.className = "codex-tool-button";
        exportButton.addEventListener("click", () => {
            window.CodexStorage.exportEntries();
            showToast("Entries exported successfully");
        });

        const defaultsButton = document.createElement("button");
        defaultsButton.textContent = "Export as default-entries.json";
        defaultsButton.className = "codex-tool-button";
        defaultsButton.addEventListener("click", () => {
            const entriesToSave = state.entries;
            if (entriesToSave.length === 0) {
                showToast("No entries to export as defaults", "error");
                return;
            }
            const blob = new Blob([JSON.stringify(entriesToSave, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "default-entries.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("default-entries.json downloaded");
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
                    showToast("Entries imported successfully");
                })
                .catch(() => showToast("Failed to import entries", "error"));
        });
        importLabel.appendChild(importInput);

        const deleteAllButton = document.createElement("button");
        deleteAllButton.textContent = "Delete all entries";
        deleteAllButton.className = "codex-tool-button";
        deleteAllButton.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to delete all entries? This cannot be undone.")) return;
            state.entries = [];
            await window.CodexStorage.saveEntries(state.entries);
            renderFilters();
            renderList();
            showToast("All entries deleted", "success");
        });

        toolsContainer.append(exportButton, defaultsButton, importLabel, deleteAllButton);
    }

    /* ----------------------------- 
       RENDER NEW ENTRY + TEMPLATES 
    ----------------------------- */
    function renderNewForm() {
        const newContainer = document.getElementById("codex-new");
        if (!newContainer) return;
        newContainer.innerHTML = "";

        const form = document.createElement("form");
        form.className = "codex-new-form";

        // Template selector
        const templateSelect = document.createElement("select");
        templateSelect.innerHTML = `
            <option value="">No template</option>
            <option value="meeting">Meeting Notes</option>
            <option value="book">Book Summary</option>
            <option value="idea">Idea / Brainstorm</option>
        `;
        templateSelect.addEventListener("change", () => {
            const val = templateSelect.value;
            if (val === "meeting") {
                state.draft.title = "Meeting — " + new Date().toLocaleDateString();
                state.draft.content = "# Agenda\n\n- \n\n# Notes\n\n# Action Items\n- [ ] ";
            } else if (val === "book") {
                state.draft.title = "Book Summary — ";
                state.draft.content = "# Title\n\n## Key Takeaways\n\n## Quotes\n\n## My Thoughts\n";
            } else if (val === "idea") {
                state.draft.title = "Idea — ";
                state.draft.content = "# Problem\n\n# Solution\n\n# Next Steps\n";
            }
            // Update inputs
            titleInput.value = state.draft.title;
            contentTextarea.value = state.draft.content;
            safeSaveDraft();
        });

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.placeholder = "Title";
        titleInput.required = true;
        titleInput.value = state.draft.title;

        const categoryInput = document.createElement("input");
        categoryInput.type = "text";
        categoryInput.placeholder = "Category";
        categoryInput.value = state.draft.category;

        const tagsInput = document.createElement("input");
        tagsInput.type = "text";
        tagsInput.placeholder = "Tags (comma-separated)";
        tagsInput.value = state.draft.tags;
        // Smart tag suggestions via datalist
        const datalist = document.createElement("datalist");
        datalist.id = "tag-suggestions";
        getAllTags(state.entries).forEach(t => {
            const opt = document.createElement("option");
            opt.value = t;
            datalist.appendChild(opt);
        });
        tagsInput.setAttribute("list", "tag-suggestions");

        const contentTextarea = document.createElement("textarea");
        contentTextarea.placeholder = "Content (Markdown supported)";
        contentTextarea.rows = 6;
        contentTextarea.value = state.draft.content;

        function updateDraft() {
            state.draft.title = titleInput.value;
            state.draft.category = categoryInput.value;
            state.draft.tags = tagsInput.value;
            state.draft.content = contentTextarea.value;
            safeSaveDraft();
        }

        [titleInput, categoryInput, tagsInput, contentTextarea].forEach(el => el.addEventListener("input", updateDraft));

        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.textContent = "Add entry";
        submitButton.className = "codex-add-button";

        form.append(templateSelect, titleInput, categoryInput, tagsInput, contentTextarea, submitButton);

        form.addEventListener("submit", async e => {
            e.preventDefault();
            const title = titleInput.value.trim();
            if (!title) return showToast("Title is required", "error");

            const entry = window.CodexStorage.validateEntry({
                title,
                category: categoryInput.value.trim(),
                tags: normalizeTags(tagsInput.value),
                content: contentTextarea.value,
                favorite: false,
                archived: false,
                pinned: false
            });

            state.entries.push(entry);
            await window.CodexStorage.saveEntries(state.entries);
            if (state.isOffline) await queueOperation("create", entry);

            clearDraft();
            titleInput.value = categoryInput.value = tagsInput.value = contentTextarea.value = "";
            renderFilters();
            renderList();
            showToast("Entry added successfully");
        });

        newContainer.appendChild(form);
    }

    /* ----------------------------- 
       MARKDOWN TOOLBAR HELPER 
    ----------------------------- */
    function createMarkdownToolbar(textarea) {
        const toolbar = document.createElement("div");
        toolbar.className = "markdown-toolbar";

        const buttons = [
            { label: "B", title: "Bold", action: () => insertAtCursor(textarea, "**", "**") },
            { label: "I", title: "Italic", action: () => insertAtCursor(textarea, "*", "*") },
            { label: "Link", title: "Link", action: () => insertAtCursor(textarea, "[", "](url)") },
            { label: "List", title: "Unordered list", action: () => insertAtCursor(textarea, "- ", "") },
            { label: "`", title: "Code", action: () => insertAtCursor(textarea, "`", "`") },
            { label: "H1", title: "Heading 1", action: () => insertAtCursor(textarea, "# ", "") }
        ];

        buttons.forEach(btn => {
            const b = document.createElement("button");
            b.textContent = btn.label;
            b.title = btn.title;
            b.addEventListener("click", e => {
                e.preventDefault();
                btn.action();
                textarea.focus();
            });
            toolbar.appendChild(b);
        });

        return toolbar;
    }

    function insertAtCursor(textarea, prefix, suffix) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        const replacement = prefix + selected + suffix;
        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = textarea.selectionStart + selected.length;
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
            const empty = document.createElement("div");
            empty.className = "codex-empty";
            empty.innerHTML = `
                <div style="font-size:4rem;margin-bottom:16px;opacity:0.25;">📪</div>
                <p style="font-size:1.1rem;margin-bottom:8px;">No entries match your filters</p>
                <button onclick="clearAllFilters()" style="margin-top:20px;background:#58a6ff;color:#fff;border:none;padding:10px 24px;border-radius:9999px;cursor:pointer;font-weight:600;">Clear all filters</button>
            `;
            listContainer.appendChild(empty);
            return;
        }

        filtered.forEach(entry => {
            const isEditing = state.editingId === entry.id;
            const card = document.createElement("article");
            card.className = `codex-card ${entry.archived ? "archived" : ""} ${entry.pinned ? "pinned" : ""}`;
            card.tabIndex = 0;

            // HEADER
            const header = document.createElement("header");
            header.className = "codex-card-header";

            let titleEl;
            if (isEditing) {
                titleEl = document.createElement("input");
                titleEl.type = "text";
                titleEl.value = entry.title;
                titleEl.className = "codex-card-title-input";
                setTimeout(() => titleEl.focus(), 10);
            } else {
                titleEl = document.createElement("h3");
                titleEl.className = "codex-card-title";
                titleEl.innerHTML = highlightText(entry.title, searchQuery);
            }
            header.appendChild(titleEl);

            if (!isEditing) {
                const meta = document.createElement("div");
                meta.className = "codex-card-meta";
                if (entry.category) {
                    const catSpan = document.createElement("span");
                    catSpan.className = "codex-card-category";
                    catSpan.textContent = entry.category;
                    meta.appendChild(catSpan);
                }
                if (entry.tags && entry.tags.length) {
                    const tagsSpan = document.createElement("span");
                    tagsSpan.className = "codex-card-tags";
                    tagsSpan.innerHTML = entry.tags.map(t => `<span class="codex-tag">${highlightText(t, searchQuery)}</span>`).join(" ");
                    meta.appendChild(tagsSpan);
                }
                header.appendChild(meta);
            }

            // Favorite / Pin / Archive buttons
            const favBtn = document.createElement("button");
            favBtn.className = "codex-favorite-button";
            favBtn.textContent = entry.favorite ? "★" : "☆";
            favBtn.addEventListener("click", async () => {
                entry.favorite = !entry.favorite;
                entry.updatedAt = new Date().toISOString();
                await window.CodexStorage.saveEntries(state.entries);
                if (state.isOffline) await queueOperation("favorite", { id: entry.id, favorite: entry.favorite });
                renderList();
                showToast(entry.favorite ? "Favorited" : "Unfavorited");
            });
            header.appendChild(favBtn);

            const pinBtn = document.createElement("button");
            pinBtn.style.marginLeft = "4px";
            pinBtn.textContent = entry.pinned ? "📌" : "📍";
            pinBtn.style.fontSize = "18px";
            pinBtn.addEventListener("click", async () => {
                entry.pinned = !entry.pinned;
                entry.updatedAt = new Date().toISOString();
                await window.CodexStorage.saveEntries(state.entries);
                renderList();
                showToast(entry.pinned ? "Pinned" : "Unpinned");
            });
            header.appendChild(pinBtn);

            card.appendChild(header);

            if (isEditing) {
                const editBody = document.createElement("div");
                editBody.className = "codex-new-inner";

                // Category
                const catWrapper = document.createElement("div");
                catWrapper.className = "codex-field-wrapper";
                catWrapper.innerHTML = `<div class="codex-field-label">Category</div>`;
                const catInput = document.createElement("input");
                catInput.type = "text";
                catInput.value = entry.category || "";
                catInput.className = "codex-input codex-card-input";
                catWrapper.appendChild(catInput);
                editBody.appendChild(catWrapper);

                // Tags
                const tagsWrapper = document.createElement("div");
                tagsWrapper.className = "codex-field-wrapper";
                tagsWrapper.innerHTML = `<div class="codex-field-label">Tags (comma-separated)</div>`;
                const tagsInput = document.createElement("input");
                tagsInput.type = "text";
                tagsInput.value = entry.tags.join(", ");
                tagsInput.className = "codex-input codex-card-input";
                const datalist = document.createElement("datalist");
                datalist.id = "edit-tag-suggestions";
                getAllTags(state.entries).forEach(t => {
                    const opt = document.createElement("option");
                    opt.value = t;
                    datalist.appendChild(opt);
                });
                tagsInput.setAttribute("list", "edit-tag-suggestions");
                tagsWrapper.appendChild(tagsInput);
                editBody.appendChild(tagsWrapper);

                // Markdown toolbar + content
                const contentWrapper = document.createElement("div");
                contentWrapper.className = "codex-field-wrapper";
                contentWrapper.innerHTML = `<div class="codex-field-label">Content (Markdown supported)</div>`;
                const contentTA = document.createElement("textarea");
                contentTA.value = entry.content;
                contentTA.className = "codex-textarea codex-card-textarea";
                contentTA.rows = 8;
                const toolbar = createMarkdownToolbar(contentTA);
                contentWrapper.append(toolbar, contentTA);
                editBody.appendChild(contentWrapper);

                card.appendChild(editBody);

                // Footer buttons
                const footer = document.createElement("footer");
                footer.className = "codex-card-footer";

                const saveBtn = document.createElement("button");
                saveBtn.textContent = "Save Changes";
                saveBtn.className = "codex-save-button";
                saveBtn.addEventListener("click", async () => {
                    const newTitle = titleEl.value.trim();
                    if (!newTitle) return showToast("Title required", "error");
                    entry.title = newTitle;
                    entry.category = catInput.value.trim();
                    entry.tags = normalizeTags(tagsInput.value);
                    entry.content = contentTA.value;
                    entry.updatedAt = new Date().toISOString();
                    await window.CodexStorage.saveEntries(state.entries);
                    if (state.isOffline) await queueOperation("update", entry);
                    state.editingId = null;
                    renderFilters();
                    renderList();
                    showToast("Entry updated");
                });

                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = "Cancel";
                cancelBtn.className = "codex-delete-button";
                cancelBtn.addEventListener("click", () => { state.editingId = null; renderList(); });

                const archiveBtn = document.createElement("button");
                archiveBtn.textContent = entry.archived ? "Restore" : "Archive";
                archiveBtn.className = "codex-delete-button";
                archiveBtn.addEventListener("click", async () => {
                    entry.archived = !entry.archived;
                    entry.updatedAt = new Date().toISOString();
                    await window.CodexStorage.saveEntries(state.entries);
                    if (state.isOffline) await queueOperation("archive", { id: entry.id, archived: entry.archived });
                    state.editingId = null;
                    renderFilters();
                    renderList();
                    showToast(entry.archived ? "Archived" : "Restored");
                });

                const btnGroup = document.createElement("div");
                btnGroup.style.display = "flex";
                btnGroup.style.gap = "8px";
                btnGroup.append(saveBtn, cancelBtn, archiveBtn);
                footer.appendChild(btnGroup);
                card.appendChild(footer);
            } else {
                // Display mode
                const body = document.createElement("div");
                body.className = "codex-card-body";
                body.innerHTML = renderMarkdown(entry.content);
                card.appendChild(body);

                const footer = document.createElement("footer");
                footer.className = "codex-card-footer";

                const dates = document.createElement("span");
                dates.textContent = `Created: ${new Date(entry.createdAt).toLocaleDateString()} • Updated: ${new Date(entry.updatedAt).toLocaleDateString()}`;

                const editBtn = document.createElement("button");
                editBtn.textContent = "Edit";
                editBtn.className = "codex-save-button";
                editBtn.addEventListener("click", () => { state.editingId = entry.id; renderList(); });

                const archiveBtn = document.createElement("button");
                archiveBtn.textContent = entry.archived ? "Restore" : "Archive";
                archiveBtn.className = "codex-delete-button";
                archiveBtn.addEventListener("click", async () => {
                    entry.archived = !entry.archived;
                    entry.updatedAt = new Date().toISOString();
                    await window.CodexStorage.saveEntries(state.entries);
                    if (state.isOffline) await queueOperation(entry.archived ? "archive" : "restore", { id: entry.id });
                    renderFilters();
                    renderList();
                    showToast(entry.archived ? "Archived" : "Restored");
                });

                const btnGroup = document.createElement("div");
                btnGroup.style.display = "flex";
                btnGroup.style.gap = "8px";
                btnGroup.append(editBtn, archiveBtn);
                footer.append(dates, btnGroup);
                card.appendChild(footer);
            }

            listContainer.appendChild(card);
        });
    }

    /* ----------------------------- 
       INIT + KEYBOARD SHORTCUT + OFFLINE 
    ----------------------------- */
    async function initCodexUI() {
        try {
            state.entries = await window.CodexStorage.loadEntries();
        } catch (e) {
            console.error("Failed to load entries:", e);
            state.entries = [];
        }
        safeLoadDraft();
        loadFilters();

        renderFilters();
        renderTools();
        renderNewForm();
        renderList();
        renderOfflineBanner();

        // Global Command Palette shortcut
        document.addEventListener("keydown", e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                showCommandPalette();
            }
        });

        window.addEventListener("online", async () => {
            state.isOffline = false;
            renderOfflineBanner();
            await window.CodexStorage.processSyncQueue();
            state.entries = await window.CodexStorage.loadEntries();
            renderList();
            showToast("Back online — synced successfully");
        });

        window.addEventListener("offline", () => {
            state.isOffline = true;
            renderOfflineBanner();
        });

        if (!state.isOffline) {
            await window.CodexStorage.processSyncQueue();
        }

        console.log("[CodexUI] Full feature set loaded: command palette, wiki links, archive, toolbar, templates, pinned entries");
    }

    document.addEventListener("DOMContentLoaded", initCodexUI);
})();