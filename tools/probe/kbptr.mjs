/* The keyboard crosshair is for keys only (0.179.1).
 *
 *   - a finger tap on the board (which gives it focus, as it has a tabIndex) shows no crosshair
 *   - reaching the board with Tab shows it, and an arrow key moves it
 *   - a tap after that hides it again on the next focus
 *
 *   node tools/probe/kbptr.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const shown = page => page.evaluate(() => { const m = document.getElementById('kbPtr'); return !!m && !m.hidden; });

for (const id of ['slack', 'arc']){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp: 300, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [id]: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, id);
  await page.waitForSelector('#surface .arcbox', { timeout: 9000 }); await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const q = document.getElementById('surface').getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; });
  await page.touchscreen.tap(r.x + r.w * 0.5, r.y + r.h * 0.97); await page.waitForTimeout(150);
  const focused = await page.evaluate(() => document.activeElement === document.getElementById('surface'));
  check(!(await shown(page)), `${id}: a tap on the board shows no crosshair (board focused: ${focused})`);
  await page.evaluate(() => document.getElementById('surface').blur());
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(100);
  const kfocus = await page.evaluate(() => document.activeElement === document.getElementById('surface'));
  if (!kfocus) await page.evaluate(() => document.getElementById('surface').focus());
  check(await shown(page), `${id}: reaching the board from the keyboard shows it`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60);
  check(await shown(page), `${id}: and an arrow key keeps it`);
  await page.evaluate(() => document.getElementById('surface').blur());
  await page.touchscreen.tap(r.x + r.w * 0.5, r.y + r.h * 0.97); await page.waitForTimeout(150);
  check(!(await shown(page)), `${id}: a tap after that does not bring it back`);
  await page.close();
}
check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nThe crosshair shows for keys only');
process.exit(bad ? 1 : 0);
