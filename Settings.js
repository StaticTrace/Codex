/* ============================================================
   SETTINGS MODULE
   Handles: theme, font size, accessibility, import/export,
   collapsible sections, search, persistence, and UI updates.
============================================================ */

const Settings = {
    theme: "auto",
    fontSize: "medium",
    highContrast: false,
    compactMode: false
};

/* ============================================================
   INITIALIZATION
============================================================ */
function initSettings() {
    loadSettings();
    applySettings();
    attachEventListeners();
}

/* ============================================================
   EVENT LISTENERS
============================================================ */
function attachEventListeners() {
    const overlay = document.getElementById("settings-overlay");
    const panel = document.getElementById("settings-panel");
    const closeBtn = document.getElementById("settings-close");
    const settingsButton = document.getElementById("settings-button");

    if (!overlay || !panel || !closeBtn || !settingsButton) return;

    /* OPEN / CLOSE PANEL */
    settingsButton.addEventListener("click", openSettings);
    closeBtn.addEventListener("click", closeSettings);
    overlay.addEventListener("click", closeSettings);

    /* COLLAPSIBLE SECTIONS */
    document.querySelectorAll(".section-header").forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            const arrow = header.querySelector(".arrow");

            body.classList.toggle("hidden");
            arrow.classList.toggle("rotated");
        });
    });

    /* SEARCH FILTER */
    const searchInput = document.getElementById("settings-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const term = searchInput.value.toLowerCase();

            document.querySelectorAll(".settings-section").forEach(section => {
                const text = section.innerText.toLowerCase();
                section.style.display = text.includes(term) ? "" : "none";
            });
        });
    }

    /* THEME RADIO BUTTONS */
    document.querySelectorAll("input[name='theme']").forEach(radio => {
        radio.addEventListener("change", () => {
            Settings.theme = radio.value;
            saveSettings();
            applyTheme();
        });
    });

    /* FONT SIZE RADIO BUTTONS */
    document.querySelectorAll("input[name='font-size']").forEach(radio => {
        radio.addEventListener("change", () => {
            Settings.fontSize = radio.value;
            saveSettings();
            applyFontSize();
        });
    });

    /* ACCESSIBILITY TOGGLES */
    const highContrastToggle = document.getElementById("high-contrast-toggle");
    const compactModeToggle = document.getElementById("compact-mode-toggle");

    if (highContrastToggle) {
        highContrastToggle.addEventListener("change", () => {
            Settings.highContrast = highContrastToggle.checked;
            saveSettings();
            applyAccessibility();
        });
    }

    if (compactModeToggle) {
        compactModeToggle.addEventListener("change", () => {
            Settings.compactMode = compactModeToggle.checked;
            saveSettings();
            applyAccessibility();
        });
    }

    /* RESET BUTTONS */
    document.getElementById("reset-theme")?.addEventListener("click", resetTheme);
    document.getElementById("reset-font")?.addEventListener("click", resetFont);
    document.getElementById("reset-accessibility")?.addEventListener("click", resetAccessibility);
    document.getElementById("reset-settings")?.addEventListener("click", resetAllSettings);

    /* ADVANCED: EXPORT SETTINGS */
    document.getElementById("export-settings")?.addEventListener("click", () => {
        const data = JSON.stringify(Settings, null, 4);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "settings.json";
        a.click();

        URL.revokeObjectURL(url);
    });

    /* ADVANCED: IMPORT SETTINGS */
    const importBtn = document.getElementById("import-settings");
    const importInput = document.getElementById("import-file-input");

    if (importBtn && importInput) {
        importBtn.addEventListener("click", () => importInput.click());

        importInput.addEventListener("change", () => {
            const file = importInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const imported = JSON.parse(reader.result);
                    Object.assign(Settings, imported);
                    saveSettings();
                    applySettings();
                } catch (e) {
                    alert("Invalid settings file.");
                }
            };
            reader.readAsText(file);
        });
    }
}

/* ============================================================
   OPEN / CLOSE PANEL
============================================================ */
function openSettings() {
    document.getElementById("settings-overlay").classList.remove("hidden");
    document.getElementById("settings-panel").classList.remove("hidden");
}

function closeSettings() {
    document.getElementById("settings-overlay").classList.add("hidden");
    document.getElementById("settings-panel").classList.add("hidden");
}

/* ============================================================
   APPLY SETTINGS TO UI
============================================================ */
function applySettings() {
    applyTheme();
    applyFontSize();
    applyAccessibility();
}

/* ============================================================
   THEME LOGIC
============================================================ */
function applyTheme() {
    document.body.dataset.theme = Settings.theme;
}

function resetTheme() {
    Settings.theme = "auto";
    saveSettings();
    applyTheme();
    document.querySelector("input[name='theme'][value='auto']").checked = true;
}

/* ============================================================
   FONT SIZE LOGIC
============================================================ */
function applyFontSize() {
    document.body.dataset.fontSize = Settings.fontSize;
}

function resetFont() {
    Settings.fontSize = "medium";
    saveSettings();
    applyFontSize();
    document.querySelector("input[name='font-size'][value='medium']").checked = true;
}

/* ============================================================
   ACCESSIBILITY LOGIC
============================================================ */
function applyAccessibility() {
    document.body.dataset.highContrast = Settings.highContrast;
    document.body.dataset.compactMode = Settings.compactMode;

    document.getElementById("high-contrast-toggle").checked = Settings.highContrast;
    document.getElementById("compact-mode-toggle").checked = Settings.compactMode;
}

function resetAccessibility() {
    Settings.highContrast = false;
    Settings.compactMode = false;
    saveSettings();
    applyAccessibility();
}

/* ============================================================
   RESET ALL SETTINGS
============================================================ */
function resetAllSettings() {
    Settings.theme = "auto";
    Settings.fontSize = "medium";
    Settings.highContrast = false;
    Settings.compactMode = false;

    saveSettings();
    applySettings();
}

/* ============================================================
   LOCAL STORAGE
============================================================ */
function saveSettings() {
    localStorage.setItem("userSettings", JSON.stringify(Settings));
}

function loadSettings() {
    const saved = localStorage.getItem("userSettings");
    if (saved) {
        Object.assign(Settings, JSON.parse(saved));
    }
}
