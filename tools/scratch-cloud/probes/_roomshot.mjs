// scratch (never commit): the Room with a lived-in save, quilt open
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const seen = {}; ['odd','order','stroop','sum','count','mirror','slide','wheel','beat','sort','arc','slack','tide','plink','peril','tumble','skim','bruise','haunt','tidy'].forEach(i => seen[i] = 1);
const lion = {}; ['blitz','fog','frenzy','iron'].forEach(tw => lion['sum:' + tw] = 3200);
await openApp(page, { reduceMotion: true, xp: 40000, runs: 400, solved: 5200, onboarded: true, seen, marathon: { odd: 3300, sum: 3300, order: 1700, stroop: 700 }, twist: lion,
  slog: { sum: '11111111111111001100' }, bestPurrRun: 12, room: { rug: 3, window: 2, wall: 2, shelf: 3, lamp: 1, bed: 2, tree: 1, plant: 2 },
  pals: { biscuit: { bond: 400, pet: null, bow: '' }, mochi: { bond: 50, pet: null, bow: '' } }, palsOn: ['biscuit', 'mochi'], yarn: 3000 });
await goTab(page, 'Room');
await page.evaluate(() => { const h = document.getElementById('accH_r-quilt'); h.click(); document.getElementById('roomIntro').hidden = true; });
await page.waitForTimeout(800);
await page.screenshot({ path: process.env.OUT + '/room1.png' });
await page.evaluate(() => document.getElementById('accH_r-quilt').scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: process.env.OUT + '/room2.png' });
await browser.close();
