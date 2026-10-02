/* Catch the Balls: a ball that goes wrong takes a paw, not the round.
 *
 *   - at a new level there are three paws above the board; leaving the pail at one edge, the first ball that lands wrong (a keeper that
 *     missed the pail or a tangle that was caught) uses a paw and the round goes on
 *   - a keeper that got away is replaced by another (the board gains a ball), so there are always enough left to win
 *   - the last paw ends the round and the next one starts with all of them; at a high level there is one paw and no row
 *
 *   node tools/probe/gather.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp) => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { gather: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'gather');
  await page.waitForSelector('#surface .gatherbox .gpail', { timeout: 9000 }); await page.waitForTimeout(300);
  return page;
};
const read = page => page.evaluate(() => { const c = document.querySelector('.budget.paws'); return { shown: c ? c.querySelectorAll('i').length : 0, left: c ? c.querySelectorAll('i:not(.used)').length : 0, aria: c ? c.getAttribute('aria-label') : '',
  balls: document.querySelectorAll('.gdrop').length, keepers: document.querySelectorAll('.gdrop:not(.dud)').length, splat: document.querySelectorAll('.gdrop.splat').length }; });
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 40000, polling: 40 }).then(() => true).catch(() => false);

{
  const page = await open(0); let s = await read(page);
  check(s.shown === 3 && s.left === 3 && /3/.test(s.aria), `three paws are shown above the board ("${s.aria}")`);
  const field = await page.evaluate(() => { const r = document.querySelector('.gatherbox').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  /* the pail pulled to the far left edge and left there */
  await page.mouse.move(field[0] + field[2] * 0.5, field[1] + field[3] * 0.5); await page.mouse.down(); await page.mouse.move(field[0] + 4, field[1] + field[3] * 0.5, { steps: 5 });
  const first = await wait(page, () => document.querySelectorAll('.budget.paws i.used').length >= 1);
  s = await read(page);
  check(first && s.left === 2 && s.balls > 0, `the first ball that lands wrong uses a paw and the round goes on (${s.left} left)`);
  const before = s.keepers;
  const ended = await wait(page, () => { const c = document.querySelector('.budget.paws'); return !c || (c.querySelectorAll('i:not(.used)').length === c.querySelectorAll('i').length); });
  await page.mouse.up();
  check(ended, 'and the last paw ends the round, the next one starting with all of them');
  await page.close();
}
{
  const page = await open(60000); const s = await read(page);
  check(s.shown === 0, `at a high level there is no row of paws (${s.shown} shown)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nCatch the Balls has paws');
process.exit(bad ? 1 : 0);
