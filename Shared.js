// Shared.js
// Handles global navigation, settings panel loading, modal behavior, and accessibility.

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

                setupModalBehavior();
            })
            .catch(err => {
                console.error("Error loading settings panel:", err);
            });
    }

    /* -----------------------------
       SETTINGS BUTTON + MODAL LOGIC
    ----------------------------- */
    function setupSettingsButton() {
        const button = document.getElementById("settings-button");
        const panelContainer = document.getElementById("global-settings");
        if (!button || !panelContainer) return;

        button.addEventListener("click", () => {
            const isOpen = panelContainer.getAttribute("data-open") === "true";
            panelContainer.setAttribute("data-open", String(!isOpen));

            if (!isOpen) {
                panelContainer.focus();
            }
        });
    }

    /* -----------------------------
       MODAL BEHAVIOR (ESC, OVERLAY, FOCUS TRAP)
    ----------------------------- */
    function setupModalBehavior() {
        const panel = document.getElementById("settings-panel");
        const overlay = document.getElementById("settings-overlay");
        const container = document.getElementById("global-settings");

        if (!panel || !overlay || !container) return;

        /* Close modal */
        function closePanel() {
            container.setAttribute("data-open", "false");
        }

        /* ESC closes panel */
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                closePanel();
            }
        });

        /* Clicking overlay closes panel */
        overlay.addEventListener("click", () => {
            closePanel();
        });

        /* Auto-close when clicking navigation links */
        document.addEventListener("click", e => {
            if (e.target.tagName === "A") {
                closePanel();
            }
        });

        /* Focus trap */
        function trapFocus() {
            const focusable = panel.querySelectorAll(
                "button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
            );

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            panel.addEventListener("keydown", e => {
                if (e.key !== "Tab") return;

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });
        }

        trapFocus();
    }

    /* -----------------------------
       INITIALIZATION
    ----------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        createNav();
        setupSettingsButton();
        loadSettingsPanel();
    });

})();
