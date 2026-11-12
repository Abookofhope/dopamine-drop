/* Cat's Eyes, played with a real mouse.
 *
 *   - the lantern throws a round pool of light that grows as eyes open (it was an oval pinned to the top corner, and almost invisible)
 *   - carrying the light over every pair of eyes wins, at a new, middle and high level, and on a 320px phone
 *   - a quick swipe that never lands near an eye still opens it: the whole stroke counts, not only where the finger was sampled
 *   - open eyes follow the light with their pupils
 *   - Glow shows three times at first and two later
 *   - stuck for a few seconds, the nearest closed pair stirs on its own
 *
 *   node tools/probe/glimmer.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { glimmer: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'glimmer');
  await page.waitForSelector('#surface .glimbox .glimlamp', { timeout: 9000 }); await page.waitForTimeout(600);
  return page;
};
const read = page => page.evaluate(() => {
  const b = document.querySelector('.glimbox'), r = b.getBoundingClientRect(), lt = document.querySelector('.glimlight').getBoundingClientRect();
  const lamps = [...document.querySelectorAll('.glimlamp')].map(e => ({ x: parseFloat(e.style.left), y: parseFloat(e.style.top), lit: e.classList.contains('lit'), op: parseFloat(e.style.opacity || '0'),
    gaze: [...e.querySelectorAll('.pl')].map(p => p.getAttribute('transform') || '').join('|') }));
  const g = [...document.querySelectorAll('.sumtool')].find(e => /glow/i.test(e.textContent));
  return { left: r.left, top: r.top, w: r.width, h: r.height, lamps, light: { w: lt.width, h: lt.height }, glow: g ? g.textContent.trim() : '' };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const px = (s, p) => [s.left + p.x / 100 * s.w, s.top + p.y / 100 * s.h];

/* ── the light, and the way round ─────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, vp, glows] of [[0, 'a new player', { width: 400, height: 820 }, 3], [12000, 'a middle level', { width: 400, height: 820 }, 2], [60000, 'a high level', { width: 400, height: 820 }, 2], [12000, 'a middle level on a 320px phone', { width: 320, height: 568 }, 2]]){
  const page = await open(xp, vp); let s = await read(page);
  check(Math.abs(s.light.w - s.light.h) < 2 && s.light.w > s.w * 0.4, `${label}: the lantern's pool of light is round and wide (${Math.round(s.light.w)} x ${Math.round(s.light.h)}px on a ${Math.round(s.w)}px board)`);
  check(new RegExp('\\b' + glows + '\\b').test(s.glow), `${label}: Glow shows ${glows} (${s.glow})`);
  /* nearest first, with a real drag between each */
  let at = { x: 50, y: 50 }, first = true; const todo = s.lamps.map((l, i) => ({ ...l, i }));
  while (todo.length){
    todo.sort((a, b) => Math.hypot(a.x - at.x, (a.y - at.y) * s.h / s.w) - Math.hypot(b.x - at.x, (b.y - at.y) * s.h / s.w));
    const t = todo.shift(); const [tx, ty] = px(s, t);
    if (first){ const [sx, sy] = px(s, at); await page.mouse.move(sx, sy); await page.mouse.down(); first = false; }
    /* creeping, a few widths a step, so shy eyes (0.186.0) stay put */
    await page.mouse.move(tx, ty, { steps: Math.max(8, Math.ceil(Math.hypot(t.x - at.x, (t.y - at.y) * s.h / s.w) / 3)) }); at = t;
  }
  await page.mouse.up(); await page.waitForTimeout(700);
  check(await score(page) > 0, `${label}: carrying the light over every pair of eyes (${s.lamps.length}) wins the round`);
  await page.close();
}

/* ── a quick swipe cannot jump over an eye ────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  /* a lamp with room either side of it on its row, and the swipe in two events only: far left of it to far right of it */
  const L = s.lamps.map((l, i) => ({ ...l, i })).find(l => l.x > 40 && l.x < 60) || s.lamps.map((l, i) => ({ ...l, i }))[0];
  const a = { x: Math.max(4, L.x - 30), y: L.y }, b = { x: Math.min(96, L.x + 30), y: L.y };
  const [ax, ay] = px(s, a), [bx, by] = px(s, b);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 1 }); await page.mouse.up(); await page.waitForTimeout(250);
  const after = await read(page);
  check(after.lamps[L.i].lit, `a swipe from ${Math.round(a.x)}% to ${Math.round(b.x)}% in one move opens the eyes it crosses (at ${Math.round(L.x)}%)`);
  await page.close();
}

/* ── open eyes follow the light ───────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const L = s.lamps[0]; const [lx, ly] = px(s, L);
  await page.mouse.move(lx, ly); await page.mouse.down(); await page.mouse.move(lx + 1, ly + 1, { steps: 2 }); await page.waitForTimeout(120);
  await page.mouse.move(Math.max(s.left + 6, lx - s.w * 0.3), ly, { steps: 6 }); await page.waitForTimeout(150);
  const left = (await read(page)).lamps[0].gaze;
  await page.mouse.move(Math.min(s.left + s.w - 6, lx + s.w * 0.3), ly, { steps: 10 }); await page.waitForTimeout(150);
  const right = (await read(page)).lamps[0].gaze;
  await page.mouse.up();
  check(left && right && left !== right, `an open pair of eyes looks at the light (${left} then ${right})`);
  await page.close();
}

/* ── stuck: the nearest closed pair stirs ─────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  const near = s.lamps.map((l, i) => ({ ...l, i })).sort((a, b) => Math.hypot(a.x - 50, (a.y - 50) * s.h / s.w) - Math.hypot(b.x - 50, (b.y - 50) * s.h / s.w))[0];
  let max = 0;
  for (let k = 0; k < 20; k++){ await page.waitForTimeout(500); const r = await read(page); if (k < 10) max = Math.max(max, r.lamps[near.i].op); else max = Math.max(max, r.lamps[near.i].op); if (k === 9) var early = max; }
  check(early < 0.69 && max >= 0.69, `left alone, the nearest closed pair stirs after a few seconds (${early.toFixed(2)} in the first five, ${max.toFixed(2)} by ten)`);
  await page.close();
}

/* ── its own rules (0.186.0): oil, gold twins, shy eyes, glowworms ─────────────────────────────────────────────────────── */
const st = page => page.evaluate(() => { const b = document.querySelector('.glimbox'); if (!b) return null; const q = b._state();
  return { ...q, light: document.querySelector('.glimlight').getBoundingClientRect().width, twins: b.dataset.twins === '1', bright: b.dataset.bright === '1',
    gauge: (document.querySelector('.glimoil') || {}).textContent || '', prompt: document.getElementById('prompt').textContent.trim(), worms: q.worms, hops: q.hops }; });
for (const [xp, label, want] of [[0, 'level 2', { word: /oil/, twins: false, shy: false, worms: false }], [4000, 'level 11', { word: /gold/, twins: true, shy: false, worms: false }],
  [30000, 'level 19', { word: /creep/, twins: true, shy: true, worms: false }], [60000, 'level 23', { word: /pink/, twins: true, shy: true, worms: true }]]){
  const page = await open(xp); const s = await read(page); let q = await st(page);
  check(want.word.test(q.prompt) && /100/.test(q.gauge), `${label}: the prompt teaches the newest rule and the lamp starts full (${q.prompt}; ${q.gauge})`);
  check(q.lamps.some(l => l.twin) === want.twins && q.lamps.some(l => l.shy) === want.shy && (q.worms.length > 0) === want.worms, `${label}: gold twins ${want.twins}, shy eyes ${want.shy}, glowworms ${want.worms}`);
  const P = l => px(s, l), w0 = q.light;
  /* moving burns oil and the pool of light shrinks with it */
  const far = { x: 50 + (q.lamps.every(l => Math.abs(l.x - 85) > 12 || Math.abs(l.y - 50) > 12) ? 35 : -35), y: 50 };
  const [cx, cy] = P({ x: 50, y: 50 }), [fx, fy] = P(far);
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(fx, fy, { steps: 14 }); await page.mouse.move(cx, cy, { steps: 14 }); await page.mouse.up(); await page.waitForTimeout(120);
  q = await st(page);
  check(q.oil < 100 && (q.light < w0 || q.lamps.some(l => l.lit)), `${label}: carrying the light burns oil and its pool shrinks (${Math.round(q.oil)}% left, ${Math.round(w0)} -> ${Math.round(q.light)}px)`);
  /* the glowworm first, while there is oil to lose */
  if (want.worms){
    const w = q.worms[0], o0 = q.oil, [wx, wy] = P(w);
    await page.mouse.click(wx, wy); await page.waitForTimeout(120); q = await st(page);
    check(q.worms[0].gone && q.oil < o0 && (q.oil === 0 || o0 - q.oil >= 29), `${label}: touching a glowworm eats oil (${Math.round(o0)} -> ${Math.round(q.oil)})`);
  }
  /* (unless the oil test above happened to creep over the shy pair and open it) */
  if (want.shy && !q.lamps.find(l => l.shy).lit){
    const sh = q.lamps.find(l => l.shy), was = { x: sh.x, y: sh.y };
    /* a tap far away, then a tap right on the shy pair: a jump */
    let away = { x: sh.x > 50 ? 15 : 85, y: sh.y > 50 ? 15 : 85 };
    /* not onto a glowworm or an unopened pair */
    for (const c of [[15, 15], [85, 85], [15, 85], [85, 15], [50, 15], [50, 85]]){ const o = { x: c[0], y: c[1] };
      if (Math.hypot(o.x - sh.x, o.y - sh.y) > 30 && q.worms.concat(q.lamps).every(w => w.gone || w.lit || Math.hypot(w.x - o.x, (w.y - o.y) * s.h / s.w) > 14)){ away = o; break; } }
    const [ax, ay] = P(away); await page.mouse.click(ax, ay); await page.waitForTimeout(60);
    const [sx, sy] = P(was); await page.mouse.click(sx, sy); await page.waitForTimeout(120);
    q = await st(page); const now = q.lamps.find(l => l.shy);
    check(!now.lit && (now.x !== was.x || now.y !== was.y) && (/quick|hid/i.test(q.prompt) || q.worms.some(w => w.gone)), `${label}: jumped on, the shy eyes hide somewhere else (${q.prompt})`);
  }
  /* open every pair, creeping, twins back to back */
  let at = await page.evaluate(() => { const b = document.querySelector('.glimbug'); return { x: parseFloat(b.style.left), y: parseFloat(b.style.top) }; });
  const asp = s.h / s.w; const d = (a2, b2) => Math.hypot(a2.x - b2.x, (a2.y - b2.y) * asp);
  const [bx0, by0] = P(at); await page.mouse.move(bx0, by0); await page.mouse.down();
  for (let pass = 0; pass < 3; pass++){
    q = await st(page); if (!q) break; let todo = q.lamps.map((l, i) => ({ ...l, i })).filter(l => !l.lit);
    const tw = todo.filter(l => l.twin); todo = todo.filter(l => !l.twin);
    while (todo.length || tw.length){
      let tgt;
      if (tw.length && (!todo.length || d(at, tw[0]) < d(at, todo[0]) + 30)){ tgt = tw.shift(); }
      else { todo.sort((a2, b2) => d(a2, at) - d(b2, at)); tgt = todo.shift(); }
      const [tx, ty] = P(tgt); await page.mouse.move(tx, ty, { steps: Math.max(6, Math.ceil(d(at, tgt) / 3)) }); at = tgt;
      if (!(await st(page))) break;
    }
  }
  await page.mouse.up(); await page.waitForTimeout(150);
  const end = await page.evaluate(() => { const b = [...document.querySelectorAll('.glimbox')].pop(); return b ? { gone: false } : { gone: true }; });
  check(await score(page) > 0, `${label}: every pair opened, the round is won`);
  await page.close();
}
/* twins and a bright finish: read off the finished board */
{
  const page = await open(4000); const s = await read(page);
  await page.evaluate(() => { window.__b = document.querySelector('.glimbox'); });
  const q = await st(page); const asp = s.h / s.w; const P = l => px(s, l);
  const tw = q.lamps.filter(l => l.twin), rest = q.lamps.filter(l => !l.twin);
  let at = { x: 50, y: 50 }; const [x0, y0] = P(at); await page.mouse.move(x0, y0); await page.mouse.down();
  const route = [...tw, ...rest.sort((a, b) => Math.hypot(a.x - tw[1].x, (a.y - tw[1].y) * asp) - Math.hypot(b.x - tw[1].x, (b.y - tw[1].y) * asp))];
  for (const l of route){ const [tx, ty] = P(l); await page.mouse.move(tx, ty, { steps: Math.max(6, Math.ceil(Math.hypot(l.x - at.x, (l.y - at.y) * asp) / 3)) }); at = l; }
  await page.mouse.up(); await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({ twins: window.__b.dataset.twins === '1', bright: window.__b.dataset.bright === '1', oil: +window.__b.dataset.oil }));
  check(r.twins, 'opening the two gold pairs one after the other pays the twins');
  check(r.bright === (r.oil >= 25), `a bright finish is paid when a quarter of the oil is left, and only then (${r.oil}% left, paid ${r.bright})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : "\nCat's Eyes lights the way and does not let you lose an eye");
process.exit(bad ? 1 : 0);
