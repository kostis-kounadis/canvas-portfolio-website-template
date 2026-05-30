const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const url = 'http://localhost:5173/';
  console.log("Navigating to " + url);
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'setup-app.png' });
  console.log("Saved setup-app.png");
  
  await browser.close();
})();
