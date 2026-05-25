// Main interaction logic for the experimental canvas portfolio.
// - Builds DOM items from mediaItems (defined in data.js)
// - Randomly scatters them on a large "stage" with overlap rules
// - Enables dragging of both the background stage and individual items
// - Handles zoom via mouse wheel and footer buttons

(function () {
  const stage = document.getElementById("stage");
  const stageWrapper = document.getElementById("stage-wrapper");
  if (!stage || !stageWrapper || !Array.isArray(window.mediaItems)) {
    console.warn("Canvas portfolio: missing stage or mediaItems.");
    return;
  }

  // Virtual canvas configuration
  const isMobile = window.innerWidth < 768;
  const STAGE_WIDTH = isMobile ? 4500 : 9000;
  const STAGE_HEIGHT = isMobile ? 6000 : 6500;

  // Apply dimensions to DOM immediately so layout matches logic
  // (Moved inside init() to avoid breaking slideshow mode)

  // Zoom configuration (ZOOM_MIN will be adjusted based on content bounds)
  let ZOOM_MIN = 0.4;
  const ZOOM_MAX = 2.4;
  const ZOOM_STEP = 0.12;


  let zoomLevel = 1;
  let stageX = 0;
  let stageY = 0;

  // Store initial view state for reset
  let initialZoom = 1;
  let initialStageX = 0;
  let initialStageY = 0;

  // For z-index ordering on click/drag
  let zCounter = 10;

  // Track where items are placed to enforce overlap constraints
  const placedRects = [];
  const overlapCount = new Map(); // element -> number of overlaps (max 1 by rules)

  // Set by initPreloader(); called on each asset load or error so the bar advances.
  let notifyAssetLoaded = null;

  // Tracks the currently-playing YouTube embed figure element (max 1 active).
  let activeYTEl = null;

  // Tracks which groups are currently hidden via nav filter.
  const hiddenGroups = new Set();

  // Current layout mode: "random" | "rows" | "stacks"
  let currentLayout = "random";

  // Site config loaded from config.json
  // Keys mirror the config.json schema; defaults match template defaults.
  let siteConfig = {
    // site
    name:            "My Portfolio",
    email:           "",
    infoText:        "",
    // ui.modules
    show_title:      true,
    title_mode:      "text",
    logo_file:       "",
    show_email:      true,
    show_info:       true,
    show_categories: true,
    show_layout:     true,
    show_zoom:       true,
    // theme
    text_colour:      "#ffff00",
    background_colour: "#f7f5f0",
    blend_mode:       true,
    // layouts
    layout_names:    ["\u2569\u2569\u2569", "\u2564\u2564\u2564", "\u2567\u2567\u2567"],
    default_layout:  "random",
    // misc
    mobile_mode:     "canvas",
    ui_text_size:    "18px",
  };

  // Active stack objects built by layoutStacks(); cleared on exit.
  let activeStacks = [];

  // Interaction state
  let spaceDown = false;

  window.addEventListener("keydown", (e) => {
    // Don't fire shortcuts when typing in an input / contenteditable
    if (e.target.matches("input, textarea, [contenteditable]")) return;

    if (e.code === "Space") spaceDown = true;

    // ESC — close Info Overlay
    if (e.key === "Escape") {
      const overlay = document.getElementById("info-overlay");
      if (overlay && overlay.classList.contains("is-visible")) {
        overlay.classList.remove("is-visible");
        document.getElementById("nav-info-btn")?.setAttribute("aria-pressed", "false");
      }
    }

    // Zoom: + / = → in,  - → out,  0 → reset
    if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomIn(); }
    if (e.key === "-")                  { e.preventDefault(); zoomOut(); }
    if (e.key === "0")                  { e.preventDefault(); resetView(); }

    // Arrow key pan — Space held = 4× faster
    const PAN_STEP = spaceDown ? 160 : 40;
    if (e.key === "ArrowLeft")  { e.preventDefault(); stageX += PAN_STEP;  scheduleStageTransform(); }
    if (e.key === "ArrowRight") { e.preventDefault(); stageX -= PAN_STEP;  scheduleStageTransform(); }
    if (e.key === "ArrowUp")    { e.preventDefault(); stageY += PAN_STEP;  scheduleStageTransform(); }
    if (e.key === "ArrowDown")  { e.preventDefault(); stageY -= PAN_STEP;  scheduleStageTransform(); }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceDown = false;
  });
  
  // Only prevent context menu if we are actively dragging/panning
  stageWrapper.addEventListener("contextmenu", (e) => {
    if (isPanning || document.querySelector(".is-dragging")) {
      e.preventDefault();
    }
  });

  // Utility: apply stage transform based on zoom and pan
  let rafPending = false;
  function scheduleStageTransform() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(() => {
      rafPending = false;
      updateStageTransform();
    });
  }

  function updateStageTransform() {
    const translateX = stageX;
    const translateY = stageY;
    stage.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${zoomLevel})`;
  }

  // Zoom helpers
  function setZoom(nextZoom, centerX, centerY) {
    const oldZoom = zoomLevel;
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    if (clamped === oldZoom) return;

    stage.classList.add("is-interacting");
    const rect = stageWrapper.getBoundingClientRect();
    const cx = centerX != null ? centerX : rect.width / 2;
    const cy = centerY != null ? centerY : rect.height / 2;

    // Keep the point under the cursor roughly stable
    const dx = cx - rect.left;
    const dy = cy - rect.top;

    stageX = dx - ((dx - stageX) * clamped) / oldZoom;
    stageY = dy - ((dy - stageY) * clamped) / oldZoom;

    zoomLevel = clamped;
    scheduleStageTransform();

    window.clearTimeout(setZoom._t);
    setZoom._t = window.setTimeout(() => {
      stage.classList.remove("is-interacting");
    }, 90);
  }

  function zoomIn(centerX, centerY) {
    setZoom(zoomLevel * (1 + ZOOM_STEP), centerX, centerY);
  }

  function zoomOut(centerX, centerY) {
    setZoom(zoomLevel * (1 - ZOOM_STEP), centerX, centerY);
  }

  function resetView() {
    zoomLevel = initialZoom;
    stageX = initialStageX;
    stageY = initialStageY;
    scheduleStageTransform();
  }

  // Random scattering with overlap rules
  function getRandomPosition(width, height, customBounds = null) {
    // Scarcity: large gutters, big stage
    const margin = 520;
    const minX = customBounds ? customBounds.minX : margin;
    const minY = customBounds ? customBounds.minY : margin;
    const maxX = (customBounds ? customBounds.maxX : STAGE_WIDTH) - width - margin;
    const maxY = (customBounds ? customBounds.maxY : STAGE_HEIGHT) - height - margin;

    const x = minX + Math.random() * Math.max(1, maxX - minX);
    const y = minY + Math.random() * Math.max(1, maxY - minY);
    return { x, y };
  }

  function rectOverlapArea(a, b) {
    const xOverlap = Math.max(
      0,
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    );
    return xOverlap * yOverlap;
  }

  function canPlaceRect(candidate, existingRects, maxOverlapRatio = 0.2) {
    const candidateArea = candidate.width * candidate.height;
    const overlaps = [];

    for (const existing of existingRects) {
      const area = rectOverlapArea(candidate, existing);
      if (area <= 0) continue;

      overlaps.push(existing);
      if (overlaps.length > 1) {
        // Candidate cannot overlap more than 1 item total
        return { allowed: false };
      }

      const existingArea = existing.width * existing.height;
      const ratioCandidate = area / candidateArea;
      const ratioExisting = area / existingArea;

      if (
        ratioCandidate > maxOverlapRatio ||
        ratioExisting > maxOverlapRatio
      ) {
        // More than 20% overlap with either surface -> not allowed
        return { allowed: false };
      }

      // If either rect is already overlapping someone else, don't allow a third overlap
      const existingCount = overlapCount.get(existing.el) || 0;
      if (existingCount >= 1) {
        return { allowed: false };
      }
    }

    return { allowed: true, overlaps };
  }

  function registerPlacedRect(rect, overlaps) {
    placedRects.push(rect);
    if (overlaps.length === 1) {
      overlapCount.set(rect.el, 1);
      overlapCount.set(overlaps[0].el, 1);
    } else {
      overlapCount.set(rect.el, 0);
    }
  }

  function getContentBounds() {
    if (!placedRects.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of placedRects) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // Preload thumbnails and images so tiles don't appear empty on first paint.
  function preloadMedia() {
    if (!Array.isArray(window.mediaItems)) return;
    window.mediaItems.forEach((item) => {
      try {
        if (item.type === "image") {
          const img = new Image();
          img.src = item.src;

        } else if (item.type === "video-embed" && item.videoId) {
          const img = new Image();
          img.src = `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
        }
      } catch (_e) {
        // best-effort; ignore individual preload failures
      }
    });
  }

  function attachReloadBadge(el, label, onReload) {
    el.classList.add("has-error");
    el.classList.remove("loading");

    // Remove any existing badge first
    const prev = el.querySelector(".reload-badge");
    if (prev) prev.remove();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reload-badge";
    btn.textContent = label;
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      el.classList.remove("has-error");
      el.classList.add("loading");
      btn.remove();
      onReload();
    });

    el.appendChild(btn);
  }

  // ── Accessibility: aria-live announcer ────────────────────────────────────

  function buildAnnouncer() {
    const el = document.createElement("div");
    el.id = "a11y-announcer";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
    return el;
  }

  let announcerEl = null;
  let announceTimer = null;

  function announce(msg) {
    if (!announcerEl) announcerEl = buildAnnouncer();
    // Clear then set — forces screen readers to re-read even identical messages
    announcerEl.textContent = "";
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      announcerEl.textContent = msg;
    }, 50);
  }

  // ── Nav: folder-driven category menu ───────────────────────────────────

  function toggleGroup(group, btnEl) {
    if (hiddenGroups.has(group)) {
      hiddenGroups.delete(group);
      btnEl.classList.remove("is-struck");
      btnEl.setAttribute("aria-pressed", "false");
      stage.querySelectorAll(`.media-item[data-group="${group}"]`).forEach((el) => {
        el.style.display = "";
      });
      announce(group.toUpperCase() + " VISIBLE");
    } else {
      hiddenGroups.add(group);
      btnEl.classList.add("is-struck");
      btnEl.setAttribute("aria-pressed", "true");
      stage.querySelectorAll(`.media-item[data-group="${group}"]`).forEach((el) => {
        el.style.display = "none";
      });
      announce(group.toUpperCase() + " HIDDEN");
    }
    // Reflow non-random layouts after filter change
    if (currentLayout !== "random") applyLayout(currentLayout);
  }

  // ── Info Overlay ─────────────────────────────────────────────────────────────

  // Tiny Markdown renderer: **bold**, _italic_, bare https://... → <a>
  function renderMarkdown(raw) {
    // 1. Escape HTML special chars
    let html = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // 2. Markdown Links: [text](url)
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // 3. Auto-link bare URLs (that are not already inside an href)
    html = html.replace(
      /(^|[^\w"'])(https?:\/\/[^\s,;]+)/g,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
    );
    // 4. Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // 5. Italic: _text_
    html = html.replace(/(?<![a-zA-Z])_(.+?)_(?![a-zA-Z])/g, "<em>$1</em>");
    // 6. Newlines → spaces (single-paragraph layout)
    html = html.replace(/\r?\n/g, " ").trim();
    return html;
  }

  // Binary-search font-size so text fills targetRatio of the overlay height.
  function autoscaleText(overlayEl, textEl) {
    const overlayH = overlayEl.getBoundingClientRect().height;
    const target   = overlayH * 0.78;
    let lo = 10;
    let hi = 280;
    
    // On mobile, we don't want the text to become absurdly large if it's short.
    const isMobileNow = window.innerWidth < 768;
    if (isMobileNow) hi = 48; // cap at 48px on mobile

    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      textEl.style.fontSize = mid + "px";
      if (textEl.scrollHeight < target) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    textEl.style.fontSize = lo + "px";
  }

  let infoLoaded = false;
  let infoBodyText = ""; // info body text from config.json

  // ── Map config.json → flat siteConfig ─────────────────────────────────────
  // Converts the nested config.json structure into the flat siteConfig object
  // that the rest of main.js uses internally. Safe-access every key.
  function mapConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return;

    // site identity
    if (cfg.site) {
      if (cfg.site.title   != null) siteConfig.name      = cfg.site.title;
      if (cfg.site.email   != null) siteConfig.email     = cfg.site.email;
      if (cfg.site.infoText != null) {
        infoBodyText = cfg.site.infoText.replace(/\\n/g, "\n").trim();
        infoLoaded = true;
      }
    }

    // ui modules visibility + title mode
    if (cfg.ui) {
      const mods = cfg.ui.modules || {};
      if (mods.title != null) {
        siteConfig.show_title = mods.title.visible !== false;
        siteConfig.title_mode = mods.title.mode || "text";
        siteConfig.logo_file  = mods.title.logoFile || "";
        // Allow overriding display text separately from site.title
        if (mods.title.text) siteConfig.name = mods.title.text;
      }
      if (mods.email    != null) siteConfig.show_email      = mods.email.visible    !== false;
      if (mods.info     != null) siteConfig.show_info       = mods.info.visible     !== false;
      if (mods.categories != null) siteConfig.show_categories = mods.categories.visible !== false;
      if (mods.layouts  != null) siteConfig.show_layout     = mods.layouts.visible  !== false;
      if (cfg.ui.zoom   != null) siteConfig.show_zoom       = cfg.ui.zoom.visible   !== false;
      if (cfg.ui.textSize)       siteConfig.ui_text_size    = cfg.ui.textSize;
    }

    // theme
    if (cfg.theme) {
      if (cfg.theme.textColor        != null) siteConfig.text_colour       = cfg.theme.textColor;
      if (cfg.theme.backgroundColor  != null) siteConfig.background_colour = cfg.theme.backgroundColor;
      if (cfg.theme.blendMode        != null) siteConfig.blend_mode        = cfg.theme.blendMode;
    }

    // layouts
    if (cfg.layouts) {
      if (Array.isArray(cfg.layouts.labels)) siteConfig.layout_names  = cfg.layouts.labels;
      if (cfg.layouts.default)               siteConfig.default_layout = cfg.layouts.default;
    }

    // mobile
    if (cfg.mobile && cfg.mobile.defaultMode) {
      siteConfig.mobile_mode = cfg.mobile.defaultMode;
    }
  }

  // Applies CSS custom properties from siteConfig to the document root.
  function applyConfigCSS() {
    if (siteConfig.text_colour) {
      document.documentElement.style.setProperty("--text-colour", siteConfig.text_colour);
    }
    if (siteConfig.background_colour) {
      document.documentElement.style.setProperty("--bg-colour", siteConfig.background_colour);
    }
    if (siteConfig.ui_text_size && !isMobile) {
      document.documentElement.style.setProperty("--ui-text-size", siteConfig.ui_text_size);
    }
    if (siteConfig.blend_mode === false) {
      document.body.classList.add("no-blend-mode");
    } else {
      document.body.classList.remove("no-blend-mode");
    }
  }

  // Fetches config.json once and populates siteConfig + infoBodyText.
  // Called from init() before buildNav() so the nav reflects config immediately.
  async function loadSiteConfig() {
    try {
      const r = await fetch("config.json");
      if (!r.ok) return;
      const cfg = await r.json();
      // Store full config for window.applyConfig access
      window._siteConfigRaw = cfg;
      mapConfig(cfg);
      applyConfigCSS();
    } catch (_) {
      // best-effort; fall back to defaults
    }
  }

  // ── window.applyConfig — GUI hot-reload entry point ────────────────────────
  // Called by the setup GUI via postMessage to update the live preview
  // without a full page reload. Accepts the full config.json object.
  window.applyConfig = function applyConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    window._siteConfigRaw = cfg;
    mapConfig(cfg);
    applyConfigCSS();
    applyTheme(cfg);          // Phase 3: apply theme colours, bg effect, noise, shadow
    buildZoneContainers();    // Phase 2: rebuild zone containers for new positions

    // Rebuild UI modules that depend on config
    const navRight = document.getElementById("nav-right");
    if (navRight) {
      navRight.innerHTML = "";
      buildNav();
    }
    // Refresh info text if overlay is open
    const overlay = document.getElementById("info-overlay");
    const textEl  = document.getElementById("info-text");
    if (overlay && textEl && overlay.classList.contains("is-visible")) {
      textEl.innerHTML = renderMarkdown(infoBodyText);
      requestAnimationFrame(() => autoscaleText(overlay, textEl));
    }
  };

  // Listen for postMessage from GUI setup iframe parent
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "config-update" && event.data.config) {
      window.applyConfig(event.data.config);
    }
  });

  // ── Zone Container System (Phase 2) ──────────────────────────────────────────
  // Creates (or re-creates) 8 fixed div zone containers used on desktop.
  // On mobile, zone containers are hidden by CSS; the legacy <nav> handles layout.

  const ZONE_IDS = [
    "top-left", "top-center", "top-right",
    "middle-left", "middle-right",
    "bottom-left", "bottom-center", "bottom-right",
  ];

  function buildZoneContainers() {
    if (isMobile) return; // zones not used on mobile

    // Remove any existing zone containers
    document.querySelectorAll(".zone-container").forEach((el) => el.remove());

    ZONE_IDS.forEach((zone) => {
      const div = document.createElement("div");
      div.className = `zone-container zone-${zone}`;
      div.id = `zone-${zone}`;
      document.body.appendChild(div);
    });
  }

  // Returns the zone container element for a given zone string (e.g. "top-left").
  // Falls back to document.body if the zone doesn't exist.
  function getZone(zoneName) {
    return document.getElementById(`zone-${zoneName}`) || document.body;
  }

  // ── Theme System (Phase 3) ──────────────────────────────────────────────────────
  // Reads the full config object (window._siteConfigRaw) and applies:
  // • CSS custom properties for colours, gradients, noise, shadow
  // • Body classes for background effect and text animation
  // • Injects the SVG feTurbulence grain filter if noise is enabled

  const BG_EFFECT_CLASSES = ["bg-solid", "bg-gradient-static", "bg-gradient-animated", "bg-blob-mesh", "bg-noise"];
  const TEXT_FX_CLASSES   = ["text-fx-color-cycle", "text-fx-gradient", "text-fx-hue-rotate"];

  function applyTheme(cfg) {
    if (!cfg || !cfg.theme) return;
    const t   = cfg.theme;
    const root = document.documentElement;

    // ─ Colours ─
    if (t.backgroundColor) {
      root.style.setProperty("--bg-colour",   t.backgroundColor);
      root.style.setProperty("--bg-from",     t.backgroundColor);
    }
    if (t.backgroundGradientFrom) root.style.setProperty("--bg-from", t.backgroundGradientFrom);
    if (t.backgroundGradientTo)   root.style.setProperty("--bg-to",   t.backgroundGradientTo);
    if (t.textColor) root.style.setProperty("--text-colour", t.textColor);

    // ─ Shadow ─
    const shadow = t.imageShadow || {};
    if (shadow.enabled === false) {
      document.body.classList.add("no-shadow");
    } else {
      document.body.classList.remove("no-shadow");
      if (shadow.blur  != null) root.style.setProperty("--shadow-blur",  shadow.blur + "px");
      if (shadow.color != null) {
        // Convert hex + opacity to rgba
        const hex = shadow.color || "#000000";
        const op  = shadow.opacity != null ? shadow.opacity : 0.06;
        const r   = parseInt(hex.slice(1, 3), 16);
        const g   = parseInt(hex.slice(3, 5), 16);
        const b   = parseInt(hex.slice(5, 7), 16);
        root.style.setProperty("--shadow-color", `rgba(${r},${g},${b},${op})`);
      }
    }

    // ─ Blend mode ─
    if (t.blendMode === false) {
      document.body.classList.add("no-blend-mode");
    } else {
      document.body.classList.remove("no-blend-mode");
    }

    // ─ Background effect ─
    document.body.classList.remove(...BG_EFFECT_CLASSES);
    const effect = t.backgroundEffect || "solid";
    if (effect === "solid")             document.body.classList.add("bg-solid");
    else if (effect === "gradient-static")   document.body.classList.add("bg-gradient-static");
    else if (effect === "gradient-animated") document.body.classList.add("bg-gradient-animated");
    else if (effect === "blob-mesh")    document.body.classList.add("bg-blob-mesh");

    // ─ Noise/grain ─
    const noise = t.noiseGrain || {};
    if (noise.enabled) {
      root.style.setProperty("--noise-opacity", String(noise.opacity != null ? noise.opacity : 0.04));
      _ensureGrainFilter(effect === "blob-mesh"); // blob-mesh needs #grain-overlay div
      document.body.classList.add("bg-noise");
    } else {
      root.style.setProperty("--noise-opacity", "0");
      document.body.classList.remove("bg-noise");
      const go = document.getElementById("grain-overlay");
      if (go) go.remove();
    }

    // ─ Text animation ─
    document.body.classList.remove(...TEXT_FX_CLASSES);
    const textFx = t.textAnimation || "none";
    if (textFx === "color-cycle")  document.body.classList.add("text-fx-color-cycle");
    else if (textFx === "gradient") document.body.classList.add("text-fx-gradient");
    else if (textFx === "hue-rotate") document.body.classList.add("text-fx-hue-rotate");
  }

  // Injects the SVG feTurbulence grain filter once.
  // When blob-mesh is active, injects a #grain-overlay div instead of relying on body::before.
  function _ensureGrainFilter(useDivOverlay) {
    if (!document.getElementById("grain-filter-svg")) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "grain-filter-svg";
      svg.setAttribute("style", "display:none");
      svg.innerHTML = `
        <defs>
          <filter id="grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3"
              stitchTiles="stitch" result="noise"/>
            <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
            <feBlend in="SourceGraphic" in2="grey" mode="multiply"/>
          </filter>
        </defs>`;
      document.body.appendChild(svg);
    }
    // When blob-mesh is active body::before is used by the blobs, so inject a div overlay
    if (useDivOverlay && !document.getElementById("grain-overlay")) {
      const div = document.createElement("div");
      div.id = "grain-overlay";
      document.body.appendChild(div);
    }
  }

  function openInfoOverlay(overlayEl, textEl) {
    overlayEl.classList.add("is-visible");
    const infoBtn = document.getElementById("nav-info-btn");
    if (infoBtn) {
      infoBtn.setAttribute("aria-pressed", "true");
      infoBtn.textContent = "[INFO ▽]";
    }

    if (!infoLoaded) {
      // Config wasn't pre-loaded (unusual); fetch config.json now
      fetch("config.json")
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((cfg) => {
          window._siteConfigRaw = cfg;
          mapConfig(cfg);
          applyConfigCSS();
          textEl.innerHTML = renderMarkdown(infoBodyText);
          requestAnimationFrame(() => autoscaleText(overlayEl, textEl));
        })
        .catch(() => { textEl.textContent = "[INFO NOT FOUND]"; infoLoaded = true; });
    } else {
      if (!textEl.innerHTML) textEl.innerHTML = renderMarkdown(infoBodyText);
      requestAnimationFrame(() => autoscaleText(overlayEl, textEl));
    }
  }

  function closeInfoOverlay(overlayEl) {
    overlayEl.classList.remove("is-visible");
    const infoBtn = document.getElementById("nav-info-btn");
    if (infoBtn) {
      infoBtn.setAttribute("aria-pressed", "false");
      infoBtn.textContent = "[INFO ▷]";
    }
  }

  function toggleInfo() {
    const overlay = document.getElementById("info-overlay");
    const textEl  = document.getElementById("info-text");
    if (!overlay || !textEl) return;
    if (overlay.classList.contains("is-visible")) {
      closeInfoOverlay(overlay);
    } else {
      openInfoOverlay(overlay, textEl);
    }
  }

  // Re-scale text if window is resized while overlay is open
  window.addEventListener("resize", () => {
    const overlay = document.getElementById("info-overlay");
    const textEl  = document.getElementById("info-text");
    if (overlay && textEl && overlay.classList.contains("is-visible")) {
      autoscaleText(overlay, textEl);
    }
  });

  function buildNav() {
    // On desktop: hide the legacy <nav> and use zone containers instead.
    // On mobile: the <nav> remains visible and unchanged.
    const legacyNav   = document.querySelector(".nav");
    const legacyLeft  = document.querySelector(".nav-left");
    const legacyRight = document.getElementById("nav-right");

    if (!isMobile) {
      // Hide legacy nav elements — zones take over
      if (legacyLeft)  legacyLeft.style.display  = "none";
      if (legacyRight) legacyRight.style.display = "none";
      if (legacyNav)   legacyNav.style.pointerEvents = "none";
    } else {
      // Restore legacy nav (mobile)
      if (legacyLeft)  legacyLeft.style.display  = "";
      if (legacyRight) legacyRight.style.display = "";
    }

    // ─ Title module ─
    const cfg      = window._siteConfigRaw || {};
    const uiMods   = (cfg.ui && cfg.ui.modules) || {};
    const titleCfg = uiMods.title || {};

    if (!isMobile && titleCfg.visible !== false) {
      const titleZone = getZone(titleCfg.position || "top-left");

      // Remove any existing title module in any zone
      document.querySelectorAll(".zone-title-module").forEach((el) => el.remove());

      const titleEl = document.createElement("div");
      titleEl.className = "zone-title-module nav-left";
      titleEl.style.display = "flex";
      titleEl.style.gap = "8px";
      titleEl.style.alignItems = "center";
      titleEl.style.pointerEvents = "auto";

      const titleMode = siteConfig.title_mode || "text";

      const buildSvg = () => {
        if (!siteConfig.logo_file) return;
        const container = document.createElement("div");
        container.className = "site-logo";
        fetch(siteConfig.logo_file)
          .then(r => {
            if (!r.ok) throw new Error("Logo fetch failed");
            return r.text();
          })
          .then(svgText => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, "image/svg+xml");
            const svgEl = doc.querySelector("svg");
            if (svgEl) {
              svgEl.removeAttribute("width");
              svgEl.removeAttribute("height");
              svgEl.style.display = "block";
              svgEl.style.height = "1em";
              svgEl.style.width = "auto";
              svgEl.style.fill = "currentColor";
              svgEl.querySelectorAll("path, circle, rect, polygon, ellipse").forEach(shape => {
                shape.style.fill = "currentColor";
              });
              container.innerHTML = svgEl.outerHTML;
            } else {
              throw new Error("Invalid SVG content");
            }
          })
          .catch(err => {
            console.error("[nav] Logo error:", err);
            const img = document.createElement("img");
            img.src = siteConfig.logo_file;
            img.style.height = "1em";
            img.style.width = "auto";
            container.appendChild(img);
          });
        titleEl.appendChild(container);
      };

      const buildText = () => {
        if (!siteConfig.name) return;
        const span = document.createElement("span");
        span.textContent = siteConfig.name;
        titleEl.appendChild(span);
      };

      if (titleMode === "text")       buildText();
      else if (titleMode === "svg")       buildSvg();
      else if (titleMode === "svg_text") { buildSvg(); buildText(); }
      else if (titleMode === "text_svg") { buildText(); buildSvg(); }

      titleZone.appendChild(titleEl);
    }

    // Mobile title fallback (still updates the legacy nav-left text)
    if (isMobile && legacyLeft) {
      if (siteConfig.show_title === false) {
        legacyLeft.style.display = "none";
      } else {
        legacyLeft.innerHTML = "";
        const span = document.createElement("span");
        span.textContent = siteConfig.name;
        legacyLeft.appendChild(span);
      }
    }

    // ─ Email + Info modules ─
    const emailCfg = uiMods.email || {};
    const infoCfg  = uiMods.info  || {};
    const email     = siteConfig.email || "";

    if (!Array.isArray(window.mediaItems)) return;

    if (!isMobile) {
      // Remove any existing email/info modules in zones
      document.querySelectorAll(".zone-email-module, .zone-info-module").forEach((el) => el.remove());

      // Email module
      if (email && emailCfg.visible !== false && siteConfig.show_email !== false) {
        const emailZone = getZone(emailCfg.position || "top-right");
        const emailEl   = document.createElement("a");
        emailEl.className = "nav-btn nav-email zone-email-module";
        emailEl.href = "mailto:" + email;
        emailEl.textContent = "[" + email.toUpperCase() + "]";
        emailEl.style.pointerEvents = "auto";
        emailZone.appendChild(emailEl);
      }

      // Info module
      if (infoCfg.visible !== false && siteConfig.show_info !== false) {
        const infoZone = getZone(infoCfg.position || "top-right");
        const infoBtn  = document.createElement("button");
        infoBtn.type = "button";
        infoBtn.id = "nav-info-btn";
        infoBtn.className = "nav-btn nav-info zone-info-module";
        infoBtn.textContent = "[INFO ▷]";
        infoBtn.style.pointerEvents = "auto";
        infoBtn.addEventListener("click", toggleInfo);
        infoZone.appendChild(infoBtn);
      }
    } else {
      // Mobile: populate legacy nav-right
      if (legacyRight) {
        legacyRight.innerHTML = "";
        const navItems = [];
        if (email && siteConfig.show_email !== false) {
          navItems.push({ type: "email", label: email.toUpperCase() });
        }
        if (siteConfig.show_info !== false) {
          navItems.push({ type: "info", label: "INFO" });
        }
        navItems.forEach((item, i) => {
          if (i > 0) {
            const sep = document.createElement("span");
            sep.className = "nav-sep";
            sep.setAttribute("aria-hidden", "true");
            sep.textContent = " | ";
            legacyRight.appendChild(sep);
          }
          let el;
          if (item.type === "info") {
            el = document.createElement("button");
            el.type = "button";
            el.id = "nav-info-btn";
            el.className = "nav-btn nav-info";
            el.textContent = "[INFO ▷]";
            el.addEventListener("click", toggleInfo);
          } else {
            el = document.createElement("a");
            el.href = "mailto:" + email;
            el.className = "nav-btn nav-email";
            el.textContent = "[" + item.label + "]";
          }
          legacyRight.appendChild(el);
        });
      }
    }
  }


  // ── YouTube embed reset ──
  function resetYTEmbed(figureEl) {
    figureEl.querySelectorAll("iframe, .yt-reset-btn").forEach((n) => n.remove());
    figureEl.classList.remove("is-playing");
    if (activeYTEl === figureEl) activeYTEl = null;
  }

  // ── Preloader ──
  function initPreloader(total) {
    const preloaderEl = document.getElementById("preloader");
    const barEl       = document.getElementById("preloader-bar");
    const counterEl   = document.getElementById("preloader-counter");

    if (!preloaderEl || !barEl || !counterEl || total === 0) {
      if (preloaderEl) preloaderEl.remove();
      return null;
    }

    // Measure real character width for this font + size combination.
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:fixed;visibility:hidden;white-space:pre;font-size:14px;" +
      'font-family:"JetBrains Mono","Cascadia Code","Source Code Pro",Menlo,Monaco,"Courier New",monospace;';
    probe.textContent = "▓".repeat(20);
    document.body.appendChild(probe);
    const charWidth = probe.getBoundingClientRect().width / 20 || 8.4;
    probe.remove();

    let loaded = 0;

    function render() {
      const totalChars  = Math.max(1, Math.floor(window.innerWidth / charWidth));
      const filledCount = Math.round((loaded / total) * totalChars);
      const emptyCount  = totalChars - filledCount;
      barEl.textContent     = "▓".repeat(filledCount) + "░".repeat(emptyCount);
      counterEl.textContent = "[" + loaded + "/" + total + "]";
    }

    render(); // initial state: empty bar

    return function onAssetLoaded() {
      loaded = Math.min(loaded + 1, total);
      render();
      if (loaded >= total) {
        // Hard cut — no animation, brutalist.
        preloaderEl.remove();
      }
    };
  }

  // Build DOM items from mediaItems
  function createMediaElement(item) {
    const el = document.createElement("figure");
    el.className = "media-item";
    el.dataset.id = item.id;
    el.dataset.group = item.group || "";
    el._mediaItem = item; // store ref for LoD swapping
    // tabIndex intentionally omitted — items are drag targets, not keyboard controls.
    // role + aria-label preserved for screen readers.
    el.setAttribute("role", "img");        // convey media nature
    el.setAttribute("aria-label",
      item.group ? `${item.group} — ${item.id}` : item.id
    );
    let baseWidth = item.width || 520;
    const ratio =
      item.width && item.height ? item.width / item.height : 520 / 340;

    // Normalize relative sizing:
    // - Portraits slightly smaller so they don't tower
    // - Photography group slightly smaller to sit with the rest
    if (ratio < 0.95) {
      baseWidth *= 0.8; // portraits ~20% smaller
    }
    if (item.group === "photography") {
      baseWidth *= 0.85;
    }

    const randomScale = 0.95 + Math.random() * 0.1; // 0.95–1.05 (±5%)
    const w = Math.round(baseWidth * randomScale);
    el.style.width = w + "px";
    el.style.aspectRatio = String(ratio);
    el.classList.add("loading");

    // Different rendering depending on type
    if (item.type === "image") {
      const img = document.createElement("img");
      img.alt = "";
      // Removed decoding="async" to ensure simpler synchronous/load behavior

      const handleLoad = () => {
        // Guard: only execute if still marked loading
        if (el.classList.contains("loading")) {
          console.info("[canvas] image loaded", item.src);
          if (img.naturalWidth && img.naturalHeight) {
            el.style.aspectRatio = String(img.naturalWidth / img.naturalHeight);
          }
          el.classList.remove("loading");
          if (notifyAssetLoaded) notifyAssetLoaded();
        }
      };

      img.addEventListener("load", handleLoad);
      img.addEventListener("error", () => {
        console.warn("[canvas] image FAILED to load", item.src);
        if (notifyAssetLoaded) notifyAssetLoaded();
        attachReloadBadge(el, "RELOAD", () => {
          // Force a fresh request by busting cache query param
          const base = item.src;
          const sep = base.includes("?") ? "&" : "?";
          img.src = base + sep + "reload=" + Date.now();
        });
      });

      // Set src LAST so listeners are ready
      img.src = item.src;

      // Immediate check for cached images
      if (img.complete) {
        handleLoad();
      }
      el.appendChild(img);
    } else if (item.type === "video-local") {
      const video = document.createElement("video");
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;


      const handleVideoLoad = () => {
        if (el.classList.contains("loading")) {
          console.info("[canvas] local video metadata loaded", item.src);
          if (video.videoWidth && video.videoHeight) {
            el.style.aspectRatio = String(video.videoWidth / video.videoHeight);
          }
          el.classList.remove("loading");
          if (notifyAssetLoaded) notifyAssetLoaded();
        }
      };

      video.addEventListener("loadedmetadata", handleVideoLoad);
      video.addEventListener("error", () => {
        console.warn("[canvas] local video FAILED to load", item.src);
        if (notifyAssetLoaded) notifyAssetLoaded();
        attachReloadBadge(el, "RELOAD", () => {
          const base = item.src;
          const sep = base.includes("?") ? "&" : "?";
          video.src = base + sep + "reload=" + Date.now();
        });
      });

      // Set src LAST
      video.src = item.src;

      // Immediate check for cached video metadata
      if (video.readyState >= 1) {
        handleVideoLoad();
      }
      el.appendChild(video);
    } else if (item.type === "video-embed") {
      el.classList.add("video-embed");
      el.style.aspectRatio = "16 / 9";

      const videoId = item.videoId;
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&mute=0`;
      const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const placeholder = document.createElement("button");
      placeholder.type = "button";
      placeholder.className = "video-placeholder";

      const thumb = document.createElement("img");
      thumb.alt = "";

      const handleThumbLoad = () => {
        if (el.classList.contains("loading")) {
          console.info("[canvas] external thumb loaded", thumbUrl);
          el.classList.remove("loading");
          if (notifyAssetLoaded) notifyAssetLoaded();
        }
      };

      thumb.addEventListener("load", handleThumbLoad);
      thumb.addEventListener("error", () => {
        console.warn("[canvas] external thumb FAILED to load", thumbUrl);
        if (notifyAssetLoaded) notifyAssetLoaded();
        attachReloadBadge(el, "RELOAD", () => {
          const base = thumbUrl;
          const sep = base.includes("?") ? "&" : "?";
          thumb.src = base + sep + "reload=" + Date.now();
        });
      });

      // Set src LAST
      thumb.src = thumbUrl;

      // Immediate check
      if (thumb.complete) {
        handleThumbLoad();
      }

      placeholder.appendChild(thumb);

      // Split Overlay and Text
      const overlay = document.createElement("span");
      overlay.className = "video-overlay";
      placeholder.appendChild(overlay);

      const badge = document.createElement("span");
      badge.className = "play-badge";
      const badgeInner = document.createElement("span");
      badgeInner.className = "play-badge-text";
      badgeInner.textContent = "PLAY VIDEO";
      badge.appendChild(badgeInner);
      placeholder.appendChild(badge);

      placeholder.addEventListener("click", () => {
        // Reset any other active YT embed first (max 1 at a time)
        if (activeYTEl && activeYTEl !== el) {
          resetYTEmbed(activeYTEl);
        }

        const iframe = document.createElement("iframe");
        iframe.src = embedUrl;
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;

        // [x] button restores the item to its draggable thumbnail state
        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "yt-reset-btn";
        resetBtn.setAttribute("aria-label", "Close video");
        resetBtn.textContent = "[×]";
        resetBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          resetYTEmbed(el);
        });

        el.appendChild(iframe);
        el.appendChild(resetBtn);
        el.classList.add("is-playing");
        activeYTEl = el;
      });

      el.appendChild(placeholder);
    }

    // Bring to front on click
    el.addEventListener("mousedown", () => {
      zCounter += 1;
      el.style.zIndex = String(zCounter);
    });

    return el;
  }

  function scatterItems(isSlideshow = false) {
    const shuffled = [...window.mediaItems].sort(() => Math.random() - 0.5);

    // Define a Landing Zone in the middle of the stage for the first few items
    // to ensure they appear in the initial viewport on mobile canvas mode.
    const landingZone = {
      minX: STAGE_WIDTH / 2 - 800,
      maxX: STAGE_WIDTH / 2 + 800,
      minY: STAGE_HEIGHT / 2 - 800,
      maxY: STAGE_HEIGHT / 2 + 800
    };

    shuffled.forEach((item, index) => {
      const el = createMediaElement(item);
      stage.appendChild(el);

      // Measure after insertion so overlap logic matches what you actually see.
      const measured = el.getBoundingClientRect();
      const width = measured.width || item.width || 520;
      const height = measured.height || item.height || 340;

      let attempts = 0;
      let placed = false;
      let rect;
      const maxAttempts = isMobile ? 1500 : 800;
      const useLandingZone = index < 3;

      while (!placed && attempts < maxAttempts) {
        attempts += 1;
        const pos = getRandomPosition(width, height, useLandingZone ? landingZone : null);
        rect = {
          x: pos.x,
          y: pos.y,
          width,
          height,
          el,
        };

        const { allowed, overlaps } = canPlaceRect(rect, placedRects, isMobile ? 0.05 : 0.2);
        if (allowed) {
          if (!isSlideshow) {
            el.style.left = rect.x + "px";
            el.style.top = rect.y + "px";
          }
          registerPlacedRect(rect, overlaps || []);
          placed = true;
        }
      }

      if (!placed && rect) {
        // Fallback: place even if overlap rules couldn't be satisfied
        if (!isSlideshow) {
          el.style.left = rect.x + "px";
          el.style.top = rect.y + "px";
        }
        registerPlacedRect(rect, []);
      }
      
      // Save random position so RANDOM mode or switching from slideshow can restore it
      const finalX = rect ? rect.x : 0;
      const finalY = rect ? rect.y : 0;
      el._randomPos = { x: finalX, y: finalY };
    });
  }

  // Light-touch helper (currently unused) left here for future experimentation
  // if we ever want to nudge a few tiles toward the initial viewport.
  function ensureInitialVisibility(_count = 4) {
    return;
  }

  // Dragging logic for the stage (background drag)
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;

  stageWrapper.addEventListener("mousedown", (event) => {
    // Left click panning only. If your cursor is on an item, hold Space to pan anyway.
    if (event.button !== 0) return;
    if (event.target.closest(".media-item") && !spaceDown) return;

    event.preventDefault();
    isPanning = true;
    stage.classList.add("is-interacting");
    stageWrapper.classList.add("is-dragging");
    panStartX = event.clientX;
    panStartY = event.clientY;
    panOriginX = stageX;
    panOriginY = stageY;
  });

  window.addEventListener("mousemove", (event) => {
    if (!isPanning) return;
    const dx = event.clientX - panStartX;
    const dy = event.clientY - panStartY;
    stageX = panOriginX + dx;
    stageY = panOriginY + dy;
    scheduleStageTransform();
  });

  window.addEventListener("mouseup", () => {
    isPanning = false;
    stageWrapper.classList.remove("is-dragging");
    stage.classList.remove("is-interacting");
  });

  // Touch handling for Mobile (Pan & Pinch-Zoom)
  let isTouchPanning = false;
  let isPinchZooming = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartStageX = 0;
  let touchStartStageY = 0;
  let initialPinchDistance = 0;
  let startZoomLevel = 1;

  function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function getMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  stageWrapper.addEventListener("touchstart", (e) => {
    // If in slideshow mode, allow native scrolling
    if (document.body.classList.contains("is-slideshow")) return;

    // If 1 finger, start panning (even if on an item, since drag is disabled on mobile)
    if (e.touches.length === 1) {
      isTouchPanning = true;
      isPinchZooming = false;
      stage.classList.add("is-interacting");
      
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartStageX = stageX;
      touchStartStageY = stageY;
    }
    // If 2 fingers, start pinch zoom
    else if (e.touches.length === 2) {
      isTouchPanning = false;
      isPinchZooming = true;
      stage.classList.add("is-interacting");

      initialPinchDistance = getDistance(e.touches);
      startZoomLevel = zoomLevel;
    }
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (document.body.classList.contains("is-slideshow")) return;
    if (!isTouchPanning && !isPinchZooming) return;
    
    // Prevent native scroll/zoom
    if (e.cancelable) e.preventDefault();

    if (isTouchPanning && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      stageX = touchStartStageX + dx;
      stageY = touchStartStageY + dy;
      scheduleStageTransform();
    }
    else if (isPinchZooming && e.touches.length === 2) {
      const currentDist = getDistance(e.touches);
      if (initialPinchDistance > 0) {
        const scale = currentDist / initialPinchDistance;
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, startZoomLevel * scale));
        
        // Calculate the midpoint of the two fingers (this is our focal point)
        const midpoint = getMidpoint(e.touches);
        
        // Adjust stage position to zoom towards the midpoint
        // Logic: The point under the fingers (midpoint) should remain stationary relative to the viewport.
        // Formula: P_new = Midpoint - (Midpoint - P_old) * (Scale_new / Scale_old)
        
        const oldZoom = zoomLevel;
        if (newZoom !== oldZoom && oldZoom > 0) {
           const rect = stageWrapper.getBoundingClientRect();
           
           // Convert midpoint to stage-relative coordinate space (before zoom change)
           // The stage transform is: Translate(stageX, stageY) * Scale(zoomLevel)
           // So a point P on screen corresponds to stage coordinates: (P - stageXY) / zoomLevel
           
           // Actually, we can just work with the translation directly:
           // We want the screen coordinate 'midpoint' to map to the same internal stage coordinate after zoom.
           // ScreenX = stageX + internalX * zoom
           // internalX = (ScreenX - stageX) / zoom
           // We want internalX to be constant.
           // (midpoint.x - newStageX) / newZoom = (midpoint.x - oldStageX) / oldZoom
           // midpoint.x - newStageX = (midpoint.x - oldStageX) * (newZoom / oldZoom)
           // newStageX = midpoint.x - (midpoint.x - oldStageX) * (newZoom / oldZoom)
           
           // However, we need to account for the wrapper offset if stageX is relative to the wrapper.
           // stageX/Y are applied as CSS transform translate3d values. 
           // The mouse/touch coordinates are clientX/Y.
           // We need midpoint relative to the wrapper to match stageX/Y frame of reference (assuming stage is at 0,0 of wrapper initially).
           
           const midRelX = midpoint.x - rect.left;
           const midRelY = midpoint.y - rect.top;
           
           const ratio = newZoom / oldZoom;
           
           stageX = midRelX - (midRelX - stageX) * ratio;
           stageY = midRelY - (midRelY - stageY) * ratio;
           
           zoomLevel = newZoom;
           scheduleStageTransform();
        }
      }
    }
  }, { passive: false });

  window.addEventListener("touchend", (e) => {
    // If we lifted all fingers, stop everything
    if (e.touches.length === 0) {
      isTouchPanning = false;
      isPinchZooming = false;
      stage.classList.remove("is-interacting");
    }
    // If we went from 2 fingers to 1, we could switch to panning, 
    // but it's often smoother to just stop until next gesture to avoid jumps.
    else if (e.touches.length === 1 && isPinchZooming) {
       // Reset pan start to avoid jump if user continues dragging
       isPinchZooming = false;
       isTouchPanning = true;
       touchStartX = e.touches[0].clientX;
       touchStartY = e.touches[0].clientY;
       touchStartStageX = stageX;
       touchStartStageY = stageY;
    }
  });

  // Dragging logic for individual media items
  function enableItemDrag(el) {
    let isDragging = false;
    let pointerOffsetX = 0;
    let pointerOffsetY = 0;
    let startClientX = 0;
    let startClientY = 0;
    let pendingLeft = 0;
    let pendingTop = 0;
    let itemRaf = false;
    let hasPassedThreshold = false;

    el.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (spaceDown) return; // Space+drag is reserved for panning

      // Prevent initiating stage pan
      event.stopPropagation();
      event.preventDefault();
      isDragging = true;
      hasPassedThreshold = false;
      el.classList.add("is-dragging");

      zCounter += 1;
      el.style.zIndex = String(zCounter);

      startClientX = event.clientX;
      startClientY = event.clientY;

      const stageRect = stage.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // Compute pointer offset inside the element in STAGE coordinates.
      pointerOffsetX = (event.clientX - elRect.left) / zoomLevel;
      pointerOffsetY = (event.clientY - elRect.top) / zoomLevel;

      // Initialize pending positions from current style to avoid jumps.
      pendingLeft = parseFloat(el.style.left || "0");
      pendingTop = parseFloat(el.style.top || "0");

      // Guard against NaN if styles are missing
      if (!Number.isFinite(pendingLeft) || !Number.isFinite(pendingTop)) {
        pendingLeft = (elRect.left - stageRect.left) / zoomLevel;
        pendingTop = (elRect.top - stageRect.top) / zoomLevel;
      }
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDragging) return;
      const moveDx = event.clientX - startClientX;
      const moveDy = event.clientY - startClientY;
      if (!hasPassedThreshold && Math.hypot(moveDx, moveDy) < 3) return;
      hasPassedThreshold = true;

      const stageRect = stage.getBoundingClientRect();
      const pointerXInStage = (event.clientX - stageRect.left) / zoomLevel;
      const pointerYInStage = (event.clientY - stageRect.top) / zoomLevel;
      pendingLeft = pointerXInStage - pointerOffsetX;
      pendingTop = pointerYInStage - pointerOffsetY;

      if (itemRaf) return;
      itemRaf = true;
      window.requestAnimationFrame(() => {
        itemRaf = false;
        el.style.left = pendingLeft + "px";
        el.style.top = pendingTop + "px";
      });
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove("is-dragging");

      // STACKS drag-out: if card moved >100px from stack origin, free it
      if (currentLayout === "stacks" && el._stack && !el.dataset.stackFree) {
        const stack = el._stack;
        const curLeft = parseFloat(el.style.left);
        const curTop  = parseFloat(el.style.top);
        const dist = Math.hypot(curLeft - stack.x, curTop - stack.y);
        if (dist > 100) {
          el.dataset.stackFree = "true";
          stack.items = stack.items.filter((i) => i !== el);
          el._stack = null;
          // If only 1 card left, dissolve the stack (no more cycling)
          if (stack.items.length <= 1 && stack.items[0]) {
            stack.items[0].dataset.stackFree = "true";
            stack.items[0]._stack = null;
            stack.items = [];
          }
        }
      }
    });
  }

  let itemDraggingWired = false;
  function wireItemDragging() {
    if (itemDraggingWired) return;
    const allItems = stage.querySelectorAll(".media-item");
    allItems.forEach((el) => enableItemDrag(el));
    itemDraggingWired = true;
  }

  // Wheel-based zoom (attached to window so it works over info overlay)
  window.addEventListener(
    "wheel",
    (event) => {
      if (document.body.classList.contains("is-slideshow")) return;
      event.preventDefault();
      if (event.deltaY < 0) zoomIn(event.clientX, event.clientY);
      else zoomOut(event.clientX, event.clientY);
    },
    { passive: false }
  );

  // Footer zoom buttons
  document.querySelectorAll(".zoom-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.zoom;
      if (mode === "in") {
        zoomIn();
      } else if (mode === "out") {
        zoomOut();
      } else if (mode === "reset") {
        resetView();
      }
    });
  });

  // ── Layout modes ──

  // Compute bounds from actual current item positions.
  // Uses _mediaItem dimensions to avoid unreliable offsetHeight reads during layout.
  function getItemBounds() {
    const ROW_H_FALLBACK = 280; // matches layoutRows constant
    const items = Array.from(stage.querySelectorAll(".media-item"))
      .filter((el) => el.style.display !== "none");
    if (!items.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach((el) => {
      const x = parseFloat(el.style.left);
      const y = parseFloat(el.style.top);
      const w = parseFloat(el.style.width);
      // Prefer data from _mediaItem; fall back to DOM
      const item = el._mediaItem;
      let h;
      if (currentLayout === "rows") {
        h = ROW_H_FALLBACK; // all items share the same row height in ROWS mode
      } else if (item && item.height) {
        h = item.height;
      } else {
        h = el.offsetHeight || 340;
      }
      // Skip any item that wound up at a non-finite coordinate (safety net)
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w)) return;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    if (!Number.isFinite(minX)) return null; // all items had bad coordinates
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  function recentreBounds() {
    // For ROWS/STACKS use actual item positions; for RANDOM use placedRects
    const bounds = (currentLayout === "random")
      ? getContentBounds()
      : getItemBounds();
    if (!bounds) return;
    const viewportRect = stageWrapper.getBoundingClientRect();
    const padding = 160;
    const scaleX = viewportRect.width  / (bounds.width  + padding);
    const scaleY = viewportRect.height / (bounds.height + padding);
    ZOOM_MIN = Math.max(0.08, Math.min(1, Math.min(scaleX, scaleY)));
    const viewCx = viewportRect.width  / 2;
    const viewCy = viewportRect.height / 2;
    // For ROWS/STACKS zoom out enough to show all content comfortably
    initialZoom = (currentLayout === "random")
      ? (isMobile ? 0.6 : 1)
      : Math.max(ZOOM_MIN, Math.min(0.9, Math.min(scaleX, scaleY)));
    // CRITICAL: stageX/Y must factor in zoom.
    // Formula: visual_pos = stageX + stageCoord * zoom
    // To centre contentCentroid: viewCx = stageX + centroidX * zoom
    //   => stageX = viewCx - centroidX * zoom
    const centroidX = bounds.minX + bounds.width  / 2;
    const centroidY = bounds.minY + bounds.height / 2;
    initialStageX = viewCx - centroidX * initialZoom;
    initialStageY = viewCy - centroidY * initialZoom;
    resetView();
  }

  function getVisibleItems() {
    return Array.from(stage.querySelectorAll(".media-item")).filter(
      (el) => el.style.display !== "none"
    );
  }

  function layoutRandom() {
    // Restore saved scatter positions
    stage.querySelectorAll(".media-item").forEach((el) => {
      if (!el._randomPos) return;
      // Free items that are not stack-free keep their dropped position;
      // cards still in stacks (or items from ROWS) go back to scatter pos
      if (!el.dataset.stackFree) {
        el.style.left  = el._randomPos.x + "px";
        el.style.top   = el._randomPos.y + "px";
      }
      // Restore width changed by ROWS
      if (el._originalWidth !== undefined) {
        el.style.width = el._originalWidth + "px";
        delete el._originalWidth;
      }
      // Remove stacks rotation
      el.style.transform = "";
      el._stack = null;
    });
    // Clear stacks state
    activeStacks = [];
    // Clear stack-free flags
    stage.querySelectorAll(".media-item").forEach((el) => {
      delete el.dataset.stackFree;
    });
  }

  function layoutRows() {
    const ROW_GAP        = 48;  // vertical gap between category rows
    const COL_GAP        = 24;  // horizontal gap between images
    const CAT_GAP        = 64;  // extra vertical gap before a new category
    const ROW_H          = 280; // uniform display height for all images
    const ORIGIN_X       = 200; // stage-absolute left margin
    const MAX_ROW_WIDTH  = STAGE_WIDTH - ORIGIN_X * 2;

    // Sort visible items: group alphabetically, then by data.js order within group
    const items = getVisibleItems();
    items.sort((a, b) => {
      const ga = a.dataset.group || "";
      const gb = b.dataset.group || "";
      if (ga !== gb) return ga.localeCompare(gb);
      const idxA = window.mediaItems.findIndex((m) => m.id === a.dataset.id);
      const idxB = window.mediaItems.findIndex((m) => m.id === b.dataset.id);
      return idxA - idxB;
    });

    // Group by category
    const groupOrder = [];
    const groupMap   = new Map();
    items.forEach((el) => {
      const g = el.dataset.group || "";
      if (!groupMap.has(g)) { groupMap.set(g, []); groupOrder.push(g); }
      groupMap.get(g).push(el);
    });

    let curY = 200; // start a bit down from stage top (will be centred by recentreBounds)

    groupOrder.forEach((group, gi) => {
      if (gi > 0) curY += CAT_GAP;

      const groupItems = groupMap.get(group);
      let curX = ORIGIN_X;

      groupItems.forEach((el) => {
        // Compute display width from _mediaItem data — avoids unreliable offsetHeight
        // reads during layout pass (offsetHeight can be 0 -> ratio = Infinity -> off-canvas).
        const item = el._mediaItem;
        const ratio = (item && item.width && item.height)
          ? item.width / item.height
          : 520 / 340; // safe fallback
        const displayW = Math.round(ROW_H * ratio);

        // Save original width for restoration when returning to RANDOM
        if (el._originalWidth === undefined) {
          el._originalWidth = parseFloat(el.style.width) || item?.width || 520;
        }

        // Wrap within this category when row is full
        if (curX > ORIGIN_X && curX + displayW > ORIGIN_X + MAX_ROW_WIDTH) {
          curX  = ORIGIN_X;
          curY += ROW_H + ROW_GAP;
        }

        el.style.left  = curX + "px";
        el.style.top   = curY + "px";
        el.style.width = displayW + "px";

        curX += displayW + COL_GAP;
      });

      // Advance Y past this category's last row
      curY += ROW_H + ROW_GAP;
    });

    // Clear stacks state since we're leaving STACKS (if coming from there)
    activeStacks = [];
  }

  function positionStackCards(stack) {
    // Each card steps STEP px right and down from the one above it,
    // so the stack fans visibly to the bottom-right.
    const STEP = 10;
    stack.items.forEach((el, i) => {
      el.style.left      = (stack.x + i * STEP) + "px";
      el.style.top       = (stack.y + i * STEP) + "px";
      el.style.transform = "";
      el.style.zIndex    = String(zCounter + stack.items.length - i);
    });
    zCounter += stack.items.length + 1;
  }

  function layoutStacks() {
    const STACK_SPACING_X = 1000;

    // Restore widths from ROWS if needed
    stage.querySelectorAll(".media-item").forEach((el) => {
      if (el._originalWidth !== undefined) {
        el.style.width = el._originalWidth + "px";
        delete el._originalWidth;
      }
    });

    // Remove previous stack state
    activeStacks = [];

    // Group visible items by group name (preserve data.js order within group)
    const groupMap = new Map();
    const items = getVisibleItems();
    items.sort((a, b) => {
      const idxA = window.mediaItems.findIndex((m) => m.id === a.dataset.id);
      const idxB = window.mediaItems.findIndex((m) => m.id === b.dataset.id);
      return idxA - idxB;
    });
    items.forEach((el) => {
      const g = el.dataset.group || "__ungrouped";
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g).push(el);
    });

    const groups = Array.from(groupMap.keys()).sort();
    const numStacks = groups.length;
    const totalWidth = numStacks * STACK_SPACING_X;
    const startX = (STAGE_WIDTH - totalWidth) / 2;
    const stackY  = STAGE_HEIGHT / 2 - 200;

    groups.forEach((g, gi) => {
      const stackItems = groupMap.get(g);
      const stack = {
        group: g,
        items: stackItems,
        x: startX + gi * STACK_SPACING_X,
        y: stackY,
      };
      activeStacks.push(stack);

      // Tag each el with its stack
      stackItems.forEach((el) => {
        el._stack = stack;
        delete el.dataset.stackFree;
      });

      positionStackCards(stack);
    });
  }

  function applyLayout(mode) {
    currentLayout = mode;

    // Add transition class to all items
    const allItems = stage.querySelectorAll(".media-item");
    allItems.forEach((el) => el.classList.add("is-layouting"));

    // Run the correct layout
    if (mode === "random")     layoutRandom();
    else if (mode === "rows")  layoutRows();
    else if (mode === "stacks") layoutStacks();

    // Update panel button states
    document.querySelectorAll(".layout-option").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.layout === mode);
    });

    // Recentre immediately so the camera tracks the items as they animate
    recentreBounds();

    // Remove transition class after animation completes
    window.clearTimeout(applyLayout._t);
    applyLayout._t = window.setTimeout(() => {
      allItems.forEach((el) => el.classList.remove("is-layouting"));
    }, 450);
  }

  function buildCategoryPanel() {
    if (isMobile) return;
    if (siteConfig.show_categories === false) return; // config toggle

    // Remove any existing panel (for hot-reload)
    const existing = document.getElementById("category-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "category-panel";

    const groups = [];
    const seen = new Set();
    if (Array.isArray(window.mediaItems)) {
      window.mediaItems.forEach((item) => {
        if (item.group && !seen.has(item.group)) {
          seen.add(item.group);
          groups.push(item.group);
        }
      });
    }

    groups.forEach((g) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nav-btn nav-category";
      el.dataset.group = g;
      el.setAttribute("aria-pressed", "false");
      el.textContent = "[" + g.toUpperCase() + "]";
      el.addEventListener("click", () => toggleGroup(g, el));
      panel.appendChild(el);
    });

    // Append into configured zone (or body fallback)
    const cfg = window._siteConfigRaw || {};
    const catPos = (cfg.ui && cfg.ui.modules && cfg.ui.modules.categories)
      ? (cfg.ui.modules.categories.position || "middle-left")
      : "middle-left";
    getZone(catPos).appendChild(panel);
  }

  function buildLayoutPanel() {
    if (isMobile) return;
    if (siteConfig.show_layout === false) return; // config toggle

    // Remove any existing panel (for hot-reload)
    const existing = document.getElementById("layout-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "layout-panel";

    // Use available layouts from config; fall back to all three
    const cfg = window._siteConfigRaw;
    const available = (cfg && cfg.layouts && Array.isArray(cfg.layouts.available))
      ? cfg.layouts.available
      : ["random", "rows", "stacks"];
    const allModes = ["random", "rows", "stacks"];
    const defaultLayout = siteConfig.default_layout || "random";

    available.forEach((mode) => {
      if (!allModes.includes(mode)) return;
      const idx = allModes.indexOf(mode);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layout-option" + (mode === defaultLayout ? " is-active" : "");
      btn.dataset.layout = mode;

      let label = mode.toUpperCase();
      if (Array.isArray(siteConfig.layout_names) && siteConfig.layout_names[idx]) {
        label = siteConfig.layout_names[idx].toUpperCase();
      }

      btn.textContent = "[" + label + "]";
      btn.addEventListener("click", () => applyLayout(mode));
      panel.appendChild(btn);
    });

    // Append into configured zone (or body fallback)
    const layoutPos = (cfg && cfg.ui && cfg.ui.modules && cfg.ui.modules.layouts)
      ? (cfg.ui.modules.layouts.position || "middle-right")
      : "middle-right";
    getZone(layoutPos).appendChild(panel);
  }

  function toggleMobileMode() {
    const isCurrentlySlideshow = document.body.classList.contains("is-slideshow");
    const switcher = document.getElementById("mode-switcher");
    const footer = document.querySelector(".footer");

    if (isCurrentlySlideshow) {
      // Switch to Canvas
      document.body.classList.remove("is-slideshow");
      if (switcher) switcher.textContent = "[SCROLL]";
      if (footer) footer.style.display = (siteConfig.show_zoom !== false) ? "flex" : "none";
      
      // Setup stage for canvas mode
      stage.style.width = STAGE_WIDTH + "px";
      stage.style.height = STAGE_HEIGHT + "px";
      
      // Apply saved random positions
      stage.querySelectorAll(".media-item").forEach(el => {
        if (el._randomPos) {
          el.style.left = el._randomPos.x + "px";
          el.style.top  = el._randomPos.y + "px";
        }
      });
      
      wireItemDragging();
      resetView();
      
    } else {
      // Switch to Slideshow
      document.body.classList.add("is-slideshow");
      if (switcher) switcher.textContent = "[DRAG]";
      if (footer) footer.style.display = "none";
      
      // Reset transforms and layout
      stage.style.transform = "none";
      stage.style.width = "100%";
      stage.style.height = "auto";
      
      stage.querySelectorAll(".media-item").forEach(el => {
        el.style.left = "auto";
        el.style.top  = "auto";
      });
    }
    
    announce(isCurrentlySlideshow ? "CANVAS MODE ACTIVE" : "SLIDESHOW MODE ACTIVE");
  }

  function buildModeSwitcher() {
    if (!isMobile) return;
    
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "mode-switcher";
    
    const isInitiallySlideshow = document.body.classList.contains("is-slideshow");
    btn.textContent = isInitiallySlideshow ? "[DRAG]" : "[SCROLL]";
    
    btn.addEventListener("click", toggleMobileMode);
    document.body.appendChild(btn);
  }

  // Initialization
  async function init() {
    // Load config.json first so all build functions reflect it
    await loadSiteConfig();

    // Apply default layout from config
    if (siteConfig.default_layout && siteConfig.default_layout !== "random") {
      currentLayout = siteConfig.default_layout;
    }

    // Phase 3: apply theme immediately after config is loaded
    applyTheme(window._siteConfigRaw);

    // Phase 2: build zone containers before any UI panels
    buildZoneContainers();

    const isSlideshow = isMobile && siteConfig.mobile_mode === "slideshow";
    if (isSlideshow) {
      document.body.classList.add("is-slideshow");
      const footer = document.querySelector(".footer");
      if (footer) footer.style.display = "none";
    } else {
      // Apply zoom footer visibility
      if (siteConfig.show_zoom === false) {
        const footer = document.querySelector(".footer");
        if (footer) footer.style.display = "none";
      }
    }

    const preloadTotal = Array.isArray(window.mediaItems) ? window.mediaItems.length : 0;
    notifyAssetLoaded = initPreloader(preloadTotal);

    preloadMedia();
    scatterItems(isSlideshow);

    if (!isSlideshow) {
      // Apply dimensions to DOM so layout matches logic
      stage.style.width = STAGE_WIDTH + "px";
      stage.style.height = STAGE_HEIGHT + "px";

      const bounds = getContentBounds();
      if (bounds) {
        const viewportRect = stageWrapper.getBoundingClientRect();
        const padding = 400;
        const scaleX = viewportRect.width  / (bounds.width  + padding);
        const scaleY = viewportRect.height / (bounds.height + padding);
        ZOOM_MIN = Math.max(0.08, Math.min(1, Math.min(scaleX, scaleY)));
        const viewCx = viewportRect.width  / 2;
        const viewCy = viewportRect.height / 2;
        
        initialZoom   = isMobile ? 0.6 : 1;
        initialStageX = viewCx - (bounds.minX + bounds.width  / 2) * initialZoom;
        initialStageY = viewCy - (bounds.minY + bounds.height / 2) * initialZoom;
        resetView();
      }
      wireItemDragging();
    }

    buildNav();
    buildCategoryPanel();
    buildLayoutPanel();
    buildModeSwitcher();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
// Race condition fix applied: Listeners attached before src set, plus synchronous check for cached assets.
