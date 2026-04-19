document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------
       LOAD GLOBAL NAVIGATION
    ----------------------------------------- */
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

    /* -----------------------------------------
       LOAD SETTINGS PANEL FROM SettingsPanel.html
    ----------------------------------------- */
    const settingsContainer = document.getElementById("global-settings");

    if (settingsContainer) {
        fetch("SettingsPanel.html")
            .then(response => response.text())
            .then(html => {
                settingsContainer.innerHTML = html;

                // Initialize settings logic AFTER the HTML loads
                initSettings();
            })
            .catch(err => console.error("Failed to load SettingsPanel.html", err));
    }

    /* -----------------------------------------
       SETTINGS LOGIC (runs AFTER panel loads)
    ----------------------------------------- */
    function initSettings() {
        const overlay = document.getElementById("settings-overlay");
        const panel = document.getElementById("settings-panel");
        const closeBtn = document.getElementById("settings-close");
        const settingsButton = document.getElementById("settings-button");

        if (!overlay || !panel || !closeBtn || !settingsButton) {
            console.warn("Settings panel elements not found.");
            return;
        }

        /* OPEN SETTINGS */
        function openSettings() {
            overlay.classList.remove("hidden");
            panel.classList.remove("hidden");
        }

        /* CLOSE SETTINGS */
        function closeSettings() {
            overlay.classList.add("hidden");
            panel.classList.add("hidden");
        }

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
    }
});
