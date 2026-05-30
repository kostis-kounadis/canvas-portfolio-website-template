const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, 'style.css');
let content = fs.readFileSync(cssPath, 'utf8');

// 1. Make body use --text-colour globally
content = content.replace(/body \{\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  background: var\(--bg-colour\);\n  color: #111111;/g, 
  `body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-colour);
  color: var(--text-colour, #111111);`);

// 2. Remove hardcoded color: var(--text-colour, #ffff00); from elements so they inherit and can be animated!
content = content.replace(/color:\s*var\(--text-colour,\s*#ffff00\);\s*(\/\*.*?\*\/)?\n?/g, 'color: inherit;\n');

// 3. Fix font-weight: 500 on #info-text strong so it's relative
content = content.replace(/#info-text strong \{\n  font-weight: 500;\n\}/g, 
  `#info-text strong {
  font-weight: bolder;
}`);

// 4. Ensure text-fx-gradient applies to #info-text properly
// text-fx-gradient uses -webkit-text-fill-color: transparent.
// If #info-text has color: inherit, the gradient should show through perfectly!

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Fixed style.css to unify text animations, weight, and color inheritance.');
