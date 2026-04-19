const CodexUI = (function () {
    let state = {
        entries: [],
        filters: {
            searchTerm: "",
            tag: "",
            favoritesOnly: false
        }
    };

    let refs = {
        app: null,
        filtersContainer: null,
        toolsContainer: null,
        newContainer: null,
        listContainer: null,
        importInput: null
    };

    function initCodexUI() {
        refs.app = document.getElementById("codex-app");
        if (!refs.app) {
            return;
        }

        refs.filtersContainer = document.getElementById("codex-filters");
        refs.toolsContainer = document.getElementById("codex-tools");
        refs.newContainer = document.getElementById("codex-new");
        refs.listContainer = document.getElementById("codex-list");
        refs.importInput = document.getElementById("codex-import-input");

        state.entries = loadEntries();
        renderAll();
        bindStaticEvents();
    }

    function bindStaticEvents() {
        if (refs.filtersContainer) {
            const searchInput = refs.filtersContainer.querySelector("#codex-search-input");
            const tagSelect = refs.filtersContainer.querySelector("#codex-tag-select");
            const favoriteCheckbox = refs.filtersContainer.querySelector("#codex-favorite-only");

            if (searchInput) {
                searchInput.addEventListener("input", () => {
                    state.filters.searchTerm = searchInput.value;
                    renderList();
                });
            }

            if (tagSelect) {
                tagSelect.addEventListener("change", () => {
                    state.filters.tag = tagSelect.value;
                    renderList();
                });
            }

            if (favoriteCheckbox) {
                favoriteCheckbox.addEventListener("change", () => {
                    state.filters.favoritesOnly = favoriteCheckbox.checked;
                    renderList();
                });
            }
        }

        if (refs.toolsContainer) {
            const exportButton = refs.toolsContainer.querySelector("#codex-export-button");
            const importButton = refs.toolsContainer.querySelector("#codex-import-button");

            if (exportButton) {
                exportButton.addEventListener("click", () => {
                    exportEntries();
                });
            }

            if (importButton && refs.importInput) {
                importButton.addEventListener("click", () => {
                    refs.importInput.click();
                });

                refs.importInput.addEventListener("change", () => {
                    const file = refs.importInput.files[0];
                    if (!file) {
                        return;
                    }
                    importEntriesFromFile(file, { merge: true })
                        .then(entries => {
                            state.entries = entries;
                            refs.importInput.value = "";
                            renderAll();
                        })
                        .catch(() => {
                            alert("Invalid Codex entries file.");
                            refs.importInput.value = "";
                        });
                });
            }
        }

        if (refs.newContainer) {
            const form = refs.newContainer.querySelector("#codex-new-form");
            if (form) {
                form.addEventListener("submit", event => {
                    event.preventDefault();
                    const titleInput = form.querySelector("#codex-new-title");
                    const descriptionInput = form.querySelector("#codex-new-description");
                    const notesInput = form.querySelector("#codex-new-notes");
                    const tagsInput = form.querySelector("#codex-new-tags");

                    const title = titleInput ? titleInput.value.trim() : "";
                    const description = descriptionInput ? descriptionInput.value.trim() : "";
                    const notes = notesInput ? notesInput.value.trim() : "";
                    const tagsRaw = tagsInput ? tagsInput.value : "";
                    const tags = tagsRaw
                        .split(",")
                        .map(t => t.trim())
                        .filter(t => t.length > 0);

                    const entry = validateEntry({
                        id: crypto.randomUUID(),
                        title,
                        description,
                        notes,
                        favorite: false,
                        tags
                    });

                    state.entries.push(entry);
                    state.entries = saveEntries(state.entries);
                    form.reset();
                    renderAll();
                });
            }
        }

        if (refs.listContainer) {
            refs.listContainer.addEventListener("click", event => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) {
                    return;
                }

                const card = target.closest(".codex-card");
                if (!card) {
                    return;
                }
                const id = card.getAttribute("data-entry-id");
                if (!id) {
                    return;
                }

                if (target.classList.contains("codex-favorite-button")) {
                    toggleFavorite(id);
                } else if (target.classList.contains("codex-save-button")) {
                    saveCardEdits(card, id);
                } else if (target.classList.contains("codex-delete-button")) {
                    deleteEntry(id);
                }
            });
        }
    }

    function toggleFavorite(id) {
        const entry = state.entries.find(e => e.id === id);
        if (!entry) {
            return;
        }
        entry.favorite = !entry.favorite;
        state.entries = saveEntries(state.entries);
        renderList();
    }

    function saveCardEdits(card, id) {
        const entry = state.entries.find(e => e.id === id);
        if (!entry) {
            return;
        }

        const titleInput = card.querySelector(".codex-card-title-input");
        const descriptionInput = card.querySelector(".codex-card-input[data-field='description']");
        const notesInput = card.querySelector(".codex-card-textarea[data-field='notes']");
        const tagsInput = card.querySelector(".codex-card-input[data-field='tags']");

        entry.title = titleInput ? titleInput.value : entry.title;
        entry.description = descriptionInput ? descriptionInput.value : entry.description;
        entry.notes = notesInput ? notesInput.value : entry.notes;

        if (tagsInput) {
            entry.tags = tagsInput.value
                .split(",")
                .map(t => t.trim())
                .filter(t => t.length > 0);
        }

        state.entries = saveEntries(state.entries);
        renderAll();
    }

    function deleteEntry(id) {
        if (!confirm("Delete this entry?")) {
            return;
        }
        state.entries = state.entries.filter(e => e.id !== id);
        state.entries = saveEntries(state.entries);
        renderAll();
    }

    function renderAll() {
        renderFilters();
        renderTools();
        renderNewForm();
        renderList();
    }

    function renderFilters() {
        if (!refs.filtersContainer) {
            return;
        }

        const tags = getAllTags(state.entries);
        const selectedTag = state.filters.tag;

        refs.filtersContainer.innerHTML = `
            <input
                id="codex-search-input"
                class="codex-filter-input"
                type="search"
                placeholder="Search Codex..."
                aria-label="Search Codex entries"
                value="${state.filters.searchTerm.replace(/"/g, "&quot;")}"
            >
            <select
                id="codex-tag-select"
                class="codex-filter-select"
                aria-label="Filter by tag"
            >
                <option value="">All tags</option>
                ${tags
                    .map(
                        tag => `<option value="${tag.replace(/"/g, "&quot;")}" ${
                            tag === selectedTag ? "selected" : ""
                        }>${tag}</option>`
                    )
                    .join("")}
            </select>
            <label class="codex-filter-favorite">
                <input
                    id="codex-favorite-only"
                    type="checkbox"
                    ${state.filters.favoritesOnly ? "checked" : ""}
                >
                Favorites only
            </label>
        `;
    }

    function renderTools() {
        if (!refs.toolsContainer) {
            return;
        }

        refs.toolsContainer.innerHTML = `
            <button
                id="codex-export-button"
                class="codex-tool-button"
                type="button"
            >
                Export entries
            </button>
            <button
                id="codex-import-button"
                class="codex-tool-button"
                type="button"
            >
                Import entries
            </button>
            <input
                id="codex-import-input"
                type="file"
                accept=".json"
                hidden
            >
        `;

        refs.importInput = document.getElementById("codex-import-input");
    }

    function renderNewForm() {
        if (!refs.newContainer) {
            return;
        }

        refs.newContainer.innerHTML = `
            <form id="codex-new-form" class="codex-new-inner" aria-label="Create new Codex entry">
                <div class="codex-field-wrapper">
                    <label class="codex-field-label" for="codex-new-title">Title</label>
                    <input
                        id="codex-new-title"
                        class="codex-input"
                        type="text"
                        required
                    >
                </div>
                <div class="codex-field-wrapper">
                    <label class="codex-field-label" for="codex-new-description">Description</label>
                    <input
                        id="codex-new-description"
                        class="codex-input"
                        type="text"
                    >
                </div>
                <div class="codex-field-wrapper">
                    <label class="codex-field-label" for="codex-new-notes">Notes</label>
                    <textarea
                        id="codex-new-notes"
                        class="codex-input codex-textarea"
                    ></textarea>
                </div>
                <div class="codex-field-wrapper">
                    <label class="codex-field-label" for="codex-new-tags">Tags (comma-separated)</label>
                    <input
                        id="codex-new-tags"
                        class="codex-input"
                        type="text"
                    >
                </div>
                <button
                    type="submit"
                    class="codex-add-button"
                >
                    Add entry
                </button>
            </form>
        `;
    }

    function renderList() {
        if (!refs.listContainer) {
            return;
        }

        const filtered = filterEntries(state.entries, state.filters);

        if (filtered.length === 0) {
            refs.listContainer.innerHTML = `<div class="codex-empty">No entries match your filters.</div>`;
            return;
        }

        refs.listContainer.innerHTML = filtered
            .map(entry => renderCard(entry))
            .join("");
    }

    function renderCard(entry) {
        const tagsValue = Array.isArray(entry.tags) ? entry.tags.join(", ") : "";
        const favoriteLabel = entry.favorite ? "Unfavorite entry" : "Favorite entry";

        return `
            <article
                class="codex-card"
                data-entry-id="${entry.id}"
                aria-label="Codex entry"
            >
                <header class="codex-card-header">
                    <input
                        class="codex-card-title-input"
                        type="text"
                        value="${(entry.title || "").replace(/"/g, "&quot;")}"
                        aria-label="Entry title"
                    >
                    <button
                        type="button"
                        class="codex-favorite-button"
                        aria-pressed="${entry.favorite ? "true" : "false"}"
                        aria-label="${favoriteLabel}"
                    >
                        ${entry.favorite ? "★" : "☆"}
                    </button>
                </header>
                <div class="codex-card-row">
                    <span class="codex-card-label">Description</span>
                    <input
                        class="codex-card-input"
                        type="text"
                        data-field="description"
                        value="${(entry.description || "").replace(/"/g, "&quot;")}"
                        aria-label="Entry description"
                    >
                </div>
                <div class="codex-card-row">
                    <span class="codex-card-label">Notes</span>
                    <textarea
                        class="codex-card-input codex-card-textarea"
                        data-field="notes"
                        aria-label="Entry notes"
                    >${entry.notes || ""}</textarea>
                </div>
                <div class="codex-card-row">
                    <span class="codex-card-label">Tags</span>
                    <input
                        class="codex-card-input"
                        type="text"
                        data-field="tags"
                        value="${tagsValue.replace(/"/g, "&quot;")}"
                        aria-label="Entry tags"
                    >
                </div>
                <div class="codex-card-buttons">
                    <button
                        type="button"
                        class="codex-save-button"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        class="codex-delete-button"
                    >
                        Delete
                    </button>
                </div>
            </article>
        `;
    }

    return {
        initCodexUI
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    CodexUI.initCodexUI();
});
