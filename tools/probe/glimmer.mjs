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
    await page.mouse.move(tx, ty, { steps: 8 }); at = t;
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

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : "\nCat's Eyes lights the way and does not let you lose an eye");
process.exit(bad ? 1 : 0);
