# Canvas Portfolio Template — Task Tracker

> **Status**: ✅ Phase 13.5 COMPLETED. Next: Phase 14 — Mobile Polish & Final QA.
> **Known issues logged**: Phase 12.5 added to capture GUI Setup Tool bugs found after Phase 11.    
> **Branch**: `main` (v1 template)  
> **Source**: copy from `_portfolio_v7_DEPLOYED` (no actual photos)

---

## Branch Strategy (create after Phase 0)
- `[x]` `feature/infinite-grid-vanilla` — cosmos.so grid, pure vanilla JS (v2)
- `[x]` `feature/infinite-grid-motion-one` — cosmos.so grid, Motion One (v2)
- `[x]` `feature/gui-drag-modules` — drag-and-drop module positioning (v2)

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

- `[x]` Create `config.json` with full schema (all defaults from implementation plan)
- `[x]` Delete `setup.md`
- `[x]` Update `main.js`: replace `parseFrontMatter()` with JSON fetch
- `[x]` Update `main.js`: replace `fetch("setup.md")` with `config.json`
- `[x]` Update `App.tsx` to render the new layout

## Phase 13.6 — React GUI Logic & Feature Migration
- `[x]` Install additional Shadcn components (accordion, switch, slider, select, radio-group, form, sonner)
- `[x]` Create `src/lib/config.ts` state management and API syncing
- `[x]` Implement `BroadcastChannel` for live preview hot-reloading
- `[x]` Re-implement Identity & Modules forms in React
- `[x]` Re-implement Theme & Layouts forms in React
- `[x]` Re-implement Interactions & Image Effects forms in React
- `[x]` Re-implement SEO & Deployment forms in React
- `[x]` Remove preview iframe from React layout and finalize Vercel Light Dashboard aesthetic
- `[x]` Update `main.js`: update all `siteConfig.*` key paths to match new `config.json` structure
- `[x]` Expose `window.applyConfig(config)` on the global scope (for GUI hot-reload)
- `[x]` Genericise `index.html`: replace hardcoded personal SEO tags with template placeholders
- `[x]` Verify: smoke test — config.json valid, setup.md gone, main.js wired correctly

---

## Phase 2 — UI Modules 8-Zone Positioning System
*Model: Claude Sonnet 4.6 (Thinking)*

- `[x]` Remove all hardcoded CSS positions for nav, category panel, layout panel
- `[x]` Add 8 zone container CSS classes to `style.css`
- `[x]` Add `mix-blend-mode` inheritance logic to zone containers
- `[x]` Add `buildZoneContainers()` function to `main.js`
- `[x]` Update `buildNav()` to read position from `config.ui.modules.title/email/info.position`
- `[x]` Update `buildCategoryPanel()` to read position from `config.ui.modules.categories.position`
- `[x]` Update `buildLayoutPanel()` to read position from `config.ui.modules.layouts.position`
- `[x]` Zoom controls: keep in `<footer>` (bottom full-width), visibility only controlled by `config.ui.zoom.visible`
- `[x]` Desktop nav: legacy `<nav>` hidden; zone containers handle all module placement
- `[x]` Mobile: legacy `<nav>` retained; zone containers hidden via CSS (`display: none`)

---

## Phase 3 — Theme & Visual Customisation
*Model: Claude Sonnet 4.6 (Thinking)*

- `[x]` Extend CSS variables in `:root` (noise, shadow, font-family, duotone vars)
- `[x]` Add background effect body classes to `style.css` (solid, gradient-static, gradient-animated, blob-mesh)
- `[x]` Add `@keyframes bg-shift`, `blob-drift-a/b`, text animation keyframes
- `[x]` Add noise/grain: SVG `feTurbulence` filter injection logic in `main.js` (`_ensureGrainFilter()`)
- `[x]` Add `body::before` noise overlay CSS + `#grain-overlay` fallback for blob-mesh combo
- `[x]` Add text animation CSS classes (`text-fx-color-cycle`, `text-fx-gradient`, `text-fx-hue-rotate`)
- `[x]` Add `@media (prefers-reduced-motion)` guard on all new animations
- `[x]` Add image shadow CSS variables to `.media-item` (`--shadow-blur`, `--shadow-color`)
- `[x]` Add image effect CSS hook classes (`fx-desaturated`, `fx-duotone`, `fx-hover-reveal`, `is-coloured`, `is-blurred`)
- `[x]` Write `applyTheme(cfg)` function in `main.js`
- `[x]` Call `applyTheme()` from `init()` and from `window.applyConfig()` (hot-reload)
- `[x]` `no-blend-mode` and `no-shadow` coverage extended to zone containers

---

## Phase 4 — Typography System
*Model: Gemini 3.5 Flash (High)*

- `[x]` Remove hardcoded JetBrains Mono `<link>` tags from `index.html`
- `[x]` Add `--font-family` CSS variable (replaces hardcoded `font-family` on `body`)
- `[x]` Add font-family injection logic to `applyTheme()` in `main.js`
- `[x]` Add font embed code `<link>` tag injection logic (parse from `config.ui.fontEmbedCode`)
- `[x]` Fallback to `"JetBrains Mono", monospace` if `fontEmbedCode` is empty
- `[x]` Verify: custom Google Font loads and applies site-wide

---

## Phase 5 — Image Effects System
*Model: Claude Sonnet 4.6 (Thinking)*

- `[x]` Add image effect CSS classes to `style.css` (desaturated, duotone, is-coloured, is-blurred)
- `[x]` Add `applyImageEffects(config)` function to `main.js`
- `[x]` Implement `handleItemClick(el, config)` unified click handler
- `[x]` Implement gallery mode (multi-sticky `.is-coloured`)
- `[x]` Implement spotlight mode (single `.is-coloured`, remove from others)
- `[x]` Implement blur-others-on-click (`.is-blurred` on siblings)
- `[x]` Implement hover reveal (CSS-only, toggled by body class)
- `[x]` Verify: desaturated mode works in random layout
- `[x]` Verify: desaturated mode works in rows layout
- `[x]` Verify: desaturated mode works in stacks layout
- `[x]` Verify: gallery mode accumulates correctly across multiple clicks
- `[x]` Verify: spotlight mode correctly removes colour from previous on new click

---

## Phase 6 — Image Click: Lightbox + Canvas Expand
*Model: Claude Sonnet 4.6 (Thinking)*

- `[x]` Build lightbox DOM element (hidden by default, `position:fixed; inset:0; z-index:9000`)
- `[x]` Implement backdrop effect variants (darken / blur / none) via CSS classes
- `[x]` Implement lightbox open/close animation
- `[x]` Implement ESC key to close lightbox
- `[x]` Implement arrow key navigation within lightbox (prev/next image in visible set)
- `[x]` Implement canvas expand: click → `setZoom()` frames the item in viewport
- `[x]` Implement canvas expand reset on second click (different image) or ESC
- `[x]` Handle conflict resolution when both modes enabled (single vs double-click config)
- `[x]` Verify: lightbox opens/closes correctly, navigation works
- `[x]` Verify: canvas expand works in all 3 layout modes

---

## Phase 7 — Category Behaviour System
*Model: Claude Sonnet 4.6 (Thinking)*

- `[x]` Extend `toggleGroup()` with `behaviour` mode branching
- `[x]` Implement `focusGroup(group)` function (focus-on-click mode)
- `[x]` Implement `restoreAllGroups()` function
- `[x]` Add CSS for blur focus effect on non-focused items (`.is-focus-blurred`)
- `[x]` Add "View All" / configurable label button to category panel (shown when in focus mode)
- `[x]` Wire "View All" button to `restoreAllGroups()`
- `[x]` Wire clicking active focused category to `restoreAllGroups()` (toggle back)
- `[x]` Verify: hide-on-click (original behaviour) still works
- `[x]` Verify: focus-on-click + hide effect works
- `[x]` Verify: focus-on-click + blur effect works
- `[x]` Verify: "View All" restores correctly

---

## Phase 8 — INFO Overlay Enhancement
*Model: Gemini 3.5 Flash (High)*

- `[x]` Add new `config.info` keys to `config.json`
- `[x]` Add CSS for canvas effects when info open (`blur-bg`, `darken`, `colour-overlay`)
- `[x]` Update `openInfoOverlay()` to apply body class from `config.info.overlayEffect`
- `[x]` Update `closeInfoOverlay()` to remove the body class
- `[x]` Update `buildInfoButton()` to render from `config.info.buttonStyle` and `closeStyle`
- `[x]` Verify: all 4 overlay effects (none/blur/darken/colour-overlay) render correctly

---

## Phase 9 — SEO & Metadata
*Model: Gemini 3.5 Flash (High)*

- `[x]` Update `admin/generate-data.js` to read `config.json`
- `[x]` Write `<title>` from `config.site.title`
- `[x]` Write `<meta name="description">` from `config.seo.metaDescription`
- `[x]` Write `<meta name="keywords">` from `config.seo.keywords`
- `[x]` Write all OG tags from `config.seo`
- `[x]` Write all Twitter card tags from `config.seo`
- `[x]` Write `<link rel="canonical">` from `config.seo.canonicalUrl`
- `[x]` Write Schema.org `<script type="application/ld+json">` from `config.seo` (Person or Organization)
- `[x]` Update `sitemap.xml` with canonical URL and build date
- `[x]` Verify: `index.html` contains correct static SEO tags after build run

---

## Phase 10 — Favicon & OG Image Workflow
*Model: Gemini 3.5 Flash (Medium)*

- `[x]` Ensure placeholder `favicon/` folder exists with working placeholder icons
- `[x]` Update `admin/generate-data.js` to update `favicon/site.webmanifest` from `config.site.title`
- `[x]` Prepare GUI help text + link for realfavicongenerator.net (for Phase 11)
- `[x]` Verify: webmanifest `name`/`short_name` update correctly after build
- `[x]` Open Graph image (og-image.jpg) workflow:
  - `[x]` Document og-image creation best-practices (1200x630px template, why & how to use it)
  - `[x]` Specify GUI SEO tab instructions & text input field mapping for `config.seo.ogImage`

---

## Phase 11 — GUI Setup Tool
*Model: Claude Sonnet 4.6 (Thinking)*

- `[x]` Create `admin/setup-server.js` (vanilla Node.js, ~175 lines)
  - `[x]` `GET /api/config` → read & return `config.json`
  - `[x]` `POST /api/config` → receive & write `config.json`
  - `[x]` `POST /api/build` → spawn `generate-data.js` as child process (streaming output)
  - `[x]` Serve static files from `setup/` and portfolio root
- `[x]` Create `start-setup.command` (macOS double-clickable launcher)
- `[x]` Create `start-setup.sh` (Linux/cross-platform)
- `[x]` Create `README-SETUP.md` (Node.js install instructions: macOS/Windows/Linux)
- `[x]` Create `setup/index.html` (GUI shell with all 12 tab template blocks)
- `[x]` Create `setup/setup.css` (dark premium aesthetic — full design system)
- `[x]` Create `setup/setup.js` (all GUI logic)
- `[x]` Implement: config fetch on load, populates all form fields
- `[x]` Implement: live preview iframe (loads `index.html`)
- `[x]` Implement: `postMessage` hot-reload on every form change (150ms debounce)
- `[x]` Implement: Save button → `POST /api/config`
- `[x]` Implement: Rebuild button → `POST /api/build` + streaming output log
- `[x]` Implement: Cmd+S / Ctrl+S keyboard shortcut to save
- `[x]` Build all GUI tabs:
  - `[x]` Identity tab
  - `[x]` Modules tab (8-zone dropdowns + zone diagram preview)
  - `[x]` Theme tab (colour pickers, background effect selector, noise/grain, shadow)
  - `[x]` Typography tab (font embed textarea, font size slider, text animation selector)
  - `[x]` Layouts tab (checkboxes, default radio, per-layout sub-panels with guarded sliders)
  - `[x]` Categories tab
  - `[x]` Image Effects tab (duotone sliders)
  - `[x]` Image Click tab
  - `[x]` INFO Panel tab
  - `[x]` SEO tab (keywords tag input, sameAs URL list)
  - `[x]` Favicon tab (step-by-step instructions + og-image workflow)
  - `[x]` Help tab (full getting-started guide + deployment instructions + FAQ)
- `[x]` Verify: server starts, /api/config GET returns valid JSON (✅ tested)
- `[x]` Verify: /setup/ serves GUI HTML (HTTP 200 ✅)
- `[x]` Verify: / serves portfolio index.html (HTTP 200 ✅)
- `[x]` Verify: POST /api/config writes config.json (✅ {"ok":true} response)
- `[x]` Phase 14 mobile re-architecture analysis documented in implementation_plan.md and task.md

---

## Phase 12 — Build Script Consolidation
*Model: Gemini 3.5 Flash (High)*

- `[x]` Refactor `admin/generate-data.js` into a unified build pipeline (media scan → data.js → SEO in index.html → webmanifest → sitemap.xml)
- `[x]` Update `admin/package.json` with any new dependencies
- `[x]` Update `build-website.command` to call unified script
- `[x]` Verify: full build runs cleanly end-to-end

---

## Phase 12.5 — GUI Setup Tool: Bug Fixes & UX Corrections
*Model: Claude Sonnet 4.6 (Thinking)*

> Issues discovered after Phase 11 implementation. All bugs listed here must be resolved before Phase 13 (Documentation) begins, as docs depend on a working GUI.

- `[x]` **Fix: Live preview not available in GUI Setup Tool**
  - Root cause: Duplicate `const overlay` declaration in `window.applyConfig()` (lines 696 + 715 of main.js) caused SyntaxError that killed the entire hot-reload function.
  - Fixed: Renamed second declaration to `infoOverlay2`. Added `canvas-ready` postMessage from `main.js` init(). `setup.js` now waits for this signal (with 3s fallback) before first hot-reload.

- `[x]` **Fix: Modules tab layout broken + too large**
  - Fixed: Replaced full-width section-cards with compact table-grid rows (name | toggle | select). Constrained panel-container to max-width:580px. Reduced zone diagram to 100px height with 8px font.

- `[x]` **Fix: Title module SVG icon functionality omitted**
  - Fixed: Added `icon` sub-object to config.json (enabled, file, position). Added `buildIcon()` in main.js buildNav(). Added icon controls (toggle, file input, position select) to GUI Modules tab.

- `[x]` **Fix: Every tab panel is neither correctly sized nor scrollable**
  - Fixed: Added `overflow:hidden` to `#preview-area` in setup.css. The absolutely-positioned `#panel-container` now gets a proper scroll context from its grid-cell parent.

- `[x]` **Fix/Feature: Text animation — add trigger mode (hover vs. always-on)**
  - Fixed: New config key `theme.textAnimationTrigger` ('always'|'hover'). Added `body.text-anim-hover` CSS selectors in style.css that override animations to :hover only. GUI: conditional 'Animation Trigger' radio group in Typography tab.

- `[x]` More issues to be added by owner during Phase 12.5 QA review (transferred to Phase 13.5)

---

## Phase 13 — Documentation
*Model: Gemini 3.5 Flash (High)*

- `[x]` Add `[?]` collapsible help blocks to each GUI tab
- `[x]` Write full "Help" tab content (getting-started, deployment, FAQ)
- `[x]` Finalize `README.md` (full feature table, deployment guide, attribution/license)
- `[x]` Finalize `README-SETUP.md` (platform-specific Node.js install instructions)
- `[x]` Verify: Help tab renders correctly in GUI

---

## Phase 13.5 — GUI Setup Tool: Further Bug Fixes & UX Polish
*Model: Gemini 3.5 Flash (Medium)*

- `[x]` **Fix: Remove "Preview only" toggle / live preview is in-tab directly**
  - Problem: Separate preview mode is redundant. Active panel controls must sit in the left sidebar, and the right pane must always show the live iframe preview updating in real-time, eliminating the overlay toggle.
- `[x]` **Fix: start-setup.command permissions and server startup**
  - Problem: Double-clicking `start-setup.command` results in: `The file “start-setup.command” could not be executed because you do not have appropriate access privileges.`
  - Solution: Set executable permissions (`chmod +x start-setup.command`) and improve double-click shell launch script to boot the server and open the browser.
- `[x]` **Fix: Conflict between Title Display Mode and Decorative SVG Icon selector**
  - Problem: Title display mode dropdown and Decorative SVG Icon options/switch conflict or allow invalid state combinations.
- `[x]` **Fix: Scrollability of panel option blocks**
  - Problem: Option blocks (e.g. Module Positions list, Theme parameters, etc.) are cut off or non-scrollable when contents exceed the viewport height.
  - Solution: Restructure setup.css panel styles to enable proper scroll context within the panel area.
- `[x]` **Fix/Feature: View All category button switch configuration**
  - Problem: Hardcoded "View All" categories button is not optional.
  - Spec: Turn "View All" into a switch: If ON, the button appears below categories when one is selected. If OFF, the button is omitted; instead, clicking the active focused category re-shows all items. If nothing is selected, clicking another category brings it into focus.
- `[x]` **Fix/Feature: Image Click mode consolidation**
  - Problem: Separate toggles for Lightbox and Canvas Expand allow invalid configurations.
  - Spec: Combine these controls into a single 3-way dropdown: **Lightbox**, **Canvas Expand**, or **Off** (the default state).
- `[x]` **Feature Option: Canvas Expand physical resizing and centering**
  - Problem: Canvas Expand currently zooms the entire canvas viewport to the image.
  - Spec: Add a setting for Canvas Expand to physically scale the media container relative to other items and center on the screen using canvas panning (instead of zooming the canvas). Clicking it again shrinks it back. If the user manually zooms out the canvas, the expanded image remains physically larger than all others.
- `[x]` **Fix: Live preview preloader stuck loading on the first image**
  - Problem: When opening the live preview iframe inside the GUI Setup Tool, the preloader remains stuck loading on the first image, making the preview non-functional.
  - Solution: Investigate preloader/resource loading logic in main.js/data.js when executed in the iframe. Ensure that config fetches or postMessage configurations do not interrupt the resource loader sequence.

---

## Phase 14 — Mobile Polish & Final QA
*Model: Gemini 3.5 Flash (High)*

> Re-architecture note added in Phase 11: all phases 2–11 features audited for mobile UX impact. See implementation_plan.md Phase 14 for the full impact matrix.

- `[x]` Touch swipe in lightbox (touchstart/touchend X-delta → navigateLightbox(±1))
- `[x]` Hover-reveal fallback on touch (first-tap = colour reveal, second tap = deactivate)
- `[x]` Canvas expand guard: ensure canvasExpand silently falls back on mobile (lightbox or no-op)
- `[x]` Grain overlay `pointer-events: none` audit — verify touch targets not blocked
- `[x]` Mobile nav rebuild after hot-reload (buildNav correctly updates mobile `<nav>`)
- `[x]` Font size guard: confirm `--ui-text-size` not applied on mobile
- `[x]` iOS Safari: safe-area-inset-bottom on footer if needed
- `[x]` Android Chrome: pinch-zoom conflict with canvas pan-zoom handler
- `[x]` Final `@media (prefers-reduced-motion)` audit across all Phases 3–8 animations
- `[x]` Performance audit: no synchronous layout reads blocking main thread
- `[x]` No preview iframe in GUI Setup — changes trigger BroadcastChannel refresh in portfolio tab
- `[x]` Final GitHub push: tag as `v1.0.0`

---

## Post-v1: Feature Branches

- `[ ]` Create branch `feature/infinite-grid-vanilla` from `main@v1.0.0`
- `[ ]` Create branch `feature/infinite-grid-motion-one` from `main@v1.0.0`
- `[ ]` Create branch `feature/gui-drag-modules` from `main@v1.0.0`
- `[ ]` Create branch `feature/gui-redesign` from `main@v1.0.0` — full visual redesign of the GUI Setup Tool (see Post-v1 notes in implementation_plan.md)
- `[ ]` Develop each branch independently
- `[ ]` Owner manual testing of both grid branches → merge winner into `main`
