/* Things drawn between other things have to land on them.
 *
 * Three modes draw a line over a board whose pieces are placed by percentage of
 * the board: No Crossing (a thread between pegs), Cat's Cradle (a thread between
 * the pegs you have looped, and a dashed circle for how far you can reach) and
 * Snip (the trail your finger leaves). The lines were drawn in an SVG with a
 * square 0-100 viewBox. Once boards filled the screen and stopped being square,
 * that SVG kept its shape and sat in the middle of a tall box, so a thread ended
 * on empty cloth a hundred pixels from the peg it was meant to join. Nothing
 * tested it: every check saw a correct DOM.
 *
 * So this measures in pixels, on the real page, at a phone shape:
 *
 *   No Crossing   every thread endpoint lies on a peg's centre, before and after
 *                 a drag; a peg is grabbed inside a circle, not an ellipse
 *   Cat's Cradle  the thread drawn after a tap joins the two pegs; a peg is
 *                 marked "in reach" exactly when it is inside the dashed circle
 *   Snip          the trail's end is under the finger; a stroke cuts what it
 *                 passes through and not what is a hand's width away
 *
 * Distances the game measures in "percent of width" on one axis and "percent of
 * height" on the other are stretched by the board's aspect ratio, which is the
 * same bug seen from the other side; the reach and grab checks are that half.
 *
 *   node tools/probe/threads.mjs
 *   VW=360 VH=640 node tools/probe/threads.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const VW = +(process.env.VW || 400), VH = +(process.env.VH || 820);
const ONLY = process.env.ONLY;                       // slack | arc | slice: run one section alone
const want = id => !ONLY || ONLY === id;
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const start = async id => {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  /* Any fixed stream will do; what matters is that a board is dealt at all. */
  await openApp(page, { reduceMotion: true, xp: 9000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true });
  await openModeList(page); await clickMode(page, id);
  await page.waitForFunction(() => [...document.getElementById('surface').children]
    .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000 }).catch(() => {});
  /* The play area itself moves about a second into a round (a line above it
     appears and pushes it down), so a position read before that is a position
     the board does not keep. Wait for the area to hold still, not for a time. */
  let prev = null, still = 0;
  for (let i = 0; i < 40 && still < 4; i++){
    const r = await page.evaluate(() => { const b = document.getElementById('surface').getBoundingClientRect(); return [b.top, b.height].map(Math.round).join('/'); });
    still = r === prev ? still + 1 : 0; prev = r; await page.waitForTimeout(200);
  }
  return page;
};

/* Positions read while a board is still settling are positions it does not end
   up at, and a stroke aimed at one lands somewhere else. Read until two reads
   150ms apart agree. */
const settle = async (page, sel) => {
  let prev = null;
  for (let i = 0; i < 24; i++){
    const now = JSON.stringify((await centres(page, sel)).map(c => [Math.round(c.x), Math.round(c.y)]));
    if (now === prev) return;
    prev = now; await page.waitForTimeout(150);
  }
};

/* Where an SVG line's two ends really are on the screen, in CSS pixels. */
const ends = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].map(l => {
  const m = l.getScreenCTM(), svg = l.ownerSVGElement;
  const at = (x, y) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m); return { x: q.x, y: q.y }; };
  return [at(+l.getAttribute('x1'), +l.getAttribute('y1')), at(+l.getAttribute('x2'), +l.getAttribute('y2'))];
}), sel);
const centres = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].map(e => {
  const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, cls: e.className };
}), sel);
const worst = (segs, pegs) => Math.max(0, ...segs.flat().map(p => Math.min(...pegs.map(c => Math.hypot(c.x - p.x, c.y - p.y)))));

/* ── No Crossing ────────────────────────────────────────────────────────── */
if (want('slack')){
  const page = await start('slack');
  await settle(page, '.slacknode');
  let segs = await ends(page, '.slackwire line'), pegs = await centres(page, '.slacknode');
  console.log(`   No Crossing: ${segs.length} threads, ${pegs.length} pegs; furthest thread end from any peg: ${worst(segs, pegs).toFixed(1)}px`);
  check(segs.length > 0 && worst(segs, pegs) < 2, 'No Crossing: every thread ends on a peg');

  /* Drag the first peg somewhere else on the board and look again. */
  const box = await (await page.$('.arcbox')).boundingBox();
  const p0 = pegs[0], to = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 };
  await page.mouse.move(p0.x, p0.y); await page.mouse.down();
  await page.mouse.move((p0.x + to.x) / 2, (p0.y + to.y) / 2, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up(); await page.waitForTimeout(250);
  segs = await ends(page, '.slackwire line'); pegs = await centres(page, '.slacknode');
  check(worst(segs, pegs) < 2, 'No Crossing: and still after dragging a peg');

  /* The grab area is a circle the size of the peg's neighbourhood, whichever way
     you miss. 55px straight up is a long way from a 45px peg; 25px sideways is
     touching it. */
  const grab = async (dx, dy) => {
    const c = (await centres(page, '.slacknode'))[1];
    await page.mouse.move(c.x + dx, c.y + dy); await page.mouse.down();
    /* That peg, not any peg: 55px from it can be inside another one. */
    const held = await page.evaluate(() => document.querySelectorAll('.slacknode')[1].classList.contains('held'));
    const any = await page.evaluate(() => [...document.querySelectorAll('.slacknode')].findIndex(n => n.classList.contains('held')));
    await page.mouse.up(); if (process.env.DEBUG) console.log(`   grab (${dx},${dy}) from peg 2 at ${Math.round(c.x)},${Math.round(c.y)}: held peg index ${any}`);
    return held;
  };
  const side = await grab(25, 0), up = await grab(0, -55), down = await grab(0, 55);
  console.log(`   grab from 25px beside: ${side}; 55px above: ${up}; 55px below: ${down}`);
  check(side, 'No Crossing: a peg is grabbed from beside it');
  check(!up && !down, 'No Crossing: and not from a peg-and-a-half above or below it');
  await page.close();
}

/* ── Cat's Cradle ───────────────────────────────────────────────────────── */
if (want('arc')){
  const page = await start('arc');
  await settle(page, '.arcdot');
  const dots = await centres(page, '.arcdot');
  const lit = dots.findIndex(d => /\blit\b/.test(d.cls));
  const halo = (await centres(page, '.arcreach'))[0];
  const inside = d => Math.hypot(d.x - halo.x, d.y - halo.y) <= halo.r;
  const wrong = dots.map((d, i) => ({ d, i })).filter(({ d, i }) => i !== lit && /\bnear\b/.test(d.cls) !== inside(d))
    .map(({ d, i }) => `peg ${i + 1}: marked ${/\bnear\b/.test(d.cls) ? 'in' : 'out of'} reach, ${Math.round(Math.hypot(d.x - halo.x, d.y - halo.y))}px away, circle radius ${Math.round(halo.r)}px`);
  console.log(`   Cat's Cradle: ${dots.length} pegs, circle radius ${Math.round(halo.r)}px`);
  check(wrong.length === 0, "Cat's Cradle: a peg is 'in reach' exactly when it is inside the dashed circle" + (wrong.length ? ' — ' + wrong[0] : ''));

  const target = dots.findIndex((d, i) => i !== lit && /\bnear\b/.test(d.cls));
  if (target < 0) check(false, "Cat's Cradle: no peg in reach to tap");
  else {
    await page.mouse.click(dots[target].x, dots[target].y);   // a real tap: the pegs listen for pointers
    await page.waitForTimeout(300);
    const segs = await ends(page, '.arcwire line');
    /* Pegs and lines are compared at the same moment. The pegs read before the
       tap are where the pegs WERE, and the page can shift a few pixels when the
       prompt changes. */
    const after = await centres(page, '.arcdot');
    dots.splice(0, dots.length, ...after);
    if (process.env.DEBUG) console.log(`   arc: lit ${lit} -> target ${target}; ${segs.length} line(s); worst end ${segs.length ? worst(segs, [dots[lit], dots[target]]).toFixed(1) : '-'}px; ends ${JSON.stringify(segs.map(g => g.map(q => [Math.round(q.x), Math.round(q.y)])))}; pegs ${JSON.stringify([dots[lit], dots[target]].map(q => [Math.round(q.x), Math.round(q.y)]))}`);
    check(segs.length === 1 && worst(segs, [dots[lit], dots[target]]) < 2, "Cat's Cradle: the thread joins the two pegs");
  }
  await page.close();
}

/* ── Snip ───────────────────────────────────────────────────────────────── */
if (want('slice')){
  const page = await start('slice');
  await settle(page, '.bit');
  const bits = (await centres(page, '.bit')).filter(b => !/\brot\b/.test(b.cls));
  const box = await (await page.$('.slicebox')).boundingBox();
  const target = bits.find(b => b.y - 45 > box.y + 6) || bits[0];
  const dy = target.y - 45 > box.y + 6 ? -45 : 45;
  const y = target.y + dy;
  /* Tag the piece now. Looking it up by position afterwards finds nothing once
     it has been cut (it shrinks away), and "found nothing" reads as "not cut",
     which is how the first version of this check passed on a broken build. */
  await page.evaluate(({ x, y }) => {
    const e = [...document.querySelectorAll('.bit')].find(b => { const r = b.getBoundingClientRect();
      return Math.abs(r.left + r.width / 2 - x) < 1 && Math.abs(r.top + r.height / 2 - y) < 1; });
    if (e) e.setAttribute('data-probe', '1');
  }, { x: target.x, y: target.y });
  const tagged = () => page.evaluate(() => { const e = document.querySelector('[data-probe]'); return e ? e.classList.contains('cut') : null; });
  /* A stroke along a line 45px from the piece's centre: the piece is 64px
     across, so that is 13px clear of its edge. */
  await page.mouse.move(box.x + 4, y); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
  const trail = await page.evaluate(() => {
    const pl = document.querySelector('.slicetrail polyline'), svg = pl.ownerSVGElement, m = svg.getScreenCTM();
    const pts = pl.getAttribute('points').trim().split(/\s+/).map(s => s.split(',').map(Number));
    const last = pts[pts.length - 1], p = svg.createSVGPoint(); p.x = last[0]; p.y = last[1]; const q = p.matrixTransform(m);
    return { x: q.x, y: q.y };
  });
  const gap = Math.hypot(trail.x - (box.x + box.width * 0.5), trail.y - y);
  console.log(`   Snip: trail end is ${gap.toFixed(1)}px from the finger`);
  check(gap < 2, 'Snip: the trail ends under the finger');
  await page.mouse.move(box.x + box.width - 4, y, { steps: 6 });
  await page.mouse.up(); await page.waitForTimeout(200);
  const missed = await tagged();
  if (process.env.DEBUG) console.log('   snip: all pieces (x,y,dist to stroke, rot):', JSON.stringify((await centres(page, '.bit')).map(b => [Math.round(b.x), Math.round(b.y), Math.round(Math.abs(b.y - y)), /\brot\b/.test(b.cls) ? 'rot' : ''])));
  if (process.env.DEBUG) console.log('   snip: target', Math.round(target.x), Math.round(target.y), 'stroke y', Math.round(y), 'box', JSON.stringify(box), 'cut states', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.bit')].map(e => e.className.replace('bit', '').trim() || '-'))));
  check(missed === false, 'Snip: a stroke 45px from a piece does not cut it' + (missed === null ? ' (piece not found: the check proves nothing)' : ''));

  /* The control: a short stroke straight through the same piece must cut it, or
     the check above would pass on a mode that never cuts anything. It is short
     so that it cannot reach a neighbour, which are always further apart. */
  await page.mouse.move(target.x - 18, target.y); await page.mouse.down();
  await page.mouse.move(target.x + 18, target.y, { steps: 4 });
  await page.mouse.up(); await page.waitForTimeout(200);
  check(await tagged() === true, 'Snip: and a stroke through it does');
  await page.close();
}

if (errs.length){ bad++; console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3)); }
await browser.close();
console.log(bad ? `\n${bad} thread problem(s)` : '\nevery line lands on what it joins');
process.exit(bad ? 1 : 0);
