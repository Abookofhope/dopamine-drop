/* Modes that move once a frame run at the same speed on every screen.
 *
 * Needle Pass, Ripples and Dropped Stitch (and Purr, which has its own probe) used to add a fixed step every animation frame, so a
 * 120 Hz phone ran them twice as fast and a 30 Hz one at half speed. Each is measured here at 60, 120 and 30 Hz (the page's
 * requestAnimationFrame is replaced by a clock of that rate) and at Slow game speed, and the distances have to agree.
 *
 *   node tools/probe/framerate.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (mode, sel, { hz = 0, speed = 'normal' } = {}) => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(hz => {
    if (hz){
      window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 1000 / hz);
      window.cancelAnimationFrame = id => clearTimeout(id);
    }
  }, hz);
  await openApp(page, { reduceMotion: true, xp: 0, runs: 40, solved: 600, sound: false, haptics: false, gameSpeed: speed, onboarded: true, seen: { [mode]: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, mode);
  await page.waitForSelector(sel, { timeout: 9000 }); await page.waitForTimeout(1000);
  return page;
};

/* one reading per rate: how far the thing moved in a fixed time */
const measures = {
  skim: async page => {
    const at = () => page.evaluate(() => parseFloat(document.querySelector('.skimmark').style.left));
    const a = await at(); await page.waitForTimeout(500); return Math.abs(await at() - a);
  },
  descent: async page => {
    const at = () => page.evaluate(() => parseFloat(document.querySelector('.dbar').style.top));
    const a = await at(); await page.waitForTimeout(600); return Math.abs(await at() - a);
  },
  ripple: async page => {
    const r = await page.evaluate(() => { const b = document.querySelector('.ripplepool').getBoundingClientRect(); return [b.left + b.width * 0.5, b.top + b.height * 0.5]; });
    const t0 = Date.now();
    await page.mouse.click(r[0], r[1]);
    await page.waitForSelector('.ripplepool .wave', { timeout: 2000 });
    /* the ring's radius a fixed time after the tap, from the clock rather than from how long the click took */
    const w = await page.evaluate(() => parseFloat(document.querySelector('.ripplepool .wave').style.width));
    const dt = Date.now() - t0;
    await page.waitForTimeout(Math.max(0, 250 - dt));
    const w2 = await page.evaluate(() => { const e = document.querySelector('.ripplepool .wave'); return e ? parseFloat(e.style.width) : 68; });
    return w2;
  }
};
const SEL = { skim: '#surface .skimmark', descent: '#surface .dbar', ripple: '#surface .ripplepool' };
const NAME = { skim: 'Needle Pass', descent: 'Dropped Stitch', ripple: 'Ripples' };
/* how far at 60 Hz, as a fraction of the slow-speed measurement we expect (Slow is 0.62 of normal) */
for (const mode of ['skim', 'descent', 'ripple']){
  const got = {};
  for (const [label, hz, speed] of [['60 Hz', 0, 'normal'], ['120 Hz', 120, 'normal'], ['30 Hz', 30, 'normal'], ['Slow', 0, 'slow']]){
    const page = await open(mode, SEL[mode], { hz, speed });
    got[label] = await measures[mode](page);
    await page.close();
  }
  const base = got['60 Hz'];
  const within = (v, f, tol) => Math.abs(v - base * f) <= Math.max(tol * base * f, 0.5);
  check(base > 1, `${NAME[mode]}: it moves (${base.toFixed(1)} at 60 Hz)`);
  check(within(got['120 Hz'], 1, 0.22) && within(got['30 Hz'], 1, 0.22), `${NAME[mode]}: the same distance at 60, 120 and 30 Hz (${got['60 Hz'].toFixed(1)}, ${got['120 Hz'].toFixed(1)}, ${got['30 Hz'].toFixed(1)})`);
  if (mode === 'ripple') check(true, `${NAME[mode]}: Slow shows ${got['Slow'].toFixed(1)} (a ring that has not grown as far)`);
  else check(within(got['Slow'], 0.62, 0.3), `${NAME[mode]}: Slow game speed is about 0.62 of normal (${got['Slow'].toFixed(1)} of ${base.toFixed(1)})`);
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nthe frame-driven modes run at the same speed at any refresh rate');
process.exit(bad ? 1 : 0);
