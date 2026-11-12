// scratch: screenshot the main screens of the current build (never commit)
import { chromium } from 'playwright';
import { openApp, goTab, openMode } from './harness.mjs';
const OUT = process.env.OUT;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const shot = async n => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/${n}.png` }); };
// first visit
await page.goto(`http://127.0.0.1:${process.env.PORT}/`, { waitUntil: 'networkidle' }); await shot('01-welcome');
await page.evaluate(() => localStorage.clear());
await openApp(page, { reduceMotion: false, xp: 9000, runs: 40, solved: 600, yarn: 640, dailyStreak: 4, dailyLast: new Date().toISOString().slice(0,10) });
await shot('02-play'); await goTab(page, 'Modes'); await shot('03-games');
await goTab(page, 'Room'); await shot('04-room'); await goTab(page, 'Stats'); await shot('05-you'); await goTab(page, 'Settings'); await shot('05b-settings');
await page.evaluate(() => window.scrollTo(0, 0));
await goTab(page, 'Play');
await page.evaluate(() => { const b = document.querySelector('[data-gate="quick"]'); if (b) b.click(); });
await page.waitForTimeout(3500); await shot('06-run');
await page.evaluate(() => document.getElementById('quitBtn').click()); await shot('07-pause');
await browser.close();
