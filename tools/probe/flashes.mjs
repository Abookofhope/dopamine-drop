/* Photosensitivity (v0.175.0): no effect flashes more than three times in any second (WCAG 2.3.1), however fast the
 * player taps.
 *
 * The page's frames are recorded as the compositor paints them (Chrome's screencast), then decoded and measured in a
 * blank page: the mean relative luminance of the whole screen and of each quarter of it (a quarter of a phone held at
 * reading distance is more than the 10-degree field WCAG measures over), and the same for saturated red. A flash is a
 * pair of opposing changes of at least 0.1 in relative luminance where the darker state is below 0.8 (WCAG's general
 * flash threshold); for red, a pair of opposing changes in saturated red of at least 20 on WCAG's red scale.
 *
 * The effects are fired through the game's own effect code at the rate a player mashing a wrong answer can reach
 * (eight a second), and at four a second:
 *   1. a miss: the board's red tint and the reddened edges of the screen;
 *   2. a solve: the board's light tint;
 *   3. a Purrfect: the gold glow in the middle of the screen;
 *   4. a level-up's confetti cannons.
 * Each must stay at three flashes or fewer in every second, on the whole screen and in every quarter. With Flashes
 * off in Settings, a mashed miss must not flash at all.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/flashes.mjs        REPORT=1 prints every series
 */
import { chromium } from 'playwright';
import { openApp, openMode } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const W = 390, H = 844;

async function record(state, fire, ms){
  const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: true });
  await page.addInitScript(() => { try { localStorage.setItem('dd.probe', '1'); } catch {} });
  await openApp(page, Object.assign({ reduceMotion: false, bigFx: true, flashes: true }, state));
  /* on a board, so the tint the board takes is on screen */
  await openMode(page, 'count', '#surface .answers');
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', f => { frames.push({ t: f.metadata.timestamp, d: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await page.waitForTimeout(300);
  await page.evaluate(fire);
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  await page.close();
  return frames;
}

/* Decode each frame in a blank page and reduce it to mean luminance and red, for the screen and its four quarters. */
const lab = await browser.newPage();
async function measure(frames){
  return lab.evaluate(async fs => {
    const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const cv = document.createElement('canvas'), w = 40, h = 86; cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true });
    const regions = { all: [0, 0, w, h], tl: [0, 0, w / 2, h / 2], tr: [w / 2, 0, w, h / 2], bl: [0, h / 2, w / 2, h], br: [w / 2, h / 2, w, h] };
    const out = [];
    for (const f of fs){
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + f.d; await img.decode();
      g.drawImage(img, 0, 0, w, h); const px = g.getImageData(0, 0, w, h).data;
      const row = { t: f.t };
      for (const [k, [x0, y0, x1, y1]] of Object.entries(regions)){
        let L = 0, R = 0, n = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++){
          const i = (y * w + x) * 4, r = px[i], gg = px[i + 1], b = px[i + 2];
          L += 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
          /* WCAG's saturated red: R/(R+G+B) at least 0.8, measured as (R-G-B)*320 on 0..1 channels */
          const s = r + gg + b; R += s && r / s >= 0.8 ? Math.max(0, (lin(r) - lin(gg) - lin(b)) * 320) : 0; n++;
        }
        row[k] = { L: L / n, R: R / n };
      }
      out.push(row);
    }
    return out;
  }, frames);
}

/* Count flashes in the worst one-second window: turn a series into its alternating extremes, keep the swings at least
   `min` big (for luminance, with the darker end below 0.8), and count pairs of opposing swings. */
function worst(series, key, min){
  let ext = [series[0]];
  for (let i = 1; i < series.length; i++){
    const v = series[i][key], last = ext[ext.length - 1][key];
    if (ext.length < 2){ if (v !== last) ext.push(series[i]); continue; }
    const prev = ext[ext.length - 2][key], dirUp = last > prev;
    if ((dirUp && v >= last) || (!dirUp && v <= last)) ext[ext.length - 1] = series[i]; else ext.push(series[i]);
  }
  const swings = [];
  for (let i = 1; i < ext.length; i++){
    const a = ext[i - 1][key], b = ext[i][key];
    if (Math.abs(b - a) >= min && (key !== 'L' || Math.min(a, b) < 0.8)) swings.push(ext[i].t);
  }
  let most = 0;
  for (let i = 0; i < swings.length; i++){ let j = i; while (j < swings.length && swings[j] - swings[i] < 1) j++; most = Math.max(most, Math.floor((j - i) / 2)); }
  return { flashes: most, swings: swings.length };
}
function verdict(rows){
  let top = { flashes: 0 }, where = '';
  for (const reg of ['all', 'tl', 'tr', 'bl', 'br']) for (const [key, min] of [['L', 0.1], ['R', 20]]){
    const s = rows.map(r => ({ t: r.t, [key]: r[reg][key] }));
    const w = worst(s, key, min); if (w.flashes > top.flashes){ top = w; where = reg + ' ' + (key === 'L' ? 'light' : 'red'); }
  }
  const span = rows.reduce((m, r) => ({ lo: Math.min(m.lo, r.all.L), hi: Math.max(m.hi, r.all.L) }), { lo: 1, hi: 0 });
  return { flashes: top.flashes, where, frames: rows.length, span };
}

const RATES = [[8, 'eight a second (mashing)'], [4, 'four a second']];
const EFFECTS = {
  miss: hz => { const go = () => { window.__flash('flash-bad'); window.__vfx.veil('#FF3D6E', .55, 460); }; let n = 0; const id = setInterval(() => { go(); if (++n >= 3 * hz) clearInterval(id); }, 1000 / hz); },
  solve: hz => { let n = 0; const id = setInterval(() => { window.__flash('flash-win'); if (++n >= 3 * hz) clearInterval(id); }, 1000 / hz); },
  purr: hz => { let n = 0; const id = setInterval(() => { window.__vfx.veil('#FFC53D', .35, 760, 'center'); if (++n >= 3 * hz) clearInterval(id); }, 1000 / hz); },
  cannons: hz => { let n = 0; const id = setInterval(() => { window.__vfx.cannons(26); if (++n >= 3 * hz) clearInterval(id); }, 1000 / hz); },
};
/* the game is on a board while these play: open a mode so the surface they tint is on screen */
const onBoard = { onboarded: true, xp: 9000, runs: 40, solved: 600 };
for (const [name, fn] of Object.entries(EFFECTS)){
  for (const [hz, label] of RATES){
    const frames = await record(onBoard, `(${fn.toString()})(${hz})`, 3400);
    const v = verdict(await measure(frames));
    if (process.env.REPORT) console.log(`   ${name} ${hz}/s: ${v.frames} frames, whole-screen luminance ${v.span.lo.toFixed(3)}..${v.span.hi.toFixed(3)}`);
    check(v.frames >= 40 && v.flashes <= 3, `${name} at ${label}: at most three flashes in any second (${v.flashes}${v.where ? ', worst ' + v.where : ''}; ${v.frames} frames)`);
  }
}
/* The measure itself: a white sheet over the screen five times a second must count as more than three flashes, and
   a sheet at 4% must not, or a clean result above means nothing. */
{
  const strobe = a => `(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:none;background:rgba(255,255,255,${a})'; let n = 0;
    const id = setInterval(() => { d.isConnected ? d.remove() : document.body.appendChild(d); if (++n >= 30) clearInterval(id); }, 100); })()`;
  const hit = verdict(await measure(await record(onBoard, strobe(1), 3400)));
  check(hit.flashes > 3, `the measure catches a real strobe: a white sheet five times a second (${hit.flashes} flashes in a second)`);
  const faint = verdict(await measure(await record(onBoard, strobe(0.04), 3400)));
  check(faint.flashes === 0, `and lets a faint one pass: the same at 4% (${faint.flashes})`);
}
/* High contrast draws the board with more light, so a tint over it moves more of the screen: mash a miss there too. */
{
  const v = verdict(await measure(await record(Object.assign({ contrast: true }, onBoard), `(${EFFECTS.miss.toString()})(8)`, 3400)));
  check(v.flashes <= 3, `with high contrast on, a mashed miss stays at three flashes or fewer (${v.flashes}${v.where ? ', worst ' + v.where : ''})`);
}
{
  const frames = await record(Object.assign({ flashes: false }, onBoard), `(${EFFECTS.miss.toString()})(8)`, 3400);
  const v = verdict(await measure(frames));
  check(v.flashes === 0, `with Flashes off, a mashed miss does not flash at all (${v.flashes})`);
}
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nno effect flashes more than three times a second, however fast the taps');
process.exit(bad ? 1 : 0);
