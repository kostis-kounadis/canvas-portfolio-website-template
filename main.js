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
    draggable:       true,
    random_scarcity: 100,
    random_overlap_ratio: 0.8,
    rows_row_height: 280,
    rows_gap: 24,
    stacks_spacing: 1000,
    stacks_depth_order: "front-to-back",
    // misc
    mobile_mode:     "canvas",
    ui_text_size:    "18px",
    // categories defaults (Phase 7)
    categories_behaviour: "hide-on-click",
    categories_focus_effect: "hide",
    categories_view_all_label: "ALL",
    // info defaults (Phase 8)
    info_overlay_effect: "none",
    info_button_style:   "arrow",
    info_close_style:    "x-only",
  };

  // Active stack objects built by layoutStacks(); cleared on exit.
  let activeStacks = [];

  // Interaction state
  let spaceDown = false;

  // Phase 6 State
  let expandedEl = null;
  let visibleLightboxItems = [];
  let currentLightboxIndex = -1;

  // Phase 7 State
  let focusedGroup = null;

  window.addEventListener("keydown", (e) => {
    // Don't fire shortcuts when typing in an input / contenteditable
    if (e.target.matches("input, textarea, [contenteditable]")) return;

    if (e.code === "Space") spaceDown = true;

    // Lightbox open override for arrow navigation
    const lightbox = document.getElementById("lightbox");
    const isLightboxOpen = lightbox && lightbox.open;
    if (isLightboxOpen) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateLightbox(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateLightbox(1);
        return;
      }
    }

    // ESC — close Info Overlay / Lightbox / expanded canvas view
    if (e.key === "Escape") {
      const overlay = document.getElementById("info-overlay");
      if (overlay && overlay.classList.contains("is-visible")) {
        closeInfoOverlay(overlay);
      }
      if (expandedEl) {
        resetViewSmooth();
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

  // Zoom configuration (ZOOM_MIN will be adjusted based on content bounds)
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
    const margin = siteConfig.random_scarcity !== undefined ? siteConfig.random_scarcity : 520;
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

  // Preload thumbnails — only used for video-embed thumbnails (external URLs).
  // Local images are NOT preloaded here because createMediaElement already
  // requests them; duplicate requests compete for HTTP connections and slow
  // initial render.
  function preloadMedia() {
    if (!Array.isArray(window.mediaItems)) return;
    window.mediaItems.forEach((item) => {
      try {
        if (item.type === "video-embed" && item.videoId) {
          const img = new Image();
          if (item.provider === "vimeo") {
            img.src = `https://vumbnail.com/${item.videoId}.jpg`;
          } else {
            img.src = `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`;
          }
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
    if (!announcerEl) announcerEl = announcerEl = buildAnnouncer();
    // Clear then set — forces screen readers to re-read even identical messages
    announcerEl.textContent = "";
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      announcerEl.textContent = msg;
    }, 50);
  }

  // ── Nav: folder-driven category menu ───────────────────────────────────

  function toggleGroup(group, btnEl) {
    const cfg = window._siteConfigRaw || {};
    const catCfg = (cfg.ui && cfg.ui.modules && cfg.ui.modules.categories) || {};
    const behaviour = catCfg.behaviour || siteConfig.categories_behaviour || "hide-on-click";
    if (behaviour === "focus-on-click") {
      if (focusedGroup === group) {
        restoreAllGroups();
      } else {
        focusGroup(group);
      }
      return;
    }

    // Default: hide-on-click behaviour
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

  function focusGroup(group) {
    focusedGroup = group;
    const effect = siteConfig.categories_focus_effect || "hide";

    // 1. Update button struck states
    const panel = document.getElementById("category-panel");
    if (panel) {
      panel.querySelectorAll(".nav-category").forEach((btn) => {
        const btnGrp = btn.dataset.group;
        if (btnGrp === group) {
          btn.classList.remove("is-struck");
          btn.setAttribute("aria-pressed", "false");
        } else {
          btn.classList.add("is-struck");
          btn.setAttribute("aria-pressed", "true");
        }
      });

      // Show the View All button
      const viewAllBtn = document.getElementById("category-view-all");
      if (viewAllBtn) {
        if (siteConfig.categories_view_all_enabled !== false) {
          viewAllBtn.style.display = "";
        } else {
          viewAllBtn.style.display = "none";
        }
      }
    }

    // 2. Update media items visibility/blur
    stage.querySelectorAll(".media-item").forEach((el) => {
      const elGrp = el.dataset.group || "";
      if (elGrp === group) {
        el.style.display = "";
        el.classList.remove("is-focus-blurred");
      } else {
        if (effect === "hide") {
          el.style.display = "none";
          el.classList.remove("is-focus-blurred");
        } else {
          // effect is "blur"
          el.style.display = "";
          el.classList.add("is-focus-blurred");
        }
      }
    });

    announce(group.toUpperCase() + " FOCUSED");

    // Reflow layouts after filter changes
    if (currentLayout !== "random") applyLayout(currentLayout);
  }

  function restoreAllGroups() {
    focusedGroup = null;

    // 1. Update button struck states
    const panel = document.getElementById("category-panel");
    if (panel) {
      panel.querySelectorAll(".nav-category").forEach((btn) => {
        btn.classList.remove("is-struck");
        btn.setAttribute("aria-pressed", "false");
      });

      // Hide the View All button
      const viewAllBtn = document.getElementById("category-view-all");
      if (viewAllBtn) {
        viewAllBtn.style.display = "none";
      }
    }

    // 2. Restore all media items to visible and unblurred
    stage.querySelectorAll(".media-item").forEach((el) => {
      el.style.display = "";
      el.classList.remove("is-focus-blurred");
    });

    announce("ALL CATEGORIES VISIBLE");

    // Reflow layouts
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
        // Phase 12.5 Bug 3: SVG icon config
        if (mods.title.icon) {
          siteConfig.title_icon_enabled  = mods.title.icon.enabled === true;
          siteConfig.title_icon_file     = mods.title.icon.file || "";
          siteConfig.title_icon_position = mods.title.icon.position || "before";
        }
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
      if (cfg.layouts.draggable !== undefined) {
        siteConfig.draggable = cfg.layouts.draggable;
      } else if (cfg.layouts.random && cfg.layouts.random.draggable !== undefined) {
        siteConfig.draggable = cfg.layouts.random.draggable;
      }
      if (cfg.layouts.random) {
        if (cfg.layouts.random.scarcity != null)     siteConfig.random_scarcity = cfg.layouts.random.scarcity;
        if (cfg.layouts.random.overlapRatio != null) siteConfig.random_overlap_ratio = cfg.layouts.random.overlapRatio;
      }
      if (cfg.layouts.rows) {
        if (cfg.layouts.rows.rowHeight != null)      siteConfig.rows_row_height = cfg.layouts.rows.rowHeight;
        if (cfg.layouts.rows.gap != null)            siteConfig.rows_gap = cfg.layouts.rows.gap;
      }
      if (cfg.layouts.stacks) {
        if (cfg.layouts.stacks.spacing != null)      siteConfig.stacks_spacing = cfg.layouts.stacks.spacing;
        if (cfg.layouts.stacks.depthOrder != null)   siteConfig.stacks_depth_order = cfg.layouts.stacks.depthOrder;
      }
    }

    // categories
    if (cfg.categories) {
      if (cfg.categories.behaviour != null)    siteConfig.categories_behaviour = cfg.categories.behaviour;
      if (cfg.categories.focusEffect != null)  siteConfig.categories_focus_effect = cfg.categories.focusEffect;
      if (cfg.categories.viewAllLabel != null) siteConfig.categories_view_all_label = cfg.categories.viewAllLabel;
      if (cfg.categories.viewAllEnabled != null) siteConfig.categories_view_all_enabled = cfg.categories.viewAllEnabled;
    }

    // info (Phase 8)
    if (cfg.info) {
      if (cfg.info.overlayEffect != null) siteConfig.info_overlay_effect = cfg.info.overlayEffect;
      if (cfg.info.buttonStyle != null)   siteConfig.info_button_style   = cfg.info.buttonStyle;
      if (cfg.info.closeStyle != null)    siteConfig.info_close_style    = cfg.info.closeStyle;
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
    
    // Store previous layout properties to detect actual layout changes
    const prevScarcity = siteConfig.random_scarcity;
    const prevOverlap = siteConfig.random_overlap_ratio;
    const prevRowHeight = siteConfig.rows_row_height;
    const prevRowGap = siteConfig.rows_gap;
    const prevStacksSpacing = siteConfig.stacks_spacing;
    const prevStacksDepth = siteConfig.stacks_depth_order;

    window._siteConfigRaw = cfg;
    mapConfig(cfg);
    applyConfigCSS();
    applyTheme(cfg);          // Phase 3: apply theme colours, bg effect, noise, shadow
    applyImageEffects(cfg);   // Phase 5: apply image effects
    
    // Rebuild zone containers and UI modules so positions & options update in real-time
    buildZoneContainers();
    
    // Toggle zoom controls footer visibility dynamically
    const footer = document.querySelector(".footer");
    if (footer) {
      footer.style.display = (siteConfig.show_zoom !== false) ? "flex" : "none";
    }

    // Phase 6 hot-reload resets
    if (cfg.imageClick) {
      if (!cfg.imageClick.lightbox?.enabled) {
        const dialog = document.getElementById("lightbox");
        if (dialog && dialog.open) {
          dialog.close();
        }
      }
      if (!cfg.imageClick.canvasExpand?.enabled && expandedEl) {
        resetViewSmooth();
      }
    }

    // Phase 7 hot-reload resets
    if (cfg.categories) {
      const nextBehaviour = cfg.categories.behaviour || "hide-on-click";
      if (nextBehaviour === "hide-on-click") {
        if (focusedGroup !== null) {
          restoreAllGroups();
        }
      } else {
        // focus-on-click mode
        if (focusedGroup !== null) {
          // Re-apply focus styles under the new settings (e.g. if focusEffect changed)
          focusGroup(focusedGroup);
        }
      }
    }

    // Phase 8 hot-reload resets for active info overlay
    const overlay = document.getElementById("info-overlay");
    if (overlay && overlay.classList.contains("is-visible")) {
      document.body.classList.remove("info-blur-bg", "info-darken", "info-colour-overlay");
      
      const cfg = window._siteConfigRaw || {};
      const infoCfg = (cfg.ui && cfg.ui.modules && cfg.ui.modules.info) || {};
      const effect = infoCfg.overlayEffect || siteConfig.info_overlay_effect || "none";
      
      if (effect !== "none") {
        document.body.classList.add("info-" + effect);
        if (effect === "colour-overlay") {
          const root = document.documentElement;
          root.style.setProperty("--info-overlay-color", infoCfg.overlayColor || "#000000");
          root.style.setProperty("--info-overlay-opacity", infoCfg.overlayOpacity ?? 0.75);
          root.style.setProperty("--info-overlay-blend-mode", infoCfg.overlayBlendMode || "normal");
        }
      }
    }

    // Rebuild UI modules that depend on config
    const navRight = document.getElementById("nav-right");
    if (navRight) {
      navRight.innerHTML = "";
    }
    buildNav();
    buildCategoryPanel();
    buildLayoutPanel();

    // Refresh info text if overlay is open
    const infoOverlay2 = document.getElementById("info-overlay");
    const textEl  = document.getElementById("info-text");
    if (infoOverlay2 && textEl && infoOverlay2.classList.contains("is-visible")) {
      textEl.innerHTML = renderMarkdown(infoBodyText);
      requestAnimationFrame(() => autoscaleText(infoOverlay2, textEl));
    }

    // Update active layout style if it changed in config
    let layoutModeChanged = false;
    if (cfg.layouts && cfg.layouts.default && cfg.layouts.default !== currentLayout) {
      currentLayout = cfg.layouts.default;
      layoutModeChanged = true;
    }

    const randomParamsChanged = (prevScarcity !== siteConfig.random_scarcity) || (prevOverlap !== siteConfig.random_overlap_ratio);
    const rowsParamsChanged = (prevRowHeight !== siteConfig.rows_row_height) || (prevRowGap !== siteConfig.rows_gap);
    const stacksParamsChanged = (prevStacksSpacing !== siteConfig.stacks_spacing) || (prevStacksDepth !== siteConfig.stacks_depth_order);
    const layoutParamsChanged = randomParamsChanged || rowsParamsChanged || stacksParamsChanged;

    // Re-apply layout parameters only if a layout property changed
    if (currentLayout) {
      if (currentLayout === "random" && (layoutModeChanged || randomParamsChanged)) {
        // Clear previous random placement and re-scatter to apply new scarcity/overlapRatio!
        placedRects.length = 0;
        overlapCount.clear();
        stage.querySelectorAll(".media-item").forEach((el) => el.remove());
        scatterItems();
      }
      
      if (layoutModeChanged || layoutParamsChanged) {
        applyLayout(currentLayout);
      }
    }
  };

  // Phase 14: Listen for config-update from GUI Setup Tool via both postMessage
  // and BroadcastChannel — so any open portfolio tab auto-refreshes when config is saved,
  // without needing to be embedded in an iframe.
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "config-update" && event.data.config) {
      window.applyConfig(event.data.config);
    }
  });

  try {
    const _guiChannel = new BroadcastChannel("canvas-portfolio-config");
    _guiChannel.addEventListener("message", (event) => {
      if (event.data && event.data.type === "config-update" && event.data.config) {
        window.applyConfig(event.data.config);
      }
    });
  } catch (_) { /* BroadcastChannel not supported — postMessage is still available */ }

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

  const BG_EFFECT_CLASSES = ["bg-solid", "bg-gradient-static", "bg-gradient-animated"];
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

    // ─ Shadow ─

    // ─ Background effect ─
    document.body.classList.remove(...BG_EFFECT_CLASSES);
    const effect = t.backgroundEffect || "solid";
    if (effect === "solid")             document.body.classList.add("bg-solid");
    else if (effect === "gradient-static")   document.body.classList.add("bg-gradient-static");
    else if (effect === "gradient-animated") document.body.classList.add("bg-gradient-animated");

    // ─ Noise/grain ─
    const noise = t.noiseGrain || {};
    if (noise.enabled) {
      root.style.setProperty("--noise-opacity", String(noise.opacity != null ? noise.opacity : 0.04));
      _ensureGrainFilter(noise.size != null ? noise.size : 0.65);
      // Inject grain overlay div inside .viewport (before #stage-wrapper) if not present
      let grainEl = document.getElementById("grain-overlay");
      if (!grainEl) {
        grainEl = document.createElement("div");
        grainEl.id = "grain-overlay";
        const viewport = document.querySelector(".viewport");
        const stageWrapper = document.getElementById("stage-wrapper");
        if (viewport && stageWrapper) {
          viewport.insertBefore(grainEl, stageWrapper);
        } else if (viewport) {
          viewport.prepend(grainEl);
        }
      }
      // Force browser to re-evaluate SVG filter by toggling the filter property
      grainEl.style.filter = "none";
      void grainEl.offsetWidth;
      grainEl.style.filter = "";
    } else {
      root.style.setProperty("--noise-opacity", "0");
      const go = document.getElementById("grain-overlay");
      if (go) go.remove();

    }

    // ─ Typography (Phase 4) ─
    const typo = cfg.typography || {};
    
    // Set base size
    if (typo.baseSize) {
      root.style.setProperty("--ui-text-size", typo.baseSize);
    }
    
    // Set single text color (always)
    root.style.setProperty("--text-colour", typo.textColor || '#000000');

    // Gradient pan — always set so gradient mode works as soon as it's selected
    root.style.setProperty("--text-gradient-1", typo.gradientColor1 || typo.textColor || '#000000');
    root.style.setProperty("--text-gradient-2", typo.gradientColor2 || '#0066ff');
    root.style.setProperty("--text-gradient-speed", `${typo.gradientSpeed || 5}s`);

    // Color cycle — always set
    root.style.setProperty("--text-cycle-1", typo.cycleColor1 || typo.textColor || '#000000');
    root.style.setProperty("--text-cycle-2", typo.cycleColor2 || '#ffff00');
    root.style.setProperty("--text-cycle-3", typo.cycleColor3 || '#00ff00');
    root.style.setProperty("--text-cycle-speed", `${typo.cycleSpeed || 8}s`);

    // Hue rotate — always set
    root.style.setProperty("--text-hue-base", typo.hueRotateBase || typo.textColor || '#0066ff');
    root.style.setProperty("--text-hue-speed", `${typo.hueRotateSpeed || 6}s`);

    // Text blend mode
    let bm = typo.blendMode;
    if (bm === true) bm = "difference";
    if (bm === false || !bm) bm = "normal";
    root.style.setProperty("--text-blend-mode", bm);

    // Text animation
    document.body.classList.remove(...TEXT_FX_CLASSES);
    document.body.classList.remove("text-anim-hover");
    const textFx = typo.textAnimation || "none";
    if (textFx === "color-cycle")  document.body.classList.add("text-fx-color-cycle");
    else if (textFx === "gradient") document.body.classList.add("text-fx-gradient");
    else if (textFx === "hue-rotate") document.body.classList.add("text-fx-hue-rotate");

    if (textFx !== "none" && typo.textAnimationTrigger === "hover") {
      document.body.classList.add("text-anim-hover");
    }

    // Clean up existing dynamic font elements
    const oldEmbeds = document.querySelectorAll(".dynamic-font-embed");
    oldEmbeds.forEach(el => el.remove());

    const DEFAULT_FONT = '"JetBrains Mono", "Cascadia Code", "Source Code Pro", Menlo, Monaco, "Courier New", monospace';
    const DEFAULT_EMBED = `<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">`;

    if (typo.fontMode === "local" && typo.localFontUrl) {
      // Inject @font-face
      const style = document.createElement("style");
      style.classList.add("dynamic-font-embed");
      style.innerHTML = `
        @font-face {
          font-family: 'CustomLocalFont';
          src: url('${typo.localFontUrl}');
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
      root.style.setProperty("--font-family", '"CustomLocalFont", sans-serif');
    } else {
      // Google mode (or fallback)
      let embedToUse = typo.googleEmbedCode ? typo.googleEmbedCode.trim() : "";
      let isDefault = !embedToUse;

      if (isDefault) {
        embedToUse = DEFAULT_EMBED;
      }

      // Convert raw URL or raw @import into HTML tags
      if (embedToUse && !embedToUse.startsWith("<")) {
        if (embedToUse.startsWith("http")) {
          embedToUse = `<link href="${embedToUse}" rel="stylesheet">`;
        } else if (embedToUse.includes("@import")) {
          embedToUse = `<style>${embedToUse}</style>`;
        }
      }

      // Inject into head
      if (embedToUse) {
        const container = document.createElement("div");
        container.innerHTML = embedToUse;
        Array.from(container.children).forEach(child => {
          child.classList.add("dynamic-font-embed");
          document.head.appendChild(child);
        });
      }

      // Parse font-family from the embed code
      const parsedFamily = parseFontFamilyFromEmbed(embedToUse);
      if (parsedFamily && !isDefault) {
        root.style.setProperty("--font-family", parsedFamily);
      } else {
        root.style.setProperty("--font-family", DEFAULT_FONT);
      }
    }
  }

  // Helper to extract font family name from a Google Fonts embed code or style tag URL
  function parseFontFamilyFromEmbed(embedCode) {
    if (!embedCode) return null;
    const urls = [];
    
    // Method 1: Extract from <link href="...">
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    while ((match = hrefRegex.exec(embedCode)) !== null) {
      urls.push(match[1]);
    }
    
    // Method 2: Extract from @import url('...') or @import "..."
    const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?/g;
    while ((match = importRegex.exec(embedCode)) !== null) {
      urls.push(match[1]);
    }
    
    // If no URLs found but there's a raw URL in text
    if (urls.length === 0) {
      const urlRegex = /(https?:\/\/[^\s'"]+)/g;
      while ((match = urlRegex.exec(embedCode)) !== null) {
        urls.push(match[1]);
      }
    }
    
    const families = [];
    
    for (const urlStr of urls) {
      try {
        const url = new URL(urlStr);
        const searchParams = new URLSearchParams(url.search);
        const familyParams = searchParams.getAll('family');
        for (const fp of familyParams) {
          const parts = fp.split(':');
          const familyName = decodeURIComponent(parts[0].replace(/\+/g, ' '));
          if (familyName && !families.includes(familyName)) {
            families.push(familyName);
          }
        }
      } catch (e) {
        const famRegex = /[?&]family=([^&:#"'\s]+)/g;
        let famMatch;
        while ((famMatch = famRegex.exec(urlStr)) !== null) {
          const familyName = decodeURIComponent(famMatch[1].replace(/\+/g, ' '));
          if (familyName && !families.includes(familyName)) {
            families.push(familyName);
          }
        }
      }
    }

    if (families.length === 0) {
      const famRegex = /[?&]family=([^&:#"'\s]+)/g;
      let famMatch;
      while ((famMatch = famRegex.exec(embedCode)) !== null) {
        const familyName = decodeURIComponent(famMatch[1].replace(/\+/g, ' '));
        if (familyName && !families.includes(familyName)) {
          families.push(familyName);
        }
      }
    }

    if (families.length > 0) {
      return families.map(f => f.includes(' ') ? `"${f}"` : f).join(', ');
    }
    
    return null;
  }

  // Phase 5: Dynamic Image Effects System
  function applyImageEffects(cfg) {
    if (!cfg || !cfg.imageEffects) return;
    const fx = cfg.imageEffects;
    const root = document.documentElement;

    // Clean up body classes
    document.body.classList.remove(
      "fx-desaturated", 
      "fx-duotone", 
      "fx-blurred", 
      "fx-hover-reveal", 
      "fx-hover-normal", 
      "fx-hover-enlarge"
    );

    // Apply initial state
    const state = fx.initialState || "colour";
    if (state === "desaturated") {
      document.body.classList.add("fx-desaturated");
    } else if (state === "duotone") {
      document.body.classList.add("fx-duotone");
      _ensureDuotoneFilter(fx.duotoneColor1 || "#000000", fx.duotoneColor2 || "#ffffff");
    } else if (state === "blurred") {
      document.body.classList.add("fx-blurred");
    }

    // Apply hover state: hover cancels initial effects (fx-hover-normal) by default
    document.body.classList.add("fx-hover-normal");
    if (fx.enlargeOnHover === true) {
      document.body.classList.add("fx-hover-enlarge");
    }

    // Apply Image Blend Mode
    const ibm = fx.blendMode || "normal";
    root.style.setProperty("--image-blend-mode", ibm);

    // Lightbox Custom Overlay Variables
    if (cfg?.imageClick?.lightbox) {
      const lb = cfg.imageClick.lightbox;
      root.style.setProperty("--lightbox-overlay-color", lb.overlayColor || "#000000");
      root.style.setProperty("--lightbox-overlay-opacity", String(lb.overlayOpacity ?? 0.75));
      root.style.setProperty("--lightbox-overlay-blend-mode", lb.overlayBlendMode || "normal");
    }

    // Apply duotone hue and saturation if provided (legacy support)
    if (fx.duotoneHue != null) {
      root.style.setProperty("--duotone-hue", fx.duotoneHue + "deg");
    } else if (cfg.theme && cfg.theme.duotoneHue != null) {
      root.style.setProperty("--duotone-hue", cfg.theme.duotoneHue + "deg");
    }
    
    if (fx.duotoneSat != null) {
      root.style.setProperty("--duotone-sat", String(fx.duotoneSat));
    } else if (cfg.theme && cfg.theme.duotoneSat != null) {
      root.style.setProperty("--duotone-sat", String(cfg.theme.duotoneSat));
    }

    // Clear any previous stickiness/blurs if config is completely reset
    if (fx.clickMode === "none") {
      document.querySelectorAll(".media-item").forEach(item => {
        item.classList.remove("is-coloured", "is-blurred", "is-focused-click");
      });
    }
  }

  function _ensureDuotoneFilter(color1, color2) {
    let svg = document.getElementById("duotone-svg-container");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "duotone-svg-container";
      svg.style.position = "absolute";
      svg.style.width = "0";
      svg.style.height = "0";
      document.body.appendChild(svg);
    }
    
    const c1 = _hexToRgbRatio(color1);
    const c2 = _hexToRgbRatio(color2);
    
    svg.innerHTML = `
      <defs>
        <filter id="duotone-filter">
          <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0
                                               0.2126 0.7152 0.0722 0 0
                                               0.2126 0.7152 0.0722 0 0
                                               0      0      0      1 0" />
          <feComponentTransfer color-interpolation-filters="sRGB">
            <feFuncR type="table" tableValues="${c1.r} ${c2.r}" />
            <feFuncG type="table" tableValues="${c1.g} ${c2.g}" />
            <feFuncB type="table" tableValues="${c1.b} ${c2.b}" />
          </feComponentTransfer>
        </filter>
      </defs>
    `;
  }
  
  function _hexToRgbRatio(hex) {
    const clean = hex.startsWith("#") ? hex.slice(1) : hex;
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return {
      r: Number.isFinite(r) ? r : 0,
      g: Number.isFinite(g) ? g : 0,
      b: Number.isFinite(b) ? b : 0
    };
  }

  // Phase 5: Unified click interaction for media items
  function handleItemClick(el, cfg) {
    if (!cfg || !cfg.imageEffects) return;
    const fx = cfg.imageEffects;
    const clickMode = fx.clickMode || "none";
    const blurOthers = fx.blurOthersOnClick === true;

    const allItems = document.querySelectorAll(".media-item");

    if (clickMode === "spotlight") {
      const isAlreadyColoured = el.classList.contains("is-coloured");
      
      // Clear coloured from all
      allItems.forEach(item => item.classList.remove("is-coloured"));
      
      if (!isAlreadyColoured) {
        el.classList.add("is-coloured");
        if (blurOthers) {
          allItems.forEach(item => {
            if (item === el) {
              item.classList.remove("is-blurred");
            } else {
              item.classList.add("is-blurred");
            }
          });
        }
      } else {
        // Toggled off: restore all from blur
        if (blurOthers) {
          allItems.forEach(item => item.classList.remove("is-blurred"));
        }
      }
    } else if (clickMode === "gallery") {
      el.classList.toggle("is-coloured");
      
      if (blurOthers) {
        // If at least one item is still coloured, keep others blurred
        const anyColoured = Array.from(allItems).some(item => item.classList.contains("is-coloured"));
        if (anyColoured) {
          allItems.forEach(item => {
            if (item.classList.contains("is-coloured")) {
              item.classList.remove("is-blurred");
            } else {
              item.classList.add("is-blurred");
            }
          });
        } else {
          // No items coloured anymore: restore all
          allItems.forEach(item => item.classList.remove("is-blurred"));
        }
      }
    } else {
      // clickMode is "none" but blurOthersOnClick is still true
      if (blurOthers) {
        const isFocused = !el.classList.contains("is-focused-click");
        
        allItems.forEach(item => {
          item.classList.remove("is-focused-click");
          item.classList.remove("is-blurred");
        });

        if (isFocused) {
          el.classList.add("is-focused-click");
          allItems.forEach(item => {
            if (item !== el) {
              item.classList.add("is-blurred");
            }
          });
        }
      }
    }
  }

  // Injects the SVG feTurbulence grain filter once.
  function _ensureGrainFilter(size) {
    let svg = document.getElementById("grain-filter-svg");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "grain-filter-svg";
      svg.setAttribute("style", "display:none; width:0; height:0; position:absolute;");
      document.body.appendChild(svg);
    }
    // Entirely replace innerHTML to force browser to re-evaluate the SVG filter definition
    svg.innerHTML = `
      <defs>
        <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence id="grain-turbulence" type="fractalNoise" baseFrequency="${size}" numOctaves="3" stitchTiles="stitch" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise"/>
        </filter>
      </defs>`;
  }

  function updateInfoButtonState(isOpen) {
    const infoBtn = document.getElementById("nav-info-btn");
    if (!infoBtn) return;
    
    const cfg = window._siteConfigRaw || {};
    const infoCfg = (cfg.ui && cfg.ui.modules && cfg.ui.modules.info) || {};
    const btnStyle = infoCfg.buttonStyle || "static";

    infoBtn.setAttribute("aria-pressed", isOpen ? "true" : "false");

    if (isOpen) {
      infoBtn.classList.remove("is-struck");
      if (btnStyle === "x-close") {
        infoBtn.textContent = "[×]";
      } else {
        infoBtn.textContent = "[INFO]";
      }
    } else {
      if (btnStyle === "strikethrough") {
        infoBtn.classList.add("is-struck");
      } else {
        infoBtn.classList.remove("is-struck");
      }
      infoBtn.textContent = "[INFO]";
    }
  }

  function openInfoOverlay(overlayEl, textEl) {
    overlayEl.classList.add("is-visible");

    // Phase 8: Apply body class for canvas overlay effects
    const cfg = window._siteConfigRaw || {};
    const infoCfg = (cfg.ui && cfg.ui.modules && cfg.ui.modules.info) || {};
    const effect = infoCfg.overlayEffect || siteConfig.info_overlay_effect || "none";
    
    document.body.classList.add("info-open");
    if (effect !== "none") {
      document.body.classList.add("info-" + effect);
      if (effect === "colour-overlay") {
        const root = document.documentElement;
        root.style.setProperty("--info-overlay-color", infoCfg.overlayColor || "#000000");
        root.style.setProperty("--info-overlay-opacity", infoCfg.overlayOpacity ?? 0.75);
        root.style.setProperty("--info-overlay-blend-mode", infoCfg.overlayBlendMode || "normal");
      }
    }

    updateInfoButtonState(true);

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

    // Phase 8: Remove body classes for canvas overlay effects
    document.body.classList.remove("info-open", "info-blur-bg", "info-darken", "info-colour-overlay");

    updateInfoButtonState(false);
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
    const overlayEl = document.getElementById("info-overlay");
    const isOverlayOpen = overlayEl ? overlayEl.classList.contains("is-visible") : false;

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

      // Phase 12.5 Bug 3: build decorative SVG icon adjacent to the title
      const buildIcon = () => {
        const iconFile = siteConfig.title_icon_file;
        if (!iconFile) return;
        const iconContainer = document.createElement("div");
        iconContainer.className = "site-icon";
        fetch(iconFile)
          .then(r => {
            if (!r.ok) throw new Error("Icon fetch failed");
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
              iconContainer.innerHTML = svgEl.outerHTML;
            }
          })
          .catch(err => {
            console.error("[nav] Icon error:", err);
          });
        titleEl.appendChild(iconContainer);
      };

      // Determine icon placement (before or after the main content)
      const iconEnabled = siteConfig.title_icon_enabled;
      const iconPos     = siteConfig.title_icon_position || "before";

      if (iconEnabled && iconPos === "before") buildIcon();

      if (titleMode === "text")       buildText();
      else if (titleMode === "svg")       buildSvg();
      else if (titleMode === "svg_text") { buildSvg(); buildText(); }
      else if (titleMode === "text_svg") { buildText(); buildSvg(); }

      if (iconEnabled && iconPos === "after") buildIcon();

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
        infoBtn.style.pointerEvents = "auto";
        infoBtn.addEventListener("click", toggleInfo);
        infoZone.appendChild(infoBtn);
        // Set initial state
        updateInfoButtonState(isOverlayOpen);
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
            el.addEventListener("click", toggleInfo);
          } else {
            el = document.createElement("a");
            el.href = "mailto:" + email;
            el.className = "nav-btn nav-email";
            el.textContent = "[" + item.label + "]";
          }
          legacyRight.appendChild(el);
          if (item.type === "info") {
            updateInfoButtonState(isOverlayOpen);
          }
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
    
    const forceFallback = setTimeout(() => {
      if (preloaderEl) preloaderEl.remove();
    }, 5000);

    return function onAssetLoaded() {
      loaded = Math.min(loaded + 1, total);
      render();
      if (loaded >= total) {
        clearTimeout(forceFallback);
        // Hard cut — no animation, brutalist.
        if (preloaderEl) preloaderEl.remove();
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

      // Set src so listeners are ready
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
      const isVimeo = item.provider === "vimeo";
      const embedUrl = isVimeo 
        ? `https://player.vimeo.com/video/${videoId}?autoplay=1&background=1&muted=1`
        : `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&mute=0`;
      const thumbUrl = isVimeo 
        ? `https://vumbnail.com/${videoId}.jpg`
        : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

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

    // Phase 14: Touch hover-reveal fallback.
    // On mobile, :hover never fires; first tap toggles colour, second tap removes it.
    if (isMobile) {
      let _touchMoved = false;
      el.addEventListener("touchstart", () => { _touchMoved = false; }, { passive: true });
      el.addEventListener("touchmove",  () => { _touchMoved = true;  }, { passive: true });
      el.addEventListener("touchend", (e) => {
        const cfg = window._siteConfigRaw;
        const fx = cfg?.imageEffects;
        if (_touchMoved) return; // was a pan gesture, not a tap
        if (fx?.hoverReveal === true && (fx?.initialState === "desaturated" || fx?.initialState === "duotone")) {
          e.preventDefault(); // prevent ghost click
          const isColoured = el.classList.contains("is-touch-coloured");
          // Remove colour from all other items first (spotlight touch mode)
          document.querySelectorAll(".media-item.is-touch-coloured").forEach(item => {
            if (item !== el) item.classList.remove("is-touch-coloured");
          });
          el.classList.toggle("is-touch-coloured", !isColoured);
        }
      }, { passive: false });
    }

    // Unified click handler (Phase 5 + Phase 6)
    el.addEventListener("click", () => {
      if (el.dataset.preventClick === "true") return;
      handleItemClick(el, window._siteConfigRaw); // Phase 5 visual trigger runs first
      handleItemInteraction(el, "single");
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

        const overlapRatio = isMobile ? 0.05 : (siteConfig.random_overlap_ratio !== undefined ? siteConfig.random_overlap_ratio : 0.2);
        const { allowed, overlaps } = canPlaceRect(rect, placedRects, overlapRatio);
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
    expandedEl = null; // Clear expanded element on manual pan
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
      expandedEl = null; // Clear expanded element on manual pan
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
      expandedEl = null; // Clear expanded element on manual pinch zoom
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
      if (siteConfig.draggable === false) return;

      // Prevent initiating stage pan
      event.stopPropagation();
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

    // Prevent the native browser ghost dragging on images/links
    el.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    window.addEventListener("mousemove", (event) => {
      if (!isDragging) return;
      const moveDx = event.clientX - startClientX;
      const moveDy = event.clientY - startClientY;
      if (!hasPassedThreshold && Math.hypot(moveDx, moveDy) < 3) return;
      hasPassedThreshold = true;
      el.dataset.preventClick = "true";

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
      setTimeout(() => {
        delete el.dataset.preventClick;
      }, 50);

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
    const ROW_H_FALLBACK = siteConfig.rows_row_height !== undefined ? siteConfig.rows_row_height : 280;
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
    const COL_GAP        = siteConfig.rows_gap !== undefined ? siteConfig.rows_gap : 24;  // horizontal gap between images
    const ROW_GAP        = COL_GAP * 2;  // vertical gap between category rows
    const CAT_GAP        = COL_GAP * 2.6;  // extra vertical gap before a new category
    const ROW_H          = siteConfig.rows_row_height !== undefined ? siteConfig.rows_row_height : 280; // uniform display height for all images
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
    const isBackToFront = siteConfig.stacks_depth_order === "back-to-front";
    stack.items.forEach((el, i) => {
      el.style.left      = (stack.x + i * STEP) + "px";
      el.style.top       = (stack.y + i * STEP) + "px";
      el.style.transform = "";
      el.style.zIndex    = isBackToFront 
        ? String(zCounter + i)
        : String(zCounter + stack.items.length - i);
    });
    zCounter += stack.items.length + 1;
  }

  function layoutStacks() {
    const STACK_SPACING_X = siteConfig.stacks_spacing !== undefined ? siteConfig.stacks_spacing : 1000;

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

    const cfg = window._siteConfigRaw || {};
    const catCfg = (cfg.ui && cfg.ui.modules && cfg.ui.modules.categories) || {};
    const behaviour = catCfg.behaviour || siteConfig.categories_behaviour || "hide-on-click";
    
    const layout = catCfg.layout || "vertical";
    const alignment = catCfg.alignment || "left";
    const separator = catCfg.separator || "|";
    const spacing = catCfg.spacing ?? 10;
    const catPos = catCfg.position || "middle-left";

    // Apply layout styles
    if (layout === "horizontal") {
      panel.style.display = "flex";
      panel.style.flexDirection = "row";
      panel.style.alignItems = "center";
      panel.style.gap = spacing + "px";
      panel.style.flexWrap = "nowrap";
    } else {
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = spacing + "px";
      if (alignment === "center") {
        panel.style.alignItems = "center";
        panel.style.textAlign = "center";
      } else if (alignment === "right") {
        panel.style.alignItems = "flex-end";
        panel.style.textAlign = "right";
      } else {
        panel.style.alignItems = "flex-start";
        panel.style.textAlign = "left";
      }
    }

    groups.forEach((g, idx) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nav-btn nav-category";
      el.dataset.group = g;

      // Determine struck state on creation (Phase 7 support for hot-reloads)
      if (behaviour === "focus-on-click" && focusedGroup !== null) {
        if (g === focusedGroup) {
          el.classList.remove("is-struck");
          el.setAttribute("aria-pressed", "false");
        } else {
          el.classList.add("is-struck");
          el.setAttribute("aria-pressed", "true");
        }
      } else if (hiddenGroups.has(g)) {
        el.classList.add("is-struck");
        el.setAttribute("aria-pressed", "true");
      } else {
        el.setAttribute("aria-pressed", "false");
      }

      el.textContent = "[" + g.toUpperCase() + "]";
      el.addEventListener("click", () => toggleGroup(g, el));
      panel.appendChild(el);

      if (layout === "horizontal" && idx < groups.length - 1) {
        const sep = document.createElement("span");
        sep.textContent = separator;
        sep.className = "nav-category-sep";
        sep.style.fontSize = "12px";
        sep.style.color = "inherit";
        sep.style.opacity = "0.5";
        panel.appendChild(sep);
      }
    });

    // Add "View All" button for focus-on-click mode
    if (behaviour === "focus-on-click") {
      if (layout === "horizontal" && groups.length > 0) {
        const sep = document.createElement("span");
        sep.textContent = separator;
        sep.className = "nav-category-sep nav-category-view-all-sep";
        sep.style.fontSize = "12px";
        sep.style.color = "inherit";
        sep.style.opacity = "0.5";
        sep.style.display = focusedGroup !== null ? "" : "none";
        panel.appendChild(sep);
      }

      const viewAllBtn = document.createElement("button");
      viewAllBtn.type = "button";
      viewAllBtn.id = "category-view-all";
      viewAllBtn.className = "nav-btn nav-category-view-all";
      const viewAllLabel = siteConfig.categories_view_all_label || "ALL";
      viewAllBtn.textContent = "[" + viewAllLabel.toUpperCase() + "]";
      viewAllBtn.style.display = focusedGroup !== null ? "" : "none";
      if (layout === "vertical") viewAllBtn.style.marginTop = "8px";
      viewAllBtn.addEventListener("click", restoreAllGroups);
      panel.appendChild(viewAllBtn);
    }

    // Append into configured zone (or body fallback)
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

    // Config parsing
    const cfg = window._siteConfigRaw || {};
    const layCfg = (cfg.ui && cfg.ui.modules && cfg.ui.modules.layouts) || {};
    const layout = layCfg.layout || "vertical"; // default vertical? or horizontal? wait, previous default was vertical layout buttons stacked or inline? actually `.layout-option` is block/inline. but let's follow the options. Wait, my config defaults to horizontal for layouts. Let's respect layCfg.
    const alignment = layCfg.alignment || "left";
    const separator = layCfg.separator || "|";
    const spacing = layCfg.spacing ?? 10;
    const layoutPos = layCfg.position || "middle-right";

    // Apply layout styles
    if (layout === "horizontal") {
      panel.style.display = "flex";
      panel.style.flexDirection = "row";
      panel.style.alignItems = "center";
      panel.style.gap = spacing + "px";
      panel.style.flexWrap = "nowrap";
    } else {
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = spacing + "px";
      if (alignment === "center") {
        panel.style.alignItems = "center";
        panel.style.textAlign = "center";
      } else if (alignment === "right") {
        panel.style.alignItems = "flex-end";
        panel.style.textAlign = "right";
      } else {
        panel.style.alignItems = "flex-start";
        panel.style.textAlign = "left";
      }
    }

    // Use available layouts from config; fall back to all three
    const available = (cfg && cfg.layouts && Array.isArray(cfg.layouts.available))
      ? cfg.layouts.available
      : ["random", "rows", "stacks"];
    const allModes = ["random", "rows", "stacks"];
    const defaultLayout = siteConfig.default_layout || "random";
    
    // Filter available to only valid modes
    const validModes = available.filter(mode => allModes.includes(mode));

    validModes.forEach((mode, idx) => {
      const allModesIdx = allModes.indexOf(mode);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layout-option" + (mode === defaultLayout ? " is-active" : "");
      btn.dataset.layout = mode;

      let label = mode.toUpperCase();
      if (Array.isArray(siteConfig.layout_names) && siteConfig.layout_names[allModesIdx]) {
        label = siteConfig.layout_names[allModesIdx].toUpperCase();
      }

      btn.textContent = "[" + label + "]";
      btn.addEventListener("click", () => applyLayout(mode));
      panel.appendChild(btn);

      if (layout === "horizontal" && idx < validModes.length - 1) {
        const sep = document.createElement("span");
        sep.textContent = separator;
        sep.className = "nav-layout-sep";
        sep.style.fontSize = "12px";
        sep.style.color = "inherit";
        sep.style.opacity = "0.5";
        panel.appendChild(sep);
      }
    });

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

  // ── Phase 6: Lightbox & Canvas Expand Helpers ──────────────────────────────
  function _ensureLightbox() {
    let dialog = document.getElementById("lightbox");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "lightbox";
      dialog.className = "lightbox-dialog";

      // Background overlay for color, opacity, blend-modes (placed OUTSIDE dialog to avoid stacking context isolation)
      const overlay = document.createElement("div");
      overlay.id = "lightbox-bg-overlay";
      overlay.className = "lightbox-overlay";
      document.body.appendChild(overlay);

      const content = document.createElement("div");
      content.className = "lightbox-content";

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "lightbox-close";
      closeBtn.textContent = "[×]";
      closeBtn.setAttribute("aria-label", "Close lightbox");
      closeBtn.addEventListener("click", () => dialog.close());

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "lightbox-nav lightbox-prev";
      prevBtn.textContent = "◁";
      prevBtn.setAttribute("aria-label", "Previous item");
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateLightbox(-1);
      });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "lightbox-nav lightbox-next";
      nextBtn.textContent = "▷";
      nextBtn.setAttribute("aria-label", "Next item");
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateLightbox(1);
      });

      content.appendChild(prevBtn);
      content.appendChild(nextBtn);
      dialog.appendChild(content);
      dialog.appendChild(closeBtn);

      document.body.appendChild(dialog);

      // Close lightbox on overlay click
      overlay.addEventListener("click", () => dialog.close());

      dialog.addEventListener("click", (e) => {
        if (e.target === dialog || e.target.classList.contains("lightbox-content")) {
          dialog.close();
        }
      });

      // Phase 14: Touch swipe navigation inside lightbox (left/right swipe = prev/next)
      let _lbTouchStartX = 0;
      dialog.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) _lbTouchStartX = e.touches[0].clientX;
      }, { passive: true });
      dialog.addEventListener("touchend", (e) => {
        if (e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - _lbTouchStartX;
        if (Math.abs(dx) > 40) navigateLightbox(dx < 0 ? 1 : -1);
      }, { passive: true });

      // Handle close cleanup (pause videos, etc.)
      dialog.addEventListener("close", () => {
        const activeVideo = dialog.querySelector("video");
        if (activeVideo) {
          activeVideo.pause();
          activeVideo.src = "";
        }
        dialog.querySelector(".lightbox-media-container")?.remove();
        document.getElementById("lightbox-bg-overlay")?.classList.remove("is-open");
      });
    }

    const cfg = window._siteConfigRaw;
    const effect = cfg?.imageClick?.lightbox?.backdropEffect || "darken";
    dialog.classList.remove("backdrop-darken", "backdrop-blur", "backdrop-none");
    dialog.classList.add(`backdrop-${effect}`);

    return dialog;
  }

  function updateLightboxContent() {
    const dialog = document.getElementById("lightbox");
    if (!dialog) return;

    dialog.querySelector(".lightbox-media-container")?.remove();

    if (currentLightboxIndex < 0 || currentLightboxIndex >= visibleLightboxItems.length) {
      dialog.close();
      return;
    }

    const activeEl = visibleLightboxItems[currentLightboxIndex];
    const mediaItem = activeEl._mediaItem;
    if (!mediaItem) return;

    const container = document.createElement("div");
    container.className = "lightbox-media-container";

    if (mediaItem.type === "image") {
      const img = document.createElement("img");
      img.src = mediaItem.src;
      img.className = "lightbox-image";
      img.alt = "";
      container.appendChild(img);
    } else if (mediaItem.type === "video-local") {
      const video = document.createElement("video");
      video.src = mediaItem.src;
      video.className = "lightbox-video";
      video.autoplay = true;
      video.loop = true;
      video.muted = false;
      video.controls = true;
      video.playsInline = true;
      container.appendChild(video);
    } else if (mediaItem.type === "video-embed") {
      const iframe = document.createElement("iframe");
      const videoId = mediaItem.videoId;
      const isVimeo = mediaItem.provider === "vimeo";
      iframe.src = isVimeo 
        ? `https://player.vimeo.com/video/${videoId}?autoplay=1`
        : `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`;
      iframe.className = "lightbox-video";
      iframe.style.border = "none";
      iframe.style.aspectRatio = "16/9";
      iframe.style.width = "80vw";
      iframe.style.height = "45vw";
      iframe.style.maxWidth = "90vw";
      iframe.style.maxHeight = "90vh";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
    }

    dialog.querySelector(".lightbox-content").appendChild(container);
  }

  function navigateLightbox(dir) {
    if (visibleLightboxItems.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex + dir + visibleLightboxItems.length) % visibleLightboxItems.length;
    updateLightboxContent();
  }

  function openLightbox(el) {
    visibleLightboxItems = Array.from(document.querySelectorAll(".media-item"))
      .filter(item => item.style.display !== "none");
    currentLightboxIndex = visibleLightboxItems.indexOf(el);

    if (currentLightboxIndex === -1) {
      visibleLightboxItems = [el];
      currentLightboxIndex = 0;
    }

    const dialog = _ensureLightbox();
    updateLightboxContent();
    document.getElementById("lightbox-bg-overlay")?.classList.add("is-open");
    dialog.show();
  }

  function zoomToElementSmooth(el) {
    if (!el) return;
    
    const cfg = window._siteConfigRaw;
    const physical = cfg?.imageClick?.canvasExpand?.physical;

    if (!stage.classList.contains("stage-animating")) {
      stage.classList.add("stage-animating");
    }

    const vw = stageWrapper.clientWidth;
    const vh = stageWrapper.clientHeight;
    const ew = el.offsetWidth || 520;
    const eh = el.offsetHeight || 340;

    const elCenterX = parseFloat(el.style.left || "0") + ew / 2;
    const elCenterY = parseFloat(el.style.top || "0") + eh / 2;

    if (physical) {
      el.classList.add('is-expanded-physical');
      stageX = vw / 2 - elCenterX * zoomLevel;
      stageY = vh / 2 - elCenterY * zoomLevel;
    } else {
      const scaleX = (vw * 0.7) / ew;
      const scaleY = (vh * 0.7) / eh;
      const targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(scaleX, scaleY)));

      zoomLevel = targetZoom;
      stageX = vw / 2 - elCenterX * targetZoom;
      stageY = vh / 2 - elCenterY * targetZoom;
    }

    updateStageTransform();
    expandedEl = el;

    window.clearTimeout(zoomToElementSmooth._t);
    zoomToElementSmooth._t = window.setTimeout(() => {
      stage.classList.remove("stage-animating");
    }, 600);
  }

  function resetViewSmooth() {
    if (!stage.classList.contains("stage-animating")) {
      stage.classList.add("stage-animating");
    }
    
    if (expandedEl && expandedEl.classList.contains('is-expanded-physical')) {
      expandedEl.classList.remove('is-expanded-physical');
    } else {
      zoomLevel = initialZoom;
      stageX = initialStageX;
      stageY = initialStageY;
      updateStageTransform();
    }

    expandedEl = null;

    window.clearTimeout(resetViewSmooth._t);
    resetViewSmooth._t = window.setTimeout(() => {
      stage.classList.remove("stage-animating");
    }, 600);
  }

  function handleItemInteraction(el, type) {
    const cfg = window._siteConfigRaw;
    let mode = "none";
    if (cfg?.imageClick) {
      if (cfg.imageClick.mode) {
        mode = cfg.imageClick.mode;
      } else if (cfg.imageClick.lightbox?.enabled) {
        mode = "lightbox";
      } else if (cfg.imageClick.canvasExpand?.enabled) {
        mode = "canvasExpand";
      }
    }

    if (type === "single") {
      if (mode === "lightbox") {
        openLightbox(el);
      } else if (mode === "canvasExpand" || mode === "canvas-expand") {
        // Phase 14: Canvas expand is desktop-only; on mobile fall back to lightbox or no-op.
        if (isMobile) {
          // If lightbox is also available, open it instead. Otherwise silently do nothing.
          if (cfg?.imageClick?.lightbox?.enabled) {
            openLightbox(el);
          }
          return;
        }
        if (expandedEl === el) {
          resetViewSmooth();
        } else {
          zoomToElementSmooth(el);
        }
      }
    }
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
    applyImageEffects(window._siteConfigRaw);

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

    if (!isSlideshow && currentLayout !== "random") {
      applyLayout(currentLayout);
    }

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

    // Phase 12.5 Bug 1: Signal GUI that the canvas is ready for hot-reload
    try {
      window.parent.postMessage({ type: 'canvas-ready' }, '*');
    } catch (_) { /* not in iframe — noop */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
// Race condition fix applied: Listeners attached before src set, plus synchronous check for cached assets.
