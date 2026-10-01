/* Chalk Line, one seeded board at a time: draw the answer with a real mouse, drop, and say what happened.
 *
 * A board is fixed by seeding Math.random just before the mode is opened, so a seed that misses can be played again exactly.
 *
 *   SEEDS=1-60 XP=12000 node tools/probe/chalkseed.mjs         every seed in the range, one line each
 *   SEEDS=17 XP=12000 JITTER=0.4 node tools/probe/chalkseed.mjs  the same board with each point moved up to 0.4px, ten times
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const [lo, hi] = (process.env.SEEDS || '1-20').split('-').map(Number); const to = hi || lo;
const XP = Number(process.env.XP || 12000), JIT = Number(process.env.JITTER || 0), PAUSE = Number(process.env.PAUSE || 0);
const browser = await chromium.launch();

const play = async (seed, jitter) => {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, hasTouch: true });
  await ctx.addInitScript(s => {
    localStorage.setItem('dd.probe', '1');
    let a = s;
    Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    window.__reseed = () => { a = s; };
  }, seed * 7919 + 13);
  const page = await ctx.newPage();
  await openApp(page, { reduceMotion: true, xp: XP, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { chalk: 1 }, schema: 11 });
  await page.evaluate(() => window.__reseed());
  await openModeList(page); await page.evaluate(() => window.__reseed()); await clickMode(page, 'chalk');
  await page.waitForSelector('.chalkbox', { timeout: 9000 }); await page.waitForTimeout(700);
  if (PAUSE) await page.waitForTimeout(PAUSE);
  const s = await page.evaluate(() => { const b = document.querySelector('.chalkbox'), r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, sol: JSON.parse(b.dataset.solution) }; });
  /* what the drawing code will keep: a point only counts if it is 1.1 or more (in widths) from the last one it kept */
  const ar = s.h / s.w;
  let lostTail = 0, dropped = 0;
  for (const st of s.sol){
    let last = st[0];
    for (let i = 1; i < st.length; i++){ const d = Math.hypot(st[i][0] - last[0], (st[i][1] - last[1]) * ar); if (d >= 1.1) last = st[i]; else { dropped++; if (i === st.length - 1) lostTail = Math.max(lostTail, Math.hypot(st[i][0] - last[0], (st[i][1] - last[1]) * ar)); } }
  }
  const jit = () => (jitter ? (Math.random() * 2 - 1) * jitter : 0);
  for (const st of s.sol){
    const pts = st.map(p => [s.x + p[0] / 100 * s.w + jit(), s.y + p[1] / 100 * s.h + jit()]);
    await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
    for (const q of pts.slice(1)) await page.mouse.move(q[0], q[1]);
    await page.mouse.up();
  }
  const info = await page.evaluate(() => ({ lines: document.querySelectorAll('.chalkbox .cline').length, ink: document.querySelector('.cink') ? document.querySelector('.cink').getBoundingClientRect().width / document.querySelector('.chalkbox').getBoundingClientRect().width : 0 }));
  let peek = '';
  if (process.env.PEEK){
    await page.locator('.ctool').nth(1).click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(250);
    peek = await page.evaluate(() => { const b = document.querySelector('.chalkbox'); return b.classList.contains('peekwin') ? 'peek-win' : b.classList.contains('peeklose') ? 'peek-lose' : 'peek-none'; });
  }
  await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
  const out = await page.waitForFunction(() => document.querySelector('.cbasket.caught') ? 'win' : (document.querySelector('.cball.lost') ? (document.querySelector('.cball.snipped') ? 'snip' : 'miss') : false), null, { timeout: 14000, polling: 40 }).then(h => h.jsonValue()).catch(() => 'none');
  await ctx.close();
  return { out, peek, strokes: s.sol.length, drawn: info.lines, ink: Math.round(info.ink * 100), lostTail: +lostTail.toFixed(2), dropped };
};

const tally = {};
if (JIT){
  const tries = Number(process.env.TRIES || 4); let n = 0, wins = 0, fragile = [];
  for (let seed = lo; seed <= to; seed++){
    let w = 0; for (let k = 0; k < tries; k++){ const r = await play(seed, JIT); n++; if (r.out === 'win'){ wins++; w++; } }
    if (w < tries) fragile.push(seed + ':' + w + '/' + tries);
  }
  console.log(`seeds ${lo}-${to}, every point up to ${JIT}px off, ${tries} tries each: ${wins}/${n} won; fragile boards (${fragile.length}): ${fragile.join(' ')}`);
} else {
  const misses = [];
  for (let seed = lo; seed <= to; seed++){
    const r = await play(seed, 0);
    tally[r.out] = (tally[r.out] || 0) + 1;
    const tag = r.lostTail > 0 ? 'tail' : r.dropped ? 'inner' : 'clean'; tally[tag + ':' + r.out] = (tally[tag + ':' + r.out] || 0) + 1;
    if (r.out !== 'win'){ misses.push(seed); console.log(`seed ${seed}: ${r.out} ${r.peek} (${r.strokes} strokes, ${r.drawn} drawn, ${r.ink}% chalk left, last point dropped by ${r.lostTail}, ${r.dropped} points dropped)`); }
  }
  console.log(`seeds ${lo}-${to} at xp ${XP}:`, JSON.stringify(tally), misses.length ? 'misses: ' + misses.join(',') : '');
}
await browser.close();
