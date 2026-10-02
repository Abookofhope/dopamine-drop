/* Paws: a wrong answer takes a paw, not the round.
 *
 * Needle Pass has its own probe (skim.mjs); this one covers the modes that share the helper: Dye Trap, Quick Count, Count the
 * Stitches, Stitch Count, Haunt, Off Beat, Dye Pots, Tidy Up and Tangle Watch.
 *
 *   - at a new level there are three paws above the board (they are the round's, not each board's: a round of several boards keeps
 *     the same three), a wrong choice uses one and the round goes on, and the third wrong choice ends the round
 *   - the right choice still counts, and a wrong swatch / number is ruled out while a wrong stitch, pair or tile just shakes or stays marked
 *   - at a high level there is one paw and no row of them: the first wrong choice ends the round as before
 *
 *   node tools/probe/paws.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (mode, sel, xp, lang = 'en') => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { [mode]: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, mode);
  await page.waitForSelector(sel, { timeout: 9000 }); await page.waitForTimeout(900);
  return page;
};
const paws = page => page.evaluate(() => { const c = document.querySelector('.budget.paws'); return { shown: c ? c.querySelectorAll('i').length : 0, left: c ? c.querySelectorAll('i:not(.used)').length : 0, aria: c ? c.getAttribute('aria-label') : '', prompt: document.getElementById('prompt').textContent.trim() }; });
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const hexOf = rgb => '#' + (rgb.match(/\d+/g) || []).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
/* click the middle of the nth element matching a selector, measured at the moment of the click (some of them drift) */
const tapNth = async (page, sel, n) => { const r = await page.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [sel, n]); await page.mouse.click(r[0], r[1]); await page.waitForTimeout(140); };

/* what a wrong choice and a right choice are, per mode: functions that do them */
const modes = {
  stroop: { name: 'Dye Trap', sel: '#surface .swatch.dyedrop', ruled: '.swatch.ruled', boards: true,
    acts: async page => {
      const hex = hexOf(await page.evaluate(() => getComputedStyle(document.querySelector('.stroopword')).color)).toLowerCase();
      const sw = await page.$$eval('.swatch.dyedrop', els => els.map(e => ({ hex: (e.dataset.hex || '').toLowerCase(), off: e.disabled })));
      const right = sw.findIndex(x => x.hex === hex), wrong = sw.findIndex((x, i) => i !== right && !x.off);
      return { right: () => tapNth(page, '.swatch.dyedrop', right), wrong: () => tapNth(page, '.swatch.dyedrop', wrong) };
    } },
  count: { name: 'Quick Count', sel: '#surface .answers .abtn', ruled: '.abtn.ruled', boards: true,
    acts: async page => {
      const ans = await page.evaluate(() => document.querySelector('.answers').dataset.answer);
      const t = await page.$$eval('.answers .abtn', els => els.map(e => ({ text: e.textContent.trim(), off: e.disabled })));
      const right = t.findIndex(x => x.text === ans), wrong = t.findIndex((x, i) => i !== right && !x.off);
      return { right: () => tapNth(page, '.answers .abtn', right), wrong: () => tapNth(page, '.answers .abtn', wrong) };
    } },
  order: { name: 'Count the Stitches', sel: '#surface .bub', ruled: null, boards: true,
    acts: async page => {
      const t = await page.$$eval('.bub', els => els.map(e => ({ text: e.textContent.trim(), done: e.classList.contains('done') })));
      const left = t.map((x, i) => ({ ...x, i })).filter(x => !x.done), nums = left.map(x => Number(x.text));
      const right = left[nums.indexOf(Math.min(...nums))].i, wrong = left.find(x => x.i !== right).i;
      return { right: () => tapNth(page, '.bub', right), wrong: () => tapNth(page, '.bub', wrong) };
    } },
  sum: { name: 'Stitch Count', sel: '#surface .cell.num', ruled: null, boards: false,   /* one board at a new level: the right pair ends the round */
    acts: async page => {
      const info = await page.evaluate(() => ({ target: Number(document.querySelector('.target b').textContent.replace(/[^\d]/g, '')), vals: [...document.querySelectorAll('.cell.num')].map(e => Number(e.textContent)) }));
      let right = null, wrong = null;
      for (let i = 0; i < info.vals.length && (!right || !wrong); i++) for (let j = i + 1; j < info.vals.length; j++){
        if (info.vals[i] + info.vals[j] === info.target){ if (!right) right = [i, j]; } else if (!wrong) wrong = [i, j];
      }
      return { right: async () => { await tapNth(page, '.cell.num', right[0]); await tapNth(page, '.cell.num', right[1]); }, wrong: async () => { await tapNth(page, '.cell.num', wrong[0]); await tapNth(page, '.cell.num', wrong[1]); } };
    } },
  haunt: { name: 'Haunt', sel: '#surface .cell.crypt', ruled: null, boards: false, ready: page => page.waitForFunction(() => !!document.querySelector('.crypts') && !!document.querySelector('.crypts').dataset.where, null, { timeout: 30000, polling: 100 }),
    acts: async page => {
      const where = await page.evaluate(() => JSON.parse(document.querySelector('.crypts').dataset.where));
      const st = await page.$$eval('.cell.crypt', els => els.map(e => e.classList.contains('wrong') || e.classList.contains('found')));
      const wrong = st.findIndex((x, i) => !x && !where.includes(i)), right = where.find(i => !st[i]);
      return { right: () => tapNth(page, '.cell.crypt', right), wrong: () => tapNth(page, '.cell.crypt', wrong) };
    } },
  beat: { name: 'Off Beat', sel: '#surface .beatdot', ruled: '.beatdot.ruled', boards: false,
    acts: async page => {
      const d = await page.$$eval('.beatdot', els => els.map(e => ({ dur: e.style.animationDuration, off: e.disabled, found: e.classList.contains('found') })));
      const count = {}; d.forEach(x => count[x.dur] = (count[x.dur] || 0) + 1);
      const period = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      const right = d.findIndex(x => x.dur !== period && !x.found), wrong = d.findIndex(x => x.dur === period && !x.off);
      return { right: () => tapNth(page, '.beatdot', right), wrong: () => tapNth(page, '.beatdot', wrong) };
    } },
  siphon: { name: 'Dye Pots', sel: '#surface .vial', ruled: null, boards: false,
    acts: async page => {
      const info = await page.evaluate(() => ({ v: [...document.querySelectorAll('.vial')].map(e => ({ hex: e.dataset.hex, spent: e.classList.contains('empty') })), j: [...document.querySelectorAll('.jar')].map(e => ({ hex: e.dataset.hex, full: e.classList.contains('full') })) }));
      const vi = info.v.findIndex((x, i) => !x.spent && info.j.some(j => j.hex === x.hex && !j.full));
      const ji = info.j.findIndex(j => j.hex === info.v[vi].hex), wj = info.j.findIndex((j, k) => k !== ji && !j.full && j.hex !== info.v[vi].hex);
      const pour = async (v, j) => { const c = await page.evaluate(([a, b]) => { const A = document.querySelectorAll('.vial')[a].getBoundingClientRect(), B = document.querySelectorAll('.jar')[b].getBoundingClientRect(); return [A.left + A.width / 2, A.top + A.height / 2, B.left + B.width / 2, B.top + B.height / 2]; }, [v, j]);
        await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.mouse.move(c[2], c[3], { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200); };
      return { right: () => pour(vi, ji), wrong: () => pour(vi, wj) };
    } },
  tidy: { name: 'Tidy Up', sel: '#surface .tidyitem', ruled: null, boards: false,
    acts: async page => {
      const info = await page.evaluate(() => ({ items: [...document.querySelectorAll('.tidyitem')].map(e => ({ hex: e.dataset.hex, gone: e.classList.contains('binned') })), bins: [...document.querySelectorAll('.tidybin')].map(e => e.dataset.hex) }));
      const ii = info.items.findIndex(x => !x.gone), want = info.bins.indexOf(info.items[ii].hex), other = info.bins.findIndex(h => h !== info.items[ii].hex);
      const drag = async (i, b) => { const c = await page.evaluate(([a, k]) => { const A = document.querySelectorAll('.tidyitem')[a].getBoundingClientRect(), B = document.querySelectorAll('.tidybin')[k].getBoundingClientRect(); return [A.left + A.width / 2, A.top + A.height / 2, B.left + B.width / 2, B.top + B.height / 2]; }, [i, b]);
        await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.mouse.move(c[2], c[3], { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(250); };
      return { right: () => drag(ii, want), wrong: () => drag(ii, other) };
    } },
  drift: { name: 'Tangle Watch', sel: '#surface .ddot', ruled: null, boards: false,
    acts: async page => {
      const pair = (await page.evaluate(() => document.querySelector('.driftwrap').dataset.pair)).split(',').map(Number);
      const n = await page.evaluate(() => document.querySelectorAll('.ddot').length);
      const other = [...Array(n).keys()].filter(i => !pair.includes(i)).slice(0, 2);
      return { right: async () => { await tapNth(page, '.ddot', pair[0]); await tapNth(page, '.ddot', pair[1]); }, wrong: async () => { await tapNth(page, '.ddot', other[0]); await tapNth(page, '.ddot', other[1]); } };
    } }
};

for (const [id, m] of Object.entries(modes)){
  /* a new level: three paws */
  {
    const page = await open(id, m.sel, 0);
    if (m.ready) await m.ready(page);
    let s = await paws(page);
    check(s.shown === 3 && s.left === 3 && /3/.test(s.aria), `${m.name}: three paws are shown above the board ("${s.aria}")`);
    let a = await m.acts(page); await a.wrong(); await page.waitForTimeout(200);
    s = await paws(page);
    check(s.left === 2 && /try again/i.test(s.prompt) && (await score(page)) === 0, `${m.name}: a wrong choice uses a paw and the round goes on (${s.left} left, "${s.prompt}")`);
    if (m.ruled) check((await page.evaluate(sel => document.querySelectorAll(sel).length, m.ruled)) === 1, `${m.name}: and the wrong choice is ruled out`);
    a = await m.acts(page); await a.wrong(); await page.waitForTimeout(200);
    s = await paws(page); check(s.left === 1, `${m.name}: a second wrong choice uses another (${s.left} left)`);
    if (m.boards){
      /* the right one still counts, and the paws belong to the round: the next board does not refill them */
      a = await m.acts(page); await a.right(); await page.waitForTimeout(700);
      s = await paws(page);
      check(s.left === 1 && s.shown === 3, `${m.name}: the right choice still counts and the paws carry on (${s.left} of ${s.shown} left)`);
    }
    a = await m.acts(page).catch(() => null);
    if (a) await a.wrong();
    const ended = await page.waitForFunction(() => { const c = document.querySelector('.budget.paws'); return !c || c.querySelectorAll('i:not(.used)').length === c.querySelectorAll('i').length; }, null, { timeout: 4000, polling: 30 }).then(() => true).catch(() => false);
    check(ended, `${m.name}: the third wrong choice ends the round and the next one starts with all its paws`);
    await page.close();
  }
  /* a high level: one paw */
  {
    const page = await open(id, m.sel, 60000); const s = await paws(page);
    check(s.shown === 0, `${m.name}: at a high level there is no row of paws (${s.shown} shown)`);
    await page.close();
  }
}

/* French */
{
  const page = await open('count', modes.count.sel, 0, 'fr'); let s = await paws(page);
  const a = await modes.count.acts(page); await a.wrong(); await page.waitForTimeout(250);
  const b = await paws(page);
  check(/chances/.test(s.aria) && /encore/.test(b.prompt) && !/\{|paws\./.test(s.aria + b.prompt), `fr: the paws and the words are in French ("${s.aria}", "${b.prompt}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nthe modes that share the paws helper all give paws');
process.exit(bad ? 1 : 0);
