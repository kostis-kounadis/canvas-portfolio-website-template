const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  const items = await page.$$('.media-item');
  console.log(`Found ${items.length} media items.`);
  
  if (items.length > 0) {
    const item = items[0];
    const box = await item.boundingBox();
    console.log('Bounding box:', box);
    
    const visibility = await page.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        opacity: style.opacity,
        display: style.display,
        visibility: style.visibility,
        zIndex: style.zIndex,
        left: style.left,
        top: style.top,
        transform: style.transform
      };
    }, item);
    console.log('CSS:', visibility);
  }
  
  await browser.close();
})();
