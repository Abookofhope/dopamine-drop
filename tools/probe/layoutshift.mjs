/* The board must not move under the player's finger.
 *
 * On a first meeting a mode shows a how-to line above the board. It is dismissed
 * by the first touch of the board (after 2.2 seconds) or after nine, and it used
 * to give its height back when it went, so the whole play area jumped upward at
 * the exact moment of the tap: every piece moved 25 to 50 pixels and the tap
 * landed on a piece that was no longer there. It happened on the first meeting
 * of every mode, and nothing noticed, because every probe measured the board
 * once, at one moment, and the board was fine at that moment.
 *
 * So this measures the play area's position and size, over time, around the
 * things that happen to it: the board appearing, the first touch, and the hint's
 * own timeout. It runs each mode as a first meeting, which is when the hint is up.
 *
 *   node tools/probe/layoutshift.mjs                 every mode
 *   ONLY=odd,forge node tools/probe/layoutshift.mjs
 *   SLOW=1 node tools/probe/layoutshift.mjs          also wait out the 9s timeout on three modes
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, modeIdsFromBuild, floorOrDie } from './harness.mjs';

const ids = process.env.ONLY ? process.env.ONLY.split(',') : modeIdsFromBuild(process.env.SITE || '/tmp/pw/_site');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 100)));

const rect = () => page.evaluate(() => { const r = document.getElementById('surface').getBoundingClientRect();
  return { top: Math.round(r.top), h: Math.round(r.height) }; });
const same = (a, b) => a.top === b.top && a.h === b.h;
const fmt = r => `top ${r.top} height ${r.h}`;

const bad = [];
let measured = 0;
for (const id of ids){
  await openApp(page, { reduceMotion: true, xp: 9000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: {} });
  await openModeList(page); await clickMode(page, id);
  await page.waitForFunction(() => [...document.getElementById('surface').children]
    .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 50 }).catch(() => {});
  const boardAt = Date.now();
  const hint = await page.evaluate(() => { const h = document.getElementById('howto'); return !!h && !h.hidden; });
  const r0 = await rect();
  /* Past the 2.2s the hint ignores touches for, counted from when the hint went
     up (a moment BEFORE the board), then touch the board: the first press is
     what dismisses it. Timed from the click, a press lands inside the guard,
     dismisses nothing, and the probe passes on a build that has the bug. */
  await page.waitForTimeout(Math.max(0, 2500 - (Date.now() - boardAt)));
  const r1 = await rect();
  const box = await (await page.$('#surface')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.waitForTimeout(120);
  const r2 = await rect();
  await page.mouse.up();
  await page.waitForTimeout(150);
  const r3 = await rect();
  measured++;
  const moved = [];
  if (!same(r0, r1)) moved.push(`settling: ${fmt(r0)} -> ${fmt(r1)}`);
  if (!same(r1, r2)) moved.push(`on the first press: ${fmt(r1)} -> ${fmt(r2)}`);
  if (!same(r2, r3)) moved.push(`just after it: ${fmt(r2)} -> ${fmt(r3)}`);
  console.log(`${moved.length ? 'FAIL' : 'ok  '} ${id.padEnd(9)} ${hint ? 'hint up' : 'no hint'}${moved.length ? '  ' + moved.join('; ') : ''}`);
  if (moved.length) bad.push(id);
}

/* The other way the hint goes: nine seconds, whatever you do. Sampled the whole
   way, and only a change under the SAME board counts: if the round times out and
   the next one is dealt, the board is empty in between and the hint's space is
   rightly given back then. */
if (process.env.SLOW){
  for (const id of ids.slice(0, 3)){
    await openApp(page, { reduceMotion: true, xp: 9000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: {} });
    await openModeList(page); await clickMode(page, id);
    await page.waitForFunction(() => [...document.getElementById('surface').children]
      .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 50 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.getElementById('surface').children].find(c => c.id !== 'count' && !c.classList.contains('swap')); if (b) b.setAttribute('data-board', '1'); });
    const first = await rect(); let broke = null, sameBoardFor = 0;
    for (let t = 0; t < 40 && !broke; t++){
      await page.waitForTimeout(250);
      const alive = await page.evaluate(() => { const b = document.querySelector('[data-board]'); return !!b && b.isConnected; });
      if (!alive) break;                       // a new round: not this board's business
      sameBoardFor += 250;
      const now = await rect();
      if (!same(first, now)) broke = `${fmt(first)} -> ${fmt(now)} after ${sameBoardFor}ms`;
    }
    console.log(`${broke ? 'FAIL' : 'ok  '} ${id.padEnd(9)} held still under the same board for ${sameBoardFor}ms${broke ? ': ' + broke : ''}`);
    if (broke) bad.push(id + ' (timeout)');
  }
}
await browser.close();
floorOrDie('layoutshift', measured, Math.min(40, ids.length));
if (errs.length) console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3));
console.log(bad.length ? `\n${bad.length} mode(s) move the board under a finger: ${bad.join(', ')}` : `\nthe board holds still in all ${measured} modes`);
process.exit(bad.length || errs.length ? 1 : 0);
