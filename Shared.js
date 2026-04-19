document.addEventListener("DOMContentLoaded", () => {
    // Load global navigation
    const nav = document.getElementById("global-nav");
    if (nav) {
        nav.innerHTML = `
            <ul>
                <li><a href="Home.html">🏠 Home</a></li>
                <li><a href="Index.html">📂 Shared Resources</a></li>
                <li><a href="Codex.html">📘 Codex</a></li>
            </ul>
        `;
    }

    // Load settings panel from SettingsPanel.html
    const settingsContainer = document.getElementById("global-settings");
    if (settingsContainer) {
        fetch("SettingsPanel.html")
            .then(response => response.text())
            .then(html => {
                settingsContainer.innerHTML = html;
                if (typeof initSettings === "function") {
                    initSettings();
                } else {
                    console.warn("initSettings is not defined. Ensure Settings.js is loaded.");
                }
            })
            .catch(err => console.error("Failed to load SettingsPanel.html", err));
    }
});
