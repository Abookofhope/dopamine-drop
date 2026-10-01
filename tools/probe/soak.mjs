/* Play the shuffle badly for a few minutes, and see what leaks between modes.
 *
 * Every other probe opens one mode, in a clean page, and closes it. A shuffle
 * does not: it builds a board, tears it down, builds another kind of board on
 * the same surface, and does that for ten minutes. What breaks there is what a
 * single-mode test cannot reach: a timer a mode armed and never cancelled that
 * fires into the next mode, a class left on the surface, a listener still
 * attached, a board built for a round that has already ended.
 *
 * This runs Just Play with a random player and motion ON, and reports:
 *   - any page error or console error, with the mode that was on screen
 *   - a HANG (the page stops answering)
 *   - a BLANK board: a live round with nothing on the surface for two seconds
 *   - the play area changing shape under a board that is still up
 *   - which modes it actually visited, so a clean run cannot be an empty one
 *
 *   node tools/probe/soak.mjs                   240 seconds
 *   SECONDS=600 node tools/probe/soak.mjs       the whole ten minutes
 *   SEED=7 node tools/probe/soak.mjs            a different shuffle (and different taps)
 */
import { chromium } from 'playwright';
import { openApp, touchTargets } from './harness.mjs';

const SECONDS = +(process.env.SECONDS || 240);
let seed = +(process.env.SEED || 20260930);
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
const problems = [];
let current = '(start)';
page.on('pageerror', e => problems.push(`page error in ${current}: ${String(e).slice(0, 110)}`));
page.on('console', m => { if (m.type() === 'error') problems.push(`console error in ${current}: ${m.text().slice(0, 110)}`); });
/* Seeded, so a bad shuffle can be replayed: the deal comes from Math.random. */
await page.addInitScript(sd => {
  let a = (sd * 0x9E3779B1) | 0;
  Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}, seed);

await openApp(page, { reduceMotion: false, sound: false, haptics: false, onboarded: true,
  xp: 30000, solved: 900, runs: 60, lastMode: 'forge', seen: {} });
await page.click('#justPlayBtn');

const alive = () => Promise.race([page.evaluate(() => 1).then(() => true, () => false), new Promise(r => setTimeout(() => r(false), 4000))]);
const visited = new Map();
let taps = 0, blankSince = null, lastBoard = null, restarts = 0, stuckSince = null, abandoned = 0;
const t0 = Date.now();

while (Date.now() - t0 < SECONDS * 1000){
  if (!(await alive())){ problems.push(`HANG in ${current}`); break; }
  const st = await page.evaluate(() => {
    const over = !document.getElementById('over').hidden, play = !document.getElementById('play').hidden;
    const s = document.getElementById('surface'), r = s.getBoundingClientRect();
    const board = [...s.children].find(c => c.id !== 'count' && !c.classList.contains('swap'));
    const kind = document.getElementById('hudKind');
    return { over, play, hasBoard: !!board, kind: kind ? kind.textContent.trim() : '', top: Math.round(r.top), h: Math.round(r.height),
             boardId: board ? (board.__soakId || (board.__soakId = (window.__sid = (window.__sid || 0) + 1))) : null };
  });
  if (st.over){
    /* The run ended (ten minutes, or the clock): start another so the soak goes on. */
    restarts++;
    await page.evaluate(() => { const a = document.getElementById('againBtn'); if (a) a.click(); });
    await page.waitForTimeout(700); continue;
  }
  if (!st.play){ await page.evaluate(() => { const b = document.getElementById('justPlayBtn'); if (b) b.click(); }); await page.waitForTimeout(700); continue; }
  if (st.kind){ current = st.kind; visited.set(st.kind, (visited.get(st.kind) || 0) + 1); }

  /* A live round with nothing on it for two seconds: between rounds is a plate
     and a breath of well under one. */
  if (!st.hasBoard){ blankSince = blankSince || Date.now();
    if (Date.now() - blankSince > 2500){ problems.push(`BLANK board for 2.5s in ${current}`); blankSince = Date.now() + 1e9; } }
  else blankSince = null;

  /* The play area must not change shape while the same board is up. */
  if (st.boardId && lastBoard && lastBoard.id === st.boardId && (lastBoard.top !== st.top || lastBoard.h !== st.h))
    problems.push(`play area moved under a live board in ${current}: top ${lastBoard.top}->${st.top}, height ${lastBoard.h}->${st.h}`);
  /* A random player cannot finish every mode (drag a bar, carry a bucket, find a balance) and Just Play has no way past a
     board you cannot solve, so one board can hold the whole soak. After fifteen seconds on the same one it is given up:
     quit from the middle of the round (which is a teardown worth testing in its own right) and start a fresh run. */
  if (st.boardId && lastBoard && lastBoard.id === st.boardId){
    stuckSince = stuckSince || Date.now();
    if (Date.now() - stuckSince > 15000){
      abandoned++; stuckSince = null;
      await page.evaluate(() => { const q = document.getElementById('quitBtn'); if (q) q.click(); });
      await page.waitForTimeout(700);
      await page.evaluate(() => { const h = document.getElementById('homeBtn'); if (h) h.click(); });
      await page.waitForTimeout(700); continue;
    }
  } else stuckSince = null;
  lastBoard = st.boardId ? { id: st.boardId, top: st.top, h: st.h } : null;

  const box = await (await page.$('#surface')).boundingBox().catch(() => null);
  if (box){
    /* Mostly real controls: random pixels almost never finish or fail a round, and a
       soak that never leaves the first board has soaked nothing. */
    const list = await touchTargets(page).catch(() => []);
    const tg = list.length && rnd() < 0.85 ? list[Math.floor(rnd() * list.length)] : null;
    const x = tg ? tg.x : box.x + 8 + rnd() * (box.width - 16), y = tg ? tg.y : box.y + 8 + rnd() * (box.height - 16);
    if (rnd() < 0.3){
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + (rnd() - .5) * 200, y + (rnd() - .5) * 200, { steps: 5 }); await page.mouse.up();
    } else await page.mouse.click(x, y);
    taps++;
  }
  await page.waitForTimeout(120 + rnd() * 380);
}
await browser.close();

const uniq = [...new Set(problems)];
console.log(`soaked ${Math.round((Date.now() - t0) / 1000)}s: ${taps} touches, ${restarts} run restarts, ${abandoned} boards given up on, ${visited.size} different modes on screen`);
console.log('modes seen: ' + [...visited.keys()].join(', '));
uniq.slice(0, 12).forEach(p => console.log('  ! ' + p));
if (visited.size < 8) { console.log('too few modes visited for a soak to mean anything'); process.exit(1); }
console.log(uniq.length ? `\n${uniq.length} problem(s)` : '\nnothing leaked between modes');
process.exit(uniq.length ? 1 : 0);
