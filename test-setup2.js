const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('SETUP LOG:', msg.text()));
  page.on('pageerror', error => console.log('SETUP ERROR:', error.message));
  await page.goto('http://localhost:3000/setup/', { waitUntil: 'networkidle0' });
  
  // Click "Theme & Styling" in the sidebar
  const items = await page.$$('nav a');
  let clicked = false;
  for (const item of items) {
    const text = await page.evaluate(el => el.textContent, item);
    if (text.includes('Theme & Styling')) {
      await item.click();
      clicked = true;
      break;
    }
  }
  
  if (clicked) {
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'setup-theme-screenshot.png' });
    console.log('Clicked Theme & Styling');
  } else {
    console.log('Could not find Theme & Styling link');
  }
  
  await browser.close();
})();
