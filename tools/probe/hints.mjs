/* How many hints a round gives, and that a hint does something: Stitch Sampler and Kitten's Snack Attack give two at a new level and one
 * from the middle of the ramp.
 *
 *   node tools/probe/hints.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (mode, sel, xp) => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [mode]: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, mode);
  await page.waitForSelector(sel, { timeout: 9000 }); await page.waitForTimeout(800);
  return page;
};
const hintText = page => page.evaluate(() => { const b = [...document.querySelectorAll('#surface .sumtool')].find(e => /hint|indice/i.test(e.textContent)); return b ? b.textContent.trim() : ''; });
const hintClick = async page => { const r = await page.evaluate(() => { const b = [...document.querySelectorAll('#surface .sumtool')].find(e => /hint|indice/i.test(e.textContent)).getBoundingClientRect(); return [b.left + 20, b.top + 18]; }); await page.mouse.click(r[0], r[1]); await page.waitForTimeout(300); };

for (const [mode, sel, name, after] of [['wheel', '#surface .wboard .wcell', 'Stitch Sampler', page => page.evaluate(() => document.querySelectorAll('.wcell.on').length)], ['forage', '#surface .sumtool', "Kitten's Snack Attack", page => page.evaluate(() => document.querySelectorAll('.nudge').length)]]){
  let page = await open(mode, sel, 0); let t = await hintText(page);
  check(/2/.test(t), `${name}: two hints at a new level (${t})`);
  const before = await after(page); await hintClick(page);
  t = await hintText(page); const a = await after(page);
  check(/1/.test(t) && (mode === 'wheel' ? a > before : a > before), `${name}: a hint is used and does something (${t}; ${before} -> ${a})`);
  await page.close();
  page = await open(mode, sel, 60000); t = await hintText(page);
  check(/1/.test(t), `${name}: one hint at a high level (${t})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nthe hints are there');
process.exit(bad ? 1 : 0);
