# Simple PWA — Progressive Web App Demo

## What is a PWA?

A **Progressive Web App (PWA)** is a regular website that can behave like a native
app on your phone or computer. It uses standard web technologies (HTML, CSS, JavaScript)
but adds a few extra pieces so the browser knows it can be "installed" and even work
**offline**.

### Why do PWAs exist?

| Problem                                                         | PWA solution                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Users don't want to install apps from a store for every website | PWAs can be "installed" straight from the browser — no app store needed            |
| Websites break when there's no internet                         | A **service worker** caches files so the app still loads offline                   |
| Websites don't feel "app-like" (address bar, tabs, etc.)        | The **manifest** tells the OS to open the PWA in its own window, with its own icon |

### The three pillars of a PWA

```
 ┌──────────────────────────────────────────┐
 │              Your Website                │
 │         (HTML + CSS + JS)                │
 └────────┬────────────────┬────────────────┘
          │                │
   ┌──────▼──────┐  ┌─────▼──────────┐
   │  manifest   │  │ service worker │
   │  .json      │  │ .js            │
   └─────────────┘  └────────────────┘
```

1. **The website itself** — just normal HTML, CSS and JavaScript.
2. **`manifest.json`** — a small JSON file that describes your app (name, icons,
   colours, how it should launch). This is what makes the browser show the
   _"Add to Home Screen"_ prompt.
3. **Service Worker** — a JavaScript file that runs _in the background_, separate
   from the page. It can **intercept network requests** and serve cached files,
   which is how the app works offline.

---

## Project structure

```
STUW2-SW5-PWA/
├── index.html          ← Home page (with install button)
├── apis.html           ← Fetches & caches live API data for offline use
├── about.html          ← Explains how the PWA works
├── style.css           ← Styling
├── app.js              ← Registers SW + install-button logic
├── service-worker.js   ← Caches files & API responses for offline use
├── manifest.json       ← Tells the browser "this is an installable app"
├── icons/
│   ├── icon-192.png    ← Home-screen icon (192×192)
│   └── icon-512.png    ← Splash-screen icon (512×512)
└── README.md           ← You are here
```

---

## How each file works

### `manifest.json`

```jsonc
{
  "name": "Simple PWA Demo",       // Full name shown during install
  "short_name": "SimplePWA",       // Shown under the home-screen icon
  "start_url": "/index.html",      // Page to open when the app launches
  "display": "standalone",         // Hide browser chrome → looks like an app
  "background_color": "#ffffff",   // Colour while the app is loading
  "theme_color": "#4a90d9",        // Toolbar / status-bar colour
  "icons": [ ... ]                 // At least 192×192 and 512×512
}
```

Key fields:

- **`display`** — `"standalone"` removes the browser address bar.
  Other options: `"fullscreen"`, `"minimal-ui"`, `"browser"`.
- **`start_url`** — where the app opens. Usually `"/"` or `"/index.html"`.
- **`icons`** — the browser needs at least a 192px and a 512px icon.

### `service-worker.js`

The service worker has three lifecycle events:

| Event        | When it fires                                                    | What we do                                        |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------- |
| **install**  | First time the SW is registered (or when the cache name changes) | Open a cache and store all the app shell files    |
| **activate** | After install, when the new SW takes control                     | Delete old caches that have a different name      |
| **fetch**    | Every time the page makes a network request                      | Route to the correct caching strategy (see below) |

#### Two caching strategies

This app uses **two different strategies** depending on what is being fetched:

```
  Incoming request
       │
       ▼
  Is it an API call?  ──yes──▶  NETWORK-FIRST
  (freepublicapis.com)          Try network → cache response → fall back to cache
       │
       no
       ▼
  CACHE-FIRST
  Try cache → fall back to network
```

| Strategy          | Used for                         | How it works                                                                                               |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Cache-First**   | App shell (HTML, CSS, JS, icons) | Serve from cache instantly; only go to network if not cached. Fast and reliable.                           |
| **Network-First** | External API calls               | Try the network to get fresh data; save a copy in the cache. When offline, serve the last cached response. |

**Why two strategies?** Static files (HTML, CSS, JS) rarely change, so serving
them from the cache is fast and safe. API data changes frequently, so we want
the latest version when online — but we still keep a cached copy for offline.

All three pages (`index.html`, `apis.html`, `about.html`) are listed in
`FILES_TO_CACHE`, so navigating between them works offline.

### `apis.html` — dynamic data that works offline

This page fetches 10 public APIs from
`https://www.freepublicapis.com/api/apis?limit=10&sort=best` and renders them
as cards. Here's the flow:

```
  Page loads
       │
       ▼
  fetch(API_URL)  ──────────────────────────────────┐
       │                                             │
       │  (service worker intercepts)                │
       ▼                                             │
  Network available?                                 │
       │                                             │
   ┌───┴───┐                                         │
  yes      no                                        │
   │        │                                        │
   ▼        ▼                                        │
  Fetch   Return cached                              │
  from    response (from                             │
  network last visit)                                │
   │                                                 │
   ├─▶ Cache the fresh response for next time        │
   │                                                 │
   ▼                                                 ▼
  Page renders the JSON as cards
```

The page itself doesn't need to know about caching — the **service worker
handles it transparently**. The `fetch()` call in `apis.html` is a normal
fetch; the service worker decides whether to go to the network or the cache.

### `app.js`

This file does two things:

1. **Registers the service worker** — `navigator.serviceWorker.register(...)`.
2. **Handles the install button** — see below.

### The install button (`beforeinstallprompt`)

Browsers fire a `beforeinstallprompt` event when a PWA meets the install
criteria (manifest + service worker + HTTPS). We capture that event and use it
to show our own install button:

```
  ┌───────────────────────────────────────────────────────┐
  │  Page loads                                           │
  │       ↓                                               │
  │  Is the app already installed?                        │
  │  (display-mode: standalone / navigator.standalone)    │
  │       ↓              ↓                                │
  │      yes             no                               │
  │       ↓              ↓                                │
  │  Show button as   Wait for "beforeinstallprompt"      │
  │  greyed-out:      event from the browser.             │
  │  "Already         │                                   │
  │   installed"      ↓                                   │
  │                We call e.preventDefault() to stop     │
  │                the default mini-bar, stash the event. │
  │                       ↓                               │
  │                Un-hide the "Install this app" button. │
  │                       ↓                               │
  │                User clicks → deferredPrompt.prompt()  │
  │                → browser shows native install dialog. │
  │                       ↓                               │
  │                On success → grey out the button.      │
  └───────────────────────────────────────────────────────┘
```

**Already-installed detection:** The app checks `window.matchMedia('(display-mode: standalone)')` 
and `navigator.standalone` (iOS Safari). If either is true the button is shown 
disabled with the label "Already installed" instead of being hidden.

**Note:** `beforeinstallprompt` is supported in Chromium-based browsers (Chrome,
Edge, Samsung Internet). Safari and Firefox handle installation differently —
Safari uses "Add to Home Screen" in the share menu, and Firefox on Android has
its own prompt.

### `index.html` / `apis.html` / `about.html`

The important PWA-specific parts in every page are:

```html
<!-- Link to the manifest -->
<link rel="manifest" href="manifest.json" />

<!-- Theme colour for the browser toolbar -->
<meta name="theme-color" content="#4a90d9" />

<!-- iOS-specific tags (Safari doesn't fully support manifest.json yet) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<link rel="apple-touch-icon" href="icons/icon-192.png" />
```

Each page includes a `<nav>` with plain `<a>` links. Because the service worker
caches all pages, clicking those links works offline — no JavaScript routing
framework needed.

---

## How to run it

A PWA **must** be served over HTTPS (or `localhost`). You can't just open
`index.html` as a file — the service worker won't register.

### Option 1 — Python (built-in on macOS / Linux)

```bash
# From the project folder:
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

### Option 2 — Node.js (`npx serve`)

```bash
npx serve .
```

### Option 3 — VS Code Live Server extension

Install the **Live Server** extension, right-click `index.html` → _Open with
Live Server_.

---

## How to verify it works

1. Open the app in **Chrome** or **Edge**.
2. Open **DevTools → Application** tab.
3. You should see:
   - **Manifest** section showing your app info and icons.
   - **Service Workers** section showing `service-worker.js` as _activated and
     running_.
   - **Cache Storage** containing `simple-pwa-v3` with all your files.
4. Click the **Install this app** button — the browser shows a native install
   dialog. After installing, the app opens in its own window without browser
   chrome.
5. Navigate to **APIs** — you should see 10 API cards loaded from the network.
6. In DevTools → Network, tick **Offline**, then:
   - Reload the APIs page — the cards still appear (served from cache).
   - Navigate to **Home** and **About** — all pages still work.

### Install button on different devices

| Platform                    | Behaviour                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Chrome / Edge (desktop)** | The install button appears. An install icon also shows in the address bar.                  |
| **Chrome (Android)**        | The install button appears. You may also see a bottom banner.                               |
| **Safari (iOS)**            | `beforeinstallprompt` is **not** supported. Users tap _Share → Add to Home Screen_ instead. |
| **Firefox (Android)**       | Firefox shows its own install prompt; `beforeinstallprompt` is not supported.               |

---

## Summary: minimum requirements for a PWA

| Requirement                               | Why                                        |
| ----------------------------------------- | ------------------------------------------ |
| Served over **HTTPS** (or localhost)      | Service workers only run on secure origins |
| A **`manifest.json`** linked from HTML    | Tells the browser the app is installable   |
| At least one **icon** (192×192 px)        | Needed for the home screen                 |
| A **service worker** that handles `fetch` | Provides offline capability                |

That's it — with these four things any website becomes a PWA.
