/* Three promises that only a lucky solve, a friend's link or a full minute and a half of play reaches (v0.161.0).
 *
 * The roadmap left these unprobed when they shipped:
 *   1. A lucky skein pays exactly double: the yarn the save gains on a lucky solve is twice that solve's own payout,
 *      every other solve gains exactly its payout, and the lucky one says so under the score. (v0.153.0)
 *   2. A friend's Daily: with a friend's link for today, the chip beside the score says Friend and how far ahead or
 *      behind their score at the same round you are, on your first Daily of the day too (until v0.161.0 the first
 *      point "beat" a best of 0 and the race never showed); the link is read from the address and then cleared; a
 *      link from another day is not raced. (v0.153.0)
 *   3. A first run, played for 90 s by five new players thinking 0.5-1.8 s a board (held on Odd Skein, the board a
 *      first run opens on, so a bot can solve every one): in at least four of five, a style grade is shown under the
 *      score and the Thread is on screen (bible 13, "taught in play"); how many tie a knot is reported, not judged.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/promises.mjs
 *   ONLY=1|2|3 ...   one part
 */
import { chromium } from 'playwright';
import { BASE, save as seedSave, openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const ONLY = process.env.ONLY || '';
const part = n => !ONLY || ONLY === String(n);
const browser = await chromium.launch();
const errs = [];
/* the game's own number format: a narrow space between thousands */
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/* Odd Skein: the tile that differs, or the lightest or darkest when the prompt asks. Lightness is judged in OKLab, as
   the game builds it ("a perceptual target"); a tile ruled out by a wrong tap is disabled and left out; and only the
   board on top counts. */
const oddAt = page => page.evaluate(() => {
  /* only tiles that are really on top at their own centre: a Daily round can stack its next board underneath */
  const top = t => { const r = t.getBoundingClientRect(); return r.width > 0 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === t; };
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')].filter(t => !t.disabled && top(t));
  if (!tiles.length) return null;
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const okL = c => { const [r, g, b] = c.map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
      s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s; };
  const cols = tiles.map(rgb);
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => okL(c) > okL(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => okL(c) < okL(cols[b]) ? i : b, 0);
  else {
    /* the odd one is the colour farthest from the typical tile (exact repeats are not guaranteed: tiles can carry a
       shade of texture each) */
    const lab = c => { const [r, g, b] = c.map(lin);
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
        s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
    const L = cols.map(lab), med = [0, 1, 2].map(k => L.map(v => v[k]).sort((a, b) => a - b)[L.length >> 1]);
    const d = v => Math.hypot(v[0] - med[0], v[1] - med[1], v[2] - med[2]);
    odd = L.reduce((b, v, i) => d(v) > d(L[b]) ? i : b, 0);
  }
  if (odd < 0) return null;
  const r = tiles[odd].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const wool = page => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dd.v1')); return (s.yarn || 0) + (s.yarnFrac || 0); });
const solved = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('dd.v1')).solved | 0; } catch(e){ return 0; } });
/* One Odd Skein board: wait for it, think, tap; true once the solve has been counted. Seeds stay at a low level
   (400 XP), where the odd skein is the one colour that differs: higher up it can be the lightest of a jittered set. */
const live = page => page.evaluate(() => document.getElementById('play').classList.contains('live'));
async function solveOne(page, think){
  for (let w = 0; w < 100; w++){ if (await live(page) && await oddAt(page)) break; await page.waitForTimeout(100); }
  const at = await oddAt(page); if (!at || !(await live(page))) return false;
  const before = await solved(page);
  if (think) await page.waitForTimeout(think);
  const at2 = await oddAt(page); if (!at2) return false;
  await page.mouse.click(at2.x, at2.y);
  for (let w = 0; w < 20; w++){ await page.waitForTimeout(60); if (await solved(page) > before) return true; }
  return false;
}

/* ── 1. a lucky skein pays exactly double ── */
if (part(1)){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, { reduceMotion: true, xp: 400, runs: 12, solved: 80, lifetime: 30000, yarn: 50, onboarded: true, seen: { odd: 1 } });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(700);
  /* the screen line under the score, collected as it changes, for the lucky solve's own words */
  await page.evaluate(() => { window.__lines = []; const p = document.getElementById('prompt');
    new MutationObserver(() => window.__lines.push(p.textContent)).observe(p, { childList: true, characterData: true, subtree: true });
    window.__floats = []; new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => n.textContent && window.__floats.push(n.textContent)))).observe(document.body, { childList: true, subtree: true }); });
  await page.evaluate(() => window.__luck.track());
  const start = await wool(page);
  let n = 0;
  for (let k = 0; k < 24 && n < 6; k++){
    if (n === 2 && !(await page.evaluate(() => window.__luck.armed() || window.__luck.count() > 0))) await page.evaluate(() => window.__luck.force());
    if (await solveOne(page, 1700)) n++;   /* slower than Swift, so no Purrfects and no Bow pay into the sum */
    n = Math.max(n, (await page.evaluate(() => (window.__luck.log() || []).length)));
  }
  await page.waitForTimeout(800);
  const log = await page.evaluate(() => window.__luck.log() || []);
  const total = (await wool(page)) - start;
  const eq = (a, b) => Math.abs(a - b) < 1e-6;
  if (process.env.DEBUG) console.log('     ' + JSON.stringify(log));
  check(log.length >= 6, `six Marathon solves on Odd Skein (${log.length})`);
  const lucky = log.filter(r => r.lucky), plain = log.filter(r => !r.lucky);
  check(lucky.length === 1, `exactly one of them is a lucky skein, the forced one (${lucky.length})`);
  check(lucky.length === 1 && eq(lucky[0].paid, 2 * lucky[0].base) && eq(lucky[0].gained, lucky[0].paid),
    `it pays exactly double: the save gains ${lucky[0] ? lucky[0].gained.toFixed(3) : '?'}, twice its ${lucky[0] ? lucky[0].base.toFixed(3) : '?'}`);
  check(plain.length >= 5 && plain.every(r => eq(r.paid, r.base) && eq(r.gained, r.base)),
    `every other solve gains exactly its own payout (${plain.map(r => r.gained.toFixed(2) + '/' + r.base.toFixed(2)).join(', ')})`);
  const sum = log.reduce((a, r) => a + r.paid, 0);
  check(eq(total, sum), `and nothing else paid: the stored wool grew by ${total.toFixed(3)}, the sum of the payouts ${sum.toFixed(3)}`);
  await page.waitForTimeout(400);
  const said = await page.evaluate(() => (window.__floats || []).concat(window.__lines || []).filter(x => /lucky skein/i.test(x)).length);
  check(said > 0, 'and the lucky one says so ("A lucky skein! ×2 yarn")');
  check(await page.evaluate(() => window.__luck.count()) === 1, 'one lucky skein in the run, no more');
  await page.close();
}

/* ── 2. a friend's Daily ── */
async function daily(vs, hash){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  if (hash){
    await page.addInitScript(v => localStorage.setItem('dd.v1', v), seedSave({ reduceMotion: true, xp: 400, runs: 12, solved: 80, onboarded: true, seen: { odd: 1 } }));
    await page.goto(BASE + hash, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const c = document.getElementById('logClose'); if (c) c.click(); });
  } else await openApp(page, { reduceMotion: true, xp: 400, runs: 12, solved: 80, onboarded: true, seen: { odd: 1 }, vs });
  const read = { vs: await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).vs || null), hash: await page.evaluate(() => location.hash) };
  await page.evaluate(() => document.getElementById('dailyStatus').click());
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(700);
  /* a Daily round can be several boards (the dots under it), and it scores when the last one is solved */
  let ok = false;
  for (let k = 0; k < 8 && !ok; k++){
    await solveOne(page, 200);
    ok = await page.evaluate(() => parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, '') || '0', 10) > 0);
  }
  await page.waitForTimeout(700);
  const chip = await page.evaluate(() => { const b = document.getElementById('hudBest');
    return { shown: !!b && !b.hidden && b.getClientRects().length > 0, label: (document.getElementById('hudBestL') || {}).textContent, n: (document.getElementById('hudBestN') || {}).textContent,
      ahead: b.classList.contains('ahead'), behind: b.classList.contains('behind'), score: parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, '') || '0', 10) }; });
  await page.close();
  return { ok, chip, read };
}
if (part(2)){
  const today = dayKey();
  {
    const { ok, chip } = await daily({ date: today, c: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    check(ok && chip.shown && chip.label === 'Friend', `with a friend's score for today, the chip says Friend after a round (${chip.label})`);
    check(chip.ahead && !chip.behind && chip.n === '+' + fmt(chip.score - 1), `ahead of a friend on 1 after round one: "${chip.n}" for ${chip.score}`);
  }
  {
    const { ok, chip } = await daily({ date: today, c: Array(12).fill(99999) });
    check(ok && chip.behind && !chip.ahead && chip.label === 'Friend' && /^−/.test(chip.n), `behind a friend on 99,999: "${chip.n}"`);
  }
  {
    const { ok, chip } = await daily({ date: '2001-01-01', c: Array(12).fill(5) });
    check(ok && chip.label !== 'Friend', `a friend's link from another day is not raced ("${chip.label || 'no chip'}")`);
  }
  {
    const c = [7, 900, 2000].map(n => n.toString(36)).join('-');
    const { ok, chip, read } = await daily(null, `#vs=${today}.${c}`);
    check(!!read.vs && read.vs.date === today && read.vs.c.join(',') === '7,900,2000' && read.hash === '', `a link in the address is read and then cleared from it (${JSON.stringify(read.vs && read.vs.c)}, "${read.hash}")`);
    check(ok && chip.label === 'Friend' && chip.ahead && chip.n === '+' + fmt(chip.score - 7), `and raced: "${chip.n}" for ${chip.score} against 7`);
  }
}

/* ── 3. a first run, 90 seconds, five new players ── */
/* How long a new player looks before tapping, on top of the bot's own ~0.2 s: 0.5-1.8 s. Spotting the one skein of
   another colour on a small board is a pop-out search, which people do in well under a second; the range runs well past
   that for a player still reading the board. */
const THINK = () => 500 + Math.random() * 1300;
if (part(3)){
  const seen = [];
  for (let v = 0; v < 5; v++){
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, locale: 'en-US' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    await page.addInitScript(() => { if (window.top !== window) return; localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.evaluate(() => { window.__lines = []; const p = document.getElementById('prompt');
      new MutationObserver(() => window.__lines.push(p.textContent)).observe(p, { childList: true, characterData: true, subtree: true }); });
    await page.click('#wcStart');
    const t0 = Date.now();
    let n = 0, knotAt = 0, overAt = 0, threadAt = 0;
    while (Date.now() - t0 < 90000){
      if (await page.evaluate(() => { const o = document.getElementById('over'); return !!o && !o.hidden; })){ overAt = Date.now() - t0; break; }
      /* what a player answers along the way: a stage's choice of charms (the first one, after a moment's reading) and a level-up */
      const stop = await page.evaluate(() => { const d = document.querySelector('#stage .draftbox .charm'); if (d) return 'draft';
        const l = document.getElementById('levelup'); return l && !l.hidden ? 'level' : ''; });
      if (stop){ await page.waitForTimeout(1500); await page.evaluate(s => { if (s === 'draft') document.querySelector('#stage .draftbox .charm').click(); else document.getElementById('luOk').click(); }, stop); continue; }
      if (await solveOne(page, THINK())) n++;
      if (!threadAt && await page.evaluate(() => { const t = document.getElementById('hudThread'); return !!t && !t.hidden && t.getClientRects().length > 0; })) threadAt = Date.now() - t0;
      if (!knotAt && await page.evaluate(() => { const t = document.getElementById('hudThread'); return !!t && !t.hidden && t.querySelectorAll('i.on').length > 0; })) knotAt = Date.now() - t0;
    }
    const grades = await page.evaluate(() => [...new Set((window.__lines || []).map(x => (/Purrfect|Swift|Clean/.exec(x) || [])[0]).filter(Boolean))]);
    seen.push({ n, grades, knotAt, overAt, threadAt });
    console.log(`     player ${v + 1}: ${n} solves, grades shown ${grades.join('/') || 'none'}, first knot ${knotAt ? (knotAt / 1000).toFixed(0) + ' s' : 'none'}${overAt ? ', run over at ' + (overAt / 1000).toFixed(0) + ' s' : ''}`);
    await ctx.close();
  }
  const both = seen.filter(s => s.grades.length && s.threadAt && s.threadAt <= 90000).length;
  check(seen.every(s => s.n >= 10), `five first runs all play on (${seen.map(s => s.n).join(', ')} solves)`);
  check(both >= 4, `in ${both} of 5, a style grade is shown under the score and the Thread is on screen within 90 s (the bible's measure: at least 4)`);
  /* Measured, not judged: a knot needs a Purrfect, which at this pace is a matter of the pace. Recorded so a change to
     grading shows up as a change here. */
  console.log(`     measured: a knot was tied in ${seen.filter(s => s.knotAt).length} of 5 runs at this pace (first at ${seen.filter(s => s.knotAt).map(s => (s.knotAt / 1000).toFixed(0) + ' s').join(', ') || 'never'})`);
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nthe lucky skein, a friend’s Daily and the first ninety seconds keep their word');
process.exit(bad ? 1 : 0);
