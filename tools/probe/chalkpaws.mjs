/* Chalk Line: a drop that goes wrong takes a paw, not the round.
 *
 *   - at a new level there are three paws above the board; a drop with a line that does not help loses the ball, uses a paw, and the
 *     ball goes back to the top with the line still on the paper and Drop ready again
 *   - the third lost drop ends the round and the next board starts with all its paws; at a high level there is one paw and no row
 *   - after a lost drop, drawing the answer and dropping again still wins
 *
 *   node tools/probe/chalkpaws.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const boot = async xp => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { chalk: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'chalk');
  await page.waitForSelector('.chalkbox', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const b = document.querySelector('.chalkbox'), r = b.getBoundingClientRect(), c = document.querySelector('.budget.paws');
  return { x: r.left, y: r.top, w: r.width, h: r.height, sol: b.dataset.solution ? JSON.parse(b.dataset.solution) : null, lines: b.querySelectorAll('.cline').length,
    dropOff: (document.querySelector('.ctool.drop') || {}).disabled, lost: !!document.querySelector('.cball.lost'), shown: c ? c.querySelectorAll('i').length : 0, left: c ? c.querySelectorAll('i:not(.used)').length : 0,
    live: b.classList.contains('live') };
});
const px = (s, p) => [s.x + p[0] / 100 * s.w, s.y + p[1] / 100 * s.h];
const stroke = async (page, s, pts) => { const a = px(s, pts[0]); await page.mouse.move(a[0], a[1]); await page.mouse.down(); for (const p of pts.slice(1)){ const q = px(s, p); await page.mouse.move(q[0], q[1]); } await page.mouse.up(); };
const drop = page => page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
const lostNow = page => page.waitForFunction(() => !!document.querySelector('.cball.lost'), null, { timeout: 14000, polling: 40 }).then(() => true).catch(() => false);
const HARMLESS = [[96, 97], [84, 97.2], [72, 97.4], [60, 97.6]];

{
  const page = await boot(0); let s = await read(page);
  check(s.shown === 3 && s.left === 3, `three paws are shown above the board (${s.shown} shown)`);
  await stroke(page, s, HARMLESS); await drop(page);
  check(await lostNow(page), 'a drop with a line that does not help loses the ball');
  await page.waitForTimeout(1500);
  s = await read(page);
  check(s.left === 2 && !s.lost && !s.live && !s.dropOff && s.lines >= 1, `it uses a paw, the ball goes back and the line stays on the paper with Drop ready (${s.left} left, ${s.lines} line)`);
  /* mend it: undo the harmless line, draw the answer, and drop again */
  if (s.sol){
    await page.locator('.ctool').nth(0).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(150);
    for (const st of s.sol) await stroke(page, s, st);
    await drop(page);
    const won = await page.waitForFunction(() => document.querySelector('.cbasket.caught') ? true : (document.querySelector('.cball.lost') ? 'lost' : false), null, { timeout: 14000, polling: 40 }).then(h => h.jsonValue()).catch(() => 'none');
    check(won === true, `drawing the answer after a lost drop and dropping again still wins (${won})`);
  }
  await page.close();
}
{
  const page = await boot(0); let s = await read(page);
  for (let k = 0; k < 3; k++){
    await stroke(page, s, HARMLESS); await drop(page); await lostNow(page); await page.waitForTimeout(k < 2 ? 1500 : 200);
    if (k < 2){ s = await read(page); }
  }
  const ended = await page.waitForFunction(() => { const c = document.querySelector('.budget.paws'); return !c || c.querySelectorAll('i:not(.used)').length === c.querySelectorAll('i').length; }, null, { timeout: 5000, polling: 40 }).then(() => true).catch(() => false);
  check(ended, 'the third lost drop ends the round and the next one starts with all its paws');
  await page.close();
}
{
  const page = await boot(60000); const s = await read(page);
  check(s.shown === 0, `at a high level there is no row of paws (${s.shown} shown)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nChalk Line has paws');
process.exit(bad ? 1 : 0);
