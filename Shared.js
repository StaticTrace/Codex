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
       CENTRALIZED LOCALSTORAGE HELPER
    ----------------------------- */
    window.StorageHelper = {
        safeGetItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn("localStorage getItem failed:", e);
                return null;
            }
        },
        safeSetItem(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn("localStorage setItem failed:", e);
            }
        },
        safeRemoveItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn("localStorage removeItem failed:", e);
            }
        },
        getSize() {
            let total = 0;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    total += (key ? key.length : 0) + (value ? value.length : 0);
                }
                return total * 2; // UTF-16 bytes approximation
            } catch (e) {
                console.warn("localStorage usage detection failed:", e);
                return 0;
            }
        },
        clearAll() {
            try {
                localStorage.clear();
            } catch (e) {
                console.error("localStorage clear failed:", e);
            }
        }
    };

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