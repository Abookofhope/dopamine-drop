/* Tumble Dryer: a Pair hint that lights two socks that go together.
 *
 *   - Pair (two a round) lights exactly two socks of the same colour for a moment and uses one of two
 *   - tapping the lit pair clears them; pairing off the whole drum wins the round
 *   - every matched pair pays points at once: 10 for the first, 15 for the next one made within a couple of seconds, and a wrong pair pays nothing
 *   - Hold still waits the drum, and both buttons are inside the board and translated
 *
 *   node tools/probe/tumble.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }, lang = 'en') => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { tumble: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'tumble');
  await page.waitForSelector('#surface .cell.sock.full', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const socks = [...document.querySelectorAll('.cell.sock')].map((e, i) => ({ i, full: e.classList.contains('full'), hex: e.dataset.hex || '', hint: e.classList.contains('hint'), tangled: e.classList.contains('tangled'), ...R(e) }));
  const tools = [...document.querySelectorAll('.sumcol .sumtool')].map(b => ({ text: b.textContent.trim(), off: b.disabled, ...R(b) }));
  return { socks, tools, surface: R(document.getElementById('surface')) };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = e => [e.x + e.w / 2, e.y + e.h / 2];
const click = async (page, e) => { const [x, y] = mid(e); await page.mouse.click(x, y); await page.waitForTimeout(90); };

for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [0, 'a new player on a 320px phone', { width: 320, height: 568 }]]){
  const page = await open(xp, vp); const s = await read(page);
  check(s.tools.length === 2 && s.tools.every(t => t.h >= 40 && t.y + t.h <= s.surface.y + s.surface.h + 1 && t.x >= 0 && t.x + t.w <= vp.width), `${label}: Hold and Pair are inside the board and big enough to hit (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}
{
  /* The checks below need, after the lit pair is cleared, two socks of different colours left for a wrong pair. Not every drum
     has them, so a drum is chosen first (it used to assume one and crashed on a drum of one colour). */
  let page = null, s = null, full0 = 0, lit = [];
  for (let tries = 0; tries < 12 && !page; tries++){
    const p = await open(0); s = await read(p);
    full0 = s.socks.filter(c => c.full).length;
    await click(p, s.tools[1]); await p.waitForTimeout(120); s = await read(p);
    lit = s.socks.filter(c => c.hint);
    const rest = s.socks.filter(c => c.full && !c.hint);
    if (lit.length === 2 && new Set(rest.map(c => c.hex)).size >= 2) page = p; else await p.close();
  }
  if (!page){ check(false, 'found a drum with two colours left after the lit pair (12 tries)'); await browser.close(); console.log(`\n${bad} failed`); process.exit(1); }
  check(lit.length === 2 && lit[0].hex === lit[1].hex && /1/.test(s.tools[1].text), `Pair lights two socks of one colour and uses one of two (${lit.map(c => c.hex).join(' = ')}; ${s.tools[1].text})`);
  const s0 = await score(page);
  await click(page, lit[0]); await click(page, lit[1]); await page.waitForTimeout(150);
  s = await read(page);
  check(s.socks.filter(c => c.full).length === full0 - 2, `tapping the lit pair clears them (${full0} -> ${s.socks.filter(c => c.full).length} socks)`);
  const s1 = await score(page);
  check(s1 - s0 === 10, `a matched pair pays at once: 10 points (${s0} -> ${s1})`);
  /* a wrong pair pays nothing: two socks of different colours */
  s = await read(page); const full = s.socks.filter(c => c.full); const odd = full.find(c => c.hex !== full[0].hex);
  await click(page, full[0]); await click(page, odd); await page.waitForTimeout(120);
  check(await score(page) === s1, 'a wrong pair pays nothing');
  await page.waitForTimeout(900);
  /* the next pair, made within a couple of seconds of the last good one, pays 15 */
  s = await read(page); const by0 = {}; s.socks.filter(c => c.full && !c.tangled).forEach(c => (by0[c.hex] = by0[c.hex] || []).push(c));
  /* another colour than the lit pair, or it would be a run and pay for that too (0.185.0) */
  const quick = Object.values(by0).find(a => a.length >= 2 && a[0].hex !== lit[0].hex);
  if (quick){ const q0 = await score(page); await click(page, quick[0]); await click(page, quick[1]); await page.waitForTimeout(100);
    check(await score(page) - q0 === 15, `a pair made soon after the last good one pays more: 15 (${q0} -> ${await score(page)})`); }
  /* pair off the rest, as fast as a thumb would: the last pair also pays for the whole drum (a solve is worth at least 100) */
  let won = false;
  for (let guard = 0; guard < 40 && !won; guard++){
    s = await read(page); const by = {}; s.socks.filter(c => c.full).forEach(c => (by[c.hex] = by[c.hex] || []).push(c));
    const pair = Object.values(by).find(a => a.length >= 2); if (!pair) break;
    const before = await score(page);
    await click(page, pair[0]); await click(page, pair[1]); await page.waitForTimeout(60);
    if (await score(page) - before >= 100) won = true;
  }
  await page.waitForTimeout(400);
  check(won, 'pairing off the whole drum wins the round, and pays for it');
  await page.close();
}
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(s.tools.length === 2 && /Paire/.test(s.tools[1].text), `fr: the Pair button is in French (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

/* ── its own rules (0.185.0): a run of one colour, striped socks, lint, socks inside out ───────────────────────────────── */
const slots = page => page.evaluate(() => { const g = document.querySelector('#surface .grid'); return g && g._slots ? { s: g._slots(), run: +g.dataset.run, ink: g.dataset.runInk } : null; });
const cellAt = (page, i) => page.evaluate(i => { const r = document.querySelectorAll('#surface .cell.sock')[i].getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, i);
const tapCell = async (page, i) => click(page, await cellAt(page, i));
for (const [xp, label, want] of [[0, 'level 2', { wild: false, lint: false, inside: false, word: /same colour/ }], [4000, 'level 11', { wild: true, lint: false, inside: false, word: /striped/ }],
  [30000, 'level 19', { wild: true, lint: true, inside: false, word: /lint/ }], [60000, 'level 23', { wild: true, lint: false, inside: true, word: /grey/ }]]){
  const page = await open(xp); let st = await slots(page);
  const prompt = await page.evaluate(() => document.getElementById('prompt').textContent.trim());
  check(want.word.test(prompt), `${label}: the prompt teaches the newest rule (${prompt})`);
  check(st.s.includes('wild') === want.wild && st.s.some(v => v && v.startsWith('in:')) === want.inside, `${label}: striped ${want.wild ? 'and' : 'but no'} ${want.inside ? 'inside-out' : 'no inside-out'} socks in the drum to start`);
  /* a grey sock turns the right way out with a tap, and picks nothing up */
  if (want.inside){ const i = st.s.findIndex(v => v && v.startsWith('in:')); const hex = st.s[i].slice(3); await tapCell(page, i); st = await slots(page);
    check(st.s[i] === hex, `${label}: a tap turns a grey sock the right way out (${hex})`); }
  /* a run: two pairs of one colour in a row */
  const by = {}; st.s.forEach((v, i) => { if (v && v[0] === '#') (by[v] = by[v] || []).push(i); });
  const four = Object.entries(by).find(([, a]) => a.length >= 4);
  if (four){ const [hex, a] = four; await tapCell(page, a[0]); await tapCell(page, a[1]); const s0 = await score(page); await tapCell(page, a[2]); await tapCell(page, a[3]); await page.waitForTimeout(80);
    st = await slots(page); const gain = await score(page) - s0;
    check(st.run === 2 && st.ink === hex && gain >= 20, `${label}: a second pair of the same colour makes a run of 2 and pays 10 more (${gain} for it)`); }
  if (want.wild){
    /* Hold the drum first, or a refill can drop a new pair into the space just cleared */
    await page.evaluate(() => { const h = document.querySelector('#surface .sumtools .sumtool'); if (h && !h.disabled) h.click(); }); await page.waitForTimeout(60);
    st = await slots(page); const w = st.s.indexOf('wild'), x = st.s.findIndex(v => v && v[0] === '#');
    if (w >= 0 && x >= 0){ const hex = st.s[x], before = st.s.filter(v => v === hex || v === 'in:' + hex).length; await tapCell(page, w); await tapCell(page, x); await page.waitForTimeout(80);
      const a2 = await slots(page); const after = a2.s.filter(v => v === hex || v === 'in:' + hex).length;
      check(a2.s[w] === null && before - after === 2 && a2.ink === hex, `${label}: a striped sock takes a whole pair of the colour it is put with, and that colour carries the run (${before} -> ${after}, wild gone ${a2.s[w] === null}, run ${a2.ink} vs ${hex})`); }
  }
  if (want.lint){
    let li = -1; for (let k = 0; k < 120 && li < 0; k++){ st = await slots(page); if (!st) break; li = st.s.indexOf('lint'); if (li < 0) await page.waitForTimeout(100); }
    check(li >= 0, `${label}: lint blows in as the drum refills`);
    if (li >= 0){ await tapCell(page, li); st = await slots(page); check(st.s[li] === null, `${label}: and a tap clears it`); }
  }
  /* empty the drum as a player would: striped socks with anything, grey ones turned, lint left where it is */
  let won = false;
  for (let guard = 0; guard < 80 && !won; guard++){
    st = await slots(page); if (!st || st.s.every(v => v === null || v === 'lint')){ won = true; break; }
    const i = st.s.findIndex(v => v && v.startsWith('in:')); if (i >= 0){ await tapCell(page, i); continue; }
    const by2 = {}; st.s.forEach((v, k) => { if (v && v[0] === '#') (by2[v] = by2[v] || []).push(k); });
    const pr = Object.values(by2).find(a => a.length >= 2), wi = st.s.indexOf('wild');
    let a, b; if (pr){ [a, b] = pr; } else if (wi >= 0){ a = wi; b = st.s.findIndex((v, k) => k !== wi && v && v !== 'lint'); } else break;
    if (b < 0) break;
    const d0 = await page.evaluate(() => +document.getElementById('play').dataset.done || 0);
    await tapCell(page, a); await tapCell(page, b); await page.waitForTimeout(40);
    if ((await page.evaluate(() => +document.getElementById('play').dataset.done || 0)) > d0) won = true;
  }
  check(won, `${label}: the drum can always be emptied`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nTumble Dryer shows you a pair');
process.exit(bad ? 1 : 0);
