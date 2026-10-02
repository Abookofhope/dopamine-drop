/* Basket Drop: the pegs have room.
 *
 *   - no two pegs' touch boxes overlap, and there is a gap of at least 6px between neighbours, at a new level and a high one, on a 400px
 *     phone and a 320px one (eight rows used to put the pegs about 31px apart with touch boxes 34px wide)
 *   - there are no more than seven rows, so the baskets are no more than eight, and the pegs stay inside the board
 *   - a peg is still big enough to hit (at least 22px), and tapping one pulls it
 *
 *   node tools/probe/pegs.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { plink: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'plink');
  await page.waitForSelector('#surface .plinkbox .peg', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const box = document.querySelector('.plinkbox').getBoundingClientRect();
  const pegs = [...document.querySelectorAll('.plinkbox .peg')].map(e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; });
  return { box: { x: box.left, y: box.top, w: box.width, h: box.height }, pegs, bins: document.querySelectorAll('.plinkbox .bin2').length };
});

for (const [vp, label] of [[{ width: 400, height: 820 }, '400px'], [{ width: 320, height: 568 }, '320px']]){
  for (const [xp, lvl] of [[0, 'a new player'], [2000, 'a middle level'], [60000, 'a high level'], [900000, 'the top']]){
    const page = await open(xp, vp); const s = await read(page);
    let minGap = 1e9, minDist = 1e9, overlap = 0;
    for (let i = 0; i < s.pegs.length; i++) for (let j = i + 1; j < s.pegs.length; j++){
      const a = s.pegs[i], b = s.pegs[j];
      const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
      const gap = Math.max(gx, gy);                      /* negative when the boxes overlap */
      minGap = Math.min(minGap, gap); if (gap < 0) overlap++;
      minDist = Math.min(minDist, Math.hypot(a.cx - b.cx, a.cy - b.cy));
    }
    const smallest = Math.min(...s.pegs.map(p => Math.min(p.w, p.h)));
    const inside = s.pegs.every(p => p.x >= s.box.x - 1 && p.x + p.w <= s.box.x + s.box.w + 1);
    check(overlap === 0 && minGap >= 6, `${label}, ${lvl}: ${s.pegs.length} pegs, no touch boxes overlap and the closest are ${minGap.toFixed(1)}px apart (centres ${minDist.toFixed(0)}px)`);
    check(s.bins <= 8 && inside && smallest >= 22, `${label}, ${lvl}: ${s.bins} baskets, the pegs are inside the board and at least ${smallest.toFixed(0)}px`);
    await page.close();
  }
}
{
  const page = await open(0, { width: 400, height: 820 }); const s = await read(page);
  const p = s.pegs[Math.floor(s.pegs.length / 2)];
  await page.mouse.click(p.cx, p.cy); await page.waitForTimeout(250);
  const pulled = await page.evaluate(() => document.querySelectorAll('.plinkbox .peg.pulled').length);
  check(pulled === 1, `tapping a peg pulls it (${pulled} pulled)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nBasket Drop has room between its pegs');
process.exit(bad ? 1 : 0);
