/* The busiest moment holds its frame rate on a slow phone (v0.146.0).
 *
 * The motion probe checks the particle cap and the transform-only rule, which are the causes; this measures the
 * effect. With the CPU slowed four times, the biggest moment a run can produce is fired at once on a live board: a
 * ×5 solve burst, the ×5 veil and rain, a stage sweep with its fountain of stars, a level's confetti cannons and a
 * ring, with embers rising. Frame times are recorded for the 2.5 s after it, and the 95th percentile must stay under
 * 33 ms (30 fps). Median of three runs: one timing sample on a shared machine swings by a third.
 *
 * It also checks that the engine's own back-off works: the live particle count must come down from its peak inside
 * the window, so a slow phone sheds load rather than piling it up.
 *
 *   PORT=8501 SITE=/path/to/built node tools/probe/framebudget.mjs
 *   RATE=6 ...   a different slowdown
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const RATE = Number(process.env.RATE || 4), LIMIT = 33;
const browser = await chromium.launch();
const errs = [];

async function trial(vp){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, { reduceMotion: false, bigFx: true, flashes: true, xp: 9000, runs: 40, solved: 600, onboarded: true });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  await page.waitForFunction(() => !document.getElementById('count') && !!document.querySelector('#surface .oddwrap .tile'), null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(600);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const V = window.__vfx; if (!V) return null;
    const times = []; let last = performance.now(), peak = 0, end = 0, on = true;
    const step = ts => { times.push(ts - last); last = ts; const n = V.live(); if (n > peak) peak = n; end = n; if (on) requestAnimationFrame(step); };
    requestAnimationFrame(ts => { last = ts; requestAnimationFrame(step); });
    await new Promise(r => setTimeout(r, 120));
    const sf = document.getElementById('surface'), tile = document.querySelector('#surface .oddwrap .tile');
    const pal = ['#FFC53D', '#FF5B39', '#FFE08A', '#FFF3E6'];
    /* everything the top of a run can stack into one moment */
    V.solve(tile, '#FFC53D', 5, 'odd');
    V.veil('#FFC53D', .35, 760, 'center');
    V.rain(34, pal);
    V.sweep(sf, '#FFC53D', 860);
    const b = V.box(sf);
    V.spray('fountain', b.x, b.y + b.h * .3, 22, { k: ['star', 'confetti'], pal: ['#FFC53D', '#FFF3E6', '#FF8AD8'], sp: 7.5, g: .24, s0: 3.5, s1: 6, l0: 900, l1: 1300 });
    V.cannons(44);
    V.ring(b.x + b.w / 2, b.y + b.h / 2, '#FFC53D', { r0: 12, r1: 120, line: 3 });
    if (V.embers) V.embers(sf, 5);
    await new Promise(r => setTimeout(r, 2500));
    on = false;
    const s = times.slice(2).sort((a, b) => a - b);
    const q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    return { n: s.length, p50: q(.5), p95: q(.95), max: s[s.length - 1], peak, end, cap: V.stats.slow };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await ctx.close();
  return r;
}

for (const vp of [{ width: 390, height: 844 }, { width: 412, height: 915 }]){
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push(await trial(vp));
  if (runs.some(r => !r)){ check(false, `${vp.width}x${vp.height}: the motion engine is reachable (dd.probe)`); continue; }
  runs.sort((a, b) => a.p95 - b.p95);
  const m = runs[1];
  console.log(`     ${vp.width}x${vp.height} at ${RATE}x: p95 ${runs.map(r => r.p95.toFixed(1)).join(' / ')} ms (median ${m.p95.toFixed(1)}), p50 ${m.p50.toFixed(1)}, max ${m.max.toFixed(1)}, ${m.n} frames, particles peak ${m.peak} then ${m.end}`);
  check(m.p95 < LIMIT, `${vp.width}x${vp.height}: the busiest moment's 95th-percentile frame is under ${LIMIT} ms at ${RATE}x slowdown (${m.p95.toFixed(1)} ms)`);
  check(m.end < m.peak, `${vp.width}x${vp.height}: the particles come down from their peak inside 2.5 s (${m.peak} to ${m.end})`);
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
