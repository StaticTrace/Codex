// Shared.js
// Handles global navigation, settings panel loading, and accessibility.

(function () {

    /* -----------------------------
       GLOBAL NAVIGATION
    ----------------------------- */
    function createNav() {
        const nav = document.getElementById("global-nav");
        if (!nav) return;

        nav.innerHTML = "";

        const list = document.createElement("ul");
        list.className = "global-nav-list";

        function addLink(text, href) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = text;
            a.href = href;
            li.appendChild(a);
            list.appendChild(li);
        }

        addLink("Home", "Home.html");
        addLink("Codex", "Codex.html");

        nav.appendChild(list);
    }

    /* -----------------------------
       SAFE FETCH (OFFLINE-FRIENDLY)
    ----------------------------- */
    function safeFetch(url) {
        return fetch(url).catch(() => {
            console.warn("Offline: could not load", url);
            return Promise.resolve({ ok: false, text: () => "" });
        });
    }

    /* -----------------------------
       SETTINGS PANEL LOADING
    ----------------------------- */
    function loadSettingsPanel() {
        const panelContainer = document.getElementById("global-settings");
        if (!panelContainer) return;

        safeFetch("SettingsPanel.html")
            .then(response => {
                if (!response.ok) throw new Error("Failed to load settings panel");
                return response.text();
            })
            .then(html => {
                panelContainer.innerHTML = html;

                // Initialize settings logic if available
                if (typeof window.initSettings === "function") {
                    window.initSettings();
                }
            })
            .catch(err => {
                console.error("Error loading settings panel:", err);
            });
    }

    /* -----------------------------
       INITIALIZATION
    ----------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        createNav();
        loadSettingsPanel();
    });

})();