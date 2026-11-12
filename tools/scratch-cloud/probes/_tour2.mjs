// scratch: a run and its Game Over (never commit)
import { chromium } from 'playwright';
import { openApp, startShuffle } from './harness.mjs';
const OUT = process.env.OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
await openApp(page, { reduceMotion: false, xp: 9000, runs: 40, solved: 600, best: {} });
await startShuffle(page);
await page.waitForTimeout(4000); await page.screenshot({ path: `${OUT}/06-run.png` });
// tap random cells to make some progress / misses
for (let i = 0; i < 25; i++){ await page.mouse.click(60 + Math.random()*270, 300 + Math.random()*380); await page.waitForTimeout(220); }
await page.screenshot({ path: `${OUT}/06b-run.png` });
await page.evaluate(() => document.getElementById('quitBtn').click()); await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/07-pause.png` });
await page.evaluate(() => { const e = document.querySelector('.pauseEnd'); if (e) e.click(); }); await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/08-over.png` });
await browser.close();
