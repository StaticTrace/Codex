/* ============================================================
   SETTINGS (Hybrid Style)
   - Uses a Settings object for storage
   - Uses simple helper functions for updates
   - Matches the clean, procedural style of your Codex project
============================================================ */

const Settings = {
    theme: "auto",
    fontSize: "medium",
    highContrast: false,
    compactMode: false
};

/* ============================================================
   INITIALIZATION
   Called by Shared.js AFTER SettingsPanel.html is loaded
============================================================ */
function initSettings() {
    loadSettings();
    applySettings();
    setupSettingsUI();
}

/* ============================================================
   SETUP UI EVENT LISTENERS
============================================================ */
function setupSettingsUI() {
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
            setTheme(radio.value);
        });
    });

    /* FONT SIZE RADIO BUTTONS */
    document.querySelectorAll("input[name='font-size']").forEach(radio => {
        radio.addEventListener("change", () => {
            setFontSize(radio.value);
        });
    });

    /* ACCESSIBILITY TOGGLES */
    const highContrastToggle = document.getElementById("high-contrast-toggle");
    const compactModeToggle = document.getElementById("compact-mode-toggle");

    if (highContrastToggle) {
        highContrastToggle.addEventListener("change", () => {
            setHighContrast(highContrastToggle.checked);
        });
    }

    if (compactModeToggle) {
        compactModeToggle.addEventListener("change", () => {
            setCompactMode(compactModeToggle.checked);
        });
    }

    /* RESET BUTTONS */
    document.getElementById("reset-theme")?.addEventListener("click", resetTheme);
    document.getElementById("reset-font")?.addEventListener("click", resetFont);
    document.getElementById("reset-accessibility")?.addEventListener("click", resetAccessibility);
    document.getElementById("reset-settings")?.addEventListener("click", resetAllSettings);

    /* ADVANCED: EXPORT SETTINGS */
    document.getElementById("export-settings")?.addEventListener("click", exportSettings);

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
                } catch {
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
   APPLY ALL SETTINGS
============================================================ */
function applySettings() {
    applyTheme();
    applyFontSize();
    applyAccessibility();
}

/* ============================================================
   THEME
============================================================ */
function setTheme(value) {
    Settings.theme = value;
    saveSettings();
    applyTheme();
}

function applyTheme() {
    document.body.dataset.theme = Settings.theme;

    const radio = document.querySelector(`input[name='theme'][value='${Settings.theme}']`);
    if (radio) radio.checked = true;
}

function resetTheme() {
    setTheme("auto");
}

/* ============================================================
   FONT SIZE
============================================================ */
function setFontSize(value) {
    Settings.fontSize = value;
    saveSettings();
    applyFontSize();
}

function applyFontSize() {
    document.body.dataset.fontSize = Settings.fontSize;

    const radio = document.querySelector(`input[name='font-size'][value='${Settings.fontSize}']`);
    if (radio) radio.checked = true;
}

function resetFont() {
    setFontSize("medium");
}

/* ============================================================
   ACCESSIBILITY
============================================================ */
function setHighContrast(value) {
    Settings.highContrast = value;
    saveSettings();
    applyAccessibility();
}

function setCompactMode(value) {
    Settings.compactMode = value;
    saveSettings();
    applyAccessibility();
}

function applyAccessibility() {
    document.body.dataset.highContrast = Settings.highContrast;
    document.body.dataset.compactMode = Settings.compactMode;

    document.getElementById("high-contrast-toggle").checked = Settings.highContrast;
    document.getElementById("compact-mode-toggle").checked = Settings.compactMode;
}

function resetAccessibility() {
    setHighContrast(false);
    setCompactMode(false);
}

/* ============================================================
   RESET ALL
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
   IMPORT / EXPORT
============================================================ */
function exportSettings() {
    const data = JSON.stringify(Settings, null, 4);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.json";
    a.click();

    URL.revokeObjectURL(url);
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
