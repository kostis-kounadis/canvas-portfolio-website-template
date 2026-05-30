const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  await page.screenshot({ path: 'screenshot.png' });
  
  const visibility = await page.evaluate(() => {
    const img = document.querySelector('.media-item img');
    if (!img) return 'No img';
    const style = window.getComputedStyle(img);
    return {
      opacity: style.opacity,
      display: style.display,
      visibility: style.visibility,
      mixBlendMode: style.mixBlendMode
    };
  });
  console.log('IMG CSS:', visibility);
  
  await browser.close();
})();
