/* Tidy Up: no piece is ever on a basket, under one, or off the board — from the first frame, with motion on or off, at every size.
 *
 * The bug this guards: a style rule shared by many tiles made Tidy Up's pieces position:relative, so they stacked down the page instead
 * of sitting where the mode placed them, and a lot of them landed on the baskets. A probe that looks only once, at one size, with motion
 * reduced, can miss it, so this one looks at every frame for the first second and a half, at phone, tablet and landscape sizes, at
 * several levels, with and without reduced motion.
 *
 *   node tools/probe/tidyspawn.mjs          # the full matrix, minutes
 *   QUICK=1 node tools/probe/tidyspawn.mjs  # what the suite runs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

/* QUICK=1 is the one the suite runs: a phone, a tall phone and a landscape tablet, two levels. The full matrix takes minutes. */
const QUICK = !!process.env.QUICK;
const SIZES = QUICK ? [[320, 568], [390, 844], [1024, 768]] : [[320, 568], [360, 640], [390, 844], [412, 915], [768, 1024], [1024, 768], [1280, 800]];
const XPS = QUICK ? [0, 12000] : [0, 2000, 12000, 60000];
const REPEATS = Number(process.env.REPEATS || (QUICK ? 1 : 3));

let boards = 0, worst = null;
for (const [w, h] of SIZES) for (const xp of XPS) for (const reduce of [false, true]){
  const faults = [];
  for (let k = 0; k < REPEATS; k++){
    const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
    page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
    /* the app wraps requestAnimationFrame and drops callbacks from an earlier round, so keep the browser's own before it can */
    await page.addInitScript(() => { window.__raf = window.requestAnimationFrame.bind(window); });
    await openApp(page, { reduceMotion: reduce, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { tidy: 1 }, schema: 11 });
    await openModeList(page);
    /* watch from the click: every frame, until a second and a half after the first piece exists */
    await page.evaluate(() => {
      window.__tidy = { frames: 0, bad: [], seen: 0, t0: 0 };
      const T = window.__tidy;
      const step = t => {
        const box = document.querySelector('.tidybox');
        if (box){
          if (!T.t0) T.t0 = t;
          const bins = [...document.querySelectorAll('.tidybin')].map(b => b.getBoundingClientRect());
          const br = box.getBoundingClientRect();
          const items = [...document.querySelectorAll('.tidyitem')];
          T.seen = Math.max(T.seen, items.length);
          T.frames++;
          items.forEach((e, i) => {
            if (e.classList.contains('binned') || e.classList.contains('held')) return;
            const r = e.getBoundingClientRect();
            if (!r.width) return;
            const onBin = bins.some(b => r.left < b.right - 1 && r.right > b.left + 1 && r.top < b.bottom - 1 && r.bottom > b.top + 1);
            const off = r.left < br.left - 1 || r.right > br.right + 1 || r.top < br.top - 1 || r.bottom > br.bottom + 1;
            const sz = r.width;
            if (onBin || off) T.bad.push({ i, t: Math.round(t - T.t0), onBin, off, w: Math.round(sz) });
          });
        }
        if (!T.t0 || t - T.t0 < 1500) window.__raf(step); else T.done = true;
      };
      window.__raf(step);
    });
    await clickMode(page, 'tidy');
    await page.waitForFunction(() => window.__tidy && window.__tidy.done, null, { timeout: 12000, polling: 100 }).catch(() => {});
    const r = await page.evaluate(() => window.__tidy);
    boards++;
    if (!r.seen || r.frames < 3) faults.push(`never saw the board (${r.frames} frames, ${r.seen} pieces)`);
    else if (r.bad.length){ faults.push(`${r.bad.length} bad sightings, first ${JSON.stringify(r.bad[0])}`); worst = worst || { w, h, xp, reduce, first: r.bad[0] }; }
    await page.close();
  }
  check(faults.length === 0, `${w}x${h}, xp ${xp}, motion ${reduce ? 'reduced' : 'on'}: pieces stay off the baskets and on the board for the first 1.5s of ${REPEATS} boards${faults.length ? ' — ' + faults[0] : ''}`);
}
check(boards >= SIZES.length * XPS.length * 2 * REPEATS, `${boards} boards watched`);
check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nno piece of Tidy Up ever spawns on a basket');
process.exit(bad ? 1 : 0);
