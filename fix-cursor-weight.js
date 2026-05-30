const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, 'style.css');
let content = fs.readFileSync(cssPath, 'utf8');

content = content.replace(/\.cursor-text \{\n  font-weight: 400;/g, 
  `.cursor-text {\n  font-weight: inherit;`);

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Fixed cursor-text font weight.');
