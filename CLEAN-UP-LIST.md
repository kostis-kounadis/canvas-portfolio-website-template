# Directory Triage & Cleanup Mapping

Based on the files present in your root directory, here is the categorized breakdown of what belongs to the core application, what appears to be temporary utilities, and what is safe to delete. 

### 🟢 CORE APPLICATION CODE
*(Files that are absolutely necessary for the app to run, structure, and document the project)*

* **`index.html`** - The main entry point and HTML shell for the portfolio.
* **`main.js`** - The core JavaScript logic that renders the portfolio frontend.
* **`style.css`** - The core stylesheet for the portfolio.
* **`data.js`** - The bridging file that loads your configuration variables.
* **`config.json`** - The primary source of truth for all your website settings.
* **`assets/`** - Directory containing site media like your logo, icons, etc.
* **`favicon/`** - Directory containing favicon generated assets.
* **`admin/`** - Directory likely related to the Netlify CMS or legacy admin structure.
* **`setup-app/`** - The React source code for your visual configuration GUI.
* **`setup/`** - The compiled, production-ready build of the `setup-app` (served to users locally).
* **`README.md`** & **`README-SETUP.md`** - Documentation for the template and the setup app.
* **`.gitignore`** - Git configuration to prevent pushing node_modules and temp files.
* **`robots.txt`** & **`sitemap.xml`** - Necessary SEO files for search engine indexing.
* **`og-image.jpg`** - The default Open Graph fallback image for social media link sharing.
* **`start-gui-dev.command`**, **`start-setup.command`**, **`start-setup.sh`** - macOS helper scripts intended to make launching the setup environment easy for end-users.
* **`install-gui-deps.sh`** - Setup script for installing required dependencies.

---

### 🟡 SUSPECTED UTILITIES/SCRIPTS
*(Node.js scripts used to bulk-replace code or automate complex edits during the "vibe coding" process. These are not needed to run the website, but you might want to keep them in a `scripts/` folder if you plan on using them again. Otherwise, they can be deleted.)*

* **`fix-cursor-weight.js`** - A targeted script to modify cursor/font weight logic.
* **`fix-text.js`** - A script used to patch text rendering or styling in the codebase.
* **`inject-accordion.js`** - A script used to bulk-insert accordion UI logic.
* **`inject-css.js`** - Used to inject or append specific styles to `style.css`.
* **`inject-global-settings.js`** - Likely used to append new settings objects to `config.json`.
* **`inject-main2.js`** - A script to patch logic directly into `main.js`.
* **`inject-ui.js`** - A bulk string-replacement script to add UI features.
* **`remove-uppercase.js`** - A script that stripped `toUpperCase()` calls from navigation text.
* **`replace.js`** - A generic string replacement utility.
* **`screenshot.js`** - A Puppeteer script used to take automated screenshots.
* **`unify-title.js`** - A script used to consolidate the title logic in `main.js`.
* **`update-index.js`**, **`update-main.js`**, **`update-schema.js`** - Automation scripts used to patch the main files or schema definitions.

---

### 🔴 LIKELY JUNK/DUPLICATES
*(Obvious backups, AI context files, headless browser tests, and debug screenshots. These are completely safe to delete.)*

* **`.DS_Store`** - A hidden macOS system file used to store folder view preferences.
* **`implementation_plan.md`** & **`task.md`** - AI-generated artifacts used by me to plan and track work. 
* **`test-browser.js`, `test-img.js`, `test-main-http.js`, `test-main.js`, `test-modules.js`, `test-opacity.js`, `test-setup.js`, `test-setup2.js`, `test-setup3.js`, `test-setup4.js`, `test-setup5.js`, `test-setup5173.js`, `test-theme.js`, `test.js`, `test2.js`, `test3.js`, `test4.js`** - Throwaway Puppeteer scripts I wrote to automatically test the UI, check clickability, and debug the site in the background without bothering you.
* **`img-screenshot.png`, `main.png`, `main_file.png`, `main_http.png`, `screenshot.png`, `setup-app-modules.png`, `setup-app.png`, `setup-screenshot.png`, `setup-theme-screenshot.png`, `setup.png`, `theme.png`** - Image files dumped into the root directory by the automated testing scripts to verify visual changes.

---

### ❓ UNKNOWN - NEED TO SEE INSIDE
*(Everything seems to fall neatly into the above categories, but just to be sure...)*

* None. The purpose of all files is clearly identifiable based on our recent development sessions.
