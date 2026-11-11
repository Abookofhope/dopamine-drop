/* Dye Pots (siphon): each dye goes into the pot that wants it, and only a wrong pot costs anything (v0.164.0).
 *
 * Read from what the player sees (each jar's colour and the word on it):
 *   1. Pouring each dye into the pot of its colour fills it, and filling them all wins, at a low level and past level 10.
 *   2. Letting go over nothing costs nothing: no paw, and the dye is still there.
 *   3. The wrong pot takes a paw, and the dye stays in its jar to be poured again.
 *   4. Past level 10 a pot can want a mix (purple is red and blue, green is blue and yellow, orange is red and yellow):
 *      its two dyes go in, in either order, the first leaving it half full.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/dyepots.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
/* the mixes, as the game's prompt tells them to a player */
const RED = '#FF3D4E', BLUE = '#3D7BFF', YELLOW = '#FFC53D';
const MIX = { '#A75BFF': [RED, BLUE], '#2ED66F': [BLUE, YELLOW], '#FF8A2B': [RED, YELLOW] };

async function open(prof){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'siphon'); });
  await openApp(page, Object.assign({ reduceMotion: true, onboarded: true, seen: { siphon: 1 } }, prof));
  await openModeList(page); await clickMode(page, 'siphon');
  for (let k = 0; k < 100; k++){ if (await page.evaluate(() => document.getElementById('play').classList.contains('live') && !!document.querySelector('#surface .jar'))) break; await page.waitForTimeout(100); }
  await page.waitForTimeout(300);
  return page;
}
const board = page => page.evaluate(() => {
  const c = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  return { src: [...document.querySelectorAll('#surface .vial')].map(e => ({ hex: e.dataset.hex, spent: e.classList.contains('empty'), ...c(e) })),
    jars: [...document.querySelectorAll('#surface .jar')].map(e => ({ hex: e.dataset.hex, full: e.classList.contains('full'), half: e.classList.contains('half'), mixed: e.classList.contains('mixed'), ...c(e) })),
    paws: document.querySelectorAll('.budget.paws i:not(.used)').length,
    done: +document.getElementById('play').dataset.done || 0, speed: document.getElementById('play').dataset.speed };
});
async function pour(page, a, b){
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let k = 1; k <= 8; k++){ await page.mouse.move(a.x + (b.x - a.x) * k / 8, a.y + (b.y - a.y) * k / 8); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(250);
}
/* the dyes each jar wants, from its colour */
const wants = j => j.mixed ? MIX[j.hex] : [j.hex];

/* ── 1 and 4: fill every pot ── */
for (const [label, prof, needMix] of [['a low level', { xp: 400, runs: 12, solved: 80 }, false], ['past level 10', { xp: 900000, runs: 900, solved: 40000 }, true]]){
  let won = 0, mixSeen = false, halfSeen = false, tries = 0;
  for (; tries < 6 && (won < 2 || (needMix && !mixSeen)); tries++){
    const page = await open(prof);
    let b = await board(page); const d0 = b.done;
    for (const j of b.jars){
      const need = wants(j);
      if (j.mixed){ mixSeen = true; need.reverse(); }   /* the second part first: either order must do */
      for (const [i, hex] of need.entries()){
        const s = b.src.find(x => x.hex === hex && !x.spent);
        if (!s) break;
        await pour(page, s, j);
        b = await board(page);
        if (j.mixed && i === 0) halfSeen = halfSeen || b.jars.find(x => x.hex === j.hex).half;
      }
    }
    for (let w = 0; w < 20 && (await board(page)).done === d0; w++) await page.waitForTimeout(100);
    const e = await board(page);
    if (e.done > d0 && e.speed !== 'miss') won++;
    await page.close();
  }
  check(won >= 2, `${label}: pouring each dye into the pot of its colour fills them all and wins (${won} of ${tries} rounds)`);
  if (needMix){
    check(mixSeen, `${label}: a pot wanting a mix was dealt`);
    check(mixSeen && halfSeen, `${label}: a mixed pot takes its second dye first and is half full after it`);
  }
}

/* ── 2 and 3: nothing costs nothing; the wrong pot costs a paw ── */
{
  const page = await open({ xp: 400, runs: 12, solved: 80 });
  let b = await board(page);
  const s = b.src[0];
  const empty = await page.evaluate(() => { const w = document.querySelector('#surface .siphonwrap').getBoundingClientRect(); return { x: w.left + 6, y: w.bottom - 6 }; });
  await pour(page, s, empty);
  let c = await board(page);
  check(c.paws === b.paws && !c.src[0].spent && c.done === b.done, `letting go over nothing costs nothing (paws ${b.paws} then ${c.paws}, the dye still there)`);
  const wrong = c.jars.find(j => !wants(j).includes(s.hex) && !j.full);
  await pour(page, c.src[0], wrong);
  const d = await board(page);
  check(d.paws === c.paws - 1 && !d.src[0].spent, `the wrong pot takes a paw (${c.paws} then ${d.paws}) and the dye stays to be poured again`);
  const right = d.jars.find(j => wants(j).includes(s.hex));
  await pour(page, d.src[0], right);
  const e = await board(page);
  check(e.src[0].spent, 'and then it pours into the right pot');
  await page.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nevery dye finds its pot, and only a wrong pot costs a paw');
process.exit(bad ? 1 : 0);
