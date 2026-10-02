/* Mirror Stitch, played the way a thumb does.
 *
 *   - the pattern is lit on one side of the fold, and you light its reflection on the other
 *   - every empty square on the far side looks like every other: nothing is picked out, at any level (there used to be a decoy square
 *     in orange from level 14 that had nothing to do with the reflection, and it read as a glitch in the pattern)
 *   - the fold runs down the middle or, from level 8, across it, and the reflection goes the right way either way
 *   - lighting exactly the reflection wins, a finger dragged over several squares lights them all, and a square tapped twice goes dark
 *
 *   node tools/probe/mirror.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const REPEATS = Number(process.env.REPEATS || 6);

const open = async xp => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { mirror: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'mirror');
  await page.waitForSelector('#surface .grid .cell', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const g = document.querySelector('#surface .grid'); if (!g) return null;
  const cells = [...g.children].filter(e => e.classList.contains('cell'));
  const N = Math.round(Math.sqrt(cells.length)), down = g.classList.contains('flat');
  return { N, down, cells: cells.map((e, i) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { i, given: e.classList.contains('given'), on: e.classList.contains('on'), tempt: e.classList.contains('tempt'), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width,
      look: [cs.borderTopColor, cs.boxShadow, cs.backgroundColor, cs.opacity].join('|') }; }) };
});
const wantedOf = s => { const out = new Set(); s.cells.forEach(c => { if (!c.given || !c.on) return; const x = c.i % s.N, y = Math.floor(c.i / s.N); out.add(s.down ? (s.N - 1 - y) * s.N + x : y * s.N + (s.N - 1 - x)); }); return out; };
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));

/* ── nothing on the far side is picked out, at any level ───────────────────────────────────────────────────────────────── */
for (const [xp, label] of [[0, 'a new player'], [2000, 'level about 5'], [12000, 'level about 14'], [60000, 'a high level']]){
  const odd = [];
  for (let i = 0; i < REPEATS; i++){
    const page = await open(xp);
    const s = await read(page);
    const far = s.cells.filter(c => !c.given);
    const looks = new Set(far.map(c => c.look));
    if (looks.size !== 1 || far.some(c => c.tempt)) odd.push(`${looks.size} different looks, ${far.filter(c => c.tempt).length} marked`);
    await page.close();
  }
  check(odd.length === 0, `${label}: every empty square on the far side looks the same on ${REPEATS} boards${odd.length ? ' (' + odd[0] + ')' : ''}`);
}

/* ── lighting the reflection wins, whichever way the fold runs ─────────────────────────────────────────────────────────── */
/* Keep dealing boards until both folds have been played twice (from level 8 about two in five fold across), up to twenty. */
const played = { across: 0, down: 0 };
for (let tries = 0; tries < 20 && (played.across < 2 || played.down < 2); tries++){
  const page = await open(60000);
  const s = await read(page);
  const kind = s.down ? 'across' : 'down';
  if (played[kind] >= 2){ await page.close(); continue; }
  played[kind]++;
  const want = [...wantedOf(s)];
  const byIdx = new Map(s.cells.map(c => [c.i, c]));
  let rest = want.slice();
  /* a real drag where two wanted squares sit side by side (or one above the other, for a fold across) */
  const step = s.down ? s.N : 1;
  const pair = want.find(i => want.includes(i + step) && (s.down || (i % s.N) < s.N - 1));
  if (pair !== undefined){
    const a = byIdx.get(pair), b = byIdx.get(pair + step);
    await page.mouse.move(a.cx, a.cy); await page.mouse.down(); await page.mouse.move(b.cx, b.cy, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
    const mid = await read(page);
    check(mid.cells[pair].on && mid.cells[pair + step].on, `fold ${kind}: a finger dragged over two squares lights both (${s.N}x${s.N})`);
    rest = rest.filter(i => i !== pair && i !== pair + step);
  }
  /* a wrong square goes dark when tapped again */
  const wrong = s.cells.find(c => !c.given && !want.includes(c.i));
  if (wrong){ await page.mouse.click(wrong.cx, wrong.cy); await page.waitForTimeout(80);
    const on = (await read(page)).cells[wrong.i].on; await page.mouse.click(wrong.cx, wrong.cy); await page.waitForTimeout(80);
    const off = !(await read(page)).cells[wrong.i].on;
    check(on && off, `fold ${kind}: a square tapped once lights and tapped again goes dark`); }
  for (const i of rest){ const c = byIdx.get(i); await page.mouse.click(c.cx, c.cy); await page.waitForTimeout(90); }
  await page.waitForTimeout(500);
  check(await score(page) > 0, `fold ${kind}: lighting exactly the reflection wins the round (${want.length} squares)`);
  await page.close();
}
check(played.across >= 2 && played.down >= 2, `both folds were played: ${played.across} across the top, ${played.down} down the side`);

/* ── a hint, and stitches that come back ─────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const want = wantedOf(s);
  const budget = async () => parseInt(((await page.evaluate(() => (document.querySelector('.budget') || {}).textContent || '')).match(/\d+/) || ['0'])[0], 10);
  const tool = async () => page.evaluate(() => { const b = document.querySelector('.sumcol .sumtool'), r = b.getBoundingClientRect(); return { text: b.textContent.trim(), x: r.left, y: r.top, w: r.width, h: r.height, off: b.disabled }; });
  const sum = await page.evaluate(() => { const r = document.getElementById('surface').getBoundingClientRect(); return { y: r.top + r.height }; });
  let tl = await tool();
  check(tl.h >= 40 && tl.y + tl.h <= sum.y + 1, `Hint is inside the board and big enough to hit (${Math.round(tl.h)}px)`);
  /* lighting a square costs a move, putting it out gives the move back */
  const b0 = await budget(); const w0 = s.cells.find(c => !c.given && !want.has(c.i));
  await page.mouse.click(w0.cx, w0.cy); await page.waitForTimeout(100); const b1 = await budget();
  await page.mouse.click(w0.cx, w0.cy); await page.waitForTimeout(100); const b2 = await budget();
  check(b1 === b0 - 1 && b2 === b0, `lighting a square costs a move and putting it out gives it back (${b0} -> ${b1} -> ${b2})`);
  /* the hint lights one square that is still missing */
  await page.mouse.click(tl.x + 20, tl.y + 18); await page.waitForTimeout(250);
  const hinted = await page.evaluate(() => [...document.querySelectorAll('.mcell')].map((c, k) => c.classList.contains('hint') ? Number(c.dataset.idx) : -1).filter(i => i >= 0));
  tl = await tool();
  check(hinted.length === 1 && want.has(hinted[0]) && /1/.test(tl.text), `Hint lights one square the reflection needs (${hinted.join()}), and uses one of two (${tl.text})`);
  const hc = s.cells.find(c => c.i === hinted[0]);
  await page.mouse.click(hc.cx, hc.cy); await page.waitForTimeout(120);
  const after = await page.evaluate(i => ({ on: document.querySelector('.mcell[data-idx="' + i + '"]').classList.contains('on'), hint: document.querySelector('.mcell[data-idx="' + i + '"]').classList.contains('hint') }), hinted[0]);
  check(after.on && !after.hint, 'tapping the lit square lights it and clears the hint');
  await page.close();
}
check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nMirror Stitch plays the way it says');
process.exit(bad ? 1 : 0);
