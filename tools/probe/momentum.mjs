/* A run has a shape: the screen warms with the streak, and every tenth solve is
 * a stage.
 *
 * Getting to x5 means winning sixteen rounds in a row, which no probe can do
 * blind across forty-two modes. So this deals a Mixtape of exactly two modes it
 * CAN read: Odd Skein (the tile whose colour appears once) and Dye Trap (the
 * swatch matching the word's ink, or the word's name when the round is
 * reversed). Then it plays them, properly, sixteen times.
 *
 * What it holds:
 *   - --heat on the play screen follows the multiplier: 0.25 / 0.5 / 0.75 / 1
 *   - the glow behind the board and the rim on it are actually drawn from it
 *   - the tenth solve is called out as a stage and pays its bonus
 *   - a miss cools it back to nothing
 *
 * Motion is ON, because the transitions are part of what is being checked.
 *
 *   node tools/probe/momentum.mjs
 */
import { chromium } from 'playwright';
import { openApp, openMyStuff } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await openApp(page, {
  reduceMotion: false, xp: 9000, lastMode: null,
  tapes: [{ id: 'tbot', name: 'Bot', modes: ['odd', 'stroop'] }], tapeId: 'tbot', mix: ['odd', 'stroop'],
});

/* Play one round. wrong=true deliberately picks a losing answer. Returns which
   mode it recognised, or a reason it could not. */
const play = (wrong = false) => page.evaluate(w => {
  const surf = document.getElementById('surface');
  const swatches = [...surf.querySelectorAll('.swatch:not([disabled])')];
  if (swatches.length){
    const word = surf.querySelector('.stroopword.ul') || surf.querySelector('.stroopword');
    if (!word) return 'dye: no word';
    const reversed = !!surf.querySelector('.stroopwrap.reversed') || /name of the underlined/i.test((document.querySelector('.prompt') || {}).textContent || '');
    const ink = getComputedStyle(word).color;
    const name = word.textContent.trim().toLowerCase();
    const right = swatches.find(b => reversed
      ? (b.getAttribute('aria-label') || '').toLowerCase() === name
      : (b.dataset.hex ? 'rgb(' + [1, 3, 5].map(i => parseInt(b.dataset.hex.slice(i, i + 2), 16)).join(', ') + ')' : getComputedStyle(b).backgroundColor) === ink);
    if (!right) return 'dye: could not find the answer';
    const pick = w ? swatches.find(b => b !== right) : right;
    window.__last = swatches[0]; pick.click(); return 'dye';
  }
  const tiles = [...surf.querySelectorAll('.grid button:not([disabled])')];
  if (tiles.length){
    const col = b => getComputedStyle(b).backgroundColor;
    const seen = new Map(); tiles.forEach(b => seen.set(col(b), (seen.get(col(b)) || 0) + 1));
    const lum = c => { const m = c.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const asked = (document.querySelector('.prompt') || {}).textContent || '';
    const extreme = cmp => tiles.reduce((a, b) => cmp(lum(col(b)), lum(col(a))) ? b : a);
    const odd = /lightest|plus claire|más claro|hellste/i.test(asked) ? extreme((x, y) => x > y)
      : /darkest|plus foncée|más oscuro|dunkelste/i.test(asked) ? extreme((x, y) => x < y) : tiles.find(b => seen.get(col(b)) === 1);
    if (!odd) return 'odd: no unique tile';
    const pick = w ? tiles.find(b => b !== odd) : odd;
    window.__last = tiles[0]; pick.click(); return 'odd';
  }
  return 'no board';
}, wrong);

const nextBoard = () => page.waitForFunction(() => {
  const n = document.querySelector('#surface .swatch:not([disabled]), #surface .grid button:not([disabled])');
  return n && n !== window.__last;
}, null, { timeout: 9000, polling: 40 });

const heat = () => page.evaluate(() =>
  document.getElementById('play').style.getPropertyValue('--heat').trim());
const streakText = () => page.evaluate(() => document.getElementById('hudStreak').textContent.trim());
const score = () => page.evaluate(() =>
  parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, ''), 10) || 0);
const rim = () => page.evaluate(() => getComputedStyle(document.getElementById('surface')).boxShadow);

await openMyStuff(page);
await page.waitForTimeout(300);
await page.click('#mixBtn');
await page.waitForTimeout(1900);
await page.waitForFunction(() => document.querySelector('#surface .swatch, #surface .grid button'),
  null, { timeout: 9000 });

const cold = { heat: await heat(), rim: await rim() };
check(cold.heat === '0' || cold.heat === '', `a new run starts cold (--heat "${cold.heat}")`);

const want = { 4: ['0.25', '×2'], 8: ['0.5', '×3'], 12: ['0.75', '×4'], 16: ['1', '×5'] };
let solved = 0, stopped = null, stageSeen = false, stageDelta = null;
/* Win ONE ROUND. Both of these modes are staged: a round is several answers,
   shown as the pips under the board, and only the last one scores. Counting
   every correct tap as a win (which this did at first) reports sixteen wins
   while the app has recorded five, and the multiplier looks broken. So: answer,
   and if the score has not moved the round is not over — wait for the next
   stage's board and answer again. */
const winRound = async () => {
  const s0 = await score();
  for (let k = 0; k < 6; k++){
    const what = await play();
    if (!/^(odd|dye)$/.test(what)) return what;
    await page.waitForTimeout(160);
    if (await score() > s0) return 'won';
    try { await nextBoard(); } catch { return 'stage never advanced'; }
  }
  return 'round never finished';
};

for (let i = 1; i <= 16 && !stopped; i++){
  const before = await score();
  const what = await winRound();
  if (what !== 'won'){ stopped = `round ${i}: ${what}`; break; }
  solved = i;
  await page.waitForTimeout(140);
  if (i === 10){
    /* the stage banner and its bonus land in the same moment as the solve */
    const after = await score();
    stageDelta = after - before;
    /* textContent, not innerText: the eyebrow is styled uppercase and innerText
       returns what CSS renders, so it would read "STAGE 1". */
    stageSeen = await page.evaluate(() => {
      const h = document.getElementById('achToast');
      return !h.hidden && /Stage 1\b/i.test(h.querySelector('em').textContent);
    });
  }
  if (i === 10){
    /* A stage beat now also offers three charms and the run waits for an answer. The bot takes the
       nap (yarn instead), which is the one answer that changes nothing about the run: a charm
       such as the Bell Collar moves the streak rungs, and these checks are about the rungs. */
    await page.waitForSelector('.draftbox .dfskip', { timeout: 4000 }).catch(() => {});
    if (await page.$('.draftbox .dfskip')) await page.click('.draftbox .dfskip');
  }
  if (want[i]){
    const [h, m] = want[i];
    const gotH = await heat(), gotM = await streakText();
    check(gotH === h && gotM === m, `after ${i} solves the streak is ${gotM} and --heat is ${gotH} (want ${m}, ${h})`);
  }
  if (i < 16){
    try { await nextBoard(); } catch { stopped = `round ${i}: the next board never appeared`; }
  }
}
if (stopped) check(false, `the bot played sixteen rounds (${stopped})`);
else check(solved === 16, 'the bot won sixteen rounds in a row');

check(stageSeen, 'the tenth solve is announced as Stage 1');
check(stageDelta !== null && stageDelta >= 250 + 100,
  `and pays a stage bonus on top of the solve (score moved ${stageDelta})`);

/* At x5 the room is drawn from --heat: give the transitions time to land. */
await page.waitForTimeout(800);
const hot = await page.evaluate(() => {
  const p = document.getElementById('play');
  const b = getComputedStyle(p, '::before');
  return { op: parseFloat(b.opacity), ratio: parseFloat(b.height) / p.getBoundingClientRect().height };
});
console.log(`   glow at x5: opacity ${hot.op.toFixed(3)}, reaches ${(hot.ratio * 100).toFixed(1)}% of the screen`);
check(Math.abs(hot.op - 0.5) < 0.02, 'the glow behind the board is at full strength (0.5)');
check(Math.abs(hot.ratio - 0.70) < 0.02, 'and reaches 70% of the way down, up from 44%');
const hotRim = await rim();
check(hotRim !== cold.rim, 'the board has picked up a rim it did not have at x1');
await page.screenshot({ path: '/tmp/pw/shots/momentum-hot.png' });

/* One wrong answer cools everything. */
/* Odd Skein and Dye Trap give paws now, so one wrong answer is not the end of a round: answer wrongly once for every paw shown. */
const lose = async () => {
  const n = Math.max(1, await page.evaluate(() => document.querySelectorAll('.budget.paws i, .oddpips i').length));
  let last; for (let k = 0; k < n; k++){ last = await play(true); await page.waitForTimeout(150); }
  return last;
};
const missed = await lose();
await page.waitForTimeout(700);
const cool = await heat();
check(/^(odd|dye)$/.test(missed) && (cool === '0'), `losing a round cools it back to nothing (--heat "${cool}")`);

if (errs.length){ bad++; console.log('PAGE ERRORS', errs.slice(0, 3)); }
await browser.close();
console.log(bad ? `\n${bad} momentum problem(s)` : '\nthe run has a shape');
process.exit(bad ? 1 : 0);
