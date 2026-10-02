/* Dropped Stitch: a bump takes a paw, not the round.
 *
 *   - at a new level there are three paws above the board; leaving the bobbin where it is, it strikes a bar sooner or later, the bar goes red,
 *     a paw is used and the fall carries on
 *   - the third bump ends the round and the next one starts with all its paws
 *   - at a high level there is one paw and no row of them
 *   - a pin takes room out of its gap, so a pinned gap is cut wider: the clear side is at least 1.3 bobbin-widths, and no two gaps in a row have a pin
 *
 *   node tools/probe/descent.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { descent: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'descent');
  await page.waitForSelector('#surface .descentsky .dbar', { timeout: 9000 }); await page.waitForTimeout(300);
  return page;
};
const read = page => page.evaluate(() => { const c = document.querySelector('.budget.paws'); return { shown: c ? c.querySelectorAll('i').length : 0, left: c ? c.querySelectorAll('i:not(.used)').length : 0, aria: c ? c.getAttribute('aria-label') : '',
  struck: document.querySelectorAll('.dbar.struck').length, cleared: document.querySelectorAll('.dbar.cleared').length, bars: document.querySelectorAll('.dbar').length, star: !!document.querySelector('.dstar') }; });
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 25000, polling: 40 }).then(() => true).catch(() => false);

/* ── a new level: three paws ──────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  check(s.shown === 3 && s.left === 3 && /3/.test(s.aria), `three paws are shown above the board ("${s.aria}")`);
  /* pull the bobbin to one edge and leave it: bars whose gaps are elsewhere strike it */
  const sky = await page.evaluate(() => { const r = document.querySelector('.descentsky').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  await page.mouse.move(sky[0] + 6, sky[1] + sky[3] * 0.3); await page.mouse.down(); await page.mouse.move(sky[0] + 8, sky[1] + sky[3] * 0.3); 
  const bumped = await wait(page, () => document.querySelectorAll('.dbar.struck').length >= 1);
  s = await read(page);
  check(bumped && s.left === 2 && s.star, `a bump reddens the bar, uses a paw and the fall goes on (${s.struck} struck, ${s.left} left)`);
  const ended = await wait(page, () => { const c = document.querySelector('.budget.paws'); return !c || (c.querySelectorAll('i:not(.used)').length === c.querySelectorAll('i').length && !document.querySelector('.dbar.struck')); });
  await page.mouse.up();
  check(ended, 'and the round ends when the last paw goes, the next one starting with all of them');
  await page.close();
}

/* ── a high level: one paw ────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(60000); const s = await read(page);
  check(s.shown === 0, `at a high level there is no row of paws (${s.shown} shown)`);
  await page.close();
}

/* ── pins: room left to pass, and never in back-to-back gaps ──────────────────────────────────────────────────────── */
{
  let pinned = 0, worst = 1e9, backToBack = 0, narrowest = 1e9;
  for (let k = 0; k < 8; k++){
    const page = await open(900000);
    const bars = await page.evaluate(() => {
      const sky = document.querySelector('.descentsky').getBoundingClientRect(), star = document.querySelector('.dstar').getBoundingClientRect();
      return { star: star.width / sky.width * 100, list: [...document.querySelectorAll('.dbar')].map(b => {
        const l = b.querySelector('.side.l').getBoundingClientRect(), r = b.querySelector('.side.r').getBoundingClientRect(), p = b.querySelector('.dpin');
        const gap = (r.left - l.right) / sky.width * 100;
        if (!p) return { pin: false, gap };
        const q = p.getBoundingClientRect();
        return { pin: true, gap, clear: Math.max(q.left - l.right, r.left - q.right) / sky.width * 100 };
      }) };
    });
    bars.list.forEach((b, i) => { if (b.pin){ pinned++; worst = Math.min(worst, b.clear / bars.star); if (i && bars.list[i - 1].pin) backToBack++; } else narrowest = Math.min(narrowest, b.gap / bars.star); });
    await page.close();
  }
  check(pinned >= 4, `pins were found to measure (${pinned} in 8 boards at a high level)`);
  check(worst >= 1.3, `a pinned gap leaves room to pass: at least 1.3 bobbin-widths beside the pin (worst ${worst.toFixed(2)})`);
  check(backToBack === 0, `no two gaps in a row have a pin (${backToBack} pairs)`);
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nDropped Stitch has paws');
process.exit(bad ? 1 : 0);
