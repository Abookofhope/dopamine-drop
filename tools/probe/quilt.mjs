/* The Quilt and the milestones (v0.151.0).
 *
 * One patch per game in the Room: dashed when never played, knitted in the family colour once played, rows of
 * stitch for its stars, a border for its rank, a gold glow for the Gold Thread (Lion, and Purrfect half the time over
 * its last twenty solves). A patch opens its game's card with Marathon and Practise. A change is stitched in when
 * the quilt is next looked at. Milestones (100 solves and up) add things to the Room's own picture, for good.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/quilt.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, modeIdsFromBuild } from './harness.mjs';
/* the number of games, read from the build: it grows (45 from v0.163.0) */
const GAMES = modeIdsFromBuild(process.env.SITE || '/tmp/pw/_site').length;

let bad = 0;
/* On a build without these features the page has none of their elements: say so as a failure rather than a stack trace. */
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

async function open(state){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, onboarded: true }, state));
  return { page, ctx };
}
const openQuilt = async page => {
  await goTab(page, 'Room');
  await page.evaluate(() => { const h = document.getElementById('accH_r-quilt'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); });
  await page.waitForTimeout(500);
};
/* 'odd' played with three Classic stars; 'order' played; everything else never met. A Lion with a Gold Thread on 'sum'. */
const lion = {}; ['blitz', 'fog', 'frenzy', 'iron'].forEach(tw => lion['sum:' + tw] = 3200);

/* ── 1. the quilt shows how each game has been played ── */
{
  const { page, ctx } = await open({ solved: 50, seen: { odd: 1, order: 1, sum: 1 }, marathon: { odd: 3300, sum: 3300 }, twist: lion,
    slog: { sum: '11111111111111001100' }, quiltSeen: {} });
  await openQuilt(page);
  const q = await page.evaluate(() => {
    const p = id => { const b = document.querySelector('#quiltGrid .qpatch[data-id="' + id + '"]'); if (!b) return null; const r = b.getBoundingClientRect();
      return { cls: b.className, stars: b.querySelectorAll('.qs i').length, label: b.getAttribute('aria-label'), w: r.width, h: r.height }; };
    return { n: document.querySelectorAll('#quiltGrid .qpatch').length, odd: p('odd'), order: p('order'), wheel: p('wheel'), sum: p('sum'), count: document.getElementById('quiltCount').textContent };
  });
  check(q.n === GAMES, `one patch for every game (${q.n} of ${GAMES})`);
  check(/tried/.test(q.odd.cls) && q.odd.stars === 3, `a game played with three stars is knitted with three rows (${q.odd.cls}, ${q.odd.stars})`);
  check(/tried/.test(q.order.cls) && q.order.stars === 0, 'a game played without stars is knitted plain');
  check(!/tried/.test(q.wheel.cls) && /not played/i.test(q.wheel.label), `a game never played is an outline, and says so ("${q.wheel.label}")`);
  check(/gold/.test(q.sum.cls) && /r5/.test(q.sum.cls), `a Lion solved Purrfect 14 times in 20 has the Gold Thread (${q.sum.cls})`);
  check(q.count === '3/' + GAMES, `the panel counts the patches knitted (${q.count})`);
  check(q.odd.w >= 44 && q.odd.h >= 44, `each patch is a full-size target (${Math.round(q.odd.w)}x${Math.round(q.odd.h)})`);
  /* a patch opens its game */
  await page.evaluate(() => document.querySelector('#quiltGrid .qpatch[data-id="odd"]').click());
  await page.waitForTimeout(300);
  const sheet = await page.evaluate(() => { const s = document.querySelector('.metasheet'); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
  check(/Odd Skein/.test(sheet) && /3 of 3/.test(sheet) && /Marathon/.test(sheet) && /Practise/.test(sheet), `a patch opens its game's card ("${sheet.slice(0, 120)}")`);
  await page.evaluate(() => [...document.querySelectorAll('.metasheet button')].find(b => /Practise/.test(b.textContent)).click());
  await page.waitForTimeout(600);
  const run = await page.evaluate(() => ({ play: !document.getElementById('play').hidden, mode: document.getElementById('play').dataset.mode || '' }));
  check(run.play, 'and Practise starts that game');
  /* the room's picture has the small quilt on its wall: 3 knitted patches and 41 outlines */
  await page.evaluate(() => { const q = document.getElementById('quitBtn'); if (q) q.click(); });
  await page.waitForTimeout(500);
  await goTab(page, 'Room');
  const mini = await page.evaluate(() => {
    const svg = document.querySelector('#roomScene svg.roomsvg');
    return { dashed: svg.querySelectorAll('rect[stroke-dasharray]').length };
  });
  check(mini.dashed >= 40, `the Room's picture has the quilt on the wall (${mini.dashed} outlines)`);
  await ctx.close();
}

/* ── 2. a new stitch is shown when the quilt is next looked at ── */
{
  /* the quilt was last seen with 'odd' unplayed */
  const seen = {}; ['odd'].forEach(id => seen[id] = '0000');
  const { page, ctx } = await open({ solved: 50, seen: { odd: 1 }, marathon: { odd: 700 }, quiltSeen: seen });
  await openQuilt(page);
  const st = await page.waitForFunction(() => { const b = document.querySelector('#quiltGrid .qpatch[data-id="odd"]'); return b && b.classList.contains('stitched'); },
    null, { timeout: 3000, polling: 50 }).then(() => true, () => false);
  check(st, 'a patch that changed since it was last seen is stitched in');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).quiltSeen.odd);
  check(after && after !== '0000', `and it is remembered as seen (${after})`);
  await ctx.close();
}

/* ── 3. milestones change the room, and say so ── */
{
  const { page, ctx } = await open({ solved: 1200, miles: {} });
  const miles = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('dd.v1')).miles || {}).sort().join(','));
  check(/s100/.test(miles) && /s500/.test(miles) && /s1000/.test(miles) && !/s2500/.test(miles), `1,200 solves reach the first three milestones (${miles})`);
  await goTab(page, 'Room');
  const scene = await page.evaluate(() => document.querySelector('#roomScene svg.roomsvg').innerHTML);
  check(/r="3.4"/.test(scene), 'the pom-pom garland hangs in the window');
  check(/fill="#B5543F"/.test(scene), 'the music box is on the sill');
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
