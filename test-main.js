const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Use file:// protocol to load the main index.html
  const fileUrl = 'file://' + path.resolve(__dirname, 'index.html');
  console.log("Navigating to " + fileUrl);
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error));

  await page.goto(fileUrl);
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'main_file.png', fullPage: true });
  console.log("Screenshot saved to main_file.png");

  await browser.close();
})();
