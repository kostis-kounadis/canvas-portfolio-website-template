const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);

// 1. Update config.json
const configPath = path.join(root, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.ui && config.ui.modules && config.ui.modules.title && config.ui.modules.title.icon) {
  delete config.ui.modules.title.icon;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// 2. Update store.ts
const storePath = path.join(root, 'setup-app', 'src', 'lib', 'store.ts');
let store = fs.readFileSync(storePath, 'utf8');
store = store.replace(
  /title: \{ visible: boolean; position: string; mode: string; text: string; logoFile: string; icon\?: any \};/,
  'title: { visible: boolean; position: string; mode: string; text: string; logoFile: string };'
);
fs.writeFileSync(storePath, store, 'utf8');

// 3. Update main.js
const mainPath = path.join(root, 'main.js');
let main = fs.readFileSync(mainPath, 'utf8');

// Remove icon parser block
main = main.replace(
  /\/\/ Phase 12\.5 Bug 3: SVG icon config\s+if \(mods\.title\.icon\) \{[\s\S]*?\}\s+/m,
  ''
);

// Delete buildIcon and its related logic
const buildIconRegex = /\/\/ Phase 12\.5 Bug 3: build decorative SVG icon adjacent to the title\s+const buildIcon = \(\) => \{[\s\S]*?\}\s*;\s*\/\*.*?icon placement.*?\*\/\s*const iconEnabled = siteConfig\.title_icon_enabled;\s*const iconPos     = siteConfig\.title_icon_position \|\| "before";\s*if \(iconEnabled && iconPos === "before"\) buildIcon\(\);\s*/m;

main = main.replace(buildIconRegex, '');

// Also remove the bottom icon invocation
main = main.replace(/if \(iconEnabled && iconPos === "after"\) buildIcon\(\);\s*/g, '');

fs.writeFileSync(mainPath, main, 'utf8');

console.log('Unification script complete!');
