const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, 'main.js');
let mainJS = fs.readFileSync(mainPath, 'utf8');

// 1. Inject wrapModule function
if (!mainJS.includes('function wrapModule(el)')) {
  mainJS = mainJS.replace(
    'document.addEventListener("DOMContentLoaded", async () => {',
    `document.addEventListener("DOMContentLoaded", async () => {
  // Helper to wrap a module with prefix/suffix without polluting the clickable link
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
  }`
  );
}

// 2. Info module
mainJS = mainJS.replace(/infoBtn\.textContent = "\[INFO\]";/g, 'infoBtn.textContent = "INFO";');
mainJS = mainJS.replace(/textEl\.textContent = "\[INFO NOT FOUND\]";/g, 'textEl.textContent = "INFO NOT FOUND";');
mainJS = mainJS.replace(/infoZone\.appendChild\(infoBtn\);/g, 'infoZone.appendChild(wrapModule(infoBtn));');

// 3. Email module
mainJS = mainJS.replace(/emailEl\.textContent = "\[" \+ email \+ "\]";/g, 'emailEl.textContent = email;');
mainJS = mainJS.replace(/emailZone\.appendChild\(emailEl\);/g, 'emailZone.appendChild(wrapModule(emailEl));');

// 4. Title module
mainJS = mainJS.replace(/titleZone\.appendChild\(titleEl\);/g, 'titleZone.appendChild(wrapModule(titleEl));');

// 5. Categories & navRight insertions
mainJS = mainJS.replace(/el\.textContent = "\[" \+ item\.label \+ "\]";/g, 'el.textContent = item.label;');
mainJS = mainJS.replace(/navRight\.appendChild\(el\);/g, 'navRight.appendChild(wrapModule(el));');

// 6. Preloader counter
mainJS = mainJS.replace(
  /counterEl\.textContent = "\[" \+ loaded \+ "\/" \+ total \+ "\]";/g,
  'counterEl.textContent = (siteConfig.module_prefix !== undefined ? siteConfig.module_prefix : "[") + loaded + "/" + total + (siteConfig.module_suffix !== undefined ? siteConfig.module_suffix : "]");'
);

// 7. Layout buttons
mainJS = mainJS.replace(/btn\.textContent = "\[" \+ label \+ "\]";/g, 'btn.textContent = label;');
mainJS = mainJS.replace(/layoutsZone\.appendChild\(btn\);/g, 'layoutsZone.appendChild(wrapModule(btn));');

// 8. View All button
mainJS = mainJS.replace(/viewAllBtn\.textContent = "\[" \+ viewAllLabel \+ "\]";/g, 'viewAllBtn.textContent = viewAllLabel;');
mainJS = mainJS.replace(/document\.querySelector\("\.zone-middle-center"\)\.appendChild\(viewAllBtn\);/g, 'document.querySelector(".zone-middle-center").appendChild(wrapModule(viewAllBtn));');
mainJS = mainJS.replace(/getZone\("middle-center"\)\.appendChild\(viewAllBtn\);/g, 'getZone("middle-center").appendChild(wrapModule(viewAllBtn));');

// 9. Mobile drag toggle button
mainJS = mainJS.replace(
  /btn\.textContent = isInitiallySlideshow \? "\[DRAG\]" : "\[SCROLL\]";/g,
  'btn.textContent = isInitiallySlideshow ? "DRAG" : "SCROLL";'
);
mainJS = mainJS.replace(
  /btn\.textContent = isDrag \? "\[DRAG\]" : "\[SCROLL\]";/g,
  'btn.textContent = isDrag ? "DRAG" : "SCROLL";'
);
mainJS = mainJS.replace(/toggleZone\.appendChild\(btn\);/g, 'toggleZone.appendChild(wrapModule(btn));');

// 10. Wrap zoom buttons
// At the end of DOMContentLoaded (before the final `});`) we can wrap the zoom buttons.
if (!mainJS.includes("document.querySelectorAll('.zoom-btn').forEach(btn => {")) {
  mainJS = mainJS.replace(
    '// Trigger layout on window resize',
    `// Wrap zoom buttons in DOM
    document.querySelectorAll('.zoom-btn').forEach(btn => {
      if (!btn.parentNode.classList.contains('module-wrapper')) {
        btn.parentNode.replaceChild(wrapModule(btn), btn);
      }
    });

    // Trigger layout on window resize`
  );
}

fs.writeFileSync(mainPath, mainJS, 'utf8');
console.log("Updated main.js");
