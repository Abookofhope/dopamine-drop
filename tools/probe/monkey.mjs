/* Play every mode badly, with motion on, and see what breaks.
 *
 * The sweep opens each mode and looks at it. Nothing else plays them: so the
 * code that runs when a round is WON or MISSED — score pops, spark bursts,
 * floating points, the shake, the board's entrance, the streak snap, the
 * results screen — has been outside every probe, and the shared harness's
 * reduceMotion default keeps most of it from even being switched on.
 *
 * This taps and drags at random inside the board for several seconds per mode,
 * with motion ON, and reports:
 *   - an uncaught page error or a console error
 *   - a HANG: the page no longer answers a trivial evaluate within 4 seconds,
 *     which is what a generator stuck in a while-loop looks like from outside
 *   - an end state that is neither a live board, the results screen nor the menu
 *   - the play area changing size or place under a board that is still the same
 *     board (a prompt that wraps to a second line does this, and nothing else
 *     notices: the board is fine at every moment it is looked at, and it moved)
 *
 *   node tools/probe/monkey.mjs               a mid-game save
 *   MAX=1 node tools/probe/monkey.mjs         maximum difficulty, where the
 *                                             generators are pushed hardest
 *   ONLY=odd,forge node tools/probe/monkey.mjs
 *   SEED=123 TAPS=30 node tools/probe/monkey.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, modeIdsFromBuild, floorOrDie } from './harness.mjs';

const MAX = !!process.env.MAX;
const PROF = MAX ? { xp: 900000, solved: 40000, runs: 900 } : { xp: 20000, solved: 600, runs: 40 };
const ids = process.env.ONLY ? process.env.ONLY.split(',')
  : modeIdsFromBuild(process.env.SITE || '/tmp/pw/_site');
const TAPS = +(process.env.TAPS || 16);

/* Seeded, so a failure can be replayed with the same taps. */
let seed = +(process.env.SEED || 20260929);
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const browser = await chromium.launch();
let errs = [];
const makePage = async () => {
  const p = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  p.on('pageerror', e => errs.push('page error: ' + String(e).split('\n')[0].slice(0, 110)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 110)); });
  return p;
};
let page = await makePage();

const alive = () => Promise.race([
  page.evaluate(() => 1).then(() => true, () => false),
  new Promise(r => setTimeout(() => r(false), 4000)),
]);

/* The board is tagged when it is dealt and every tap is measured against it, so a
   round that ends and is dealt again is not mistaken for the board moving. */
const tagBoard = () => page.evaluate(() => { document.querySelectorAll('[data-lsb]').forEach(e => e.removeAttribute('data-lsb'));
  const b = [...document.getElementById('surface').children].find(c => c.id !== 'count' && !c.classList.contains('swap'));
  if (b) b.setAttribute('data-lsb', '1'); return !!b; }).catch(() => false);
const rectOfBoard = () => page.evaluate(() => { const b = document.querySelector('[data-lsb]'); if (!b || !b.isConnected) return null;
  const r = document.getElementById('surface').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }).catch(() => null);

const results = [];
for (const id of ids){
  errs = [];
  let note = '', won = false, lost = false, ended = false;
  const moved = [];
  try {
    await openApp(page, Object.assign({ reduceMotion: false, sound: false, haptics: false }, PROF));
    await openModeList(page);
    await clickMode(page, id);
    await page.waitForFunction(() => [...document.getElementById('surface').children]
      .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 60 })
      .catch(() => { note = 'the board never appeared'; });

    await page.waitForTimeout(1300);          // let the board's own entrance and the how-to line settle
    await tagBoard();
    for (let i = 0; i < TAPS && !note; i++){
      if (!(await alive())){ note = 'HANG: the page stopped answering'; break; }
      const before = await rectOfBoard();
      const box = await (await page.$('#surface')).boundingBox().catch(() => null);
      if (!box) break;
      const x = box.x + 8 + rnd() * (box.width - 16), y = box.y + 8 + rnd() * (box.height - 16);
      if (rnd() < 0.3){
        await page.mouse.move(x, y); await page.mouse.down();
        await page.mouse.move(x + (rnd() - .5) * 180, y + (rnd() - .5) * 180, { steps: 5 });
        await page.mouse.up();
      } else {
        await page.mouse.click(x, y);
      }
      await page.waitForTimeout(140 + rnd() * 330);
      const after = await rectOfBoard();
      if (before && after && (before[0] !== after[0] || before[1] !== after[1])) moved.push(`${before.join('/')} -> ${after.join('/')}`);
      if (!after) await tagBoard();          // a new round: measure that one from here
      /* Did anything actually resolve? A monkey whose taps never win or lose a
         round exercises none of the code it exists to exercise, and would pass
         every time. */
      const s = await page.evaluate(() => {
        const p = document.querySelector('.prompt');
        return { p: p ? p.className : '', over: !document.getElementById('over').hidden };
      }).catch(() => null);
      if (s){ if (/\bwon\b/.test(s.p)) won = true; if (/\blost\b/.test(s.p)) lost = true; if (s.over) ended = true; }
    }
    if (!note && !(await alive())) note = 'HANG: the page stopped answering';
    if (!note){
      const state = await page.evaluate(() => ({
        play: !document.getElementById('play').hidden,
        over: !document.getElementById('over').hidden,
        home: !!document.getElementById('justPlayBtn') && document.getElementById('justPlayBtn').offsetParent !== null,
      }));
      if (!state.play && !state.over && !state.home) note = 'ended in no known screen ' + JSON.stringify(state);
    }
  } catch (e){ note = 'probe error: ' + String(e.message).split('\n')[0].slice(0, 90); }

  const problems = [...new Set(errs)].slice(0, 2);
  if (moved.length) problems.push(`the board moved under a live round (top/height): ${moved.slice(0, 2).join('; ')}`);
  results.push({ id, note, problems, won, lost, ended });
  console.log(`${note || problems.length ? 'FAIL' : 'ok  '} ${id.padEnd(9)}`
    + ` ${won ? 'W' : '-'}${lost ? 'L' : '-'}${ended ? 'E' : '-'}`
    + `${note ? ' ' + note : ''}${problems.length ? ' | ' + problems.join(' | ') : ''}`);

  /* A hung page cannot be reused, and one hung mode must not hide the rest. */
  if (note.startsWith('HANG')){
    await Promise.race([page.close().catch(() => {}), new Promise(r => setTimeout(r, 3000))]);
    page = await makePage();
  }
}
/* Random taps win a round only now and then (none at all in some runs), and the claim below is that the
   shell's win path ran with motion on and threw nothing. That claim should not depend on luck, so if the
   monkey did not win by itself one round of Odd Skein is won on purpose, by reading which tile is the odd
   one out, with motion on and error capture running. It is counted separately and said aloud. */
let scriptedWin = false;
if (!results.some(r => r.won) && ids.includes('odd')){
  errs = [];
  try {
    await openApp(page, Object.assign({ reduceMotion: false, sound: false, haptics: false }, PROF));
    await openModeList(page); await clickMode(page, 'odd');
    await page.waitForFunction(() => document.querySelector('#surface .grid button:not([disabled])'), null, { timeout: 9000, polling: 60 });
    await page.waitForTimeout(1500);
    for (let k = 0; k < 8 && !scriptedWin; k++){
      const did = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('#surface .grid button:not([disabled])')];
        const col = b => getComputedStyle(b).backgroundColor, seen = new Map();
        tiles.forEach(b => seen.set(col(b), (seen.get(col(b)) || 0) + 1));
        const lum = c => { const m = c.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const asked = (document.querySelector('.prompt') || {}).textContent || '';
    const extreme = cmp => tiles.reduce((a, b) => cmp(lum(col(b)), lum(col(a))) ? b : a);
    const odd = /lightest|plus claire|más claro|hellste/i.test(asked) ? extreme((x, y) => x > y)
      : /darkest|plus foncée|más oscuro|dunkelste/i.test(asked) ? extreme((x, y) => x < y) : tiles.find(b => seen.get(col(b)) === 1); if (!odd) return false;
        window.__lastTile = tiles[0]; odd.click(); return true;
      });
      if (!did) break;
      await page.waitForTimeout(260);
      scriptedWin = await page.evaluate(() => { const p = document.querySelector('.prompt'); return !!p && /\bwon\b/.test(p.className); });
      if (!scriptedWin) await page.waitForTimeout(500);
    }
  } catch (e){ errs.push('scripted win: ' + String(e.message).split('\n')[0].slice(0, 90)); }
  if (errs.length) results.push({ id: 'odd (scripted win)', note: '', problems: [...new Set(errs)].slice(0, 2), won: false, lost: false, ended: false });
  else if (scriptedWin) results.push({ id: 'odd (scripted win)', note: '', problems: [], won: true, lost: false, ended: false, scripted: true });
  console.log(`${errs.length ? 'FAIL' : scriptedWin ? 'ok  ' : 'note'} odd (scripted win)  the monkey won nothing by itself, so a round was won on purpose: ${scriptedWin ? 'won, with motion on' : 'the round was not won'}`);
}
await browser.close();
floorOrDie('monkey', results.length, Math.min(40, ids.length));
const failed = results.filter(r => r.note || r.problems.length);
const modeCount = results.filter(r => !r.scripted && r.id !== 'odd (scripted win)').length;
const wins = results.filter(r => r.won && !r.scripted).length + (scriptedWin ? 1 : 0), losses = results.filter(r => r.lost).length;
const finished = results.filter(r => r.ended).length;
console.log(`\n${modeCount - failed.filter(r => r.id !== 'odd (scripted win)').length}/${modeCount} modes survived ${TAPS} random taps and drags`
  + `${MAX ? ' at maximum difficulty' : ''}, motion on`);
console.log(`reached: a WIN in ${wins} modes${scriptedWin ? ' (scripted: the monkey won none itself)' : ''}, a MISS in ${losses}, the results screen in ${finished}`);
/* What a clean run can honestly claim depends on what it reached, so the counts
   above are the point and the floors below only guard the minimum. Random taps
   resolve a round in a minority of modes (most are multi-step puzzles a monkey
   will not finish), so this does NOT show that each mode's win path is sound.
   It shows two narrower things: no mode crashes or hangs under random input, and
   the SHELL's win, miss and end-of-run paths (score pop, bursts, floating points,
   shake, the streak snap, the results screen) ran with motion on and threw
   nothing. The floors are exactly that: at least one of each. An earlier version
   demanded 8 wins and 25 misses, numbers guessed before seeing any data, and
   failed a clean run for it. */
console.log(`modes where a round actually resolved: ${results.filter(r => (r.won || r.lost) && !r.scripted).length} of ${modeCount}`);
if (ids.length >= 40 && (wins < 1 || losses < 1 || finished < 1)){
  console.log('the monkey never reached a win, a miss and the results screen: it is not testing the shell. Raise TAPS.');
  process.exit(1);
}
process.exit(failed.length ? 1 : 0);
