const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('SETUP LOG:', msg.text()));
  page.on('pageerror', error => console.log('SETUP ERROR:', error.message));
  await page.goto('http://localhost:3000/setup/', { waitUntil: 'networkidle0' });
  
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('a, button, div')];
    const el = els.find(e => e.textContent === 'Theme & Styling');
    if (el) el.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'setup-theme-screenshot.png' });
  await browser.close();
})();
