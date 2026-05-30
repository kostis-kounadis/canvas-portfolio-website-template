const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('SETUP LOG:', msg.text()));
  page.on('pageerror', error => console.log('SETUP ERROR:', error.message));
  await page.goto('http://localhost:3000/setup/', { waitUntil: 'networkidle0' });
  
  // Click by finding the text "Theme & Styling"
  const elements = await page.$x("//*[contains(text(), 'Theme & Styling')]");
  if (elements.length > 0) {
    await elements[0].click();
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'setup-theme-screenshot.png' });
    console.log('Clicked Theme & Styling');
  } else {
    console.log('Could not find Theme & Styling link');
  }
  
  await browser.close();
})();
