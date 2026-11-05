/* A run outlives the app; a session can end gently (v0.150.0).
 *
 * 1. Resume: a run closed mid-way (here: the page is reloaded, as when a phone call or the system takes it) is offered
 *    back on the Play tab, with its score; Resume brings back the score, the solves and the clock, and the round in
 *    play is dealt again. Let it go forgets it. Not the Daily Drop. A run that ended normally leaves nothing behind.
 * 2. Tuck in: Game Over offers it; it darkens the room, the cats riding along are drawn asleep, one line says what the
 *    session held, and a tap (or nine seconds) goes back to the menu.
 * 3. One tap for many: Pet everyone pets every cat that can be petted today.
 * 4. A weekly copy is kept on the device, and Settings offers it back.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/resume.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab, save as seedSave } from './harness.mjs';

let bad = 0;
/* On a build without these features the page has none of their elements: say so as a failure rather than a stack trace. */
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const tiles = page => page.evaluate(() => {
  const ts = [...document.querySelectorAll('#surface .oddwrap .tile')];
  if (!ts.length) return null;
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = ts.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const r = ts[odd].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const live = page => page.waitForFunction(() => {
  const p = document.getElementById('play'), sf = document.getElementById('surface');
  return !p.hidden && !document.getElementById('count') && !!document.querySelector('#surface .oddwrap .tile')
    && ![...sf.children].some(c => c.classList.contains('swap')) && document.getElementById('prompt').className === 'prompt';
}, null, { timeout: 12000, polling: 60 }).then(() => true, () => false);
const sv = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')) || {});
async function solve(page){
  if (!await live(page)) return false;
  const s0 = (await sv(page)).solved | 0;
  for (let i = 0; i < 10; i++){
    const at = await tiles(page); if (!at){ await page.waitForTimeout(80); continue; }
    await page.mouse.click(at.x, at.y); await page.waitForTimeout(90);
    if (((await sv(page)).solved | 0) > s0) return true;
  }
  return false;
}
const score = page => page.evaluate(() => parseInt(document.getElementById('hudScore').textContent.replace(/\D/g, ''), 10) || 0);
const seedOnce = (page, state) => page.addInitScript(([v]) => { if (!sessionStorage.getItem('seeded')){ localStorage.setItem('dd.v1', v); sessionStorage.setItem('seeded', '1'); } }, [seedSave(state)]);
async function open(state = {}){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  /* Seeded once per tab, so a reload keeps what the run wrote (openApp would write the seed again). */
  await seedOnce(page, Object.assign({ reduceMotion: true, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  await page.goto(`http://127.0.0.1:${process.env.PORT || 8275}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const c = document.getElementById('logClose'); if (c) c.click(); });
  return { page, ctx };
}

/* ── 1. resume ── */
{
  const { page, ctx } = await open();
  check(await page.evaluate(() => document.getElementById('resumeCard').hidden), 'with nothing waiting, there is no Resume card');
  await page.evaluate(() => document.getElementById('moodPlay').click());
  for (let i = 0; i < 3; i++) await solve(page);
  await page.waitForTimeout(400);
  const before = { score: await score(page), solved: 3 };
  check(before.score > 0, `a run with three solves (${before.score} points)`);
  /* the app is closed and opened again */
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600);
  await page.evaluate(() => { const c = document.getElementById('logClose'); if (c) c.click(); });
  const card = await page.evaluate(() => { const c = document.getElementById('resumeCard'); return { shown: !c.hidden, line: document.getElementById('resumeLine').textContent }; });
  check(card.shown, 'after the app is reopened, the Play tab offers the run back');
  const pts = String(before.score).replace(/\B(?=(\d{3})+(?!\d))/g, '\\D?');
  check(new RegExp(pts).test(card.line) && /left/.test(card.line), `with its score and its clock ("${card.line}")`);
  await page.evaluate(() => document.getElementById('resumeGo').click());
  check(await live(page), 'Resume deals the round again');
  const after = await score(page);
  check(after === before.score, `the score is as it was (${after})`);
  await solve(page); await page.waitForTimeout(300);
  check(await score(page) > before.score, 'and the run goes on from there');
  /* a run that ends normally leaves nothing behind */
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseEnd', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.pauseEnd').click());
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 });
  check(await page.evaluate(() => !localStorage.getItem('dd.run')), 'a run that ended leaves nothing waiting');
  await ctx.close();
}
{
  /* Let it go */
  const { page, ctx } = await open();
  await page.evaluate(() => document.getElementById('moodPlay').click());
  await solve(page); await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600);
  await page.evaluate(() => { const c = document.getElementById('logClose'); if (c) c.click(); });
  await page.evaluate(() => document.getElementById('resumeDrop').click());
  const gone = await page.evaluate(() => document.getElementById('resumeCard').hidden && !localStorage.getItem('dd.run'));
  check(gone, 'Let it go forgets it');
  await ctx.close();
}
{
  /* a day later it is gone; the Daily Drop is never kept */
  const { page, ctx } = await open();
  await page.evaluate(() => localStorage.setItem('dd.run', JSON.stringify({ v: 1, at: Date.now() - 25 * 3600 * 1000, kind: 'shuffle', score: 999, solved: 3, time: 300000 })));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  check(await page.evaluate(() => document.getElementById('resumeCard').hidden), 'a run left for more than a day is not offered');
  await page.evaluate(() => { localStorage.removeItem('dd.pool'); document.getElementById('dailyStatus').click(); });
  await page.waitForTimeout(4500);
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForTimeout(400);
  check(await page.evaluate(() => !localStorage.getItem('dd.run')), 'the Daily Drop is never kept for later');
  await ctx.close();
}

/* ── 2. Tuck in ── */
{
  /* two seats need a room of grade 10 */
  const { page, ctx } = await open({ pals: { biscuit: { bond: 10, pet: null, bow: '' }, mochi: { bond: 0, pet: null, bow: '' } }, palsOn: ['biscuit', 'mochi'], room: { rug: 3, window: 3, wall: 3, shelf: 1 } });
  await page.evaluate(() => document.getElementById('moodPlay').click());
  await solve(page); await solve(page);
  await page.evaluate(() => document.getElementById('quitBtn').click());
  await page.waitForSelector('.pauseEnd', { timeout: 5000 });
  await page.evaluate(() => document.querySelector('.pauseEnd').click());
  await page.waitForFunction(() => !document.getElementById('over').hidden, null, { timeout: 6000 });
  await page.waitForTimeout(500);
  const offered = await page.evaluate(() => { const b = document.getElementById('tuckBtn'); const r = b.getBoundingClientRect(); return !b.hidden && r.height >= 44; });
  check(offered, 'Game Over offers Tuck in');
  await page.evaluate(() => document.getElementById('tuckBtn').click());
  await page.waitForTimeout(400);
  const t = await page.evaluate(() => ({ shown: !document.getElementById('tuck').hidden, cats: document.querySelectorAll('#tuckCats .tc').length, line: document.getElementById('tuckLine').textContent }));
  check(t.shown, 'the room goes dark');
  check(t.cats === 2, `the cats riding along are there, asleep (${t.cats})`);
  check(/2/.test(t.line), `and one line says what the session held ("${t.line}")`);
  await page.mouse.click(195, 400);
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => ({ hidden: document.getElementById('tuck').hidden, play: !document.getElementById('tabPlay').hidden }));
  check(back.hidden && back.play, 'a tap goes back to the menu');
  await ctx.close();
}

/* ── 3. Pet everyone ── */
{
  const cats = { biscuit: { bond: 0, pet: null, bow: '' }, noodle: { bond: 0, pet: null, bow: '' }, mochi: { bond: 0, pet: null, bow: '' } };
  const { page, ctx } = await open({ pals: cats, palsOn: ['biscuit'], yarn: 0, yarnEver: 0 });
  await goTab(page, 'Room');
  const shown = await page.evaluate(() => !document.getElementById('roomActs').hidden);
  check(shown, 'with three cats to pet, the Room offers Pet everyone');
  const y0 = (await sv(page)).yarn || 0;
  await page.evaluate(() => document.getElementById('petAll').click());
  await page.waitForTimeout(300);
  const s = await sv(page);
  const petted = ['biscuit', 'noodle', 'mochi'].filter(id => s.pals[id] && s.pals[id].pet).length;
  check(petted === 3 && (s.yarn || 0) - y0 === 6, `one tap pets all three (${petted}) and pays each one's 2 yarn (+${(s.yarn || 0) - y0})`);
  await ctx.close();
}

/* ── 4. the weekly copy ── */
{
  const { page, ctx } = await open({ backupAt: Date.now() - 8 * 24 * 3600 * 1000, xp: 9000 });
  const kept = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('dd.backup.1') || 'null'); return !!(o && o.save && o.at); });
  check(kept, 'a week after the last copy, a new one is kept at boot');
  await goTab(page, 'Settings');
  const row = await page.evaluate(() => ({ shown: !document.getElementById('weeklyRow').hidden, sub: document.getElementById('weeklySub').textContent }));
  check(row.shown && /level/i.test(row.sub), `Settings offers it back ("${row.sub}")`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
