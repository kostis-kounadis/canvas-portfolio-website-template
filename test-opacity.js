const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  const stageInfo = await page.evaluate(() => {
    const sw = document.getElementById('stage-wrapper');
    const stage = document.getElementById('stage');
    return {
      swOpacity: window.getComputedStyle(sw).opacity,
      swDisplay: window.getComputedStyle(sw).display,
      stageOpacity: window.getComputedStyle(stage).opacity,
      stageDisplay: window.getComputedStyle(stage).display
    };
  });
  console.log('Stage info:', stageInfo);
  
  await browser.close();
})();
