const fs = require('fs');
const path = require('path');

const mainJsPath = path.resolve(__dirname, 'main.js');
let content = fs.readFileSync(mainJsPath, 'utf8');

// Replace specific toUpperCase() calls
content = content.replace(/email\.toUpperCase\(\)/g, 'email');
content = content.replace(/g\.toUpperCase\(\)/g, 'g');
content = content.replace(/viewAllLabel\.toUpperCase\(\)/g, 'viewAllLabel');
content = content.replace(/mode\.toUpperCase\(\)/g, 'mode');
content = content.replace(/siteConfig\.layout_names\[allModesIdx\]\.toUpperCase\(\)/g, 'siteConfig.layout_names[allModesIdx]');

// Leave the ones in announce() because they are just console.log / screen reader announcements
// Actually wait, let's just make sure I replaced the right ones:
// 1668: emailEl.textContent = "[" + email.toUpperCase() + "]"; -> emailEl.textContent = "[" + email + "]";
// 1692: navItems.push({ type: "email", label: email.toUpperCase() }); -> ... label: email ...
// 2749: el.textContent = "[" + g.toUpperCase() + "]"; -> ... g ...
// 2782: viewAllBtn.textContent = "[" + viewAllLabel.toUpperCase() + "]"; -> ... viewAllLabel ...
// 2853: let label = mode.toUpperCase(); -> let label = mode;
// 2855: label = siteConfig.layout_names[allModesIdx].toUpperCase(); -> ...[allModesIdx]

fs.writeFileSync(mainJsPath, content, 'utf8');
console.log('Removed hardcoded toUpperCase() calls from main.js');
