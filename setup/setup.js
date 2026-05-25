/**
 * setup/setup.js
 * Canvas Portfolio Template — GUI Setup Tool Logic
 *
 * Architecture:
 *  - Fetches config.json via GET /api/config on load
 *  - Populates all form fields from the config object
 *  - On any form change → debounced hot-reload into preview iframe via postMessage
 *  - Save button → POST /api/config with serialised config
 *  - Rebuild button → POST /api/build (streaming text response)
 */

'use strict';

// ── Constants ───────────────────────────────────────────────────────────────

const ZONES = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

const MODULE_KEYS = ['title', 'email', 'info', 'categories', 'layouts'];
const MODULE_LABELS = {
  title:      'Title / Logo',
  email:      'Email Link',
  info:       'INFO Button',
  categories: 'Categories Panel',
  layouts:    'Layouts Panel',
};

// ── State ───────────────────────────────────────────────────────────────────

let _cfg = null;       // live config object (mutated in-place)
let _dirty = false;    // unsaved changes flag
let _debounceTimer = null;
let _activeTab = 'identity';
let _canvasReady = false; // Phase 12.5 Bug 1: tracks iframe readiness

// ── Utility ─────────────────────────────────────────────────────────────────

function deepGet(obj, path) {
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function deepSet(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function setStatus(msg, type = '') {
  const el = document.getElementById('status-message');
  el.textContent = msg;
  el.className = type;
}

function markDirty(isDirty = true) {
  _dirty = isDirty;
  document.getElementById('unsaved-dot').classList.toggle('visible', isDirty);
}

function debounce(fn, ms) {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(fn, ms);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  _activeTab = tabId;

  // Update sidebar button states
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Render the panel into the preview area overlay
  renderPanel(tabId);
}

function renderPanel(tabId) {
  const previewArea = document.getElementById('preview-area');
  let panelContainer = document.getElementById('panel-container');

  if (!panelContainer) {
    panelContainer = document.createElement('div');
    panelContainer.id = 'panel-container';
    panelContainer.style.cssText = [
      'position:absolute', 'inset:40px 0 0 0', 'z-index:10',
      'overflow-y:auto', 'background:var(--bg-0)',
      'padding:20px', 'display:flex', 'flex-direction:column', 'gap:16px',
      'scrollbar-width:thin', 'scrollbar-color:var(--bg-4) transparent',
      'max-width:580px', // Phase 12.5 Bug 2: constrain panel width
    ].join(';');
    previewArea.appendChild(panelContainer);
  }

  // Help tab: show full-width, no preview split needed
  panelContainer.style.display = 'flex';

  const tpl = document.getElementById(`tpl-${tabId}`);
  if (!tpl) return;

  panelContainer.innerHTML = '';
  panelContainer.appendChild(tpl.content.cloneNode(true));

  // Wire controls specific to this tab
  wireTab(tabId);
}

// ── Config fetch / push ──────────────────────────────────────────────────────

async function loadConfig() {
  setStatus('Loading config…', 'loading');
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _cfg = await res.json();
    setStatus('Config loaded.', 'success');
    switchTab(_activeTab);
    markDirty(false);
  } catch (e) {
    setStatus('❌ Failed to load config: ' + e.message, 'error');
  }
}

async function saveConfig() {
  setStatus('Saving…', 'loading');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_cfg, null, 2),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    setStatus('✅ Saved to config.json', 'success');
    markDirty(false);
    // Phase 14: Broadcast to any open portfolio tab so it hot-reloads automatically.
    hotReload();
    setTimeout(() => setStatus('Ready.'), 3000);
  } catch (e) {
    setStatus('❌ Save failed: ' + e.message, 'error');
  }
}

async function triggerBuild() {
  const btn = document.getElementById('btn-rebuild');
  btn.disabled = true;
  setStatus('Building…', 'loading');

  let log = document.getElementById('build-log');
  if (!log) {
    // Create log near the bottom of the active panel
    log = document.createElement('pre');
    log.id = 'build-log';
    log.className = 'build-log visible';
    document.getElementById('panel-container')?.appendChild(log);
  }
  log.classList.add('visible');
  log.textContent = '';

  try {
    const res = await fetch('/api/build', { method: 'POST' });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        const text = decoder.decode(value);
        log.textContent += text;
        log.scrollTop = log.scrollHeight;
      }
    }
    setStatus('✅ Build complete.', 'success');
    setTimeout(() => setStatus('Ready.'), 4000);
  } catch (e) {
    setStatus('❌ Build failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Hot-reload ───────────────────────────────────────────────────────────────
// Phase 14: No longer uses an iframe. Broadcasts config via BroadcastChannel
// so any open portfolio tab at localhost:3000 automatically picks up changes.

let _guiChannel = null;
try {
  _guiChannel = new BroadcastChannel('canvas-portfolio-config');
} catch (_) { /* BroadcastChannel unsupported — live preview won't work */ }

function hotReload() {
  if (_guiChannel) {
    try {
      _guiChannel.postMessage({ type: 'config-update', config: _cfg });
    } catch (_) { /* noop */ }
  }
}

function scheduleHotReload() {
  debounce(hotReload, 150);
}

// ── Generic field wiring ─────────────────────────────────────────────────────

/**
 * Wire all elements with data-path attribute in a container to _cfg.
 */
function wireDataPath(container = document) {
  // Text / email / url inputs
  container.querySelectorAll('[data-path]').forEach(el => {
    const path = el.dataset.path;
    const val = deepGet(_cfg, path);

    if (el.type === 'checkbox') {
      el.checked = !!val;
      el.addEventListener('change', () => {
        deepSet(_cfg, path, el.checked);
        markDirty();
        scheduleHotReload();
        handleConditionalVisibility();
      });
    } else if (el.type === 'radio') {
      el.checked = (String(val) === el.value);
      el.addEventListener('change', () => {
        if (el.checked) {
          deepSet(_cfg, path, el.value);
          markDirty();
          scheduleHotReload();
          handleConditionalVisibility();
        }
      });
    } else if (el.type === 'range') {
      const num = parseFloat(val) || 0;
      el.value = num;
      updateSliderLabel(el);
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        deepSet(_cfg, path, v);
        updateSliderLabel(el);
        markDirty();
        scheduleHotReload();
      });
    } else if (el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'email' || el.type === 'url' || el.type === 'number') {
      el.value = val ?? '';
      el.addEventListener('input', () => {
        deepSet(_cfg, path, el.value);
        markDirty();
        scheduleHotReload();
      });
    } else if (el.tagName === 'SELECT') {
      el.value = String(val ?? '');
      el.addEventListener('change', () => {
        deepSet(_cfg, path, el.value);
        markDirty();
        scheduleHotReload();
        handleConditionalVisibility();
      });
    }
  });
}

function updateSliderLabel(rangeEl) {
  const valId = rangeEl.id + '-val';
  const label = document.getElementById(valId);
  if (!label) return;
  let v = rangeEl.value;
  // Textsize: append px
  if (rangeEl.dataset.path === 'ui.textSize') v = v + 'px';
  label.textContent = v;
}

// ── Colour pickers ───────────────────────────────────────────────────────────

function wireColourPair(colorInputId, hexInputId, path) {
  const colorEl = document.getElementById(colorInputId);
  const hexEl   = document.getElementById(hexInputId);
  if (!colorEl || !hexEl) return;

  const val = deepGet(_cfg, path) || '#000000';
  colorEl.value = val;
  hexEl.value = val.toUpperCase();

  colorEl.addEventListener('input', () => {
    hexEl.value = colorEl.value.toUpperCase();
    deepSet(_cfg, path, colorEl.value);
    markDirty();
    scheduleHotReload();
  });

  hexEl.addEventListener('input', () => {
    const v = hexEl.value.trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      colorEl.value = v;
      deepSet(_cfg, path, v);
      markDirty();
      scheduleHotReload();
    }
  });
}

// ── Conditional visibility ───────────────────────────────────────────────────

function handleConditionalVisibility() {
  const t = _cfg?.theme;
  const ie = _cfg?.imageEffects;
  const ic = _cfg?.imageClick;
  const cat = _cfg?.categories;

  maybe('gradient-controls',   t && (t.backgroundEffect === 'gradient-static' || t.backgroundEffect === 'gradient-animated'));
  maybe('noise-controls',      t?.noiseGrain?.enabled);
  maybe('shadow-controls',     t?.imageShadow?.enabled);
  maybe('duotone-controls',    ie?.initialState === 'duotone');
  maybe('lightbox-controls',   ic?.lightbox?.enabled);
  maybe('ic-trigger-card',     ic?.lightbox?.enabled && ic?.canvasExpand?.enabled);
  maybe('focus-effect-group',  cat?.behaviour === 'focus-on-click');
  // Phase 12.5 Bug 5: text animation trigger visibility
  maybe('text-anim-trigger-group', t?.textAnimation && t.textAnimation !== 'none');
}

function maybe(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

// ── Zone diagram ─────────────────────────────────────────────────────────────

function updateZoneDiagram() {
  const occupied = {};
  MODULE_KEYS.forEach(k => {
    const mod = deepGet(_cfg, `ui.modules.${k}`);
    if (mod?.visible && mod?.position) {
      occupied[mod.position] = occupied[mod.position] || [];
      occupied[mod.position].push(k);
    }
  });

  document.querySelectorAll('.zone-cell').forEach(cell => {
    const zone = cell.dataset.zone;
    const items = occupied[zone];
    if (items?.length) {
      cell.classList.add('occupied');
      cell.textContent = items.map(k => MODULE_LABELS[k].split(' ')[0]).join(' + ');
    } else {
      cell.classList.remove('occupied');
      cell.textContent = zone.replace('-', '\n');
    }
  });
}

// ── Modules panel ────────────────────────────────────────────────────────────

function buildModulesPanel() {
  const list = document.getElementById('modules-list');
  if (!list) return;
  list.innerHTML = '';

  // Phase 12.5 Bug 2: Compact table-grid layout for modules
  MODULE_KEYS.forEach(key => {
    const mod = deepGet(_cfg, `ui.modules.${key}`) || {};
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns:1fr auto auto; gap:8px; align-items:center; padding:8px 12px; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--r-sm); margin-bottom:6px;';

    const label = document.createElement('span');
    label.style.cssText = 'font-size:12px; font-weight:500; color:var(--text-primary);';
    label.textContent = MODULE_LABELS[key];

    const toggleWrap = document.createElement('label');
    toggleWrap.className = 'toggle';
    toggleWrap.innerHTML = `<input type="checkbox" id="mod-${key}-visible" ${mod.visible ? 'checked' : ''} /><span class="toggle-track"></span>`;

    const posSelect = document.createElement('select');
    posSelect.id = `mod-${key}-pos`;
    posSelect.style.cssText = 'width:130px; font-size:11px; padding:4px 6px;';
    posSelect.innerHTML = ZONES.map(z => `<option value="${z}" ${mod.position === z ? 'selected' : ''}>${z}</option>`).join('');

    row.appendChild(label);
    row.appendChild(toggleWrap);
    row.appendChild(posSelect);
    list.appendChild(row);

    // Wire toggle
    const visEl = document.getElementById(`mod-${key}-visible`);
    visEl.addEventListener('change', () => {
      deepSet(_cfg, `ui.modules.${key}.visible`, visEl.checked);
      markDirty(); scheduleHotReload(); updateZoneDiagram();
    });

    // Wire position select
    posSelect.addEventListener('change', () => {
      deepSet(_cfg, `ui.modules.${key}.position`, posSelect.value);
      markDirty(); scheduleHotReload(); updateZoneDiagram();
    });

    // Title-specific extended controls
    if (key === 'title') {
      const extCard = document.createElement('div');
      extCard.className = 'section-card';
      extCard.style.marginBottom = '6px';
      extCard.innerHTML = `
        <div class="section-body" style="padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
          <div class="field">
            <label>Title Display Mode</label>
            <select id="mod-title-mode" style="width:100%">
              <option value="text">Text</option>
              <option value="svg">Logo image (SVG/PNG)</option>
              <option value="svg_text">Logo + Text</option>
              <option value="text_svg">Text + Logo</option>
            </select>
          </div>
          <div class="field" id="mod-title-logo-row" style="display:none;">
            <label for="mod-title-logo">Logo filename (in project root)</label>
            <input type="text" id="mod-title-logo" placeholder="logo.svg" />
          </div>
          <div class="field" id="mod-title-text-row">
            <label for="mod-title-text">Title text override</label>
            <input type="text" id="mod-title-text" placeholder="My Portfolio" />
          </div>
          <div class="toggle-row" id="mod-title-icon-row">
            <label>Decorative SVG Icon</label>
            <label class="toggle"><input type="checkbox" id="mod-title-icon-enabled" /><span class="toggle-track"></span></label>
          </div>
          <div id="mod-title-icon-controls" style="display:none;">
            <div class="field" style="margin-bottom:6px;">
              <label for="mod-title-icon-file">Icon SVG file path</label>
              <input type="text" id="mod-title-icon-file" placeholder="icon.svg" />
            </div>
            <div class="field">
              <label>Icon Position</label>
              <select id="mod-title-icon-pos">
                <option value="before">Before title</option>
                <option value="after">After title</option>
              </select>
            </div>
          </div>
        </div>
      `;
      list.appendChild(extCard);

      // Wire title mode
      const modeEl = document.getElementById('mod-title-mode');
      const logoRow = document.getElementById('mod-title-logo-row');
      const textRow = document.getElementById('mod-title-text-row');
      const logoEl  = document.getElementById('mod-title-logo');
      const textEl  = document.getElementById('mod-title-text');

      modeEl.value = mod.mode || 'text';
      logoEl.value = mod.logoFile || '';
      textEl.value = mod.text || _cfg.site?.title || '';

      const toggleTitleMode = () => {
        const isLogo = modeEl.value === 'svg' || modeEl.value === 'svg_text' || modeEl.value === 'text_svg';
        logoRow.style.display = isLogo ? '' : 'none';
        textRow.style.display = modeEl.value === 'svg' ? 'none' : '';
      };
      toggleTitleMode();

      modeEl.addEventListener('change', () => {
        deepSet(_cfg, 'ui.modules.title.mode', modeEl.value);
        markDirty(); scheduleHotReload();
        toggleTitleMode();
      });
      logoEl.addEventListener('input', () => {
        deepSet(_cfg, 'ui.modules.title.logoFile', logoEl.value);
        markDirty(); scheduleHotReload();
      });
      textEl.addEventListener('input', () => {
        deepSet(_cfg, 'ui.modules.title.text', textEl.value);
        markDirty(); scheduleHotReload();
      });

      // Phase 12.5 Bug 3: Wire icon controls
      const iconEnabledEl = document.getElementById('mod-title-icon-enabled');
      const iconControlsEl = document.getElementById('mod-title-icon-controls');
      const iconFileEl = document.getElementById('mod-title-icon-file');
      const iconPosEl = document.getElementById('mod-title-icon-pos');

      const icon = mod.icon || {};
      iconEnabledEl.checked = icon.enabled === true;
      iconFileEl.value = icon.file || '';
      iconPosEl.value = icon.position || 'before';
      iconControlsEl.style.display = icon.enabled ? '' : 'none';

      iconEnabledEl.addEventListener('change', () => {
        if (!_cfg.ui.modules.title.icon) _cfg.ui.modules.title.icon = {};
        deepSet(_cfg, 'ui.modules.title.icon.enabled', iconEnabledEl.checked);
        iconControlsEl.style.display = iconEnabledEl.checked ? '' : 'none';
        markDirty(); scheduleHotReload();
      });
      iconFileEl.addEventListener('input', () => {
        if (!_cfg.ui.modules.title.icon) _cfg.ui.modules.title.icon = {};
        deepSet(_cfg, 'ui.modules.title.icon.file', iconFileEl.value);
        markDirty(); scheduleHotReload();
      });
      iconPosEl.addEventListener('change', () => {
        if (!_cfg.ui.modules.title.icon) _cfg.ui.modules.title.icon = {};
        deepSet(_cfg, 'ui.modules.title.icon.position', iconPosEl.value);
        markDirty(); scheduleHotReload();
      });
    }
  });

  updateZoneDiagram();

  // Zoom toggle
  const zoomEl = document.getElementById('mod-zoom-visible');
  if (zoomEl) {
    zoomEl.checked = !!deepGet(_cfg, 'ui.zoom.visible');
    zoomEl.addEventListener('change', () => {
      deepSet(_cfg, 'ui.zoom.visible', zoomEl.checked);
      markDirty(); scheduleHotReload();
    });
  }
}

// ── Layouts panel ─────────────────────────────────────────────────────────────

function buildLayoutsPanel() {
  const available = _cfg?.layouts?.available || [];
  const labels    = _cfg?.layouts?.labels || ['▩▩▩', '▤▤▤', '▧▧▧'];

  ['random', 'rows', 'stacks'].forEach((lay, i) => {
    const cb = document.getElementById(`lay-${lay}`);
    if (cb) {
      cb.checked = available.includes(lay);
      cb.addEventListener('change', () => {
        const avail = _cfg.layouts.available || [];
        if (cb.checked && !avail.includes(lay)) avail.push(lay);
        if (!cb.checked) {
          const idx = avail.indexOf(lay);
          if (idx > -1) avail.splice(idx, 1);
        }
        _cfg.layouts.available = avail;
        markDirty(); scheduleHotReload();
      });
    }

    // Label inputs
    const labelEl = document.getElementById(`lay-${lay}-label`);
    if (labelEl) {
      labelEl.value = labels[i] || '';
      labelEl.addEventListener('input', () => {
        if (!_cfg.layouts.labels) _cfg.layouts.labels = ['', '', ''];
        _cfg.layouts.labels[i] = labelEl.value;
        markDirty(); scheduleHotReload();
      });
    }
  });
}

// ── SEO keywords tag input ────────────────────────────────────────────────────

function buildKeywordsInput() {
  const wrap  = document.getElementById('seo-keywords-wrap');
  const input = document.getElementById('seo-keywords-input');
  if (!wrap || !input) return;

  const keywords = _cfg?.seo?.keywords || [];

  function renderTags() {
    // Remove existing tags (keep input)
    wrap.querySelectorAll('.tag').forEach(t => t.remove());
    keywords.forEach((kw, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${kw}<button class="tag-remove" data-i="${i}" title="Remove">×</button>`;
      wrap.insertBefore(tag, input);
    });
  }

  function addKeyword(kw) {
    kw = kw.trim().replace(/,$/, '').trim();
    if (!kw || keywords.includes(kw)) return;
    keywords.push(kw);
    deepSet(_cfg, 'seo.keywords', keywords);
    markDirty(); scheduleHotReload();
    renderTags();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(input.value);
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && keywords.length) {
      keywords.pop();
      deepSet(_cfg, 'seo.keywords', keywords);
      markDirty(); scheduleHotReload();
      renderTags();
    }
  });

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.tag-remove');
    if (btn) {
      const i = parseInt(btn.dataset.i, 10);
      keywords.splice(i, 1);
      deepSet(_cfg, 'seo.keywords', keywords);
      markDirty(); scheduleHotReload();
      renderTags();
    } else {
      input.focus();
    }
  });

  renderTags();
}

// ── SEO sameAs URL list ───────────────────────────────────────────────────────

function buildSameAsList() {
  const listEl = document.getElementById('seo-same-as-list');
  const addBtn = document.getElementById('seo-add-url');
  if (!listEl || !addBtn) return;

  const urls = _cfg?.seo?.sameAs || [];
  deepSet(_cfg, 'seo.sameAs', urls);

  function renderList() {
    listEl.innerHTML = '';
    urls.forEach((url, i) => {
      const row = document.createElement('div');
      row.className = 'url-list-item';
      row.innerHTML = `
        <input type="url" value="${url}" placeholder="https://instagram.com/yourhandle" />
        <button class="btn btn-danger btn-sm" data-i="${i}" title="Remove">×</button>
      `;
      const inp = row.querySelector('input');
      inp.addEventListener('input', () => {
        urls[i] = inp.value;
        deepSet(_cfg, 'seo.sameAs', urls);
        markDirty(); scheduleHotReload();
      });
      row.querySelector('button').addEventListener('click', () => {
        urls.splice(i, 1);
        deepSet(_cfg, 'seo.sameAs', urls);
        markDirty(); scheduleHotReload();
        renderList();
      });
      listEl.appendChild(row);
    });
  }

  addBtn.addEventListener('click', () => {
    urls.push('');
    deepSet(_cfg, 'seo.sameAs', urls);
    markDirty();
    renderList();
    listEl.querySelectorAll('input').forEach((el, i) => { if (i === urls.length - 1) el.focus(); });
  });

  renderList();
}

// ── Typography font preview ───────────────────────────────────────────────────

function updateFontPreview() {
  const embedCode = _cfg?.ui?.fontEmbedCode || '';
  const preview = document.getElementById('font-preview');
  if (!preview) return;

  // Extract font-family from embed code or CSS var
  const match = embedCode.match(/family=([^&"]+)/);
  if (match) {
    const family = decodeURIComponent(match[1].split(':')[0].replace(/\+/g, ' '));
    preview.style.fontFamily = `"${family}", sans-serif`;
  } else {
    preview.style.fontFamily = '"JetBrains Mono", monospace';
  }
}

// ── Per-tab wiring ────────────────────────────────────────────────────────────

function wireTab(tabId) {
  if (!_cfg) return;
  const container = document.getElementById('panel-container');
  if (!container) return;

  // Wire all data-path fields in this panel generically
  wireDataPath(container);

  switch (tabId) {
    case 'identity':
      // No extra wiring needed — all covered by data-path
      break;

    case 'modules':
      buildModulesPanel();
      break;

    case 'theme':
      wireColourPair('th-bg-color',      'th-bg-color-hex',      'theme.backgroundColor');
      wireColourPair('th-text-color',     'th-text-color-hex',    'theme.textColor');
      wireColourPair('th-grad-from',      'th-grad-from-hex',     'theme.backgroundGradientFrom');
      wireColourPair('th-grad-to',        'th-grad-to-hex',       'theme.backgroundGradientTo');
      wireColourPair('th-shadow-color',   'th-shadow-color-hex',  'theme.imageShadow.color');
      handleConditionalVisibility();
      break;

    case 'typography':
      {
        // textSize: stored as "18px", slider value is the integer
        const sizeEl = document.getElementById('typo-size');
        const sizeVal = document.getElementById('typo-size-val');
        if (sizeEl && sizeVal) {
          const current = parseInt(_cfg?.ui?.textSize || '18', 10);
          sizeEl.value = current;
          sizeVal.textContent = current + 'px';
          sizeEl.addEventListener('input', () => {
            const v = sizeEl.value + 'px';
            deepSet(_cfg, 'ui.textSize', v);
            sizeVal.textContent = v;
            markDirty();
            scheduleHotReload();
          });
        }

        // Font embed textarea: after change, update preview
        const embedEl = document.getElementById('typo-embed');
        if (embedEl) {
          embedEl.addEventListener('input', updateFontPreview);
          updateFontPreview();
        }

        // Phase 12.5 Bug 5: text animation trigger visibility
        handleConditionalVisibility();
      }
      break;

    case 'layouts':
      buildLayoutsPanel();
      break;

    case 'categories':
      handleConditionalVisibility();
      break;

    case 'imageeffects':
      handleConditionalVisibility();
      // Duotone sliders: not in config yet, wire them loosely
      {
        const hueEl = document.getElementById('fx-duotone-hue');
        const satEl = document.getElementById('fx-duotone-sat');
        const hueVal = document.getElementById('fx-duotone-hue-val');
        const satVal = document.getElementById('fx-duotone-sat-val');
        if (hueEl && hueVal) {
          const h = deepGet(_cfg, 'imageEffects.duotoneHue') ?? 220;
          hueEl.value = h; hueVal.textContent = h;
          hueEl.addEventListener('input', () => {
            hueVal.textContent = hueEl.value;
            deepSet(_cfg, 'imageEffects.duotoneHue', parseFloat(hueEl.value));
            markDirty(); scheduleHotReload();
          });
        }
        if (satEl && satVal) {
          const s = deepGet(_cfg, 'imageEffects.duotoneSaturation') ?? 80;
          satEl.value = s; satVal.textContent = s;
          satEl.addEventListener('input', () => {
            satVal.textContent = satEl.value;
            deepSet(_cfg, 'imageEffects.duotoneSaturation', parseFloat(satEl.value));
            markDirty(); scheduleHotReload();
          });
        }
      }
      break;

    case 'imageclick':
      handleConditionalVisibility();
      break;

    case 'info':
      // handled by data-path
      break;

    case 'seo':
      buildKeywordsInput();
      buildSameAsList();
      break;

    case 'favicon':
      // No form fields — just static instructions
      break;

    case 'help':
      // Static content
      break;
  }
}

// ── Main event wiring ─────────────────────────────────────────────────────────

function init() {
  // Tab navigation
  document.getElementById('sidebar-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  // Save buttons
  document.getElementById('btn-save').addEventListener('click', saveConfig);
  document.getElementById('btn-save-footer').addEventListener('click', saveConfig);

  // Rebuild
  document.getElementById('btn-rebuild').addEventListener('click', () => {
    if (_dirty) {
      saveConfig().then(triggerBuild);
    } else {
      triggerBuild();
    }
  });

  // Reload preview
  document.getElementById('btn-reload-preview').addEventListener('click', () => {
    const iframe = document.getElementById('preview-iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  });

  // Open in new tab
  document.getElementById('btn-open-preview').addEventListener('click', () => {
    window.open('/', '_blank', 'noopener');
  });

  // Listen for messages from preview iframe
  window.addEventListener('message', e => {
    if (e.data?.type === 'canvas-ready' && _cfg) {
      _canvasReady = true;
      hotReload();
    }
  });

  // When iframe finishes loading, wait for canvas-ready or fall back after 3s
  document.getElementById('preview-iframe').addEventListener('load', () => {
    if (_cfg && _canvasReady) {
      hotReload();
    } else if (_cfg) {
      // Fallback: if canvas-ready never arrives, try after 3 seconds
      setTimeout(() => {
        if (!_canvasReady) {
          _canvasReady = true;
          hotReload();
        }
      }, 3000);
    }
  });

  // Keyboard shortcut: Cmd/Ctrl+S = save
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveConfig();
    }
  });

  // Load config on startup
  loadConfig();
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
