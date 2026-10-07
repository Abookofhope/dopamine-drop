/* The motion overhaul: does everything that moves move the way it says, and does nothing move when it should not?
 *
 *   1. The engine. A solve in Odd Skein draws on one canvas laid over the whole screen (no touches, hidden from screen
 *      readers, above the board), lays a ghost over the solved tile instead of moving it, uses Odd Skein's own shapes,
 *      and leaves nothing behind: the particles drain and every ghost, veil and sweep is gone within a few seconds. A
 *      miss snags the tile and reddens the edges. The next board opens with its game's reveal.
 *   2. Every game says yes its own way: each of the 44 has a signature, draws only its own shapes (plus the shared
 *      rings, glints and confetti of a hot streak), and no two share both a style and a set of shapes.
 *   3. A flood is capped: asking for two thousand particles at once leaves at most 260 alive.
 *   4. Reduce motion means none of it: no canvas, no particle, no ghost, no idle loop on a cat, and the page says so.
 *   5. The shell: a pill sits under the tab you are on and follows you, a change of tab slides the right way, the cats in
 *      the Room come alive a moment at a time (never a loop inside a drawing, which costs a layout every frame) and an
 *      idle Room costs little, petting one sends hearts up,
 *      the big doors on the home screen catch a shine, and every endless animation moves only transform or opacity.
 *   6. The end of a run: Game Over arrives in order and settles, Back to menu is topmost, and a level earned fires
 *      confetti from both corners.
 *
 *   PORT=8400 SITE=/tmp/pw/cur node tools/probe/motion.mjs
 */
import { chromium } from 'playwright';
import { openApp, openMode, goTab, modeIdsFromBuild } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const SITE = process.env.SITE || '/tmp/pw/_site';
const IDS = modeIdsFromBuild(SITE);
const PALS = { pals: { biscuit: { bond: 0, pet: null, bow: '' }, noodle: { bond: 0, pet: null, bow: '' } }, palsOn: ['biscuit'] };

const newPage = async (state, vp) => {
  const page = await browser.newPage({ viewport: vp || { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ onboarded: true, seen: { odd: 1 }, schema: 11 }, state));
  return page;
};

/* Odd Skein's odd tile, read the way a player reads it. */
const oddAt = (page, wrong) => page.evaluate(wrong => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  if (!tiles.length) return null;
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const i = wrong ? (odd + 1) % tiles.length : odd;
  const r = tiles[i].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, wrong);
const stats = page => page.evaluate(() => window.__vfx ? JSON.parse(JSON.stringify(window.__vfx.stats)) : null);
const leftovers = page => page.evaluate(() => ({
  live: window.__vfx ? window.__vfx.live() : -1,
  dom: document.querySelectorAll('.fxghost, .fxveil, .fxsweep').length }));
const waitBoard = page => page.waitForFunction(() => document.querySelectorAll('#surface .oddwrap .tile').length > 1 && !document.getElementById('count'), null, { timeout: 12000, polling: 60 });

/* ── 1. the engine, on a real solve and a real miss ── */
{
  const page = await newPage({ reduceMotion: false });
  check(await page.evaluate(() => document.documentElement.dataset.motion) === 'on', 'motion on: the page says so (html[data-motion="on"])');
  await openMode(page, 'odd', '#surface .oddwrap .tile');
  await waitBoard(page); await page.waitForTimeout(400);
  const s0 = await stats(page);
  check(!!s0, 'the motion engine is there (window.__vfx under dd.probe)');
  const runLoops = await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.ownerSVGElement && a.effect.getTiming().iterations === Infinity).length);
  check(runLoops === 0, `a run has no endless animation inside a drawing (${runLoops})`);
  /* A round of Odd Skein can be several boards long; the first right taps only move it on a stage (and bring a little of
     the signature, section 8). Tap until the round itself is solved. */
  let ghost = false;
  for (let k = 0; k < 5; k++){
    await waitBoard(page); await page.waitForTimeout(250);
    const at = await oddAt(page, false);
    await page.mouse.click(at.x, at.y);
    for (let i = 0; i < 8 && !ghost; i++){ await page.waitForTimeout(40); ghost = await page.evaluate(() => !!document.querySelector('.fxghost')); }
    if (await page.evaluate(() => window.__vfx && (window.__vfx.stats.sigs.odd | 0) >= 1)) break;
    await page.waitForTimeout(500);
  }
  const cv = await page.evaluate(() => {
    const c = document.getElementById('fxCanvas');
    if (!c) return null;
    const r = c.getBoundingClientRect(), cs = getComputedStyle(c);
    return { hidden: c.getAttribute('aria-hidden'), pe: cs.pointerEvents, z: +cs.zIndex, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
      outside: !document.getElementById('surface').contains(c) };
  });
  check(!!cv, 'a solve draws on the effects canvas');
  if (cv){
    check(cv.hidden === 'true' && cv.pe === 'none', `the canvas is hidden from screen readers and takes no touch (${cv.hidden}, ${cv.pe})`);
    check(Math.abs(cv.w - cv.vw) < 2 && Math.abs(cv.h - cv.vh) < 2 && cv.z >= 70 && cv.outside, `it covers the screen, above the board and outside it (${cv.w}x${cv.h}, z ${cv.z})`);
  }
  check(ghost, 'the solved tile answers through a ghost laid over it, not by moving');
  const s1 = await stats(page);
  check(s1 && (s1.sigs.odd || 0) >= 1, `the solve used Odd Skein's own signature (${s1 ? JSON.stringify(s1.sigs) : 'none'})`);
  check(s1 && ((s1.kinds.curl || 0) + (s1.kinds.thread || 0)) >= 6, `in Odd Skein's shapes, curls and threads (${s1 ? (s1.kinds.curl | 0) + '+' + (s1.kinds.thread | 0) : 0})`);
  await waitBoard(page);
  const rv = await page.evaluate(() => document.getElementById('surface').dataset.rv || '');
  check(rv === 'iris', `the next board opens with its game's reveal ("${rv}")`);
  await page.waitForTimeout(2600);
  const left = await leftovers(page);
  check(left.live === 0 && left.dom === 0, `nothing is left behind (${left.live} particles, ${left.dom} overlays)`);
  /* a miss */
  const w = await oddAt(page, true);
  await page.mouse.click(w.x, w.y);
  let snag = false, veil = false;
  for (let i = 0; i < 8 && !(snag && veil); i++){
    await page.waitForTimeout(40);
    const r = await page.evaluate(() => ({ s: !!document.querySelector('.fxghost.snag path'), v: !!document.querySelector('.fxveil') }));
    snag = snag || r.s; veil = veil || r.v;
  }
  check(snag, 'a miss snags the tile with a pulled thread');
  check(veil, 'and the edges of the screen redden');

  /* ── 2. every game has its own way of saying yes ── */
  const sig = await page.evaluate(ids => {
    const V = window.__vfx; if (!V) return null;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:150px;top:300px;width:80px;height:80px';
    document.body.appendChild(host);
    const SHARED = new Set(['ring', 'ellring', 'glint', 'confetti']);
    const out = {};
    for (const id of ids){
      V.clear();
      const before = Object.assign({}, V.stats.kinds);
      const s = V.SIG[id];
      const did = V.solve(host, '#33E6C8', 2, id);
      const made = Object.keys(V.stats.kinds).filter(k => (V.stats.kinds[k] | 0) > (before[k] | 0));
      out[id] = { has: !!s, did, st: s && s.st, k: s ? s.k.slice().sort().join('+') : '',
        own: s ? made.filter(k => s.k.includes(k)).length : 0, stray: s ? made.filter(k => !s.k.includes(k) && !SHARED.has(k)) : made };
    }
    host.remove();
    return out;
  }, IDS);
  if (!sig) check(false, 'every game has a signature (no engine)');
  else {
    const missing = IDS.filter(id => !sig[id].has || !sig[id].did);
    check(missing.length === 0, `every game has a signature (${IDS.length - missing.length}/${IDS.length}${missing.length ? '; none for ' + missing.join(',') : ''})`);
    const silent = IDS.filter(id => sig[id].has && sig[id].own === 0);
    check(silent.length === 0, `every one draws its own shapes${silent.length ? ' (not: ' + silent.join(',') + ')' : ''}`);
    const stray = IDS.filter(id => sig[id].stray && sig[id].stray.length);
    check(stray.length === 0, `and only its own (plus rings, glints and confetti)${stray.length ? ': ' + stray.map(id => id + ':' + sig[id].stray.join('/')).join(' ') : ''}`);
    const seen = {}, twins = [];
    IDS.forEach(id => { const k = sig[id].st + '|' + sig[id].k; if (seen[k]) twins.push(seen[k] + '=' + id); else seen[k] = id; });
    check(twins.length === 0, `no two games share both a style and a set of shapes${twins.length ? ': ' + twins.join(' ') : ''}`);
    const rv = await page.evaluate(ids => ids.filter(id => { const s = window.__vfx.SIG[id]; return !s || !['radial','spiral','orbit','line','trail','rain','pour','bounce','fountain','drift','puff','mirror','split','cross','twinkle','implode'].includes(s.st); }), IDS);
    check(rv.length === 0, `every style has a reveal${rv.length ? ' (not: ' + rv.join(',') + ')' : ''}`);
  }

  /* ── 3. a flood is capped ── */
  await page.waitForTimeout(2000);
  const flood = await page.evaluate(() => {
    const V = window.__vfx; if (!V) return null;
    V.spray('radial', 200, 400, 2000, { k: ['dot'], pal: ['#fff'] });
    return V.live();
  });
  check(flood !== null && flood <= 260 && flood >= 100, `two thousand asked for at once, ${flood} alive (cap 260)`);
  await page.close();
}

/* ── 4. Reduce motion: none of it ── */
{
  const page = await newPage({ reduceMotion: true, ...PALS });
  check(await page.evaluate(() => document.documentElement.dataset.motion) === 'off', 'reduce motion: the page says so (html[data-motion="off"])');
  await goTab(page, 'Room'); await page.waitForTimeout(600);
  const catAnims = await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.catart')).length);
  check(catAnims === 0, `reduce motion: the cats in the Room keep still (${catAnims} animations)`);
  await goTab(page, 'Play');
  await openMode(page, 'odd', '#surface .oddwrap .tile');
  await waitBoard(page); await page.waitForTimeout(300);
  const at = await oddAt(page, false);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ canvas: !!document.getElementById('fxCanvas'), made: window.__vfx ? window.__vfx.stats.made : 0,
    ghosts: document.querySelectorAll('.fxghost, .fxveil, .fxsweep').length }));
  check(!r.canvas && r.made === 0 && r.ghosts === 0, `reduce motion: a solve draws nothing (canvas ${r.canvas}, ${r.made} particles, ${r.ghosts} overlays)`);
  await page.close();
}

/* ── 5. the shell ── */
{
  const page = await newPage({ reduceMotion: false, ...PALS, xp: 9000, solved: 600, runs: 40 });
  const pillUnder = () => page.evaluate(() => {
    const p = document.querySelector('#tabbar .tabpill'), on = document.querySelector('#tabbar .tab[aria-current="page"] .ti');
    if (!p || !on) return null;
    const a = p.getBoundingClientRect(), b = on.getBoundingClientRect();
    return { dx: Math.abs((a.left + a.width / 2) - (b.left + b.width / 2)), dy: Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)),
      pe: getComputedStyle(p).pointerEvents, tab: on.closest('.tab').dataset.tab };
  });
  await page.waitForTimeout(700);
  let pu = await pillUnder();
  check(!!pu && pu.dx < 3 && pu.dy < 3 && pu.pe === 'none', `a pill sits under the tab you are on and takes no touch (${pu ? pu.tab + ', off by ' + pu.dx.toFixed(1) : 'no pill'})`);
  await page.evaluate(() => document.querySelector('#tabbar .tab[data-tab="Room"]').click());
  const dir1 = await page.evaluate(() => document.documentElement.dataset.vtdir || '');
  await page.waitForTimeout(900);
  pu = await pillUnder();
  check(!!pu && pu.tab === 'Room' && pu.dx < 3, `and follows you to the Room (${pu ? pu.tab + ', off by ' + pu.dx.toFixed(1) : 'no pill'})`);
  check(dir1 === 'fwd', `going right slides the page forward ("${dir1}")`);
  /* Idle life comes as moments (a blink, a twitch, a flick, a breath, a z off a sleeper), never as loops on parts inside
     an SVG: those cannot be handed to the compositor and cost a layout every frame (a run's mascot once made a Loaf Box
     drag 120 layouts heavier). */
  const seen = new Set(); const z0 = await page.evaluate(() => window.__vfx ? window.__vfx.stats.kinds.text | 0 : 0);
  for (let i = 0; i < 45; i++){
    await page.waitForTimeout(100);
    (await page.evaluate(() => [...document.querySelectorAll('#tabRoom .catart')].flatMap(n => [...n.classList].filter(c => c.startsWith('lf-'))))).forEach(c => seen.add(c));
  }
  const z1 = await page.evaluate(() => window.__vfx ? window.__vfx.stats.kinds.text | 0 : 0);
  check(seen.size >= 2, `the cats in the Room come alive a moment at a time (${[...seen].join(', ') || 'nothing'}${z1 > z0 ? ', and a z' : ''})`);
  {
    const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
    const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    const a = await m(); await page.waitForTimeout(3000); const b = await m();
    const lay = b.LayoutCount - a.LayoutCount, ms = (b.TaskDuration - a.TaskDuration) * 1000;
    check(lay <= 45 && ms < 150, `a Room left alone costs little (${lay} layouts and ${ms.toFixed(0)} ms of work in 3 s)`);
  }
  const h0 = await page.evaluate(() => window.__vfx ? (window.__vfx.stats.kinds.heart | 0) : 0);
  const cat = await page.evaluate(() => { const g = document.querySelector('#roomScene [data-pal]'); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .55 }; });
  if (cat){ await page.mouse.click(cat.x, cat.y); await page.waitForTimeout(250); }
  const h1 = await page.evaluate(() => window.__vfx ? (window.__vfx.stats.kinds.heart | 0) : 0);
  check(!!cat && h1 > h0, `petting a cat sends hearts up (${h1 - h0})`);
  await page.evaluate(() => document.querySelector('#tabbar .tab[data-tab="Play"]').click());
  const dir2 = await page.evaluate(() => document.documentElement.dataset.vtdir || '');
  check(dir2 === 'back', `going left slides it back ("${dir2}")`);
  await page.waitForTimeout(900);
  const sheen = await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.pseudoElement === '::after' && a.effect.target.classList.contains('gateBtn')).length);
  check(sheen === 3, `the three big doors each catch a shine (${sheen})`);
  /* Every endless animation on screen moves only transform or opacity: an endless repaint is what makes a cheap phone warm. */
  const heavy = async where => page.evaluate(() => {
    const ok = new Set(['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset', 'translate', 'scale', 'rotate']);
    return document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations === Infinity)
      .map(a => ({ n: a.animationName || '?', p: a.effect.getKeyframes().flatMap(k => Object.keys(k)).filter(k => !ok.has(k)) }))
      .filter(x => x.p.length).map(x => x.n + ':' + [...new Set(x.p)].join('/'));
  });
  let hv = await heavy();
  await goTab(page, 'Room'); await page.waitForTimeout(500);
  hv = hv.concat(await heavy());
  check(hv.length === 0, `every endless animation moves only transform or opacity${hv.length ? ' (not: ' + [...new Set(hv)].join(' ') + ')' : ''}`);
  await page.close();
}

/* ── 6. the end of a run (and 7. the same with Big celebrations off) ── */
for (const bigFx of [true, false]){
  const tag = bigFx ? '' : 'big celebrations off: ';
  /* Level 9 with five points to go: one solve makes level 10. */
  const page = await newPage({ reduceMotion: false, bigFx, xp: 805, runs: 12, solved: 80 });
  await openMode(page, 'odd', '#surface .oddwrap .tile');
  let solved = false;
  for (let k = 0; k < 6 && !solved; k++){
    await waitBoard(page); await page.waitForTimeout(350);
    const at = await oddAt(page, false);
    await page.mouse.click(at.x, at.y); await page.waitForTimeout(700);
    solved = await page.evaluate(() => parseInt((document.getElementById('hudScore').textContent || '').replace(/\D/g, '') || '0', 10) > 0);
  }
  let enter = false;
  for (let k = 0; k < 30; k++){
    const st = await page.evaluate(() => ({ over: !document.getElementById('over').hidden, enter: document.getElementById('over').classList.contains('enter') }));
    if (st.over){ enter = st.enter; break; }
    await page.evaluate(() => { const t = [...document.querySelectorAll('#surface .oddwrap .tile:not([disabled])')]; if (t.length) t[t.length - 1].click(); });
    await page.waitForTimeout(260);
  }
  check(solved, tag + 'a board was solved on the way (the level-up depends on it)');
  check(enter, tag + 'Game Over arrives in order (the entrance runs)');
  if (bigFx){
    const bar = await page.evaluate(() => getComputedStyle(document.querySelector('#over .overbar')).animationName);
    check(/fadeOnly/.test(bar), `its buttons only fade in, so they are where they will stay ("${bar}")`);
  }
  await page.waitForTimeout(2300);
  const lv = await page.evaluate(() => ({ card: !document.getElementById('levelup').hidden, confetti: window.__vfx ? window.__vfx.stats.kinds.confetti | 0 : 0,
    made: window.__vfx ? window.__vfx.stats.made : 0 }));
  if (bigFx) check(lv.card && lv.confetti >= 40, `a level earned fires confetti from both corners (${lv.confetti})`);
  else check(lv.card && lv.confetti === 0 && lv.made > 0, `${tag}the level card shows with no confetti, and the small touches stay (${lv.confetti} confetti, ${lv.made} particles)`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const settled = await page.evaluate(() => {
    const o = document.getElementById('over'), b = document.getElementById('homeBtn').getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { enter: o.classList.contains('enter'), top: !!t && (t.id === 'homeBtn' || !!t.closest('#homeBtn')) };
  });
  check(!settled.enter && settled.top, `${tag}then it settles, with Back to menu topmost (${JSON.stringify(settled)})`);
  await page.close();
}

/* ── 8. a game's own small moments inside a round ── */
{
  const page = await newPage({ reduceMotion: false, seen: { tumble: 1, odd: 1 } });
  await page.evaluate(() => localStorage.setItem('dd.pool', 'tumble'));
  await openMode(page, 'tumble', '#surface button');
  await page.waitForTimeout(900);
  for (let i = 0; i < 24; i++){
    const at = await page.evaluate(i => {
      const b = [...document.querySelectorAll('#surface button:not([disabled])')];
      if (!b.length) return null;
      const r = b[(i * 7) % b.length].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, i);
    if (at) await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(140);
  }
  const bits = await page.evaluate(() => window.__vfx ? window.__vfx.stats.bits | 0 : -1);
  check(bits > 0, `a game's own chime or buzz inside a round brings a little of its signature (${bits} in Tumble Dryer)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + [...new Set(errs)].join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nEverything that moves moves its own way, leaves nothing behind, and stops when motion is off');
process.exit(bad ? 1 : 0);
