const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, 'style.css');
let content = fs.readFileSync(cssPath, 'utf8');

content = content.replace(/text-transform:\s*uppercase;/g, 'text-transform: var(--text-transform, uppercase);');

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Replaced all text-transform: uppercase with var(--text-transform, uppercase)');
