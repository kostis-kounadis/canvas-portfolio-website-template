# 🔍 Canvas Portfolio Template — Full Codebase Audit

> **Scope:** `template/` (index.html, main.js, style.css, data.js, config.json), `admin/server/` (setup-server.js, generate-data.js), `admin/build-setup-app/src/` (App.tsx, Forms.tsx, Layout.tsx, AppSidebar.tsx, lib/store.ts)

---

## 🔴 CRITICAL BUGS & SILENT FAILURES

### BUG-01 — `applyConfig()` parameter shadowed by inner `const cfg`

- **File:** `template/main.js`
- **Location:** Lines 728–800 (`window.applyConfig` function)
- **Problem:** The function is declared as `window.applyConfig = function applyConfig(cfg)` — its parameter is named `cfg`. However, inside the body at **line 788**, a new `const cfg = window._siteConfigRaw || {}` is declared, which silently shadows the outer `cfg` parameter within the Phase 8 info-overlay block. This means the live hot-reload path reads from the global `window._siteConfigRaw` (the *just-committed* value) instead of the incoming argument, making the info overlay effect read the correct value by coincidence — but it's a latent bug that could break if call order ever changes.
- **Solution:** Rename the inner variable: `const infoCfgRaw = window._siteConfigRaw || {};` and update references to `infoCfgRaw` in that block.

---

### BUG-02 — Double assignment in `announce()` — `announcerEl = announcerEl = buildAnnouncer()`

- **File:** `template/main.js`
- **Location:** Line 417
- **Problem:** `if (!announcerEl) announcerEl = announcerEl = buildAnnouncer();` — the double assignment `announcerEl = announcerEl = buildAnnouncer()` is a no-op (right-hand `announcerEl` is `null` before the assignment completes), but it's a typo that implies unintended logic. While it works today, any linter or minifier that optimises `x = x = f()` differently could silently drop one assignment.
- **Solution:** `if (!announcerEl) announcerEl = buildAnnouncer();`

---

### BUG-03 — `isMobile` computed once at module load; never updates on resize

- **File:** `template/main.js`
- **Location:** Line 16 — `const isMobile = window.innerWidth < 768;`
- **Problem:** `isMobile` is a frozen constant evaluated on script load. If the user resizes from a mobile viewport to desktop (or vice versa, e.g. browser devtools, foldable phones, tablet orientation), the entire UI branching logic (`buildNav()`, `buildCategoryPanel()`, `buildLayoutPanel()`, `buildZoneContainers()`, `wireItemDragging()`, etc.) stays locked to the initial state. Likewise, `STAGE_WIDTH` and `STAGE_HEIGHT` are computed from `isMobile` and never updated.
- **Solution:** Add a `window.addEventListener('resize', debounce(reinit, 300))` that recalculates `isMobile` and rebuilds the relevant UI panels. Alternatively, rely on CSS media queries for responsive switching and remove the JS-side `isMobile` gate from structural decisions.

---

### BUG-04 — Race condition: `scatterItems()` runs before `window.mediaItems` can be undefined

- **File:** `template/main.js`
- **Location:** Lines 10–13 (guard), then `init()` at line 3292
- **Problem:** The IIFE guard at the top (`if (!Array.isArray(window.mediaItems)) return;`) exits early, but `preloadTotal` at line 3292 re-checks `Array.isArray(window.mediaItems)` inside `init()`. If `data.js` is deferred or fails to execute before `main.js`, the IIFE exits cleanly — but if `data.js` is removed from `index.html` by mistake, the user sees a blank screen with no warning. The preloader never initialises (`notifyAssetLoaded` stays `null`), the stage is empty, and the 5-second fallback timeout fires and removes the preloader — leaving no error state.
- **Solution:** After `scatterItems()`, add a check: `if (!stage.querySelectorAll('.media-item').length) { /* show "no media" empty state */ }`.

---

### BUG-05 — `setup-server.js` uses `fs.readFileSync` inside async HTTP handler

- **File:** `admin/server/setup-server.js`
- **Location:** Lines 107–109 (`GET /api/config`)
- **Problem:** The server uses `fs.readFileSync()` synchronously inside the Node.js async HTTP handler. Under load (e.g. the portfolio tab is open and polling config while the admin CMS is also saving), this blocks the entire event loop for the duration of the file read.
- **Solution:** Replace with `fs.promises.readFile()` inside the already-`async` handler.

---

### BUG-06 — Concurrent `POST /api/config` requests can corrupt `config.json`

- **File:** `admin/server/setup-server.js`
- **Location:** Lines 113–124
- **Problem:** The `store.ts` debounce (`400ms`) fires auto-saves, but nothing prevents two concurrent POST requests from interleaving their `writeFileSync` calls. If the user makes two rapid changes, the second save could begin while the first is mid-write, resulting in a truncated or partially-written `config.json`.
- **Solution:** Add a simple per-file write mutex (a `Promise` chain or a boolean `isSaving` flag on the server side) so writes are serialised.

---

### BUG-07 — `generate-data.js` regex for HTML tag replacement is too greedy — can corrupt `index.html`

- **File:** `admin/server/generate-data.js`
- **Location:** Lines 190–213 (SEO tag replacement)
- **Problem:** The replacements use patterns like `/<div class="nav-left">[\s\S]*?<\/div>/is`. The lazy wildcard will match the *first* closing `</div>` it encounters — but if `nav-left` contains nested elements (which it does after JS injects SVG logos), the regex will close on the *wrong* `</div>`. This produces a corrupted `index.html` on rebuild.
- **Solution:** Use a proper HTML parser (e.g. `cheerio`) for HTML mutation, or replace the `nav-left` regex with a placeholder comment `<!-- NAV_TITLE -->` and replace that instead.

---

### BUG-08 — Logo SVG fetched via `fetch()` with no timeout or abort

- **File:** `template/main.js`
- **Location:** Lines 1583–1621 (`buildSvg()` inside `buildNav()`)
- **Problem:** The SVG logo is fetched with a plain `fetch()` call with no `AbortController` or timeout. If the network request hangs (wrong path, slow server), the title zone shows an empty gap indefinitely — no loading skeleton, no fallback text.
- **Solution:** Add `AbortController` with a 5-second timeout and a fallback to render the text title if the fetch fails or is aborted.

---

### BUG-09 — `openInfoOverlay()` has a secondary `fetch('config.json')` with no deduplication

- **File:** `template/main.js`
- **Location:** Lines 1490–1505
- **Problem:** `infoLoaded` is not set to `true` before the fetch resolves — rapidly clicking INFO multiple times before the response arrives dispatches multiple concurrent fetches. The last-to-arrive response wins, which may not be the most recent.
- **Solution:** Set `infoLoaded = true` *before* the fetch (or use a separate `infoFetching` boolean to gate concurrent dispatches).

---

### BUG-10 — `store.ts` auto-save silently swallows errors

- **File:** `admin/build-setup-app/src/lib/store.ts`
- **Location:** Line 165 — `get().saveConfig().catch(() => {})`
- **Problem:** The debounced auto-save catches all errors with an empty handler. If the server is down, the save silently fails. `isDirty` remains `true`, but there is no user-facing error toast or retry. The user may close the browser thinking their config was saved.
- **Solution:** Surface failures via `set({ error: e.message })` so the UI header can display a "Save failed" warning.

---

### BUG-11 — `generate-data.js` does not HTML-escape values injected into `index.html`

- **File:** `admin/server/generate-data.js`
- **Location:** Lines 191–213 (all `html.replace(...)` calls)
- **Problem:** Values like `siteTitle`, `metaDescription`, and `author` are injected verbatim. If a field contains `"` or `<` (e.g. `title: 'My "Portfolio" <2024>'`), the generated HTML will be malformed, breaking meta parsers and social sharing previews.
- **Solution:** HTML-escape all interpolated values: `const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');`

---

## 🟡 CLEANUP & TECH DEBT

### DEBT-01 — `main.js` is a 3,353-line monolithic IIFE

- **File:** `template/main.js`
- **Location:** Entire file
- **Problem:** All functionality — config loading, theming, image effects, dragging, zooming, lightbox, layout, preloader, nav, categories, info overlay — is crammed into a single IIFE. There are no modules, no separation of concerns, and no unit-testable units.
- **Solution:** Split into ES modules: `theme.js`, `layout.js`, `media.js`, `nav.js`, `lightbox.js`, `config.js`. Use `<script type="module">` in `index.html`. This is a medium-term refactor, not a one-liner.

---

### DEBT-02 — `// Phase N:` comments indicate design-by-iteration, not coherent architecture

- **File:** `template/main.js`
- **Location:** Dispersed throughout (Phase 2, 3, 4, 5, 6, 7, 8, 9, 10, 12.5, 14)
- **Problem:** The codebase has grown through numbered "phases" that are all conflated in a single file. Phase labels are inconsistent (Phase 12.5 exists; Phase 11 and 13 are absent). Some "phase" comments are purely historical. This makes it hard for a new developer to know where to make a change.
- **Solution:** Strip the phase annotations and replace with meaningful section headers. Move each subsystem into its own function namespace or module.

---

### DEBT-03 — `wrapModule()` reads `siteConfig` from closure, not from a parameter

- **File:** `template/main.js`
- **Location:** Lines 34–60
- **Problem:** `wrapModule(el)` reads `siteConfig.module_prefix` and `siteConfig.module_suffix` directly from the closure. This is fine at init time, but if called during a hot-reload *before* `mapConfig` has updated `siteConfig`, the old prefix/suffix is used.
- **Solution:** Accept prefix/suffix as arguments: `wrapModule(el, prefix, suffix)` for purity and testability.

---

### DEBT-04 — Duplicated inline defaults in `Forms.tsx` across 15+ handlers

- **File:** `admin/build-setup-app/src/components/Forms.tsx`
- **Location:** Lines 1028, 1052, 1074, 1088 (and similar for `imageEffects`, `imageClick`)
- **Problem:** Every `onCheckedChange` handler contains inline default initialisation like `if (!c.theme.imageShadow) c.theme.imageShadow = { enabled: true, opacity: 0.06, blur: 30, color: '#000000' };`. These magic defaults are scattered across 15+ callbacks. If a default changes, it must be updated in all copies.
- **Solution:** Extract a single `getDefaultConfig()` helper in `store.ts` or a `defaults.ts` file. Use `deepMerge(defaults, incoming)` on load.

---

### DEBT-05 — `SiteConfig` TS interface does not match `config.json` schema in a verifiable way

- **File:** `admin/build-setup-app/src/lib/store.ts`
- **Location:** Lines 3–106 (`SiteConfig` interface)
- **Problem:** The TS interface, the JSON on disk, and the `mapConfig()` bridge in `main.js` are three separate schema definitions maintained manually. A mismatch is not caught at compile or runtime — it silently falls back via `?.` chains.
- **Solution:** Generate a shared JSON Schema from the TS interface (via `ts-json-schema-generator`) and validate on save (server) and on load (client) using `ajv`.

---

### DEBT-06 — `setup-server.js` has no request size limit on `POST /api/config`

- **File:** `admin/server/setup-server.js`
- **Location:** Lines 70–77 (`readBody()`)
- **Problem:** `readBody()` accumulates all incoming data chunks with no maximum size check. A malformed POST could buffer an arbitrarily large payload in memory before parsing.
- **Solution:** Add a size cap (e.g. 512KB): if `Buffer.concat(chunks).length > MAX_SIZE`, respond with HTTP 413 and destroy the request.

---

### DEBT-07 — `generate-data.js` hardcodes 16:9 aspect ratio for local video files

- **File:** `admin/server/generate-data.js`
- **Location:** Lines 83–86
- **Problem:** Local `.mp4` files are always assigned `height = Math.round(DISPLAY_WIDTH / (16/9))` regardless of actual video dimensions. Vertical or square videos will always appear letterboxed on the canvas.
- **Solution:** Use `ffprobe` (via `child_process`) or a pure-JS library to extract real video dimensions during the build step.

---

### DEBT-08 — `ensureInitialVisibility()` is a dead function

- **File:** `template/main.js`
- **Location:** Lines 2105–2107
- **Problem:** 
  ```js
  function ensureInitialVisibility(_count = 4) {
    return;
  }
  ```
  The function body is just `return;`. It is defined but never actually does anything.
- **Solution:** Delete the function and its call sites.

---

### DEBT-09 — `style.css` has inconsistent indentation (mixed leading spaces)

- **File:** `template/style.css`
- **Location:** Lines 316, 365, 398, 539, 640, 658, 714, 1094, 1199, 1213 (and more)
- **Problem:** Most of the CSS is consistently 2-space indented, but several lines have zero indentation inside rule blocks. Suggests mixed editors or auto-format disabled during some editing sessions.
- **Solution:** Run `prettier --write template/style.css` to normalise formatting.

---

### DEBT-10 — `#layout-panel` CSS flex properties are immediately overridden by JS inline styles

- **File:** `template/style.css`
- **Location:** Lines 653–665 (`#layout-panel` rule)
- **Problem:** The CSS sets `flex-direction: column; align-items: flex-end` on `#layout-panel` as defaults. However, `buildLayoutPanel()` in `main.js` overrides these via inline styles on every render. The CSS defaults are therefore immediately overridden and serve no purpose — they're misleading to anyone reading only the CSS.
- **Solution:** Remove the layout-specific flex properties from the CSS rule and rely entirely on JS to set them.

---

### DEBT-11 — `applyConfig()` rebuilds the entire nav and all panels on every config change

- **File:** `template/main.js`
- **Location:** Lines 803–811 (`applyConfig()` bottom section)
- **Problem:** Every hot-reload — even a colour change — triggers `buildNav()`, `buildCategoryPanel()`, `buildLayoutPanel()`, `buildZoomModule()`. Each destroys and recreates DOM nodes, causing a brief flicker.
- **Solution:** Implement dirty-field comparison so only affected subsystems are rebuilt. E.g. if only `theme.backgroundColor` changed, only `applyTheme()` runs.

---

## 🟢 PERFORMANCE OPTIMIZATION

### PERF-01 — `scatterItems()` calls `getBoundingClientRect()` inside a loop, forcing layout thrash

- **File:** `template/main.js`
- **Location:** Lines 2049–2094 (`scatterItems()`)
- **Problem:** Inside the `shuffled.forEach()` loop, each iteration calls `el.getBoundingClientRect()` immediately after `stage.appendChild(el)`. This forces a synchronous layout reflow on every iteration. For 50 images, this means 50 forced reflows — the single biggest source of jank during page load.
- **Solution:** Batch all `appendChild` calls first, then read all `getBoundingClientRect()` values in a single second pass after the batch insert.

---

### PERF-02 — `canPlaceRect()` is O(n²) with no spatial index

- **File:** `template/main.js`
- **Location:** Lines 288–322 (`canPlaceRect()`)
- **Problem:** For every item placed, `canPlaceRect()` iterates over all previously placed rects. For 80 items: ~3,200 comparisons. For 200 items: ~20,000 comparisons. No spatial culling is performed.
- **Solution:** Use a spatial hash grid to reduce average-case comparisons to O(1) per candidate — only check items in adjacent grid cells.

---

### PERF-03 — `scatterItems()` runs up to 1,500 rejection-sampling attempts per item on mobile

- **File:** `template/main.js`
- **Location:** Line 2061 — `const maxAttempts = isMobile ? 1500 : 800;`
- **Problem:** With a large media set on a slow device, 1,500 retries per item can block the main thread for hundreds of milliseconds. Combined with PERF-01's reflow-per-item, this makes the first render visibly sluggish on mobile.
- **Solution:** Use deterministic bin-packing as a fallback after N failed random attempts (e.g. after 50 misses, place in a grid cell).

---

### PERF-04 — All media items are mounted to the DOM simultaneously with no virtualisation

- **File:** `template/main.js`
- **Location:** `scatterItems()` → `stage.appendChild(el)` for every item
- **Problem:** If `data.js` contains 100+ items, all `<figure>` elements with `<img>` and `<video>` tags are inserted at init time. Each `<img>` fires a network request immediately, saturating bandwidth and delaying LCP.
- **Solution:** Implement an IntersectionObserver-based lazy loader: insert placeholder elements and only swap in real `src` values when items approach the current canvas viewport (based on `stageX/stageY/zoomLevel` transforms).

---

### PERF-05 — `preloadMedia()` creates throwaway `new Image()` objects that are never used

- **File:** `template/main.js`
- **Location:** Lines 360–376 (`preloadMedia()`)
- **Problem:** `preloadMedia()` creates `new Image()` for video embed thumbnails, but these objects are immediately garbage-collected. The browser may cache the response, but `createMediaElement()` then creates *another* `<img>` for the same URL — potentially two network requests per embed thumbnail.
- **Solution:** Remove `preloadMedia()` for video embeds entirely (the `<img>` in `createMediaElement()` handles the load), or use `<link rel="preload" as="image">` in the `<head>` for true browser-native preloading.

---

### PERF-06 — N `mousemove` listeners on `window` — one per media item

- **File:** `template/main.js`
- **Location:** Lines 2334–2355 (inside `enableItemDrag()`)
- **Problem:** `enableItemDrag()` is called once per media item and attaches a **new `mousemove` listener to `window`** each time. For 80 items, 80 `mousemove` handlers fire on every mouse move — even though at most 1 item can be dragged at a time. The early-exit guard works, but the overhead of 80 closure calls per event is real.
- **Solution:** Use a single delegated `mousemove` listener on `window` that checks a single `currentlyDraggingEl` variable. Similarly for `mouseup`.

---

### PERF-07 — Font embed injection re-runs on every hot-reload, appending new `<link>` to `<head>`

- **File:** `template/main.js`
- **Location:** Lines 1019–1155 (inside `applyTheme()`)
- **Problem:** Every `applyTheme()` call (triggered by every config change) removes and re-injects font `<link>` elements. For rapid CMS slider dragging (e.g. font weight), this fires many times per second, causing repeated CSS network requests.
- **Solution:** Cache the last-used embed URL in a module-level variable. Only re-inject if the new URL differs from the cached one.

---

### PERF-08 — `autoscaleText()` performs 22 binary-search iterations with forced reflows

- **File:** `template/main.js`
- **Location:** Lines 577–597
- **Problem:** The binary-search font scaler reads `textEl.scrollHeight` inside a 22-iteration loop. Each read forces a synchronous layout reflow. Called on every overlay open and every `resize` event.
- **Solution:** Cache the result and only re-run when overlay dimensions or text content actually change. Use `ResizeObserver` to trigger only on genuine size changes. Reduce max iterations to 14 for adequate precision.

---

### PERF-09 — `querySelectorAll('.media-item')` called on every layout change

- **File:** `template/main.js`
- **Location:** Lines 2471–2474, called from `layoutRows()`, `layoutStacks()`, `focusGroup()`, `restoreAllGroups()`, `toggleGroup()`
- **Problem:** `querySelectorAll('.media-item')` scans the entire DOM subtree on every layout change. For 100+ items, each call walks 100 nodes. This is called multiple times per layout event.
- **Solution:** Maintain a module-level `let allMediaItems = []` array populated once in `scatterItems()`. Use this array instead of repeated `querySelectorAll` calls.

---

### PERF-10 — `generate-data.js` processes images sequentially with `sharp`

- **File:** `admin/server/generate-data.js`
- **Location:** Lines 66–101 (inner `for` loop)
- **Problem:** Image metadata is read from `sharp` sequentially — each `await sharp(path).metadata()` waits for the previous before starting. For a large portfolio (50+ images), this makes the build noticeably slow.
- **Solution:** Parallelise with `Promise.all()`:
  ```js
  const items = await Promise.all(fileObjects.map(async fileObj => { ... }));
  ```

---

*End of audit — 32 issues total: 11 critical, 11 debt, 10 performance.*
