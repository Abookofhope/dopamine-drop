/* The game keeps up with the player, and says so.
 *
 *   two misses in three rounds -> the next boards are a step easier, the rule is shown again, a
 *                                 note says so, and the pause sheet says where it stands
 *   three quick solves in a row -> a step harder
 *   Settings -> a switch turns it off, and then nothing moves
 *   a different puzzle -> the pause sheet deals a fresh board three times a run, not on a Daily
 *                         Drop or a single-mode run
 *
 * Runs are held on one board (Odd Skein) with a probe-only pool so a miss is something the script
 * does, not something it hopes for. Levels are read from the probe-only data-lvl on #play; the
 * easier/harder claims compare a run with the setting on against the same moves with it off.
 *
 *   node tools/probe/adapt.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, startShuffle, openPanels, goTab } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

/* Where to tap. Odd Skein asks for the odd one, the lightest or the darkest, in words the probe only
   reads in English, so a tile that can be none of the three is the safe wrong answer in any language. */
const oddAt = (page, wrong) => page.evaluate(wrong => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  const light = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  const dark = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1);
  const uniq = cols.findIndex(c => n[key(c)] === 1);
  let pick = /lightest/i.test(prompt) ? light : /darkest/i.test(prompt) ? dark : uniq;
  if (wrong){ pick = tiles.findIndex((t, i) => !t.disabled && i !== light && i !== dark && i !== uniq); }
  if (pick < 0) return null;
  const r = tiles[pick].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, wrong);

/* A fresh page, a probe-only pool, a Shuffle run started and its first board up. */
async function open(state, { pool = 'odd', vw = 360, vh = 640, lang = 'en' } = {}){
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(p => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', p); }, pool);
  await openApp(page, Object.assign({ xp: 4000, runs: 12, solved: 80, seen: { odd: 1, order: 1 }, schema: 11,
    sound: false, haptics: false, reduceMotion: true, lang }, state));
  return page;
}
const boardUp = async page => {
  await page.waitForFunction(() => { const t = document.querySelector('#surface .oddwrap .tile'); return t && !t.dataset.old && !t.disabled; },
    null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(150);
};
const mark = page => page.evaluate(() => document.querySelectorAll('#surface .oddwrap .tile').forEach(t => { t.dataset.old = '1'; }));
const read = page => page.evaluate(() => {
  const p = document.getElementById('play'), n = document.getElementById('adaptNote'), h = document.getElementById('howto');
  const vis = e => !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  return { lvl: +p.dataset.lvl, nudge: p.dataset.nudge === undefined ? NaN : +p.dataset.nudge, mode: p.dataset.mode || '',
    note: vis(n) ? n.textContent.trim() : '', howto: vis(h) && !h.classList.contains('gone') ? h.textContent.trim() : '' };
});

const doneCount = page => page.evaluate(() => +document.getElementById('play').dataset.done || 0);

/* One round, played to its end. Odd Skein is three boards a round and forgives a first wrong tap, so
   "a solve" is three taps and "a miss" is wrong taps until it gives up on you. */
async function playRound(page, step){
  const before = await doneCount(page);
  for (let i = 0; i < 12; i++){
    if (step === 'hit'){ await boardUp(page); await mark(page); }
    else await page.waitForFunction(() => [...document.querySelectorAll('#surface .oddwrap .tile')].some(t => !t.disabled), null, { timeout: 8000, polling: 100 });
    const at = await oddAt(page, step === 'miss');
    if (!at) return;
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(260);
    if (await doneCount(page) > before) return;
  }
}

/* Play a list of 'hit' / 'miss' rounds and return what the board looked like at the start of each,
   plus the first board after the last. */
async function drive(page, plan){
  await startShuffle(page);
  const seen = [];
  for (const step of plan){
    await boardUp(page);
    seen.push(await read(page));
    await playRound(page, step);
  }
  await boardUp(page);
  seen.push(await read(page));
  return seen;
}

/* ── 1. the setting exists ─────────────────────────────────────────────────────────────────── */
{
  const page = await open({});
  await goTab(page, 'Settings');
  await openPanels(page, 'access');
  const sw = await page.evaluate(() => {
    const s = document.getElementById('swAdapt'); if (!s) return null;
    const row = s.closest('.setrow').getBoundingClientRect();
    return { on: s.getAttribute('aria-checked'), h: row.height, label: s.getAttribute('aria-label') };
  });
  check(!!sw, 'Settings has an Adaptive difficulty switch');
  if (sw){
    check(sw.on === 'true', 'it is on by default');
    check(sw.h >= 44, 'its row is at least 44px high (' + Math.round(sw.h) + ')');
    check(/adaptive/i.test(sw.label || ''), 'it has an accessible name (' + sw.label + ')');
  }
  await page.close();
}

if (bad){
  console.log('\nthis build has no adaptive difficulty setting: the rest of the probe is skipped');
  console.log(`\n${bad} check(s) FAILED`);
  await browser.close();
  process.exit(1);
}

/* ── 2. two misses: easier, the rule again, a note, a line on the pause sheet ───────────────── */
let easyOn, easyOff;
{
  const page = await open({});
  easyOn = await drive(page, ['hit', 'miss', 'miss']);
  const [a, b, c, d] = easyOn;
  check(a.nudge === 0 && b.nudge === 0, 'no change after one solve and one miss (nudge ' + a.nudge + ', ' + b.nudge + ')');
  check(c.nudge === 0 && !c.note, 'a single miss moves nothing and shows no note');
  check(d.nudge === -1, 'after two misses in three rounds the run is one step easier (nudge ' + d.nudge + ')');
  check(/easier/i.test(d.note), 'a note says so on the board that follows (' + JSON.stringify(d.note) + ')');
  check(d.howto.length > 10, 'and the rule is shown again, unasked (' + JSON.stringify(d.howto.slice(0, 40)) + ')');
  /* The pause sheet says where it stands. */
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pausebox', { timeout: 4000 });
  const line = await page.evaluate(() => { const n = document.querySelector('.pausebox .pausenudge'); return n ? n.textContent.trim() : ''; });
  check(/easier/i.test(line) && /1 of 3/.test(line), 'the pause sheet says where it stands (' + JSON.stringify(line) + ')');
  await page.close();
}
{
  const page = await open({ adaptive: false });
  easyOff = await drive(page, ['hit', 'miss', 'miss']);
  const d = easyOff[3];
  check(d.nudge === 0 && !d.note, 'with the switch off two misses move nothing and show no note (nudge ' + d.nudge + ')');
  await page.close();
}
check(Number.isFinite(easyOn[3].lvl) && Number.isFinite(easyOff[3].lvl) && easyOn[3].lvl < easyOff[3].lvl,
  'the easier board is built at a lower level than the same moves with it off (' + easyOn[3].lvl + ' < ' + easyOff[3].lvl + ')');

/* ── 3. three quick solves: harder ─────────────────────────────────────────────────────────── */
let hardOn, hardOff;
{
  const page = await open({});
  hardOn = await drive(page, ['hit', 'hit', 'hit']);
  const last = hardOn[3];
  check(hardOn[1].nudge === 0 && hardOn[2].nudge === 0, 'two quick solves are not enough');
  check(last.nudge === 1, 'three quick solves in a row make it one step harder (nudge ' + last.nudge + ')');
  check(/harder/i.test(last.note), 'a note says so (' + JSON.stringify(last.note) + ')');
  await page.close();
}
{
  const page = await open({ adaptive: false });
  hardOff = await drive(page, ['hit', 'hit', 'hit']);
  await page.close();
}
check(Number.isFinite(hardOn[3].lvl) && hardOn[3].lvl > hardOff[3].lvl,
  'the harder board is built at a higher level than the same moves with it off (' + hardOn[3].lvl + ' > ' + hardOff[3].lvl + ')');

/* ── 4. it never runs away ─────────────────────────────────────────────────────────────────── */
{
  const page = await open({ reduceMotion: true }, {});
  const plan = []; for (let i = 0; i < 12; i++) plan.push('miss');
  /* Shuffle's clock takes four seconds a miss, so the run may end first; what matters is the floor. */
  let seen = [];
  try { seen = await drive(page, plan); } catch (e) { /* the run ended; read what we have */ }
  const lowest = await page.evaluate(() => +document.getElementById('play').dataset.nudge);
  check(!Number.isNaN(lowest) && lowest >= -3, 'misses never take it below three steps easier (nudge ' + lowest + ')');
  await page.close();
}

/* ── 5. the note fits: smallest phone, biggest text ────────────────────────────────────────── */
{
  const page = await open({ textSize: '150' }, { vw: 320, vh: 568 });
  await startShuffle(page);
  await boardUp(page);
  for (let i = 0; i < 2; i++){
    await playRound(page, 'miss');
    await boardUp(page);
  }
  const g = await page.evaluate(() => {
    const r = id => { const e = document.getElementById(id) || document.querySelector(id); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
    const note = document.getElementById('adaptNote');
    return { note: note && !note.hidden ? r('adaptNote') : null, quit: r('quitBtn'), kind: r('hudKind'), top: r('.hudtop'), hud: r('.hud'), vw: innerWidth };
  });
  check(!!g.note, 'the note is up on the smallest phone at 150 percent text');
  if (g.note){
    check(g.note.r <= g.vw + 0.5 && g.note.l >= -0.5, 'it is inside the screen (' + Math.round(g.note.l) + '..' + Math.round(g.note.r) + ' of ' + g.vw + ')');
    check(g.note.l >= g.kind.r - 0.5, 'it does not sit on the mode label');
    check(g.hud.h < 70, 'it does not grow the HUD (' + Math.round(g.hud.h) + 'px)');
  }
  await page.close();
}

/* ── 6. a different puzzle ─────────────────────────────────────────────────────────────────── */
{
  const page = await open({}, { pool: 'odd,order' });
  await startShuffle(page);
  await page.waitForFunction(() => document.getElementById('play').dataset.round, null, { timeout: 12000, polling: 100 });
  await page.waitForTimeout(500);
  const labels = [];
  const modes = [];
  for (let i = 0; i < 4; i++){
    const before = await page.evaluate(() => document.getElementById('play').dataset.mode);
    await page.evaluate(() => document.getElementById('quitBtn').click());
    await page.waitForSelector('.pausebox', { timeout: 4000 });
    const info = await page.evaluate(() => { const b = document.querySelector('.pausebox .pauseSkip'); if (!b) return null;
      const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), disabled: b.disabled, h: r.height }; });
    labels.push(info ? info.text + (info.disabled ? ' [disabled]' : '') : null);
    if (i === 0 && info) check(info.h >= 44, 'the button is at least 44px high (' + Math.round(info.h) + ')');
    if (!info || info.disabled){ modes.push([before, before]); break; }
    await page.evaluate(() => document.querySelector('.pausebox .pauseSkip').click());
    await page.waitForFunction(b => { const d = document.getElementById('play').dataset; return d.mode && d.mode !== b; }, before, { timeout: 12000, polling: 100 });
    await page.waitForTimeout(500);
    modes.push([before, await page.evaluate(() => document.getElementById('play').dataset.mode)]);
  }
  check(labels[0] === 'Different puzzle (3 left)', 'the pause sheet offers three (' + labels[0] + ')');
  check(modes.slice(0, 3).every(([a, b]) => a !== b && a && b), 'each use deals a different puzzle (' + modes.map(m => m.join('>')).join(', ') + ')');
  check(/2 left/.test(labels[1] || '') && /1 left/.test(labels[2] || ''), 'the count goes down (' + labels.slice(0, 3).join(' / ') + ')');
  check(/none left/.test(labels[3] || '') && /disabled/.test(labels[3] || ''), 'the fourth is spent and disabled (' + labels[3] + ')');
  const nudged = await page.evaluate(() => document.getElementById('play').dataset.nudge);
  check(nudged === '0', 'skipping is not a miss: the difficulty has not moved (' + nudged + ')');
  await page.close();
}
for (const [what, open2] of [
  ['a single-game run', async page => { await openModeList(page); await clickMode(page, 'odd'); }],
  ['a Daily Drop', async page => { await page.evaluate(() => { const t = document.querySelector('.tab[data-tab="Play"]'); if (t) t.click(); }); await page.waitForTimeout(250); await page.evaluate(() => document.getElementById('dailyStatus').click()); }],
]){
  const page = await open({}, { pool: 'odd,order' });
  await open2(page);
  await page.waitForSelector('#play:not([hidden])', { timeout: 6000 });
  await page.waitForFunction(() => document.querySelector('#surface .tile, #surface button, #surface canvas, #surface > div:not(#count)'), null, { timeout: 12000, polling: 100 });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('quitBtn').click());
  const sheet = await page.waitForSelector('.pausebox', { timeout: 4000 }).then(() => true, () => false);
  const has = await page.evaluate(() => !!document.querySelector('.pausebox .pauseSkip'));
  check(sheet && !has, 'no Different puzzle on ' + what);
  await page.close();
}

/* ── 7. other languages carry it ───────────────────────────────────────────────────────────── */
for (const lang of ['fr', 'es', 'de']){
  const page = await open({}, { lang });
  const d = (await drive(page, ['miss', 'miss']))[2];
  check(d.nudge === -1 && d.note.length > 3 && !/easier/i.test(d.note), lang + ': the note is translated (' + JSON.stringify(d.note) + ')');
  await page.close();
}

check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed');
process.exit(bad ? 1 : 0);
