const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  const blueElements = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    return els.filter(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    }).map(el => ({
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      bg: window.getComputedStyle(el).backgroundColor
    }));
  });
  console.log('Colored elements:', blueElements);
  
  await browser.close();
})();
