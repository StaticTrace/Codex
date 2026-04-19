const Settings = {
    theme: "auto",
    fontSize: "medium",
    highContrast: false,
    compactMode: false
};

function initSettings() {
    loadSettings();
    applySettings();
    setupSettingsUI();
}

function setupSettingsUI() {
    const overlay = document.getElementById("settings-overlay");
    const panel = document.getElementById("settings-panel");
    const closeBtn = document.getElementById("settings-close");
    const settingsButton = document.getElementById("settings-button");

    if (!overlay || !panel || !closeBtn || !settingsButton) {
        return;
    }

    settingsButton.addEventListener("click", openSettings);
    closeBtn.addEventListener("click", closeSettings);
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeSettings();
        }
    });

    document.querySelectorAll(".section-header").forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            const arrow = header.querySelector(".arrow");
            if (!body || !arrow) {
                return;
            }
            body.classList.toggle("hidden");
            arrow.classList.toggle("rotated");
        });
    });

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

    document.querySelectorAll("input[name='theme']").forEach(radio => {
        radio.addEventListener("change", () => {
            setTheme(radio.value);
        });
    });

    document.querySelectorAll("input[name='font-size']").forEach(radio => {
        radio.addEventListener("change", () => {
            setFontSize(radio.value);
        });
    });

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

    const resetThemeBtn = document.getElementById("reset-theme");
    if (resetThemeBtn) {
        resetThemeBtn.addEventListener("click", resetTheme);
    }

    const resetFontBtn = document.getElementById("reset-font");
    if (resetFontBtn) {
        resetFontBtn.addEventListener("click", resetFont);
    }

    const resetAccessibilityBtn = document.getElementById("reset-accessibility");
    if (resetAccessibilityBtn) {
        resetAccessibilityBtn.addEventListener("click", resetAccessibility);
    }

    const resetAllBtn = document.getElementById("reset-settings");
    if (resetAllBtn) {
        resetAllBtn.addEventListener("click", resetAllSettings);
    }

    const exportBtn = document.getElementById("export-settings");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportSettings);
    }

    const importBtn = document.getElementById("import-settings");
    const importInput = document.getElementById("import-file-input");

    if (importBtn && importInput) {
        importBtn.addEventListener("click", () => importInput.click());
        importInput.addEventListener("change", () => {
            const file = importInput.files[0];
            if (!file) {
                return;
            }
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

    // Storage management setup
    const clearStorageBtn = document.getElementById("clear-storage-btn");
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener("click", () => {
            if (confirm("⚠️ This will PERMANENTLY delete ALL data stored in LocalStorage:\n• Codex entries\n• Drafts\n• Settings\n\nAre you absolutely sure?")) {
                if (confirm("Final confirmation: This cannot be undone. Proceed?")) {
                    try {
                        localStorage.clear();
                        alert("✅ LocalStorage has been cleared successfully.");
                        window.location.reload(true);
                    } catch (e) {
                        alert("Failed to clear storage: " + e.message);
                    }
                }
            }
        });
    }
}

function openSettings() {
    const overlay = document.getElementById("settings-overlay");
    const panel = document.getElementById("settings-panel");
    if (!overlay || !panel) {
        return;
    }
    overlay.classList.add("visible");
    panel.classList.add("visible");

    // Update storage usage every time settings are opened
    if (typeof updateStorageUsage === "function") {
        updateStorageUsage();
    }
}

function closeSettings() {
    const overlay = document.getElementById("settings-overlay");
    const panel = document.getElementById("settings-panel");
    if (!overlay || !panel) {
        return;
    }
    overlay.classList.remove("visible");
    panel.classList.remove("visible");
}

function applySettings() {
    applyTheme();
    applyFontSize();
    applyAccessibility();
}

function setTheme(value) {
    Settings.theme = value;
    saveSettings();
    applyTheme();
}

function applyTheme() {
    if (Settings.theme === "auto") {
        document.body.removeAttribute("data-theme");
    } else {
        document.body.dataset.theme = Settings.theme;
    }

    const radio = document.querySelector(
        `input[name='theme'][value='${Settings.theme}']`
    );
    if (radio) {
        radio.checked = true;
    }
}

function resetTheme() {
    setTheme("auto");
}

function setFontSize(value) {
    Settings.fontSize = value;
    saveSettings();
    applyFontSize();
}

function applyFontSize() {
    document.body.dataset.fontSize = Settings.fontSize;

    const radio = document.querySelector(
        `input[name='font-size'][value='${Settings.fontSize}']`
    );
    if (radio) {
        radio.checked = true;
    }
}

function resetFont() {
    setFontSize("medium");
}

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
    document.body.dataset.highContrast = String(Settings.highContrast);
    document.body.dataset.compactMode = String(Settings.compactMode);

    const highContrastToggle = document.getElementById("high-contrast-toggle");
    const compactModeToggle = document.getElementById("compact-mode-toggle");

    if (highContrastToggle) {
        highContrastToggle.checked = Settings.highContrast;
    }
    if (compactModeToggle) {
        compactModeToggle.checked = Settings.compactMode;
    }
}

function resetAccessibility() {
    setHighContrast(false);
    setCompactMode(false);
}

function resetAllSettings() {
    Settings.theme = "auto";
    Settings.fontSize = "medium";
    Settings.highContrast = false;
    Settings.compactMode = false;
    saveSettings();
    applySettings();
}

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

function saveSettings() {
    localStorage.setItem("userSettings", JSON.stringify(Settings));
}

function loadSettings() {
    const saved = localStorage.getItem("userSettings");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(Settings, parsed);
        } catch {
            localStorage.removeItem("userSettings");
        }
    }
}

function updateStorageUsage() {
    const container = document.getElementById("storage-info-container");
    if (!container) return;

    let totalBytes = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                totalBytes += (key.length + (value ? value.length : 0)) * 2;
            }
        }
    } catch (e) {
        console.warn("Could not calculate storage usage", e);
    }

    const QUOTA_BYTES = 5 * 1024 * 1024;
    const percent = Math.min(100, Math.round((totalBytes / QUOTA_BYTES) * 100));
    const usedKB = (totalBytes / 1024).toFixed(1);
    const quotaMB = (QUOTA_BYTES / (1024 * 1024)).toFixed(0);

    document.getElementById("storage-details").innerHTML = `Used: <strong>${usedKB} KB</strong> / ${quotaMB} MB <span style="color: #666">(${percent}% full)</span>`;

    const progressBar = document.getElementById("storage-progress-bar");
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}