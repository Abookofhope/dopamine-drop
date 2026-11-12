import { chromium } from 'playwright';
import { openApp, goTab, openModeList, clickMode } from './harness.mjs';
const OUT = process.env.OUT, TAG = process.env.TAG || 'now';
const browser = await chromium.launch();
for (const [w, h] of [[768, 1024], [1024, 768], [820, 1180], [1180, 820]]){
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  await openApp(page, { xp: 9000, runs: 40, solved: 600, onboarded: true, yarn: 300 });
  await page.screenshot({ path: `${OUT}/${TAG}_${w}x${h}_home.png` });
  await goTab(page, 'Room'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${TAG}_${w}x${h}_room.png` });
  await goTab(page, 'Play'); await openModeList(page); await clickMode(page, 'forge');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${TAG}_${w}x${h}_board.png` });
  const cab = await page.evaluate(() => { const r = document.querySelector('.cab').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width)]; });
  console.log(w, h, 'column', cab);
  await page.close();
}
await browser.close();
