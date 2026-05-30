const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, 'main.js');
let mainJS = fs.readFileSync(mainPath, 'utf8');

// 1. Inject wrapModule globally
if (!mainJS.includes('function wrapModule(el)')) {
  mainJS = mainJS.replace(
    '// Store initial view state for reset',
    `// Helper to wrap a module with prefix/suffix without polluting the clickable link
function wrapModule(el) {
  const pfxText = siteConfig.module_prefix !== undefined ? siteConfig.module_prefix : "[";
  const sfxText = siteConfig.module_suffix !== undefined ? siteConfig.module_suffix : "]";
  
  if (!pfxText && !sfxText) return el;

  const wrapper = document.createElement("span");
  wrapper.className = "module-wrapper";
  
  if (pfxText) {
    const pfxNode = document.createElement("span");
    pfxNode.className = "module-prefix";
    pfxNode.textContent = pfxText;
    wrapper.appendChild(pfxNode);
  }
  
  wrapper.appendChild(el);
  
  if (sfxText) {
    const sfxNode = document.createElement("span");
    sfxNode.className = "module-suffix";
    sfxNode.textContent = sfxText;
    wrapper.appendChild(sfxNode);
  }
  
  return wrapper;
}

// Store initial view state for reset`
  );
}

// Ensure module_prefix config properties exist in siteConfig definition
if (!mainJS.includes('module_prefix:     "["')) {
  mainJS = mainJS.replace(
    '    show_zoom:       true,',
    `    show_zoom:       true,
    module_prefix:   "[",
    module_suffix:   "]",`
  );
}

// And populate from config.json
if (!mainJS.includes('if (cfg.ui.module_prefix !== undefined) siteConfig.module_prefix')) {
  mainJS = mainJS.replace(
    '      if (cfg.ui.zoom  != null) siteConfig.show_zoom  = cfg.ui.zoom.visible  !== false;',
    `      if (cfg.ui.zoom  != null) siteConfig.show_zoom  = cfg.ui.zoom.visible  !== false;
      if (cfg.ui.module_prefix !== undefined) siteConfig.module_prefix = cfg.ui.module_prefix;
      if (cfg.ui.module_suffix !== undefined) siteConfig.module_suffix = cfg.ui.module_suffix;`
  );
}

fs.writeFileSync(mainPath, mainJS, 'utf8');
console.log("Injected wrapModule into main.js");
