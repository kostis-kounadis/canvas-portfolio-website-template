const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:5173/setup/ ...");
  await page.goto('http://localhost:5173/setup/');
  await page.waitForTimeout(1000);
  
  // Click on "Theme & Styling"
  console.log("Clicking Theme & Styling");
  await page.click('text="Theme & Styling"');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'theme.png' });
  console.log("Screenshot saved to theme.png");

  await browser.close();
})();
