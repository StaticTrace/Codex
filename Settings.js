// Refactored Settings.js - Cleaner initialization, modular methods, IndexedDB quota warnings
const SettingsManager = {
    defaults: {
        theme: "auto",
        fontSize: "medium",
        highContrast: false,
        compactMode: false,
        customAccent: "#58a6ff"
    },

    settings: {},

    async init() {
        this.loadSettings();
        this.applySettings();
        this.setupUI();
        await this.updateStorageInfo(); // Initial quota check
        console.log("[Settings] Refactored initialization complete");
    },

    loadSettings() {
        const saved = window.StorageHelper.safeGetItem("userSettings");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.defaults, ...parsed };
            } catch {
                window.StorageHelper.safeRemoveItem("userSettings");
                this.settings = { ...this.defaults };
            }
        } else {
            this.settings = { ...this.defaults };
        }
    },

    saveSettings() {
        window.StorageHelper.safeSetItem("userSettings", JSON.stringify(this.settings));
    },

    applySettings() {
        this.applyTheme();
        this.applyFontSize();
        this.applyAccessibility();
        this.applyCustomAccent();
    },

    setupUI() {
        const overlay = document.getElementById("settings-overlay");
        const panel = document.getElementById("settings-panel");
        const closeBtn = document.getElementById("settings-close");
        const settingsButton = document.getElementById("settings-button");

        if (!overlay || !panel || !closeBtn || !settingsButton) return;

        settingsButton.addEventListener("click", () => this.openSettings());
        closeBtn.addEventListener("click", () => this.closeSettings());
        overlay.addEventListener("click", e => { if (e.target === overlay) this.closeSettings(); });

        // Accordion sections
        document.querySelectorAll(".section-header").forEach(header => {
            header.addEventListener("click", () => {
                const body = header.nextElementSibling;
                const arrow = header.querySelector(".arrow");
                if (body && arrow) {
                    body.classList.toggle("hidden");
                    arrow.classList.toggle("rotated");
                }
            });
        });

        // Search
        const searchInput = document.getElementById("settings-search-input");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                const term = searchInput.value.toLowerCase();
                document.querySelectorAll(".settings-section").forEach(section => {
                    section.style.display = section.innerText.toLowerCase().includes(term) ? "" : "none";
                });
            });
        }

        // Theme radios
        document.querySelectorAll("input[name='theme']").forEach(radio => {
            radio.addEventListener("change", () => this.setTheme(radio.value));
        });

        // Font size
        document.querySelectorAll("input[name='font-size']").forEach(radio => {
            radio.addEventListener("change", () => this.setFontSize(radio.value));
        });

        // Accessibility toggles
        const highContrastToggle = document.getElementById("high-contrast-toggle");
        const compactModeToggle = document.getElementById("compact-mode-toggle");
        if (highContrastToggle) highContrastToggle.addEventListener("change", () => this.setHighContrast(highContrastToggle.checked));
        if (compactModeToggle) compactModeToggle.addEventListener("change", () => this.setCompactMode(compactModeToggle.checked));

        // Accent picker
        const customAccentPicker = document.getElementById("custom-accent-picker");
        if (customAccentPicker) customAccentPicker.addEventListener("input", () => this.setCustomAccent(customAccentPicker.value));

        // Reset buttons
        document.getElementById("reset-theme")?.addEventListener("click", () => this.resetTheme());
        document.getElementById("reset-font")?.addEventListener("click", () => this.resetFont());
        document.getElementById("reset-accessibility")?.addEventListener("click", () => this.resetAccessibility());
        document.getElementById("reset-settings")?.addEventListener("click", () => this.resetAll());

        // Export / Import
        document.getElementById("export-settings")?.addEventListener("click", () => this.exportSettings());
        const importBtn = document.getElementById("import-settings");
        const importInput = document.getElementById("import-file-input");
        if (importBtn && importInput) {
            importBtn.addEventListener("click", () => importInput.click());
            importInput.addEventListener("change", () => this.importSettings(importInput.files[0]));
        }

        // Storage management
        const clearStorageBtn = document.getElementById("clear-storage-btn");
        if (clearStorageBtn) {
            clearStorageBtn.addEventListener("click", async () => {
                if (confirm("⚠️ This will permanently delete ALL data in LocalStorage (Codex entries, drafts, and settings) AND the IndexedDB database. Continue?")) {
                    window.StorageHelper.clearAll();
                    if ('indexedDB' in window) {
                        await new Promise(resolve => {
                            const req = indexedDB.deleteDatabase("CodexDB");
                            req.onsuccess = req.onerror = req.onblocked = resolve;
                        });
                    }
                    this.updateStorageInfo();
                    alert("LocalStorage and IndexedDB cleared.");
                    location.reload();
                }
            });
        }

        const storageHeader = document.querySelector('[data-section="storage"] .section-header');
        if (storageHeader) storageHeader.addEventListener("click", () => setTimeout(() => this.updateStorageInfo(), 200));
    },

    openSettings() {
        document.getElementById("settings-overlay")?.classList.add("visible");
        document.getElementById("settings-panel")?.classList.add("visible");
    },

    closeSettings() {
        document.getElementById("settings-overlay")?.classList.remove("visible");
        document.getElementById("settings-panel")?.classList.remove("visible");
    },

    setTheme(value) {
        this.settings.theme = value;
        this.saveSettings();
        this.applyTheme();
    },

    applyTheme() {
        const body = document.body;
        if (this.settings.theme === "auto") {
            body.removeAttribute("data-theme");
        } else {
            body.dataset.theme = this.settings.theme;
        }
        const radio = document.querySelector(`input[name='theme'][value='${this.settings.theme}']`);
        if (radio) radio.checked = true;
    },

    resetTheme() {
        this.setTheme("auto");
    },

    setFontSize(value) {
        this.settings.fontSize = value;
        this.saveSettings();
        this.applyFontSize();
    },

    applyFontSize() {
        document.body.dataset.fontSize = this.settings.fontSize;
        const radio = document.querySelector(`input[name='font-size'][value='${this.settings.fontSize}']`);
        if (radio) radio.checked = true;
    },

    resetFont() {
        this.setFontSize("medium");
    },

    setHighContrast(value) {
        this.settings.highContrast = value;
        this.saveSettings();
        this.applyAccessibility();
    },

    setCompactMode(value) {
        this.settings.compactMode = value;
        this.saveSettings();
        this.applyAccessibility();
    },

    setCustomAccent(value) {
        this.settings.customAccent = value;
        this.saveSettings();
        this.applyCustomAccent();
    },

    applyCustomAccent() {
        document.documentElement.style.setProperty('--accent-color', this.settings.customAccent);
    },

    applyAccessibility() {
        const body = document.body;
        body.dataset.highContrast = String(this.settings.highContrast);
        body.dataset.compactMode = String(this.settings.compactMode);

        const highContrastToggle = document.getElementById("high-contrast-toggle");
        const compactModeToggle = document.getElementById("compact-mode-toggle");
        if (highContrastToggle) highContrastToggle.checked = this.settings.highContrast;
        if (compactModeToggle) compactModeToggle.checked = this.settings.compactMode;
    },

    resetAccessibility() {
        this.setHighContrast(false);
        this.setCompactMode(false);
    },

    resetAll() {
        this.settings = { ...this.defaults };
        this.saveSettings();
        this.applySettings();
    },

    exportSettings() {
        const data = JSON.stringify(this.settings, null, 4);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "settings.json";
        a.click();
        URL.revokeObjectURL(url);
    },

    async importSettings(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);
                this.settings = { ...this.defaults, ...imported };
                this.saveSettings();
                this.applySettings();
                alert("Settings imported successfully.");
            } catch {
                alert("Invalid settings file.");
            }
        };
        reader.readAsText(file);
    },

    async updateStorageInfo() {
        const progressBar = document.getElementById("storage-progress-bar");
        const detailsEl = document.getElementById("storage-details");

        let usedBytes = 0;
        let quotaBytes = 5242880; // 5 MB fallback
        let isEstimate = false;

        if ('storage' in navigator && typeof navigator.storage.estimate === 'function') {
            try {
                const estimate = await navigator.storage.estimate();
                usedBytes = estimate.usage || 0;
                quotaBytes = estimate.quota || 5242880;
                isEstimate = true;
            } catch (e) {
                usedBytes = window.StorageHelper.getSize();
            }
        } else {
            usedBytes = window.StorageHelper.getSize();
        }

        const usedKB = Math.round(usedBytes / 1024);
        const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(1);
        const percent = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            progressBar.style.backgroundColor = percent >= 80 ? "#e74c3c" : percent >= 50 ? "#f39c12" : "#2ecc71";
        }

        if (detailsEl) {
            let text = `<strong>${usedKB} KB</strong> of ${quotaMB} MB (${percent}%)`;
            if (isEstimate) text += ` <span style="font-size:0.8em;color:#666;">(IndexedDB + localStorage)</span>`;
            detailsEl.innerHTML = text;

            // NEW: Storage limit warning for IndexedDB exploration
            if (percent >= 80) {
                detailsEl.style.color = "#d9534f";
                console.warn(`[Settings] Storage usage high: ${percent}% – consider clearing data`);
            }
        }
    }
};

// Global exposure for existing calls
window.initSettings = () => SettingsManager.init();