/* The beat between rounds, and the honesty of the clock.
 *
 * Two things this exists to hold, both reported as "the game starts before I
 * can see it" and "the line isn't in sync":
 *
 *  1. While the "new mode" plate is on screen the round has not started. There
 *     is no board under it, and the shared clock does not move. It used to be
 *     the reverse: the board was built and live, every timer a mode arms was
 *     running and the clock was draining, under a card that hid all of it.
 *
 *  2. The countdown meter tells the truth about the clock. The Rally perk adds
 *     seconds to the starting clock but not to the ceiling the meter divides
 *     by, so the meter sat pinned at full for the first six to fourteen seconds
 *     while the clock was really running.
 *
 * Runs with MOTION ON, on purpose. The shared harness's default save sets
 * reduceMotion:true, and with that on the plate is never shown at all, so a
 * probe using the default cannot even see this bug.
 *
 *   node tools/probe/timing.mjs
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const fresh = async state => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e)));
  /* A last mode SAVED, on purpose. Just Play used to continue it as a Marathon
     when there was one, so with lastMode null this probe took the one path
     that worked and the ten-minute run looked fine while nobody who had ever
     picked a mode from the roster could reach it. */
  await openApp(page, Object.assign({ reduceMotion: false, xp: 9000, lastMode: 'forge' }, state));
  return page;
};
const meter = page => page.evaluate(() => {
  const m = getComputedStyle(document.getElementById('hudMeterFill')).transform.match(/matrix\(([^,]+)/);
  return m ? parseFloat(m[1]) : 1;
});

/* ── 1. Rally: the meter drains from the first second ─────────────────────── */
{
  const page = await fresh({ perks: ['rally'], perkLv: { rally: 3 } });   // +14s
  await page.click('#justPlayBtn');
  await page.waitForTimeout(2600);
  const ui = await page.evaluate(() => ({
    meter: !document.getElementById('hudMeter').hidden,
    lives: !document.getElementById('hudLives').hidden,
  }));
  check(ui.meter && !ui.lives,
    'Just Play is the timed shuffle even with a last mode saved (clock on, lives off)');
  const a = await meter(page);
  await page.waitForTimeout(6000);
  const b = await meter(page);
  console.log(`   meter with Rally +14s: ${a.toFixed(5)} -> ${b.toFixed(5)} over 6s`);
  check(a - b > 0.004, 'the meter is draining, not pinned at full while the clock runs');
  await page.close();
}

/* ── 2. The plate: nothing is live under it, and the clock holds ──────────── */
const sample = () => {
  window.__log = [];
  const surface = document.getElementById('surface');
  const fill = document.getElementById('hudMeterFill');
  const frac = () => { const m = getComputedStyle(fill).transform.match(/matrix\(([^,]+)/); return m ? parseFloat(m[1]) : 1; };
  const step = () => {
    const plate = !!surface.querySelector(':scope > .swap');
    const board = [...surface.children].filter(c =>
      !/(^| )(swap|spark|float|ring)( |$)/.test(c.className || '') && c.id !== 'count').length;
    window.__log.push({ t: performance.now(), plate, board, f: frac() });
  };
  /* An interval, not requestAnimationFrame: the app wraps rAF so that frames
     scheduled in one round are dropped when the round changes, which is the
     right behaviour for the app and silently killed this sampler the moment a
     round ended — the one moment it exists to watch. */
  window.__int = setInterval(step, 16);
  step();
};

/* A round that ends on ONE tap, so this can be driven without knowing how to
 * play forty-two games. Most modes are multi-step (one tap on Spool Shots fires
 * a shot and the round carries on), so the run has to be dealt one of these
 * first. Just Play deals in a shuffled order from Math.random, which is seeded
 * here: scan seeds until the first mode is a single-choice one. Seeding, not
 * hoping, because a constant Math.random hangs generators that loop until they
 * draw something different. */
const SINGLE_TAP = new Set(['Odd Skein', 'Dye Trap']);
let live = null, seedUsed = null;
const trySeed = async seed => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(sd => {
    let a = (sd * 0x9E3779B1) | 0;
    Math.random = () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }, seed);
  await openApp(page, { reduceMotion: false, xp: 9000, lastMode: 'forge' });
  await page.click('#justPlayBtn');
  await page.waitForTimeout(1900);
  const kind = await page.evaluate(() => document.getElementById('hudKind').textContent.trim());
  return { page, kind, seed };
};
/* In batches of eight, in parallel: one page at a time is a minute of waiting
   for a seed that is usually in the first few dozen. */
for (let base = 1; base <= 40 && !live; base += 8){
  const batch = await Promise.all(Array.from({ length: 8 }, (_, i) => trySeed(base + i)));
  for (const r of batch){
    if (!live && SINGLE_TAP.has(r.kind)){ live = r.page; seedUsed = r.seed; console.log(`   seed ${r.seed} deals ${r.kind} first`); }
    else await r.page.close();
  }
}

let got = null;
if (live){
  await live.evaluate(sample);
  await live.evaluate(() => {
    const b = document.querySelector('#surface button:not([disabled])'); if (b) b.click();
  });
  await live.waitForTimeout(3400);
  const log = await live.evaluate(() => { clearInterval(window.__int); return window.__log; });
  if (log.some(x => x.plate)) got = log;
  else console.log(`   sampler recorded ${log.length} frames over ${log.length ? Math.round(log[log.length-1].t - log[0].t) : 0}ms; `
    + `max board ${Math.max(0, ...log.map(x => x.board))}`);
  await live.close();
}

if (!got){
  check(false, live ? 'the plate never appeared after a round ended' : 'found a seed that deals a single-tap mode first (40 tried)');
} else {
  const plateFrames = got.filter(x => x.plate);
  const lastPlate = plateFrames[plateFrames.length - 1];
  const fs = plateFrames.map(x => x.f);
  const drift = Math.max(...fs) - Math.min(...fs);
  const boardUnder = plateFrames.filter(x => x.board > 0).length;
  const after = got.find(x => x.t > lastPlate.t && x.board > 0);
  const gap = after ? Math.round(after.t - lastPlate.t) : null;
  console.log(`   plate visible ${plateFrames.length} frames; board frames under it: ${boardUnder}; `
    + `clock drift under it: ${drift.toExponential(1)}; board ${gap}ms after it left`);
  check(plateFrames.length >= 8, 'the plate was actually on screen (motion is on)');
  check(boardUnder === 0, 'no board exists while the plate is showing');
  check(drift < 1e-6, 'the shared clock does not move while the plate is showing');
  check(gap !== null && gap < 500, 'the board appears promptly once the plate is gone');
}

if (errs.length){ bad++; console.log('PAGE ERRORS', errs.slice(0, 3)); }
await browser.close();
console.log(bad ? `\n${bad} timing problem(s)` : '\nthe round starts when it is shown, and the clock is honest');
process.exit(bad ? 1 : 0);
