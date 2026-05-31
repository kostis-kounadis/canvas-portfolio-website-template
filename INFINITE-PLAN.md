# Infinite Grid — Architecture Plan
## Branch: `feature/infinite-grid-vanilla`

---

## 1. Visual Reference & Findings

**Reference**: https://www.cosmos.so/public-work

Cosmos is a **masonry grid**: fixed-width columns, images at full column width with auto height (aspect ratio preserved). Columns are equal width. Items butt up against each other with minimal gap. The grid fills the viewport edge-to-edge. There is no drag or zoom — it is purely a scroll surface.

**Cosmos tech stack** (from Wappalyzer): React, Next.js, Framer Motion, Tailwind CSS, Amazon CloudFront. Completely irrelevant — we are building in vanilla JS.

**External repos verdict**:
- `egjs-infinitegrid` — scroll-only, not a canvas. ❌ Do not clone.
- `tldraw` — React-based canvas editor, massive dependency. ❌ Do not clone.
- `xiaoiver/infinite-canvas-tutorial` — educational resource only. ❌ Do not clone.
- `saeedkohansal/Vanilla-JavaScript-Infinite-Scroll-HTML-CSS-JS` — scroll-only, one direction. ❌ Do not clone.

**Verdict**: No external dependencies. Pure vanilla DOM virtual windowing is sufficient and matches the existing architecture.

---

## 2. What We Are Building

An **Infinite Tiling Masonry** layout — a fourth layout mode alongside `random`, `rows`, and `stacks`.

### Core behaviour
- Same-width columns, auto-height items (masonry, like the reference)
- The portfolio's images fill the columns cyclically — repeating as many times as needed
- The canvas fills the viewport completely at all zoom levels
- Pan freely in all four directions — the grid continues infinitely
- Zoom in → fewer columns (items larger); zoom out → more columns (items smaller)
- No individual item dragging in this mode (the stage itself is panned)

### What makes this non-trivial
A finite pre-rendered grid cannot be "infinite". Rendering all possible positions upfront would consume gigabytes of memory. The solution is **virtual windowing**: at any given moment, only DOM elements within the visible viewport plus a small buffer are rendered. As the user pans or zooms, elements outside the buffer are recycled and repositioned to serve newly-visible cells.

---

## 3. Architecture

### 3.1 Core Concept: Tile + Virtual Window

**Step A — Compute one tile**
Run a standard masonry packing algorithm on `window.mediaItems` to produce a rectangular "tile": a fixed-width, fixed-height block containing one copy of all images packed into N columns (N = configurable). This tile has a known `tileWidth` and `tileHeight`.

```
┌────────────────────────┐
│ [img0] [img2]  [img4]  │  ← tile (one complete pass of all items)
│ [img1] [img3]  [img5]  │
│        [img6]  [img7]  │
└────────────────────────┘
  tileWidth × tileHeight
```

**Step B — Tile the infinite plane**
The infinite grid is mathematically this tile repeated at positions `(tx * tileWidth, ty * tileHeight)` for all integer `(tx, ty)`.

**Step C — Render only what is visible**
Given the current viewport (derived from `stageX`, `stageY`, `zoomLevel`), compute which `(tx, ty)` copies overlap the visible area plus a 1-viewport buffer. For each item inside a visible tile copy, render exactly one DOM element at the correct absolute stage coordinate. All other elements are removed from the DOM and returned to a pool.

### 3.2 The Single Hook Point

The existing `updateStageTransform()` (line 225) is called via RAF on every pan and zoom. It is the **single injection point**:

```js
function updateStageTransform() {
  stage.style.transform = `translate3d(${stageX}px, ${stageY}px, 0) scale(${zoomLevel})`;
  // ADD: if (currentLayout === "infinite") refreshInfiniteGrid();
}
```

No other changes to the pan/zoom system are needed.

### 3.3 Element Pool

To avoid creating/destroying DOM elements on every frame, maintain a pool:

```
infinitePool = []           ← idle elements (not in DOM)
infiniteActive = Map<key, el>  ← key = "tx:ty:itemIdx"
```

On each `refreshInfiniteGrid()` call:
1. Calculate the set of keys that SHOULD be visible
2. Remove keys no longer needed → push element to pool
3. For each new key → pop from pool (or create new), reposition, append

This is O(visible_items) per frame, not O(total_items).

### 3.4 Masonry Packing Algorithm (shortest-column-first)

```
columnHeights = [0, 0, ..., 0]  // one per column
placements = []
for each item in mediaItems:
  col = index of min(columnHeights)
  x = col * (columnWidth + gap)
  y = columnHeights[col]
  h = Math.round(columnWidth / (item.width / item.height))
  placements.push({ item, col, x, y, w: columnWidth, h })
  columnHeights[col] += h + gap
tileHeight = max(columnHeights)
tileWidth = numCols * (columnWidth + gap) - gap
```

This runs once when entering the layout (or when config changes). O(N) time.

### 3.5 Visible Stage Rectangle

```
visMinX = -stageX / zoomLevel - BUFFER_W
visMinY = -stageY / zoomLevel - BUFFER_H
visMaxX = (viewportW - stageX) / zoomLevel + BUFFER_W
visMaxY = (viewportH - stageY) / zoomLevel + BUFFER_H
```

Where `BUFFER_W = viewportW / zoomLevel` and `BUFFER_H = viewportH / zoomLevel` (one full viewport of pre-render buffer).

### 3.6 Number of Columns

The number of columns is **config-driven**, not auto-calculated from zoom. The user sets `columnWidth` in config. Zoom acts as a visual scale on top of that — zooming out makes all items visually smaller and reveals more columns from the infinite grid naturally.

Default: `numCols = Math.min(mediaItems.length, 6)`

This is also a config value: `layouts.infinite.numCols`.

---

## 4. Config Schema Additions

In `config.json` → `layouts`:

```json
"available": ["random", "infinite"],
"infinite": {
  "columnWidth": 520,
  "gap": 8,
  "numCols": 6
}
```

In `siteConfig` defaults (main.js):

```js
infinite_column_width: 520,
infinite_gap: 8,
infinite_num_cols: 6,
```

---

## 5. Files to Modify

| File | Change |
|---|---|
| `template/main.js` | Add `computeInfiniteGridTile()`, `refreshInfiniteGrid()`, `layoutInfinite()`, `exitInfiniteGrid()`. Hook into `updateStageTransform()` and `applyLayout()`. Add new `siteConfig` defaults. |
| `template/config.json` | Add `"infinite"` to `layouts.available`, add `layouts.infinite` sub-object |
| `template/style.css` | Add `.layout-infinite .media-item` rules (no individual drag cursor, no transition) |
| `admin/build-setup-app/src/components/forms/` | Add Infinite Grid section to the layout settings form |
| `admin/build-setup-app/src/lib/defaults.ts` | Add defaults for `infinite_column_width`, `infinite_gap`, `infinite_num_cols` |

---

## 6. Task Breakdown (atomic, sequenced for Gemini 3.1 Pro High)

Tasks are ordered by dependency. Each task is self-contained and testable.

---

### TASK 1 — Add config schema + siteConfig defaults

**File**: `template/main.js`

Add to the `siteConfig` object (around line 100):
```js
infinite_column_width: 520,
infinite_gap:          8,
infinite_num_cols:     6,
```

Add to `mapConfig(cfg)` to read from `config.json`:
```js
siteConfig.infinite_column_width = cfg?.layouts?.infinite?.columnWidth ?? 520;
siteConfig.infinite_gap          = cfg?.layouts?.infinite?.gap ?? 8;
siteConfig.infinite_num_cols     = cfg?.layouts?.infinite?.numCols ?? 6;
```

**File**: `template/config.json`

Add `"infinite"` to `layouts.available` array.
Add `"infinite": { "columnWidth": 520, "gap": 8, "numCols": 6 }` inside `layouts`.

**Verifiable**: Server starts, `config.json` loads without error, no console errors.

---

### TASK 2 — Add `"infinite"` to the layout dispatch

**File**: `template/main.js`

In `applyLayout(mode)`, add:
```js
else if (mode === "infinite") layoutInfinite();
```

Add a stub `layoutInfinite()` function that just logs `"infinite layout"` to console and returns.

Add a stub `exitInfiniteGrid()` function (called when switching AWAY from infinite mode). Hook it at the top of `applyLayout()`:
```js
function applyLayout(mode) {
  if (currentLayout === "infinite" && mode !== "infinite") exitInfiniteGrid();
  currentLayout = mode;
  // ...
}
```

**Verifiable**: Clicking the infinite layout button in the UI logs to console, switches `currentLayout` to `"infinite"`.

---

### TASK 3 — Implement `computeInfiniteGridTile(items, colWidth, gap, numCols)`

**File**: `template/main.js`

Write this pure function (no DOM, no side effects):

```js
// Returns: { placements: [{item, col, x, y, w, h}], tileWidth, tileHeight }
function computeInfiniteGridTile(items, colWidth, gap, numCols) {
  const colHeights = new Array(numCols).fill(0);
  const placements = [];

  items.forEach(item => {
    // Find shortest column
    let col = 0;
    for (let i = 1; i < numCols; i++) {
      if (colHeights[i] < colHeights[col]) col = i;
    }
    const x = col * (colWidth + gap);
    const y = colHeights[col];
    const ratio = (item.width && item.height) ? item.width / item.height : 520 / 340;
    const h = Math.round(colWidth / ratio);
    placements.push({ item, col, x, y, w: colWidth, h });
    colHeights[col] += h + gap;
  });

  const tileHeight = Math.max(...colHeights);
  const tileWidth  = numCols * (colWidth + gap) - gap;
  return { placements, tileWidth, tileHeight };
}
```

**Verifiable**: Call it from browser console with `window.mediaItems` and verify the returned geometry is sensible (no NaN, tileWidth > 0).

---

### TASK 4 — Implement the DOM element pool

**File**: `template/main.js`

Add module-level variables:
```js
let infinitePool   = [];         // recycled elements not in DOM
let infiniteActive = new Map();  // key→el for currently-rendered cells
let infiniteTile   = null;       // result of computeInfiniteGridTile
```

Add two helper functions:
```js
function igAcquire(item) {
  // Get an element from pool or create new one.
  // Important: do NOT call enableItemDrag on it (grid items are not individually draggable).
  let el = infinitePool.pop();
  if (!el) {
    el = createMediaElement(item);
    el.classList.add("ig-cell");          // marks it as grid-managed
    el.style.position = "absolute";
  }
  el._mediaItem = item;
  // Update src/content if item changed (pool reuse):
  // For simplicity at this stage, just set the background image / img src.
  return el;
}

function igRelease(el) {
  el.remove();               // detach from DOM
  infinitePool.push(el);     // return to pool
}
```

**Note for implementer**: `createMediaElement` already creates fully-featured elements with click handlers, lightbox, etc. `ig-cell` class will be used in CSS to suppress individual-item drag cursor. Do NOT call `enableItemDrag` on pool elements.

**Verifiable**: Pool functions exist and don't throw errors.

---

### TASK 5 — Implement `refreshInfiniteGrid()`

**File**: `template/main.js`

This is the core render loop. Called every time pan or zoom changes.

```js
function refreshInfiniteGrid() {
  if (!infiniteTile) return;
  const { placements, tileWidth, tileHeight } = infiniteTile;
  if (tileWidth <= 0 || tileHeight <= 0) return;

  const vw = stageWrapper.clientWidth;
  const vh = stageWrapper.clientHeight;
  const bufX = vw / zoomLevel;
  const bufY = vh / zoomLevel;

  // Visible stage-coordinate rectangle (with buffer)
  const visMinX = -stageX / zoomLevel - bufX;
  const visMinY = -stageY / zoomLevel - bufY;
  const visMaxX = (vw - stageX) / zoomLevel + bufX;
  const visMaxY = (vh - stageY) / zoomLevel + bufY;

  // Which tile copies (integer offsets) intersect the visible rect?
  const txMin = Math.floor(visMinX / tileWidth);
  const txMax = Math.ceil(visMaxX / tileWidth);
  const tyMin = Math.floor(visMinY / tileHeight);
  const tyMax = Math.ceil(visMaxY / tileHeight);

  // Build the set of keys that SHOULD be visible
  const wantedKeys = new Set();
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      placements.forEach((p, pi) => {
        const absX = p.x + tx * tileWidth;
        const absY = p.y + ty * tileHeight;
        // Quick cull: item bounding box vs visible rect
        if (absX + p.w < visMinX || absX > visMaxX) return;
        if (absY + p.h < visMinY || absY > visMaxY) return;
        wantedKeys.add(`${tx}:${ty}:${pi}`);
      });
    }
  }

  // Release elements no longer needed
  for (const [key, el] of infiniteActive) {
    if (!wantedKeys.has(key)) {
      igRelease(el);
      infiniteActive.delete(key);
    }
  }

  // Acquire elements for new visible cells
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      placements.forEach((p, pi) => {
        const absX = p.x + tx * tileWidth;
        const absY = p.y + ty * tileHeight;
        if (absX + p.w < visMinX || absX > visMaxX) return;
        if (absY + p.h < visMinY || absY > visMaxY) return;
        const key = `${tx}:${ty}:${pi}`;
        if (infiniteActive.has(key)) return; // already rendered

        const el = igAcquire(p.item);
        el.style.left   = absX + "px";
        el.style.top    = absY + "px";
        el.style.width  = p.w + "px";
        el.style.height = p.h + "px";
        stage.appendChild(el);
        infiniteActive.set(key, el);
      });
    }
  }
}
```

**Verifiable**: After hooking (Task 6), images appear in a masonry grid filling the viewport. No console errors.

---

### TASK 6 — Hook `refreshInfiniteGrid()` into `updateStageTransform()`

**File**: `template/main.js`

Modify `updateStageTransform()`:

```js
function updateStageTransform() {
  stage.style.transform = `translate3d(${stageX}px, ${stageY}px, 0) scale(${zoomLevel})`;
  if (currentLayout === "infinite") refreshInfiniteGrid();
}
```

**That's the entire hook.** Because every pan and zoom already flows through this function via the RAF scheduler, the grid automatically stays current.

**Verifiable**: Pan in any direction → grid follows seamlessly. Zoom in/out → images scale correctly.

---

### TASK 7 — Implement `layoutInfinite()` (the entry point)

**File**: `template/main.js`

Replace the stub from Task 2:

```js
function layoutInfinite() {
  // 1. Remove scatter items from DOM (but keep allMediaItems array intact for
  //    other layouts to restore from; we use our own pool here)
  allMediaItems.forEach(el => el.remove());

  // 2. Disable item dragging flag (wireItemDragging won't re-run in this mode)
  //    Individual items in the infinite grid are not draggable.

  // 3. Remove stage size constraints so items can be placed at any coordinate
  stage.style.width  = "";
  stage.style.height = "";

  // 4. Compute the tile geometry from current config
  const colWidth = siteConfig.infinite_column_width;
  const gap      = siteConfig.infinite_gap;
  const numCols  = siteConfig.infinite_num_cols;
  const items    = Array.isArray(window.mediaItems) ? window.mediaItems : [];
  infiniteTile   = computeInfiniteGridTile(items, colWidth, gap, numCols);

  // 5. Centre the view on the origin tile
  const vw = stageWrapper.clientWidth;
  const vh = stageWrapper.clientHeight;
  stageX = vw / 2 - (infiniteTile.tileWidth  / 2) * zoomLevel;
  stageY = vh / 2 - (infiniteTile.tileHeight / 2) * zoomLevel;

  // 6. Initial render
  refreshInfiniteGrid();
  updateStageTransform();
}
```

**Verifiable**: Switching to "infinite" mode shows the masonry grid centred in the viewport.

---

### TASK 8 — Implement `exitInfiniteGrid()` (cleanup when switching away)

**File**: `template/main.js`

```js
function exitInfiniteGrid() {
  // Release all active infinite grid elements back to pool
  for (const [, el] of infiniteActive) {
    igRelease(el);
  }
  infiniteActive.clear();

  // Drain the pool — actually destroy elements since other layouts use allMediaItems
  infinitePool.forEach(el => el.remove());
  infinitePool = [];

  // Clear tile state
  infiniteTile = null;

  // Restore stage size constraints
  stage.style.width  = STAGE_WIDTH + "px";
  stage.style.height = STAGE_HEIGHT + "px";

  // Re-append scatter items so other layouts can find them
  allMediaItems.forEach(el => stage.appendChild(el));
}
```

**Verifiable**: Switching FROM infinite to another mode restores the previous layout without broken elements or console errors.

---

### TASK 9 — CSS for infinite grid cells

**File**: `template/style.css`

Add rules to suppress drag cursor and disable individual transitions on infinite grid cells:

```css
/* Infinite grid managed cells — not individually draggable */
.ig-cell {
  cursor: default !important;
  transition: none !important;
  will-change: transform;
}

.ig-cell:hover {
  cursor: pointer !important; /* lightbox/click still works */
}
```

Also ensure the stage has no `overflow: hidden` that would clip items at negative coordinates (it currently does not, but verify).

**Verifiable**: No drag cursor appears on items in infinite mode. Click still opens lightbox.

---

### TASK 10 — Admin GUI: Add Infinite Grid config section

**File**: `admin/build-setup-app/src/components/forms/` (existing layout form file)

Add a collapsible section "Infinite Grid" with three controls:
- **Column width** → `layouts.infinite.columnWidth` (number input, 100–1200, default 520)
- **Gap between items** → `layouts.infinite.gap` (number input, 0–64, default 8)
- **Number of columns** → `layouts.infinite.numCols` (number input, 1–12, default 6)

Follow existing patterns in the forms for Rows/Stacks settings.

**File**: `admin/build-setup-app/src/lib/defaults.ts`

Add the three new fields to the defaults export.

**Verifiable**: Admin panel shows the new section. Saving triggers a hot-reload with updated values.

---

### TASK 11 — Handle category filter in infinite mode

**File**: `template/main.js`

Modify `refreshInfiniteGrid()` to skip items whose group is in `hiddenGroups`:

```js
// Inside the placements.forEach in refreshInfiniteGrid:
if (hiddenGroups.has(p.item.group)) return; // skip filtered groups
```

Also, when `focusGroup()` or `restoreAllGroups()` is called while in infinite mode, call `refreshInfiniteGrid()` after updating `hiddenGroups`.

**Verifiable**: Clicking a category in the nav hides items from other groups in the infinite grid. "View All" restores them.

---

### TASK 12 — Recompute tile on config hot-reload

**File**: `template/main.js`

In `applyConfig()`, after `mapConfig()` runs and `currentLayout === "infinite"`:

```js
if (currentLayout === "infinite") {
  // Recompute tile if column settings changed
  const newTile = computeInfiniteGridTile(
    window.mediaItems,
    siteConfig.infinite_column_width,
    siteConfig.infinite_gap,
    siteConfig.infinite_num_cols
  );
  if (JSON.stringify(newTile.placements.map(p => p.h)) !== JSON.stringify(infiniteTile?.placements?.map(p => p.h))) {
    // Release all, recompute
    for (const [, el] of infiniteActive) igRelease(el);
    infiniteActive.clear();
    infiniteTile = newTile;
    refreshInfiniteGrid();
  }
}
```

**Verifiable**: Changing `columnWidth` in the admin updates the grid live.

---

## 7. What is NOT in Scope for This Branch

- **Pinch-to-zoom on mobile** — the existing touch pan/zoom already handles this via the existing transform system. The grid refresh will trigger automatically.
- **Infinite scroll in slideshow mode** — infinite grid is a canvas-only layout. On mobile, if `mobile_mode === "slideshow"`, the infinite layout is not available (or falls back to rows).
- **Per-item resize within the grid** — items are grid-managed. No individual resize handles.
- **Spatial search / highlighting** — future feature.

---

## 8. Open Questions for the User

Before implementation begins, one question needs an answer:

> **Tile seam visibility**: When the tile repeats, the same item appears at regular intervals across the grid. This can look like a grid of wallpaper. Do you want:
> 
> **A. Identical tiles** (simplest) — Item order in the masonry is fixed. Every `tileWidth` horizontal and `tileHeight` vertical, the pattern repeats exactly.
>
> **B. Seeded shuffle per tile** — Each tile copy uses the same items but in a different pseudo-random order (seeded from `tx * 997 + ty * 31`). No two adjacent tiles look identical, the seam is invisible. Slightly more complex.
>
> **Recommendation: B** (invisible seam, much more natural-looking infinite grid). Implementation cost is one `shuffleWithSeed(items, seed)` function added to Task 3.

---

## 9. Key Technical Constraints

| Constraint | How it's respected |
|---|---|
| Vanilla JS only | Zero imports. All new code is plain functions inside the existing IIFE |
| No breaking existing layouts | `exitInfiniteGrid()` fully restores DOM state for other modes |
| Hot-reload compatible | Task 12 handles config changes while in infinite mode |
| Single transform hook | Only `updateStageTransform()` needs modification |
| `allMediaItems` cache | Not used in infinite mode (grid has its own pool). Cache is preserved for other layouts |
| CSS `will-change: transform` | Already on `.media-item` via existing CSS |

---

## 10. Estimated Effort

| Task | Complexity | Lines of code (approx) |
|---|---|---|
| 1 Config | Low | ~10 |
| 2 Dispatch stub | Low | ~10 |
| 3 Tile algorithm | Low-Medium | ~25 |
| 4 Pool helpers | Low | ~20 |
| 5 refreshInfiniteGrid | **Medium** | ~50 |
| 6 Transform hook | Low | ~2 |
| 7 layoutInfinite entry | Low | ~20 |
| 8 exitInfiniteGrid | Low | ~15 |
| 9 CSS | Low | ~10 |
| 10 Admin GUI | Low-Medium | ~40 |
| 11 Category filter | Low | ~5 |
| 12 Hot-reload | Low | ~10 |
| **Total** | | **~220 lines** |

All changes are additive. No existing function is rewritten.
