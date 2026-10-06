const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/');
  
  // Esperar a que exista el dock
  await page.waitForSelector('.dock-panel', { timeout: 5000 });
  
  const results = await page.evaluate(() => {
    const dock = document.querySelector('.dock-panel');
    const s = window.getComputedStyle(dock);
    return {
      innerWidth: window.innerWidth,
      isMobileState: window.innerWidth < 768,
      outerHTML: dock.outerHTML,
      styles: {
        position: s.position,
        left: s.left,
        top: s.top,
        transform: s.transform,
        flexDirection: s.flexDirection,
        zIndex: s.zIndex,
        className: dock.className
      }
    };
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
