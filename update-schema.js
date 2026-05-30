const fs = require('fs');
const path = require('path');

const storePath = path.resolve(__dirname, 'setup-app', 'src', 'lib', 'store.ts');
let store = fs.readFileSync(storePath, 'utf8');

if (!store.includes('module_prefix?: string;')) {
  store = store.replace(
    `  ui: {
    modules: {`,
    `  ui: {
    module_prefix?: string;
    module_suffix?: string;
    modules: {`
  );
  
  store = store.replace(
    `    ui: {
      modules: {`,
    `    ui: {
      module_prefix: "[",
      module_suffix: "]",
      modules: {`
  );

  fs.writeFileSync(storePath, store, 'utf8');
}

const configPath = path.resolve(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.ui.module_prefix === undefined) {
  config.ui.module_prefix = "[";
  config.ui.module_suffix = "]";
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

console.log("Updated config.json and store.ts schema");
