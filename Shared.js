// Shared.js
// Handles global navigation, settings panel loading, accessibility, PWA install prompt, and version badge.

(function () {

    const APP_VERSION = "v1.2";

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

    function renderVersionBadge() {
        const header = document.querySelector("header");
        if (!header) return;

        // Prevent duplicate badges
        if (header.querySelector(".version-badge")) return;

        const badge = document.createElement("span");
        badge.className = "version-badge";
        badge.textContent = APP_VERSION;
        badge.setAttribute("title", `Codex ${APP_VERSION}`);

        const settingsBtn = document.getElementById("settings-button");
        if (settingsBtn) {
            header.insertBefore(badge, settingsBtn);
        } else {
            header.appendChild(badge);
        }
    }

    /* -----------------------------
       PWA INSTALL PROMPT
    ----------------------------- */
    let deferredPrompt = null;

    function showInstallPrompt() {
        // Already dismissed permanently by user
        if (window.StorageHelper.safeGetItem("installPromptDismissed") === "true") {
            return;
        }

        const promptEl = document.createElement("div");
        promptEl.className = "install-prompt show";
        promptEl.innerHTML = `
            <span>📲 Install Codex for a better offline experience</span>
            <button id="install-app-btn">Install</button>
            <button id="dismiss-install-btn" class="dismiss" aria-label="Dismiss install prompt">✕</button>
        `;

        document.body.appendChild(promptEl);

        const installBtn = promptEl.querySelector("#install-app-btn");
        const dismissBtn = promptEl.querySelector("#dismiss-install-btn");

        installBtn.addEventListener("click", () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    console.log(`[PWA] Install prompt outcome: ${choiceResult.outcome}`);
                    deferredPrompt = null;
                });
            }
            promptEl.remove();
        });

        dismissBtn.addEventListener("click", () => {
            promptEl.remove();
            window.StorageHelper.safeSetItem("installPromptDismissed", "true");
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
       INITIALIZATION
    ----------------------------- */
    document.addEventListener("DOMContentLoaded", () => {
        createNav();
        renderVersionBadge();

        if (typeof window.initSettings === "function") {
            window.initSettings();
        }

        // PWA Service Worker registration (enables offline caching + background sync)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('[Shared] Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('[Shared] Service Worker registration failed:', error);
                });
        }

        // PWA Install Prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] beforeinstallprompt fired');
            e.preventDefault();
            deferredPrompt = e;
            showInstallPrompt();
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
        });
    });

})();