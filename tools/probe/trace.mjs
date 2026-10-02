/* Follow the Thread, followed with a real mouse.
 *
 *   - the thread is a smooth curve (hundreds of points, not a handful of straight pieces), and the part you have followed turns bright
 *   - dragging along it from the bright dot to the ring wins, at a new, middle and high level, and on a 320px phone
 *   - wandering off for good fills the meter and loses; wandering off for a little and coming back does not (the meter empties
 *     while you are on the thread), and the words say you are drifting while you are off it
 *   - lifting a finger is free: you can put it back on the thread and carry on
 *
 *   node tools/probe/trace.mjs
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
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { trace: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'trace');
  await page.waitForSelector('#surface .trcbox .trcline', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
/* the thread as pixel points, plus the box and the meter */
const read = page => page.evaluate(() => {
  const b = document.querySelector('.trcbox'), r = b.getBoundingClientRect();
  const nums = (document.querySelector('.trcline').getAttribute('d').match(/-?[\d.]+/g) || []).map(Number);
  const pts = []; for (let i = 0; i + 1 < nums.length; i += 2) pts.push([r.left + nums[i] / 100 * r.width, r.top + nums[i + 1] / 100 * r.height]);
  const trail = (document.querySelector('.trcdone').getAttribute('d').match(/-?[\d.]+/g) || []).length / 2;
  return { pts, trail, w: r.width, h: r.height, left: r.left, top: r.top, astray: b.classList.contains('astray'), lost: b.classList.contains('lost'), won: b.classList.contains('won'),
    prompt: document.getElementById('prompt').textContent.trim(), slip: parseFloat(document.querySelector('.trcslip').style.width || '0'),
    marks: document.querySelectorAll('.trcmark.got').length, nmarks: document.querySelectorAll('.trcmark').length };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const along = async (page, pts, from = 0, to = pts.length - 1, every = 2) => { for (let i = from; i <= to; i += every) await page.mouse.move(pts[i][0], pts[i][1]); await page.mouse.move(pts[to][0], pts[to][1]); };

/* ── smooth, and it follows ───────────────────────────────────────────────────────────────────────────────────────────── */
for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [12000, 'a middle level', { width: 400, height: 820 }], [60000, 'a high level', { width: 400, height: 820 }], [12000, 'a middle level on a 320px phone', { width: 320, height: 568 }]]){
  const page = await open(xp, vp); const s = await read(page);
  check(s.pts.length >= 49, `${label}: the thread is a smooth curve (${s.pts.length} points, ${s.nmarks} waypoints)`);
  /* no sharp corners: the direction never turns more than 100 degrees between neighbouring points */
  let worst = 0;
  for (let i = 1; i + 1 < s.pts.length; i++){
    const a = [s.pts[i][0] - s.pts[i-1][0], s.pts[i][1] - s.pts[i-1][1]], b = [s.pts[i+1][0] - s.pts[i][0], s.pts[i+1][1] - s.pts[i][1]];
    const la = Math.hypot(...a), lb = Math.hypot(...b); if (la < .5 || lb < .5) continue;
    worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))) * 180 / Math.PI);
  }
  check(worst < 100, `${label}: no sharp corner in it (the sharpest turn is ${Math.round(worst)} degrees)`);
  await page.mouse.move(s.pts[0][0], s.pts[0][1]); await page.mouse.down();
  await along(page, s.pts, 0, Math.floor(s.pts.length / 2));
  const half = await read(page);
  check(half.trail > 4 && half.trail < s.pts.length, `${label}: the part followed turns bright (${half.trail} of ${s.pts.length} points)`);
  await along(page, s.pts, Math.floor(s.pts.length / 2), s.pts.length - 1);
  await page.mouse.up(); await page.waitForTimeout(600);
  check(await score(page) > 0, `${label}: following the thread from the dot to the ring wins the round`);
  await page.close();
}

/* ── off the thread for good loses, off a little does not ─────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  await page.mouse.move(s.pts[0][0], s.pts[0][1]); await page.mouse.down();
  await along(page, s.pts, 0, 12);
  /* a long way off the thread, to the top corner of the board if the thread is below it, else the bottom */
  const far = [s.left + s.w * 0.5, s.pts[12][1] > s.top + s.h * 0.5 ? s.top + 8 : s.top + s.h - 8];
  await page.mouse.move(far[0], far[1], { steps: 4 });
  await page.waitForTimeout(250);
  const mid = await read(page);
  check(mid.astray && /drift|ease/i.test(mid.prompt) && mid.slip > 0, `off the thread: the words say so and the meter fills ("${mid.prompt}", ${mid.slip}%)`);
  const lost = await page.waitForFunction(() => { const b = document.querySelector('.trcbox'); return !b || b.classList.contains('lost'); }, null, { timeout: 3500, polling: 30 }).then(() => true).catch(() => false);
  check(lost && (await score(page)) === 0, 'off the thread for good: the round is lost with no score');
  await page.mouse.up(); await page.close();
}
{
  /* the meter empties while you are back on the thread: 0.9s off, 2s on, 0.9s off would be 1.8s off in total at level 0 (limit 1.5s) */
  const page = await open(0); const s = await read(page);
  await page.mouse.move(s.pts[0][0], s.pts[0][1]); await page.mouse.down();
  await along(page, s.pts, 0, 12);
  const far = [s.left + s.w * 0.5, s.pts[12][1] > s.top + s.h * 0.5 ? s.top + 8 : s.top + s.h - 8];
  await page.mouse.move(far[0], far[1], { steps: 3 }); await page.waitForTimeout(800);
  const a = await read(page);
  await page.mouse.move(s.pts[12][0], s.pts[12][1], { steps: 3 }); await page.waitForTimeout(1900);
  const b = await read(page);
  check(!a.lost && b.slip < a.slip && !b.astray && /\d/.test(b.prompt), `back on the thread the meter empties (${a.slip}% then ${b.slip}%) and the words are the count again ("${b.prompt}")`);
  await page.mouse.move(far[0], far[1], { steps: 3 }); await page.waitForTimeout(800);
  const c = await read(page);
  check(!c.lost, `a second wander after recovering does not lose (${c.slip}%)`);
  await page.mouse.move(s.pts[12][0], s.pts[12][1], { steps: 3 }); await page.waitForTimeout(300);
  await along(page, s.pts, 12, s.pts.length - 1);
  await page.mouse.up(); await page.waitForTimeout(600);
  check(await score(page) > 0, 'and the thread can still be finished afterwards');
  await page.close();
}

/* ── lifting is free ──────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); const s = await read(page);
  await page.mouse.move(s.pts[0][0], s.pts[0][1]); await page.mouse.down();
  await along(page, s.pts, 0, 20); await page.mouse.up(); await page.waitForTimeout(2200);
  const a = await read(page);
  check(!a.lost && a.marks >= 2, `lifting a finger costs nothing, even for two seconds (${a.marks} stitches kept)`);
  await page.mouse.move(s.pts[20][0], s.pts[20][1]); await page.mouse.down();
  await along(page, s.pts, 20, s.pts.length - 1); await page.mouse.up(); await page.waitForTimeout(600);
  check(await score(page) > 0, 'putting it back on the thread carries on and wins');
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nFollow the Thread forgives a wobble and shows how far you have come');
process.exit(bad ? 1 : 0);
