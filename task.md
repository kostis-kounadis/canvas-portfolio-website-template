# Canvas Portfolio Template — Task Tracker

> **Status**: ⏸ READY TO START — awaiting model switch by user before each phase.  
> **Branch**: `main` (v1 template)  
> **Source**: copy from `_portfolio_v7_DEPLOYED` (no actual photos)

---

## Branch Strategy (create after Phase 0)
- `[ ]` `feature/infinite-grid-vanilla` — cosmos.so grid, pure vanilla JS (v2)
- `[ ]` `feature/infinite-grid-motion-one` — cosmos.so grid, Motion One (v2)
- `[ ]` `feature/gui-drag-modules` — drag-and-drop module positioning (v2)

---

## Phase 0 — Repository Bootstrap
*Model: Gemini 3.5 Flash (Low)*

- `[x]` Create private GitHub repo: `canvas-portfolio-website-template`
- `[x]` Copy source files from `_portfolio_v7_DEPLOYED` (exclude `assets/images/` actual photos, `node_modules`)
- `[x]` Set up `.gitignore` (`node_modules/`, `.DS_Store`, `assets/images/*/` real content)
- `[x]` Write initial `README.md` (what it is, live demo link, template philosophy, quick-start outline)
- `[x]` Create 3 placeholder solid-colour PNG images (different aspect ratios: landscape, portrait, square)
- `[x]` Create 3 example category folders: `assets/images/work/`, `assets/images/personal/`, `assets/images/experiments/`
- `[x]` Copy placeholder images across categories (5–8 copies each, to fill the canvas meaningfully)
- `[x]` Initial commit & push to GitHub

---

## Phase 1 — Config Migration: `setup.md` → `config.json`
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Create `config.json` with full schema (all defaults from implementation plan)
- `[ ]` Delete `setup.md`
- `[ ]` Update `main.js`: replace `parseFrontMatter()` with JSON fetch
- `[ ]` Update `main.js`: replace `fetch("setup.md")` with `fetch("config.json")`
- `[ ]` Update `main.js`: update all `siteConfig.*` key paths to match new `config.json` structure
- `[ ]` Expose `window.applyConfig(config)` on the global scope (for GUI hot-reload)
- `[ ]` Update `admin/generate-data.js` to also write SEO meta tags into `index.html` from `config.json`
- `[ ]` Verify: portfolio loads in browser with placeholder images, looks identical to current v7

---

## Phase 2 — UI Modules 8-Zone Positioning System
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Remove all hardcoded CSS positions for nav, category panel, layout panel
- `[ ]` Add 8 zone container CSS classes to `style.css`
- `[ ]` Add `mix-blend-mode` inheritance logic to zone containers
- `[ ]` Add `buildZoneContainers()` function to `main.js`
- `[ ]` Update `buildNav()` to read position from `config.ui.modules.title/email/info.position`
- `[ ]` Update `buildCategoryPanel()` to read position from `config.ui.modules.categories.position`
- `[ ]` Update `buildLayoutPanel()` to read position from `config.ui.modules.layouts.position`
- `[ ]` Zoom controls: keep in `<footer>` (bottom full-width), visibility only controlled by `config.ui.zoom.visible`
- `[ ]` Verify: all 8 zone positions work correctly with default config
- `[ ]` Verify: multiple modules in same zone stack vertically in correct order

---

## Phase 3 — Theme & Visual Customisation
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Extend CSS variables in `:root` (noise, shadow, font-family, duotone vars)
- `[ ]` Add background effect body classes to `style.css` (solid, gradient-static, gradient-animated, blob-mesh)
- `[ ]` Add `@keyframes bg-shift` and `@keyframes drift` animations
- `[ ]` Add noise/grain: SVG `feTurbulence` filter injection logic in `main.js`
- `[ ]` Add `body::before` noise overlay CSS (toggled by `body.bg-noise`)
- `[ ]` Add text animation CSS classes (`text-fx-color-cycle`, `text-fx-gradient`, `text-fx-hue-rotate`)
- `[ ]` Add `@media (prefers-reduced-motion)` guard on all new animations
- `[ ]` Add image shadow CSS variables to `.media-item`
- `[ ]` Write `applyTheme(config)` function in `main.js`
- `[ ]` Call `applyTheme()` from `init()` after config is loaded
- `[ ]` Verify: all 5 background effects render correctly in Chrome and Safari

---

## Phase 4 — Typography System
*Model: Gemini 3.5 Flash (High)*

- `[ ]` Remove hardcoded JetBrains Mono `<link>` tags from `index.html`
- `[ ]` Add `--font-family` CSS variable (replaces hardcoded `font-family` on `body`)
- `[ ]` Add font-family injection logic to `applyTheme()` in `main.js`
- `[ ]` Add font embed code `<link>` tag injection logic (parse from `config.ui.fontEmbedCode`)
- `[ ]` Fallback to `"JetBrains Mono", monospace` if `fontEmbedCode` is empty
- `[ ]` Verify: custom Google Font loads and applies site-wide

---

## Phase 5 — Image Effects System
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Add image effect CSS classes to `style.css` (desaturated, duotone, is-coloured, is-blurred)
- `[ ]` Add `applyImageEffects(config)` function to `main.js`
- `[ ]` Implement `handleItemClick(el, config)` unified click handler
- `[ ]` Implement gallery mode (multi-sticky `.is-coloured`)
- `[ ]` Implement spotlight mode (single `.is-coloured`, remove from others)
- `[ ]` Implement blur-others-on-click (`.is-blurred` on siblings)
- `[ ]` Implement hover reveal (CSS-only, toggled by body class)
- `[ ]` Verify: desaturated mode works in random layout
- `[ ]` Verify: desaturated mode works in rows layout
- `[ ]` Verify: desaturated mode works in stacks layout
- `[ ]` Verify: gallery mode accumulates correctly across multiple clicks
- `[ ]` Verify: spotlight mode correctly removes colour from previous on new click

---

## Phase 6 — Image Click: Lightbox + Canvas Expand
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Build lightbox DOM element (hidden by default, `position:fixed; inset:0; z-index:9000`)
- `[ ]` Implement backdrop effect variants (darken / blur / none) via CSS classes
- `[ ]` Implement lightbox open/close animation
- `[ ]` Implement ESC key to close lightbox
- `[ ]` Implement arrow key navigation within lightbox (prev/next image in visible set)
- `[ ]` Implement canvas expand: click → `setZoom()` frames the item in viewport
- `[ ]` Implement canvas expand reset on second click (different image) or ESC
- `[ ]` Handle conflict resolution when both modes enabled (single vs double-click config)
- `[ ]` Verify: lightbox opens/closes correctly, navigation works
- `[ ]` Verify: canvas expand works in all 3 layout modes

---

## Phase 7 — Category Behaviour System
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Extend `toggleGroup()` with `behaviour` mode branching
- `[ ]` Implement `focusGroup(group)` function (focus-on-click mode)
- `[ ]` Implement `restoreAllGroups()` function
- `[ ]` Add CSS for blur focus effect on non-focused items (`.is-focus-blurred`)
- `[ ]` Add "View All" / configurable label button to category panel (shown when in focus mode)
- `[ ]` Wire "View All" button to `restoreAllGroups()`
- `[ ]` Wire clicking active focused category to `restoreAllGroups()` (toggle back)
- `[ ]` Verify: hide-on-click (original behaviour) still works
- `[ ]` Verify: focus-on-click + hide effect works
- `[ ]` Verify: focus-on-click + blur effect works
- `[ ]` Verify: "View All" restores correctly

---

## Phase 8 — INFO Overlay Enhancement
*Model: Gemini 3.5 Flash (High)*

- `[ ]` Add new `config.info` keys to `config.json`
- `[ ]` Add CSS for canvas effects when info open (`blur-bg`, `darken`, `colour-overlay`)
- `[ ]` Update `openInfoOverlay()` to apply body class from `config.info.overlayEffect`
- `[ ]` Update `closeInfoOverlay()` to remove the body class
- `[ ]` Update `buildInfoButton()` to render from `config.info.buttonStyle` and `closeStyle`
- `[ ]` Verify: all 4 overlay effects (none/blur/darken/colour-overlay) render correctly

---

## Phase 9 — SEO & Metadata
*Model: Gemini 3.5 Flash (High)*

- `[ ]` Update `admin/generate-data.js` to read `config.json`
- `[ ]` Write `<title>` from `config.site.title`
- `[ ]` Write `<meta name="description">` from `config.seo.metaDescription`
- `[ ]` Write `<meta name="keywords">` from `config.seo.keywords`
- `[ ]` Write all OG tags from `config.seo`
- `[ ]` Write all Twitter card tags from `config.seo`
- `[ ]` Write `<link rel="canonical">` from `config.seo.canonicalUrl`
- `[ ]` Write Schema.org `<script type="application/ld+json">` from `config.seo` (Person or Organization)
- `[ ]` Update `sitemap.xml` with canonical URL and build date
- `[ ]` Verify: `index.html` contains correct static SEO tags after build run

---

## Phase 10 — Favicon Workflow
*Model: Gemini 3.5 Flash (Medium)*

- `[ ]` Ensure placeholder `favicon/` folder exists with working placeholder icons
- `[ ]` Update `admin/generate-data.js` to update `favicon/site.webmanifest` from `config.site.title`
- `[ ]` Prepare GUI help text + link for realfavicongenerator.net (for Phase 11)
- `[ ]` Verify: webmanifest `name`/`short_name` update correctly after build

---

## Phase 11 — GUI Setup Tool
*Model: Claude Sonnet 4.6 (Thinking)*

- `[ ]` Create `admin/setup-server.js` (vanilla Node.js, ~80 lines)
  - `[ ]` `GET /api/config` → read & return `config.json`
  - `[ ]` `POST /api/config` → receive & write `config.json`
  - `[ ]` `POST /api/build` → spawn `generate-data.js` as child process
  - `[ ]` Serve static files from `setup/` and portfolio root
- `[ ]` Create `start-setup.command` (macOS double-clickable launcher)
- `[ ]` Create `start-setup.sh` (Linux/cross-platform)
- `[ ]` Create `README-SETUP.md` (Node.js install instructions: macOS/Windows/Linux)
- `[ ]` Create `setup/index.html` (GUI shell)
- `[ ]` Create `setup/setup.css` (dark premium aesthetic)
- `[ ]` Create `setup/setup.js` (all GUI logic)
- `[ ]` Implement: config fetch on load, populates all form fields
- `[ ]` Implement: live preview iframe (loads `index.html`)
- `[ ]` Implement: `postMessage` hot-reload on every form change
- `[ ]` Implement: Save button → `POST /api/config`
- `[ ]` Implement: Rebuild button → `POST /api/build` + show output log
- `[ ]` Build all GUI tabs:
  - `[ ]` Identity tab
  - `[ ]` Modules tab (8-zone dropdowns + zone diagram preview)
  - `[ ]` Theme tab (colour pickers, background effect selector, noise/grain, shadow)
  - `[ ]` Typography tab (font embed textarea, font size slider, text animation selector)
  - `[ ]` Layouts tab (checkboxes, default radio, per-layout sub-panels with guarded sliders)
  - `[ ]` Categories tab
  - `[ ]` Image Effects tab
  - `[ ]` Image Click tab
  - `[ ]` INFO Panel tab
  - `[ ]` SEO tab
  - `[ ]` Favicon tab (instructions + webmanifest title sync note)
  - `[ ]` Help tab (full getting-started guide + deployment instructions + FAQ)
- `[ ]` Verify: GUI opens in Chrome from `start-setup.command`
- `[ ]` Verify: every control immediately updates the preview iframe
- `[ ]` Verify: Save writes correct `config.json` to disk
- `[ ]` Verify: Rebuild runs `generate-data.js` and shows success/error output
- `[ ]` Verify: GUI works in Safari (read-only preview; Save still works via server)
- `[ ]` Verify: GUI works in Firefox

---

## Phase 12 — Build Script Consolidation
*Model: Gemini 3.5 Flash (High)*

- `[ ]` Refactor `admin/generate-data.js` into a unified build pipeline (media scan → data.js → SEO in index.html → webmanifest → sitemap.xml)
- `[ ]` Update `admin/package.json` with any new dependencies
- `[ ]` Update `build-website.command` to call unified script
- `[ ]` Verify: full build runs cleanly end-to-end

---

## Phase 13 — Documentation
*Model: Gemini 3.5 Flash (High)*

- `[ ]` Add `[?]` collapsible help blocks to each GUI tab
- `[ ]` Write full "Help" tab content (getting-started, deployment, FAQ)
- `[ ]` Finalize `README.md` (full feature table, deployment guide, attribution/license)
- `[ ]` Finalize `README-SETUP.md` (platform-specific Node.js install instructions)
- `[ ]` Verify: Help tab renders correctly in GUI

---

## Phase 14 — Mobile Polish & Final QA
*Model: Gemini 3.5 Flash (High)*

- `[ ]` Test all new image effects on mobile (iOS Safari, Android Chrome)
- `[ ]` Ensure hover effects fall back to first-tap on touch devices
- `[ ]` Verify category focus mode works on touch
- `[ ]` Verify zone module system has no overlap issues on mobile
- `[ ]` Verify lightbox keyboard nav works on desktop, touch-nav on mobile
- `[ ]` Final `@media (prefers-reduced-motion)` audit across all animations
- `[ ]` Performance audit: no synchronous layout reads blocking main thread
- `[ ]` Final GitHub push: tag as `v1.0.0`

---

## Post-v1: Feature Branches

- `[ ]` Create branch `feature/infinite-grid-vanilla` from `main@v1.0.0`
- `[ ]` Create branch `feature/infinite-grid-motion-one` from `main@v1.0.0`
- `[ ]` Create branch `feature/gui-drag-modules` from `main@v1.0.0`
- `[ ]` Develop each branch independently
- `[ ]` Owner manual testing of both grid branches → merge winner into `main`
