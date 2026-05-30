const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('SETUP LOG:', msg.text()));
  page.on('pageerror', error => console.log('SETUP ERROR:', error.message));
  await page.goto('http://localhost:3000/setup/theme', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'setup-theme-screenshot.png' });
  await browser.close();
})();
