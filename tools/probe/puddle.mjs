/* Puddle Hop (v0.172.0): each stone says how far to hop; land on the basket.
 *
 * The probe reads each board off the screen (stone numbers, puddles, the basket, the cat's stone) and solves it with its
 * own search, so it checks the game's promises from outside:
 *   1. Every board can be done within the hops given, at a beginner's level, the middle and the top: the probe's own
 *      shortest route fits, playing it by tapping wins, and the game counts each board done in exactly its shortest route.
 *   2. Exactly the stones the cat can reach light up (the number on its stone away, straight, dry, on the board); a tap on
 *      any other cell does nothing and costs nothing.
 *   3. Hopping back and forth away from the basket runs the hops out and loses the round.
 *   4. A hop to a dead end (no way on, by the probe's own search) gets the round ended with a message.
 *   5. The Hint lights the first stone of a shortest way; there are two a round.
 *   6. The reachable stones are buttons named for where they are, reached with Tab and taken with Enter; the board's name
 *      says where the cat and the basket are; the board passes axe; ten exact boards earn "Dry Paws".
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/puddle.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, axeOn } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/* the board as the screen shows it */
const read = page => page.evaluate(() => {
  const cells = [...document.querySelectorAll('#surface .pudcell')]; if (!cells.length) return null;
  const n = Math.round(Math.sqrt(cells.length)), chip = document.querySelector('.budget');
  return { n, k: cells.map(c => +(c.dataset.k || 0)), wet: cells.map(c => c.classList.contains('wet')),
    goal: cells.findIndex(c => c.classList.contains('basket')), cat: cells.findIndex(c => c.classList.contains('here')),
    can: cells.map((c, i) => c.classList.contains('can') ? i : -1).filter(i => i >= 0),
    left: chip ? parseInt(chip.textContent.replace(/\D/g, ''), 10) : NaN, prompt: document.getElementById('prompt').textContent };
});
/* the rules again, from the description: hop exactly k, straight, onto a dry cell on the board */
const reach = (b, p) => { if (p === b.goal) return []; const k = b.k[p], x = p % b.n, y = Math.floor(p / b.n), out = [];
  for (const [dx, dy] of D){ const nx = x + dx * k, ny = y + dy * k; if (nx >= 0 && ny >= 0 && nx < b.n && ny < b.n && !b.wet[ny * b.n + nx]) out.push(ny * b.n + nx); }
  return out; };
function route(b, from = b.cat){
  let front = [[from, []]]; const seen = new Set([from]);
  for (let d = 0; d < 24 && front.length; d++){
    const nf = [];
    for (const [p, r] of front) for (const q of reach(b, p)){ const nr = r.concat(q); if (q === b.goal) return nr; if (!seen.has(q)){ seen.add(q); nf.push([q, nr]); } }
    front = nf;
  }
  return null;
}
const done = page => page.evaluate(() => +document.getElementById('play').dataset.done || 0);
const live = page => page.evaluate(() => document.getElementById('play').classList.contains('live'));
async function waitBoard(page){ for (let k = 0; k < 120; k++){ if (await live(page) && (await read(page))) return true; await page.waitForTimeout(100); } return false; }
const tapCell = (page, q) => page.evaluate(q => document.querySelectorAll('#surface .pudcell')[q].click(), q);
async function open(prof){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'puddle'); });
  await openApp(page, Object.assign({ reduceMotion: true, onboarded: true, seen: { puddle: 1 } }, prof));
  await openModeList(page); await clickMode(page, 'puddle'); await waitBoard(page);
  return page;
}
const LV = [['a beginner', { xp: 0, runs: 3, solved: 5 }], ['the middle', { xp: 9000, runs: 40, solved: 600 }], ['the top', { xp: 900000, runs: 900, solved: 40000 }]];

/* ── 1 and 2 ── */
for (const [label, prof] of LV){
  const page = await open(prof);
  const rows = []; let lit = true, free = true;
  for (let r = 0; r < 4; r++){
    if (!(await waitBoard(page))){ rows.push('no board'); break; }
    await page.waitForTimeout(150);
    const b = await read(page);
    const want = reach(b, b.cat).sort((x, y) => x - y);
    if (want.join() !== b.can.slice().sort((x, y) => x - y).join()) lit = false;
    if (r === 0){ /* a tap on a cell that is not lit does nothing */
      const other = [...Array(b.n * b.n).keys()].find(q => !b.can.includes(q) && q !== b.cat && !b.wet[q]);
      if (other !== undefined){ await tapCell(page, other); await page.waitForTimeout(150); const a = await read(page); if (a.cat !== b.cat || a.left !== b.left) free = false; }
    }
    const rt = route(b);
    if (!rt){ rows.push(`${b.n}x${b.n}: no route`); break; }
    if (rt.length > b.left){ rows.push(`${b.n}x${b.n}: shortest ${rt.length} > ${b.left}`); break; }
    const d0 = await done(page);
    for (const q of rt){ await tapCell(page, q); await page.waitForTimeout(80); }
    for (let w = 0; w < 30 && (await done(page)) === d0; w++) await page.waitForTimeout(100);
    const sp = await page.evaluate(() => document.getElementById('play').dataset.speed);
    rows.push(`${b.n}x${b.n}: ${rt.length} of ${b.left}${sp === 'miss' || (await done(page)) === d0 ? ' NOT WON' : ''}`);
    if (sp === 'miss' || (await done(page)) === d0) break;
    await page.waitForTimeout(900);
  }
  check(rows.length === 4 && rows.every(x => /of \d+$/.test(x)), `${label}: four boards, each won by the probe's own shortest route within the hops given (${rows.join('; ')})`);
  check(lit, `${label}: exactly the stones the cat can reach light up`);
  if (label === 'a beginner') check(free, 'a tap on a stone that is not lit does nothing and costs nothing');
  const ex = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).hopExact | 0);
  check(ex === 4, `${label}: the game counts the four boards hopped in their shortest route (${ex})`);
  await page.close();
}

/* ── 3. running out ── */
{
  const page = await open({ xp: 9000, runs: 40, solved: 600 });
  const d0 = await done(page); let k = 0;
  for (; k < 40 && (await done(page)) === d0; k++){
    const b = await read(page); if (!b) break;
    /* a hop that is not the basket and still leaves a way on */
    const q = b.can.find(q => q !== b.goal && route(Object.assign({}, b, { cat: q })));
    if (q === undefined) break;
    await tapCell(page, q); await page.waitForTimeout(100);
  }
  const sp = await page.evaluate(() => document.getElementById('play').dataset.speed);
  check((await done(page)) > d0 && sp === 'miss', `hopping about away from the basket runs the hops out and loses (after ${k} hops)`);
  await page.close();
}

/* ── 4. a dead end ── */
{
  const page = await open({ xp: 9000, runs: 40, solved: 600 });
  let found = false, said = '', lost = false;
  for (let r = 0; r < 16 && !found; r++){
    const b = await read(page); if (!b) break;
    /* up to three hops that end where, by the probe's search, there is no way on */
    const seq = (s, depth, path) => { for (const q of reach(s, s.cat)){ if (q === s.goal) continue; const nx = Object.assign({}, s, { cat: q });
      if (!route(nx)) return path.concat(q); if (depth > 1){ const r = seq(nx, depth - 1, path.concat(q)); if (r) return r; } } return null; };
    const hopsTo = seq(b, 3, []);
    if (hopsTo){
      found = true; const d0 = await done(page);
      for (const q of hopsTo){ await tapCell(page, q); await page.waitForTimeout(120); }
      await page.waitForTimeout(300); said = (await read(page)).prompt;
      for (let w = 0; w < 30 && (await done(page)) === d0; w++) await page.waitForTimeout(100);
      lost = (await done(page)) > d0 && (await page.evaluate(() => document.getElementById('play').dataset.speed)) === 'miss';
      break;
    }
    const rt = route(b); if (!rt) break; for (const q of rt){ await tapCell(page, q); await page.waitForTimeout(80); }
    await page.waitForTimeout(1200); await waitBoard(page);
  }
  check(found, 'a hop sequence into a dead end was found on a board');
  check(found && /no hop/i.test(said) && lost, `a dead end says so ("${said}") and ends the round`);
  await page.close();
}

/* ── 5 and 6 ── */
{
  const page = await open({ xp: 9000, runs: 40, solved: 600 });
  const b = await read(page), before = route(b);
  const label = () => page.evaluate(() => (document.querySelector('#surface .pudtools .sumtool') || {}).textContent || '');
  const l0 = await label();
  await page.evaluate(() => { const h = document.querySelector('#surface .pudtools .sumtool'); if (h) h.click(); }); await page.waitForTimeout(200);
  const lit = await page.evaluate(() => [...document.querySelectorAll('#surface .pudcell')].findIndex(c => c.classList.contains('hint')));
  const rest = lit >= 0 ? route(Object.assign({}, b, { cat: lit })) : null;
  check(lit >= 0 && b.can.includes(lit) && ((lit === b.goal && before.length === 1) || (rest && rest.length === before.length - 1)), `the hint lights the first stone of a shortest way (${before && before.length} hops, then ${rest ? rest.length : lit === b.goal ? 0 : '?'})`);
  check(/2/.test(l0) && /1/.test(await label()), `two hints a round ("${l0}" then "${await label()}")`);
  const name = await page.evaluate(() => document.querySelector('#surface .pudgrid').getAttribute('aria-label') || '');
  const at = q => `row ${Math.floor(q / b.n) + 1}, column ${q % b.n + 1}`;
  const badge = await page.evaluate(() => { const e = document.querySelector('#surface .pudcatnum'); return e && !e.hidden && e.getClientRects().length ? e.textContent : ''; });
  check(badge === String(b.k[b.cat]), `the number under the cat rides on it as a badge (${badge || 'none'}, the stone says ${b.k[b.cat]})`);
  check(name.includes(`The cat: ${at(b.cat)}, on a ${b.k[b.cat]}`) && name.includes(`The basket: ${at(b.goal)}`), `the board's name says where the cat and the basket are ("${name}")`);
  /* the keyboard: Tab to a lit stone, Enter */
  let hopped = false;
  for (let k = 0; k < 30; k++){
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => { const a = document.activeElement; return a && a.classList && a.classList.contains('pudcell') ? a.getAttribute('aria-label') : null; });
    if (f && /^Hop (to|into the basket,) row \d+, column \d+/.test(f)){ await page.keyboard.press('Enter'); await page.waitForTimeout(300); hopped = (await read(page)).cat !== b.cat; break; }
  }
  check(hopped, 'the lit stones are named buttons: Tab reaches one and Enter hops there');
  const ax = await axeOn(page, '#surface');
  check(!ax.length, `the board passes axe (${ax.map(x => x.id).join(', ') || 'clean'})`);
  await page.close();
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openApp(p2, { hopExact: 10, onboarded: true });
  const got = await p2.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('dd.v1')).achieve || {}));
  check(got.includes('puddleline'), `ten boards in their shortest route earn "Dry Paws" (${got.includes('puddleline') ? 'earned' : 'not earned'})`);
  await p2.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nevery board can be hopped, the stones keep their word, and the hops are honest');
process.exit(bad ? 1 : 0);
