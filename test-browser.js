const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error));

  // Try opening the setup app
  console.log("Navigating to http://localhost:5173/setup/ ...");
  await page.goto('http://localhost:5173/setup/');
  
  await page.waitForTimeout(2000);
  console.log("Done checking setup app.");

  // Also check the main portfolio
  console.log("Navigating to http://localhost:5173/ ...");
  await page.goto('http://localhost:5173/');
  
  await page.waitForTimeout(2000);
  console.log("Done checking main app.");

  await browser.close();
})();
