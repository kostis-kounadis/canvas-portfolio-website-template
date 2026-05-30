const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

const wrapperStyles = `
/* Global Module Wrapper (separates brackets from clickable links) */
.module-wrapper {
  display: inline-flex;
  align-items: baseline;
  pointer-events: none;
}
.module-wrapper > * {
  pointer-events: auto;
}
.module-prefix, .module-suffix {
  pointer-events: none;
  user-select: none;
  white-space: pre;
}
`;

if (!css.includes('.module-wrapper')) {
  css = css.replace(
    `/* Separator pipe between nav items */`,
    wrapperStyles + '\n/* Separator pipe between nav items */'
  );
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log("Injected module wrapper styles to style.css");
}
