const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  const imgHandle = await page.$('.media-item');
  if (imgHandle) {
    await imgHandle.screenshot({ path: 'img-screenshot.png' });
    console.log('Took screenshot of .media-item');
  } else {
    console.log('No .media-item found');
  }
  
  await browser.close();
})();
