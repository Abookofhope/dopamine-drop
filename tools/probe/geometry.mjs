/* What is on the board is the shape it was meant to be.
 *
 * The sweep asks whether things fit and can be hit; this asks whether they are
 * RIGHT, which is what a person sees in one glance and no DOM assertion did:
 *
 *   tiles      the cells of a grid are all the same size. One tile drawn 12%
 *              larger (Odd Skein's "decoy") read as a glitch every round.
 *   circles    anything styled as a circle is one. A 50% radius on a box that is
 *              not square is an oval, which is what a stretched board makes.
 *   overlays   a drawing laid over the board (a thread, a trail) stretches with
 *              the board. An SVG that keeps a square and sits in the middle of a
 *              tall box draws every line the wrong place.
 *   offboard   a piece you can tap has its middle inside the play area. Tidy Up's
 *              pieces were once stacked down the page by a style rule that beat
 *              the one placing them, and lay on the baskets and below the board.
 *   overlap    pieces you can tap do not sit on top of one another, so a tap is
 *              never ambiguous. Reported, not failed: some boards stack on purpose.
 *
 * Run at a mid-game save; MAX=1 for maximum difficulty (more tiles, denser
 * boards). VW / VH choose the screen, so a small phone and a tablet can be
 * checked the same way.
 *
 *   node tools/probe/geometry.mjs                 as a returning player sees each board
 *   FIRST=1 node tools/probe/geometry.mjs         as a first meeting (shallow end)
 *   VW=320 VH=568 node tools/probe/geometry.mjs
 *   MAX=1 ONLY=odd,forge node tools/probe/geometry.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, modeIdsFromBuild, floorOrDie } from './harness.mjs';

const VW = +(process.env.VW || 400), VH = +(process.env.VH || 820);
const MAX = !!process.env.MAX;
const PROF = MAX ? { xp: 900000, solved: 40000, runs: 900 } : { xp: 9000, solved: 600, runs: 40 };
const allIds = modeIdsFromBuild(process.env.SITE || '/tmp/pw/_site');
const ids = process.env.ONLY ? process.env.ONLY.split(',') : allIds;
/* A first meeting is dealt at the shallow end (six levels at most), so a board
   checked as one never shows what a returning player gets: Odd Skein's larger
   tile only appears from level 14. Every mode is marked as met, unless FIRST=1. */
const SEEN = process.env.FIRST ? {} : Object.fromEntries(allIds.map(i => [i, 1]));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH }, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 100)));

const inspect = () => page.evaluate(() => {
  const s = document.getElementById('surface');
  const name = e => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : e.tagName.toLowerCase());
  const shown = e => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.05; };

  /* tiles: every child of a grid is the same size (as drawn, transforms included) */
  const tiles = [];
  for (const g of s.querySelectorAll('.grid')){
    /* A piece that spans cells on purpose (a car in Let the Cat Out) is not a cell. */
    const spans = k => { const c = getComputedStyle(k); return /span/.test(c.gridColumnEnd + c.gridRowEnd); };
    /* An emptied slot (bare ground in Kittens Out) is drawn smaller on purpose. */
    const vacant = k => /(^| )(gone|empty)( |$)/.test(k.className);
    const kids = [...g.children].filter(k => shown(k) && !spans(k) && !vacant(k)).map(k => k.getBoundingClientRect()).filter(r => r.width > 0);
    if (kids.length < 2) continue;
    const w = kids.map(r => r.width), h = kids.map(r => r.height);
    const dw = Math.max(...w) - Math.min(...w), dh = Math.max(...h) - Math.min(...h);
    if (dw > 2.5 || dh > 2.5) tiles.push(`${name(g)} cells differ by ${dw.toFixed(1)}x${dh.toFixed(1)}px (${Math.min(...w).toFixed(0)}-${Math.max(...w).toFixed(0)} wide)`);
  }

  /* circles: a 50% radius on a box that is not square */
  const circles = [];
  for (const e of s.querySelectorAll('*')){
    if (!shown(e) || e.closest('svg')) continue;
    const c = getComputedStyle(e);
    if (c.borderTopLeftRadius !== '50%' || c.borderBottomRightRadius !== '50%') continue;
    const w = e.offsetWidth, h = e.offsetHeight;
    if (w < 14 || h < 14) continue;
    if (Math.abs(w - h) > 2.5) circles.push(`${name(e)} is ${w}x${h}`);
  }

  /* overlays: an absolutely placed SVG that covers its parent must stretch to it */
  const overlays = [];
  for (const v of s.querySelectorAll('svg[viewBox]')){
    const c = getComputedStyle(v);
    if (c.position !== 'absolute') continue;
    const p = v.parentElement, pr = p.getBoundingClientRect(), r = v.getBoundingClientRect();
    if (r.width < pr.width * 0.9 || r.height < pr.height * 0.9) continue;      // an icon, not an overlay
    const vb = v.viewBox.baseVal;
    if (!vb || !vb.width) continue;
    const par = v.getAttribute('preserveAspectRatio');
    const boxAspect = r.width / r.height, vbAspect = vb.width / vb.height;
    if (par !== 'none' && Math.abs(boxAspect - vbAspect) > 0.06)
      overlays.push(`${name(v)} keeps a ${vb.width}x${vb.height} square inside a ${Math.round(r.width)}x${Math.round(r.height)} box`);
  }

  /* overlap: tappable pieces lying on one another */
  const taps = [...s.querySelectorAll('button, [role="button"], [role="img"]')].filter(shown)
    .map(e => ({ e, r: e.getBoundingClientRect() })).filter(o => o.r.width > 10 && o.r.height > 10);
  const overlap = [];
  for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++){
    const a = taps[i], b = taps[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix <= 0 || iy <= 0) continue;
    const frac = ix * iy / Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
    if (frac > 0.35) overlap.push(`${name(a.e)} and ${name(b.e)} overlap ${Math.round(frac * 100)}%`);
  }
  /* offboard: the middle of anything tappable is inside the play area */
  const sr = s.getBoundingClientRect();
  /* Things that enter from outside on purpose: Descent's bars scroll up from below, Catch the Balls' drops fall in from above. */
  const arrives = e => /(^|\s)(dbar|gdrop)(\s|$)/.test(e.className || '');
  const offboard = taps.filter(o => !arrives(o.e)).filter(o => { const cx = o.r.left + o.r.width / 2, cy = o.r.top + o.r.height / 2;
    return cx < sr.left - 2 || cx > sr.right + 2 || cy < sr.top - 2 || cy > sr.bottom + 2; })
    .map(o => `${name(o.e)} is centred at ${Math.round(o.r.left + o.r.width / 2 - sr.left)},${Math.round(o.r.top + o.r.height / 2 - sr.top)} in a ${Math.round(sr.width)}x${Math.round(sr.height)} area`);
  const uniq = a => [...new Set(a)];
  return { tiles: uniq(tiles), circles: uniq(circles).slice(0, 4), overlays: uniq(overlays), offboard: uniq(offboard).slice(0, 3), overlap: uniq(overlap).slice(0, 3) };
});

const rows = [];
for (const id of ids){
  errs.length = 0;
  await openApp(page, Object.assign({ reduceMotion: true, sound: false, haptics: false, onboarded: true, seen: SEEN }, PROF));
  await openModeList(page);
  try { await clickMode(page, id); } catch (e){ rows.push({ id, err: e.message }); continue; }
  await page.waitForFunction(() => [...document.getElementById('surface').children]
    .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 50 }).catch(() => {});
  await page.waitForTimeout(1500);
  rows.push({ id, ...(await inspect()) });
}
await browser.close();

let hard = 0, soft = 0, clean = 0;
for (const r of rows){
  const h = (r.err ? 1 : 0) + (r.tiles || []).length + (r.circles || []).length + (r.overlays || []).length + (r.offboard || []).length;
  const o = (r.overlap || []).length;
  if (!h && !o){ clean++; continue; }
  console.log(`${h ? 'FAIL' : 'note'} ${r.id}`);
  if (r.err) console.log(`    ! ${r.err}`);
  (r.tiles || []).forEach(x => console.log(`    tiles    : ${x}`));
  (r.circles || []).forEach(x => console.log(`    circles  : ${x}`));
  (r.overlays || []).forEach(x => console.log(`    overlays : ${x}`));
  (r.offboard || []).forEach(x => console.log(`    offboard : ${x}`));
  (r.overlap || []).forEach(x => console.log(`    overlap  : ${x}`));
  hard += h ? 1 : 0; soft += !h && o ? 1 : 0;
}
console.log(`\n${VW}x${VH}${MAX ? ' at maximum difficulty' : ''}: ${clean}/${rows.length} modes clean, ${hard} with a fault, ${soft} with overlap only`);
floorOrDie('geometry', rows.length, Math.min(40, ids.length));
if (errs.length) console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3));
process.exit(hard ? 1 : 0);
