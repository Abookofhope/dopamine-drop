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

const results = [];
for (const id of ids){
  errs = [];
  let note = '', won = false, lost = false, ended = false;
  try {
    await openApp(page, Object.assign({ reduceMotion: false, sound: false, haptics: false }, PROF));
    await openModeList(page);
    await clickMode(page, id);
    await page.waitForFunction(() => [...document.getElementById('surface').children]
      .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 60 })
      .catch(() => { note = 'the board never appeared'; });

    for (let i = 0; i < TAPS && !note; i++){
      if (!(await alive())){ note = 'HANG: the page stopped answering'; break; }
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
await browser.close();
floorOrDie('monkey', results.length, Math.min(40, ids.length));
const failed = results.filter(r => r.note || r.problems.length);
const wins = results.filter(r => r.won).length, losses = results.filter(r => r.lost).length;
const finished = results.filter(r => r.ended).length;
console.log(`\n${results.length - failed.length}/${results.length} modes survived ${TAPS} random taps and drags`
  + `${MAX ? ' at maximum difficulty' : ''}, motion on`);
console.log(`reached: a WIN in ${wins} modes, a MISS in ${losses}, the results screen in ${finished}`);
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
console.log(`modes where a round actually resolved: ${results.filter(r => r.won || r.lost).length} of ${results.length}`);
if (ids.length >= 40 && (wins < 1 || losses < 1 || finished < 1)){
  console.log('the monkey never reached a win, a miss and the results screen: it is not testing the shell. Raise TAPS.');
  process.exit(1);
}
process.exit(failed.length ? 1 : 0);
