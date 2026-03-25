// ── Register the service worker ─────────────
const statusEl = document.getElementById("status");
const offlineEl = document.getElementById("offline-note");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      console.log("SW registered, scope:", registration.scope);
      if (statusEl) {
        statusEl.textContent = "Service worker active — app works offline.";
        statusEl.classList.add("ok");
      }
    })
    .catch((err) => {
      console.error("SW registration failed:", err);
      if (statusEl) {
        statusEl.textContent = "Service worker registration failed.";
        statusEl.classList.add("no");
      }
    });
} else {
  if (statusEl) {
    statusEl.textContent = "Service workers are not supported in this browser.";
    statusEl.classList.add("no");
  }
}

// ── Install button ──────────────────────────
// The browser fires "beforeinstallprompt" when the PWA meets install criteria.
// We capture the event so we can trigger the native install dialog from our own button.
let deferredPrompt;
const installBtn = document.getElementById("install-btn");

// Check if the app is already installed (launched in standalone / twa mode).
function isAppInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    navigator.standalone === true // iOS Safari
  );
}

function markAsInstalled() {
  if (!installBtn) return;
  installBtn.hidden = false;
  installBtn.disabled = true;
  installBtn.textContent = "Already installed";
  deferredPrompt = null;
}

// If the app is already running as an installed PWA, grey out immediately.
if (isAppInstalled()) {
  markAsInstalled();
}

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the default mini-infobar on mobile.
  e.preventDefault();
  // Stash the event so we can use it when the user clicks our button.
  deferredPrompt = e;
  // Show our custom install button.
  if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    // Show the browser's native install prompt.
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Install prompt outcome:", outcome);
    // The prompt can only be used once.
    deferredPrompt = null;
    markAsInstalled();
  });
}

// Grey out the button once the app has been installed.
window.addEventListener("appinstalled", () => {
  console.log("App installed");
  markAsInstalled();
});

// ── Show / hide the offline banner ──────────
function updateOnlineStatus() {
  if (offlineEl) offlineEl.hidden = navigator.onLine;
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();
