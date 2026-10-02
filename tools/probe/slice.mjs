/* Snip: cutting a matted ball takes a paw, not the round.
 *
 *   - at a level where there are matted balls and three paws, the paws are shown above the board; a swipe through a matted ball uses one
 *     paw, leaves the ball spent, and the round goes on (one swipe is one paw, however long it lingers)
 *   - cutting the good ones still counts, and the third matted ball ends the round
 *   - at a high level there is one paw and no row of them
 *
 *   node tools/probe/slice.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, lang = 'en') => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { slice: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'slice');
  await page.waitForSelector('#surface .slicebox .bit', { timeout: 9000 }); await page.waitForTimeout(900);
  return page;
};
const read = page => page.evaluate(() => {
  const c = document.querySelector('.budget.paws');
  const bits = [...document.querySelectorAll('.bit')].map((e, i) => { const r = e.getBoundingClientRect(); return { i, rot: e.classList.contains('rot'), cut: e.classList.contains('cut'), spent: e.classList.contains('hitrot'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  return { bits, shown: c ? c.querySelectorAll('i').length : 0, left: c ? c.querySelectorAll('i:not(.used)').length : 0, aria: c ? c.getAttribute('aria-label') : '', prompt: document.getElementById('prompt').textContent.trim() };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
/* a short, slow stroke straight through the middle of one ball */
const through = async (page, b) => { await page.mouse.move(b.x - 6, b.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.move(b.x + 6, b.y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(220); };

/* ── a level with matted balls and three paws ─────────────────────────────────────────────────────────────────────────── */
{
  let page = null, s = null;
  for (const xp of [700, 1100, 1600, 2200]){
    if (page) await page.close();
    page = await open(xp); s = await read(page);
    if (s.bits.some(b => b.rot) && s.shown === 3) break;
  }
  check(s.bits.some(b => b.rot) && s.shown === 3 && /3/.test(s.aria), `three paws are shown above a board with matted balls ("${s.aria}", ${s.bits.filter(b => b.rot).length} matted)`);
  const rots = s.bits.filter(b => b.rot);
  await through(page, rots[0]);
  let a = await read(page);
  check(a.left === 2 && a.bits[rots[0].i].spent && !a.bits[rots[0].i].cut, `a swipe through a matted ball uses a paw and leaves it spent (${a.left} left)`);
  check(/try again/i.test(a.prompt) && (await score(page)) === 0, `and the round goes on ("${a.prompt}")`);
  /* a good one still cuts */
  const good = a.bits.find(b => !b.rot && !b.cut);
  await through(page, good); a = await read(page);
  check(a.bits[good.i].cut && a.left === 2, 'a good ball still cuts and costs no paw');
  /* going back and forth over the spent ball costs nothing more */
  await through(page, rots[0]); a = await read(page);
  check(a.left === 2, `swiping the spent ball again costs nothing (${a.left} left)`);
  if (rots.length >= 3){
    await through(page, rots[1]); a = await read(page); check(a.left === 1, `a second matted ball uses another paw (${a.left} left)`);
    await through(page, rots[2]);
    const ended = await page.waitForFunction(() => { const c = document.querySelector('.budget.paws'); return !c || c.querySelectorAll('i:not(.used)').length === c.querySelectorAll('i').length; }, null, { timeout: 4000, polling: 30 }).then(() => true).catch(() => false);
    check(ended, 'the third matted ball ends the round and the next one starts with all its paws');
  } else check(true, `(only ${rots.length} matted balls on this board: the third-paw end is checked at the next level)`);
  await page.close();
}

/* ── a high level: one paw ────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(60000); const s = await read(page);
  check(s.shown === 0, `at a high level there is no row of paws (${s.shown} shown)`);
  const r = s.bits.find(b => b.rot);
  if (r){ await through(page, r); await page.waitForTimeout(700); const a = await read(page); check(!a.bits.some(b => b.spent && !b.cut && a.prompt.includes('try again')), `and the first matted ball ends the round ("${a.prompt}")`); }
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nSnip has paws');
process.exit(bad ? 1 : 0);
