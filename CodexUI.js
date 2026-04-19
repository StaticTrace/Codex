document.addEventListener("DOMContentLoaded", () => {
    const tabsContainer = document.getElementById("codex-tabs");
    const filtersSection = document.getElementById("codex-filters");
    const searchInput = document.getElementById("codex-search-input");
    const tagFilterInput = document.getElementById("codex-tag-filter");
    const favoriteFilterCheckbox = document.getElementById("codex-favorite-filter");
    const favoriteFilterLabel = document.getElementById("codex-favorite-filter-label");
    const newSection = document.getElementById("codex-new");
    const listSection = document.getElementById("codex-list");

    let currentCategoryKey = "entries";

    function getCategoryConfig(key) {
        return CATEGORIES[key];
    }

    function buildTabs() {
        tabsContainer.innerHTML = "";
        Object.keys(CATEGORIES).forEach(key => {
            const cfg = CATEGORIES[key];
            const btn = document.createElement("button");
            btn.className = "tab-button";
            btn.textContent = cfg.label;
            btn.dataset.category = key;
            if (key === currentCategoryKey) {
                btn.classList.add("active");
            }
            btn.addEventListener("click", () => {
                currentCategoryKey = key;
                updateActiveTab();
                renderCategoryUI();
            });
            tabsContainer.appendChild(btn);
        });
    }

    function updateActiveTab() {
        const buttons = tabsContainer.querySelectorAll(".tab-button");
        buttons.forEach(btn => {
            if (btn.dataset.category === currentCategoryKey) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    function parseTags(value) {
        return value
            .split(",")
            .map(t => t.trim())
            .filter(t => t.length > 0);
    }

    function tagsToString(tags) {
        if (!Array.isArray(tags)) return "";
        return tags.join(", ");
    }

    function buildNewForm() {
        const cfg = getCategoryConfig(currentCategoryKey);
        newSection.innerHTML = "";

        const container = document.createElement("div");
        container.className = "codex-new-inner";

        cfg.fields.forEach(field => {
            const wrapper = document.createElement("div");
            wrapper.className = "codex-field-wrapper";

            const label = document.createElement("label");
            label.textContent = field.label;
            label.className = "codex-field-label";

            let input;
            if (field.type === "textarea") {
                input = document.createElement("textarea");
                input.className = "codex-input codex-textarea";
            } else {
                input = document.createElement("input");
                input.type = "text";
                input.className = "codex-input";
            }

            input.dataset.fieldName = field.name;
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        });

        const addButton = document.createElement("button");
        addButton.textContent = "Add " + cfg.label.slice(0, -1);
        addButton.className = "codex-add-button";
        addButton.style.backgroundColor = cfg.color;

        addButton.addEventListener("click", () => {
            const data = {};
            let tagsArray = [];

            const inputs = container.querySelectorAll(".codex-input, .codex-textarea");
            inputs.forEach(input => {
                const fieldName = input.dataset.fieldName;
                const fieldCfg = cfg.fields.find(f => f.name === fieldName);
                const value = input.value.trim();

                if (fieldCfg.type === "tags") {
                    tagsArray = parseTags(value);
                } else {
                    data[fieldName] = value;
                }
            });

            if (cfg.supportsTags) {
                data.tags = tagsArray;
            }

            const hasContent = Object.values(data).some(v => typeof v === "string" && v.length > 0);
            if (!hasContent) return;

            CodexStorage.addItem(cfg.key, data, cfg.supportsFavorite, cfg.supportsTags);

            inputs.forEach(input => {
                input.value = "";
            });

            renderList();
        });

        newSection.appendChild(container);
        newSection.appendChild(addButton);
    }

    function itemMatchesFilters(item, cfg) {
        const search = searchInput.value.trim().toLowerCase();
        const tagFilter = tagFilterInput.value.trim().toLowerCase();
        const favoritesOnly = favoriteFilterCheckbox.checked && cfg.supportsFavorite;

        if (favoritesOnly && !item.favorite) {
            return false;
        }

        if (tagFilter && cfg.supportsTags) {
            const tags = Array.isArray(item.tags) ? item.tags : [];
            const hasTag = tags.some(t => t.toLowerCase().includes(tagFilter));
            if (!hasTag) return false;
        }

        if (search) {
            const haystackParts = [];
            cfg.fields.forEach(field => {
                const name = field.name;
                if (name === "tags") return;
                const value = item[name];
                if (typeof value === "string") {
                    haystackParts.push(value.toLowerCase());
                }
            });
            const haystack = haystackParts.join(" ");
            if (!haystack.includes(search)) {
                return false;
            }
        }

        return true;
    }

    function buildCard(item, cfg) {
        const card = document.createElement("div");
        card.className = "codex-card";
        card.style.borderTopColor = cfg.color;

        const header = document.createElement("div");
        header.className = "codex-card-header";

        const titleField = cfg.fields[0];
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "codex-card-title-input";
        titleInput.value = item[titleField.name] || "";
        titleInput.dataset.fieldName = titleField.name;

        header.appendChild(titleInput);

        if (cfg.supportsFavorite) {
            const favBtn = document.createElement("button");
            favBtn.className = "codex-favorite-button";
            favBtn.textContent = item.favorite ? "★" : "☆";
            favBtn.addEventListener("click", () => {
                CodexStorage.toggleFavorite(cfg.key, item.id);
                renderList();
            });
            header.appendChild(favBtn);
        }

        card.appendChild(header);

        cfg.fields.slice(1).forEach(field => {
            const row = document.createElement("div");
            row.className = "codex-card-row";

            const label = document.createElement("div");
            label.className = "codex-card-label";
            label.textContent = field.label + ":";

            let input;
            if (field.type === "textarea") {
                input = document.createElement("textarea");
                input.className = "codex-card-input codex-card-textarea";
                input.value = item[field.name] || "";
            } else if (field.type === "tags") {
                input = document.createElement("input");
                input.type = "text";
                input.className = "codex-card-input";
                input.value = tagsToString(item.tags);
            } else {
                input = document.createElement("input");
                input.type = "text";
                input.className = "codex-card-input";
                input.value = item[field.name] || "";
            }

            input.dataset.fieldName = field.name;

            row.appendChild(label);
            row.appendChild(input);
            card.appendChild(row);
        });

        const buttonsRow = document.createElement("div");
        buttonsRow.className = "codex-card-buttons";

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.className = "codex-save-button";

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "codex-delete-button";

        saveBtn.addEventListener("click", () => {
            const updates = {};
            let tagsArray = item.tags;

            const inputs = card.querySelectorAll(".codex-card-input, .codex-card-title-input, .codex-card-textarea");
            inputs.forEach(input => {
                const fieldName = input.dataset.fieldName;
                const fieldCfg = cfg.fields.find(f => f.name === fieldName);
                const value = input.value;

                if (fieldCfg.type === "tags") {
                    tagsArray = parseTags(value);
                } else {
                    updates[fieldName] = value;
                }
            });

            if (cfg.supportsTags) {
                updates.tags = tagsArray;
            }

            CodexStorage.updateItem(cfg.key, item.id, updates, cfg.supportsTags);
            renderList();
        });

        deleteBtn.addEventListener("click", () => {
            CodexStorage.deleteItem(cfg.key, item.id);
            renderList();
        });

        buttonsRow.appendChild(saveBtn);
        buttonsRow.appendChild(deleteBtn);
        card.appendChild(buttonsRow);

        return card;
    }

    function renderList() {
        const cfg = getCategoryConfig(currentCategoryKey);
        const items = CodexStorage.loadCategory(cfg.key);
        listSection.innerHTML = "";

        const filtered = items.filter(item => itemMatchesFilters(item, cfg));

        if (filtered.length === 0) {
            const empty = document.createElement("div");
            empty.className = "codex-empty";
            empty.textContent = "No " + cfg.label.toLowerCase() + " found.";
            listSection.appendChild(empty);
            return;
        }

        filtered.forEach(item => {
            const card = buildCard(item, cfg);
            listSection.appendChild(card);
        });
    }

    function renderCategoryUI() {
        const cfg = getCategoryConfig(currentCategoryKey);

        if (cfg.supportsFavorite) {
            favoriteFilterLabel.classList.remove("hidden");
        } else {
            favoriteFilterLabel.classList.add("hidden");
            favoriteFilterCheckbox.checked = false;
        }

        searchInput.value = "";
        tagFilterInput.value = "";
        favoriteFilterCheckbox.checked = false;

        buildNewForm();
        renderList();
    }

    searchInput.addEventListener("input", renderList);
    tagFilterInput.addEventListener("input", renderList);
    favoriteFilterCheckbox.addEventListener("change", renderList);

    buildTabs();
    renderCategoryUI();
});
