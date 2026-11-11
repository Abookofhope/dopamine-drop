/* Peekaboo (haunt): where the cats end up is where you watched them go (v0.164.0).
 *
 * The probe does what a player does: it notes where the cats are when they show, follows every swap the board marks,
 * and keeps its own count of where they are. Then:
 *   1. Every swap you see moves a cat: one of the two marked baskets held a cat, the other did not.
 *   2. Where the probe followed them to is where the game says they are, and picking those baskets wins, at three
 *      levels (one cat, a few, the most).
 *   3. A wrong basket takes a paw and the round goes on; the Peek shows the cats still to find.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/peekaboo.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

async function open(prof){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'haunt');
    /* what the player sees: the baskets open at the start, and each pair the board marks as a swap */
    window.__seen = { shown: null, swaps: [] };
    /* A swap marks its two baskets by taking the mark off and putting it back, so each basket shows up in two records
       of one batch: each is counted once a batch, in the order marked. */
    new MutationObserver(ms => { const batch = [];
      ms.forEach(m => {
        const e = m.target; if (!e.classList || !e.classList.contains('crypt')) return;
        const i = [...e.parentNode.children].filter(x => x.classList.contains('crypt')).indexOf(e);
        const was = m.oldValue || '';
        if (e.classList.contains('crswap') && !/\bcrswap\b/.test(was) && !batch.includes(i)) batch.push(i);
        if (e.classList.contains('open') && !/\bopen\b/.test(was) && !window.__seen.started){
          window.__seen.shown = window.__seen.shown || []; if (!window.__seen.shown.includes(i)) window.__seen.shown.push(i); }
      });
      window.__seen.swaps.push(...batch);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });
  await openApp(page, Object.assign({ reduceMotion: true, onboarded: true, seen: { haunt: 1 } }, prof));
  await openModeList(page); await clickMode(page, 'haunt');
  return page;
}
/* wait for the pick: the board writes where the cats are (probe hook) once the swaps are over */
async function untilPick(page){
  for (let k = 0; k < 200; k++){
    const w = await page.evaluate(() => { const g = document.querySelector('#surface .crypts'); return g && g.dataset.where ? JSON.parse(g.dataset.where) : null; });
    if (w) return w;
    await page.waitForTimeout(100);
  }
  return null;
}
const tileAt = (page, i) => page.evaluate(i => { const r = document.querySelectorAll('#surface .cell.crypt')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);

/* ── 1 and 2: follow them ── */
for (const [label, prof] of [['a beginner', { xp: 0, runs: 3, solved: 5 }], ['the middle', { xp: 9000, runs: 40, solved: 600 }], ['the top', { xp: 900000, runs: 900, solved: 40000 }]]){
  const page = await open(prof);
  const where = await untilPick(page);
  await page.evaluate(() => { window.__seen.started = true; });
  const seen = await page.evaluate(() => window.__seen);
  let pos = (seen.shown || []).slice(), honest = true;
  for (let k = 0; k + 1 < seen.swaps.length; k += 2){
    const [a, b] = [seen.swaps[k], seen.swaps[k + 1]];
    const ha = pos.includes(a), hb = pos.includes(b);
    if (ha === hb) honest = false;
    pos = pos.map(p => p === a ? b : p === b ? a : p);
  }
  const same = !!where && pos.length === where.length && pos.every(p => where.includes(p));
  check(seen.swaps.length >= 4 && seen.swaps.length % 2 === 0 && honest, `${label}: every one of the ${seen.swaps.length / 2} swaps you see moves a cat`);
  check(same, `${label}: the ${pos.length} cat(s) are where they were followed to (${pos.join(',')} vs ${where && where.join(',')})`);
  const d0 = await page.evaluate(() => +document.getElementById('play').dataset.done || 0);
  for (const p of pos){ const c = await tileAt(page, p); await page.mouse.click(c.x, c.y); await page.waitForTimeout(150); }
  for (let w = 0; w < 20 && (await page.evaluate(() => +document.getElementById('play').dataset.done || 0)) === d0; w++) await page.waitForTimeout(100);
  const r = await page.evaluate(() => ({ done: +document.getElementById('play').dataset.done || 0, speed: document.getElementById('play').dataset.speed }));
  check(r.done > d0 && r.speed !== 'miss', `${label}: picking them wins the round`);
  await page.close();
}

/* ── 3: a wrong basket, and the Peek ── */
{
  const page = await open({ xp: 400, runs: 12, solved: 80 });
  const where = await untilPick(page);
  const n = await page.evaluate(() => document.querySelectorAll('#surface .cell.crypt').length);
  const wrong = [...Array(n).keys()].find(i => !where.includes(i));
  const paws0 = await page.evaluate(() => document.querySelectorAll('.budget.paws i:not(.used)').length);
  const c = await tileAt(page, wrong); await page.mouse.click(c.x, c.y); await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ paws: document.querySelectorAll('.budget.paws i:not(.used)').length, live: document.getElementById('play').classList.contains('live') }));
  check(st.paws === paws0 - 1 && st.live, `a wrong basket takes a paw (${paws0} then ${st.paws}) and the round goes on`);
  await page.evaluate(() => { const p = [...document.querySelectorAll('#surface .sumtool')].find(b => !b.disabled); if (p) p.click(); });
  await page.waitForTimeout(150);
  const peeked = await page.evaluate(() => [...document.querySelectorAll('#surface .cell.crypt')].map((e, i) => e.classList.contains('open') ? i : -1).filter(i => i >= 0));
  check(peeked.length === where.length && peeked.every(i => where.includes(i)), `the Peek shows the cats still to find (${peeked.join(',')})`);
  await page.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nthe cats are where you watched them go');
process.exit(bad ? 1 : 0);
