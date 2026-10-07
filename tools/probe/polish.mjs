/* The logo, the two HUDs and the small comforts (v0.145.0).
 *
 *   1. The logo: the cat-drop mark sits before the name in the header and on the welcome card, hidden from screen
 *      readers (the name is still the text "Dopamine Drop"), each copy with its own gradient id so a hidden copy never
 *      blanks another.
 *   2. The menu's HUD: the yarn in the basket (a tap goes to the Room), the daily streak from two days (not before),
 *      the level's number on the ring; all of it inside a 320px screen at 150 percent text, where the words give way
 *      before the ring does.
 *   3. The in-game HUD: the top-left button says Pause in the player's language and is drawn as a pause; a timed run
 *      shows its clock in m:ss, counting down; a run with a best shows it, then "New best" and by how much once passed,
 *      once, with a moment; a run with no best shows nothing.
 *   4. The pause sheet says where the run stands; P pauses and resumes from a keyboard.
 *   5. The screen is kept awake while a run is live, let go on pause and at the end.
 *
 *   PORT=8400 SITE=/tmp/pw/cur node tools/probe/polish.mjs
 */
import { chromium } from 'playwright';
import { openApp, openMode, goTab, startShuffle } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

/* The app's own day key: the local date. */
const today = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
const newPage = async (state, vp, init) => {
  const page = await browser.newPage({ viewport: vp || { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  if (init) await page.addInitScript(init);
  await openApp(page, Object.assign({ onboarded: true, seen: { odd: 1 }, schema: 11 }, state));
  return page;
};
const oddAt = page => page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  if (!tiles.length) return null;
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const r = tiles[odd].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const waitBoard = page => page.waitForFunction(() => document.querySelectorAll('#surface .oddwrap .tile:not([disabled])').length > 1 && !document.getElementById('count'), null, { timeout: 12000, polling: 60 });

/* ── 1 and 2: the logo and the menu's HUD ── */
{
  const page = await newPage({ yarn: 191, yarnEver: 400, xp: 9000, runs: 40, solved: 600, reduceMotion: false, welcomeSeen: true });
  const h = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    const mark = document.querySelector('#chrome .logomark svg.logo'), wc = document.querySelector('#welcome .wclogo svg.logo');
    const r = mark ? mark.getBoundingClientRect() : null;
    return { mark: !!mark, hidden: mark ? mark.getAttribute('aria-hidden') : null, h: r ? Math.round(r.height) : 0,
      name: document.querySelector('#chrome .wordmark').textContent.replace(/\s+/g, ' ').trim(), wc: !!wc, dup: [...new Set(dup)] };
  });
  check(h.mark && h.hidden === 'true' && h.h >= 20, `the header carries the logo, hidden from screen readers (${h.h}px tall)`);
  check(h.name === 'Dopamine Drop', `and the name is still the text "Dopamine Drop" ("${h.name}")`);
  check(h.wc, 'the welcome card carries it too');
  check(h.dup.length === 0, `every copy has its own ids (${h.dup.length ? 'duplicated: ' + h.dup.join(',') : 'none duplicated'})`);
  /* The header's yarn is the basket's: the same number the Room shows (achievements pay out at boot, so not the seed). */
  const y = await page.evaluate(() => { const b = document.getElementById('hdrYarn'); return b && !b.hidden ? { n: document.getElementById('hdrYarnN').textContent, label: b.getAttribute('aria-label') } : null; });
  if (y) await page.evaluate(() => document.getElementById('hdrYarn').click());
  await page.waitForTimeout(500);
  const room = await page.evaluate(() => ({ open: !document.getElementById('tabRoom').hidden, n: (document.getElementById('yarnNum') || {}).textContent || '' }));
  const digits = x => String(x || '').replace(/\D/g, '');
  check(!!y && digits(y.n) === digits(room.n) && digits(y.n).length > 0 && (y.label || '').includes(y.n), `the header shows the yarn in the basket, the Room's own number (${y ? y.n + ' and ' + room.n + ', "' + y.label + '"' : 'none'})`);
  check(!!y && room.open, 'and a tap on it opens the Room');
  const badge = await page.evaluate(() => ({ b: (document.getElementById('lvlBadge') || {}).textContent || '', t: (document.getElementById('lvlTitle') || {}).textContent || '' }));
  check(badge.b !== '' && badge.b === digits(badge.t), `the level's number sits on the ring (${badge.b || 'nothing'} for "${badge.t}")`);
  await page.close();
}
{
  const shown = async n => { const page = await newPage({ dailyLast: today, dailyStreak: n }); const r = await page.evaluate(() => { const e = document.getElementById('hdrStreak'); return e ? { on: !e.hidden, n: document.getElementById('hdrStreakN').textContent, l: e.getAttribute('aria-label') } : null; }); await page.close(); return r; };
  const one = await shown(1), four = await shown(4);
  check(!!one && !one.on && !!four && four.on && four.n === '4' && /4/.test(four.l || ''), `the daily streak shows from two days, with a label (one day: ${one && one.on ? 'shown' : 'hidden'}; four: ${four ? four.n + ', "' + four.l + '"' : 'none'})`);
}
for (const [w, h, ts] of [[320, 568, '150'], [320, 568, '100'], [360, 640, '150']]){
  const page = await newPage({ yarn: 12345, yarnEver: 20000, xp: 900000, runs: 400, solved: 6000, textSize: ts, dailyStreak: 12, dailyLast: today }, { width: w, height: h });
  const r = await page.evaluate(() => {
    const c = document.getElementById('chrome'), out = [];
    c.querySelectorAll('*').forEach(e => { const b = e.getBoundingClientRect(); if (b.width && (b.right > innerWidth + 1 || b.left < -1)) out.push(e.id || e.className.baseVal || e.className); });
    const ring = (document.getElementById('lvlRing') || document.body).getBoundingClientRect();
    return { off: [...new Set(out)].slice(0, 4), ring: ring.width > 0 && ring.right <= innerWidth, side: document.documentElement.scrollWidth - innerWidth };
  });
  check(r.off.length === 0 && r.ring && r.side <= 0, `${w}x${h} at ${ts}%: the header fits, the level ring always shows${r.off.length ? ' (off: ' + r.off.join(',') + ')' : ''}`);
  await page.close();
}

/* ── 3, 4 and 5: the in-game HUD, the pause sheet, the keyboard, the wake lock ── */
const lockLog = () => {
  window.__locks = [];
  const fake = { request: () => { window.__locks.push('request'); const l = { released: false, _h: [], addEventListener(t, f){ this._h.push(f); },
    release(){ if (!this.released){ this.released = true; window.__locks.push('release'); this._h.forEach(f => f()); } return Promise.resolve(); } };
    return Promise.resolve(l); } };
  try { Object.defineProperty(navigator, 'wakeLock', { value: fake, configurable: true }); } catch(e){}
};
for (const lang of ['en', 'es']){
  const page = await newPage({ lang, marathon: { odd: 50 }, reduceMotion: lang === 'es' }, null, lockLog);
  const q = await page.evaluate(() => { const b = document.getElementById('quitBtn'); return { l: b.getAttribute('aria-label'), bars: b.querySelectorAll('svg rect').length }; });
  check(q.l === (lang === 'es' ? 'Pausa' : 'Pause') && q.bars === 2, `${lang}: the top-left button says "${q.l}" and is drawn as a pause (${q.bars} bars)`);
  if (lang === 'es'){ await page.close(); continue; }
  await openMode(page, 'odd', '#surface .oddwrap .tile');
  await waitBoard(page);
  const b0 = await page.evaluate(() => { const e = document.getElementById('hudBest'), c = document.getElementById('hudClock'); return e ? { on: !e.hidden, l: document.getElementById('hudBestL').textContent, n: document.getElementById('hudBestN').textContent, clock: !!c && !c.hidden } : { on: false, l: '', n: '', clock: false }; });
  check(b0.on && /best/i.test(b0.l) && b0.n === '50', `a run with a best shows it beside the multiplier ("${b0.l} ${b0.n}")`);
  check(!b0.clock, 'a run with no clock shows none');
  const locks0 = await page.evaluate(() => window.__locks.slice());
  check(locks0.includes('request'), `the screen is kept awake once the run is live (${locks0.join(',') || 'nothing asked'})`);
  /* solve until the score passes 50 */
  let beat = null;
  for (let k = 0; k < 6 && !beat; k++){
    await waitBoard(page); await page.waitForTimeout(250);
    const at = await oddAt(page); await page.mouse.click(at.x, at.y); await page.waitForTimeout(600);
    beat = await page.evaluate(() => { const e = document.getElementById('hudBest'); return e && e.classList.contains('beat') ? { l: document.getElementById('hudBestL').textContent, n: document.getElementById('hudBestN').textContent } : null; });
  }
  check(!!beat && /new best/i.test(beat.l) && /^\+\d/.test(beat.n), `past it, the chip says so and by how much (${beat ? beat.l + ' ' + beat.n : 'never passed'})`);
  /* P pauses, the sheet says where the run stands, P resumes */
  await waitBoard(page);
  await page.keyboard.press('p'); await page.waitForTimeout(300);
  const ps = await page.evaluate(() => { const b = document.querySelector('.pausebox'); const s = b && b.querySelector('.pausesofar'); return { open: !!b, sofar: s ? s.textContent : '' }; });
  check(ps.open, 'P pauses the run');
  check(/points/.test(ps.sofar) && /solved/.test(ps.sofar), `the pause sheet says where the run stands ("${ps.sofar}")`);
  const locks1 = await page.evaluate(() => window.__locks.slice());
  check(locks1[locks1.length - 1] === 'release', `pausing lets the screen sleep again (${locks1.join(',')})`);
  await page.keyboard.press('p'); await page.waitForTimeout(1600);
  const resumed = await page.evaluate(() => !document.querySelector('.pausebox'));
  const locks2 = await page.evaluate(() => window.__locks.slice());
  check(resumed && locks2[locks2.length - 1] === 'request', `P resumes, and the screen is kept awake again (${locks2.join(',')})`);
  /* end the run */
  for (let k = 0; k < 30; k++){
    if (await page.evaluate(() => !document.getElementById('over').hidden)) break;
    await page.evaluate(() => { const t = [...document.querySelectorAll('#surface .oddwrap .tile:not([disabled])')]; if (t.length) t[t.length - 1].click(); });
    await page.waitForTimeout(280);
  }
  const locks3 = await page.evaluate(() => window.__locks.slice());
  check(await page.evaluate(() => !document.getElementById('over').hidden) && locks3[locks3.length - 1] === 'release', `the end of the run lets it go (${locks3.join(',')})`);
  await page.close();
}
/* a timed run: the clock in m:ss, counting down; and no best chip when there is no best yet */
{
  const page = await newPage({ pbBlitz: 0, reduceMotion: true });
  await startShuffle(page);
  await page.waitForFunction(() => { const c = document.getElementById('hudClock'); return c && !c.hidden; }, null, { timeout: 12000 }).catch(() => {});
  const c1 = await page.evaluate(() => { const c = document.getElementById('hudClock'), b = document.getElementById('hudBest'); return { on: !!c && !c.hidden, t: c ? c.textContent : '', best: !!b && !b.hidden }; });
  await page.waitForTimeout(2200);
  const c2 = await page.evaluate(() => { const c = document.getElementById('hudClock'); return c ? c.textContent : ''; });
  const sec = s => { const m = /^(\d+):(\d\d)$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
  check(c1.on && /^\d+:\d\d$/.test(c1.t) && sec(c2) < sec(c1.t), `a timed run shows its clock in m:ss, counting down (${c1.t} then ${c2})`);
  check(!c1.best, 'with no best yet, there is nothing to chase on screen');
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + [...new Set(errs)].join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nThe logo, both HUDs and the small comforts are in place');
process.exit(bad ? 1 : 0);
