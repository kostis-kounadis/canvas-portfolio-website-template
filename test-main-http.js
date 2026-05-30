const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const url = 'http://localhost:8000/index.html';
  console.log("Navigating to " + url);
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error));

  await page.goto(url);
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'main_http.png', fullPage: true });
  console.log("Screenshot saved to main_http.png");

  await browser.close();
})();
