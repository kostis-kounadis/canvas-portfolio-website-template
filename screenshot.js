const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:5173/setup/ ...");
  await page.goto('http://localhost:5173/setup/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'setup.png' });
  console.log("Screenshot saved to setup.png");

  console.log("Navigating to http://localhost:5173/ ...");
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'main.png' });
  console.log("Screenshot saved to main.png");

  await browser.close();
})();
