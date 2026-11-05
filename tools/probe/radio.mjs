/* Room Radio: music made as you play (v0.148.0).
 *
 * The music is generated in Web Audio, so a headless browser cannot listen to it; the probe reads its state instead
 * (`window.__radio`, under dd.probe) and checks the behaviour the bible specifies: it starts with a run when Sound
 * and Music are on, its layers follow the multiplier, a miss muffles it, a pause silences it and a resume brings it
 * back, the end of a run resolves and stops it, and it never starts when Sound or Music is off, nor in Fidget Loop.
 * Chromium is launched with autoplay allowed, so its audio clock runs without a real tap.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/radio.mjs
 */
import { chromium } from 'playwright';
import { openApp } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errs = [];

const oddAt = page => page.evaluate(() => {
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
  const at = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  return { odd: at(ts[odd]), wrong: at(ts[(odd + 1) % ts.length]) };
});
const live = page => page.waitForFunction(() => {
  const p = document.getElementById('play'), sf = document.getElementById('surface');
  return !p.hidden && !document.getElementById('count') && !!document.querySelector('#surface .oddwrap .tile')
    && ![...sf.children].some(c => c.classList.contains('swap')) && document.getElementById('prompt').className === 'prompt';
}, null, { timeout: 12000, polling: 60 }).then(() => true, () => false);
const st = page => page.evaluate(() => window.__radio ? window.__radio.state() : null);
async function solve(page){
  if (!await live(page)) return false;
  const s0 = await page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')) || {}).solved | 0);
  for (let i = 0; i < 10; i++){
    const t = await oddAt(page); if (!t){ await page.waitForTimeout(80); continue; }
    await page.mouse.click(t.odd.x, t.odd.y); await page.waitForTimeout(90);
    if ((await page.evaluate(() => (JSON.parse(localStorage.getItem('dd.v1')) || {}).solved | 0)) > s0) return true;
  }
  return false;
}
async function open(state = {}, start = 'moodPlay'){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ reduceMotion: true, sound: true, music: true, musicVol: 0.5, xp: 9000, runs: 40, solved: 600, onboarded: true }, state));
  await page.mouse.click(5, 5);                  /* a real gesture, as a player's first tap would be */
  await page.evaluate(id => document.getElementById(id).click(), start);
  return { page, ctx };
}

/* ── 1. the music follows the run ── */
{
  const { page, ctx } = await open();
  await live(page); await page.waitForTimeout(800);
  const a = await st(page);
  check(!!a, 'the radio is there (probe hook)');
  if (a){
    check(a.on && a.ctx === 'running', `it plays once a run starts (on ${a.on}, audio ${a.ctx})`);
    await page.waitForTimeout(1500);
    const b = await st(page);
    check(b.steps - a.steps >= 3 && b.steps - a.steps <= 5, `and keeps time: ${b.steps - a.steps} eighth notes in 1.5 s at 76 bpm (want 3 to 5)`);
    check(b.heat === 1, `at ×1 it is the pad alone (heat ${b.heat})`);
    for (let i = 0; i < 4; i++) await solve(page);
    await page.waitForTimeout(300);
    const c = await st(page);
    check(c.heat >= 2, `four solves in a row bring in the next layer (heat ${c.heat})`);
    /* a miss muffles it */
    await live(page);
    /* Odd Skein gives a try or two before a wrong tile is a miss: keep choosing wrong ones until the round is lost. */
    for (let i = 0; i < 5; i++){
      const t = await page.evaluate(() => { const b = [...document.querySelectorAll('#surface .oddwrap .tile:not([disabled])')];
        if (document.getElementById('prompt').className !== 'prompt' || b.length < 2) return null;
        const rgb = e => getComputedStyle(e).backgroundColor; const n = {}; b.forEach(x => n[rgb(x)] = (n[rgb(x)] || 0) + 1);
        const w = b.find(x => n[rgb(x)] > 1) || b[0]; const r = w.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (!t) break;
      await page.mouse.click(t.x, t.y); await page.waitForTimeout(140);
    }
    await page.waitForTimeout(80);
    const d = await st(page);
    check(d.lp < 4000 && d.on, `a miss muffles it without stopping it (filter at ${Math.round(d.lp)} Hz)`);
    await page.waitForTimeout(1800);
    check((await st(page)).lp > 9000, 'and it opens up again a moment later');
    check((await st(page)).heat === 1, 'and the layers drop back with the streak');
    /* pause and resume */
    await live(page);
    await page.evaluate(() => document.getElementById('quitBtn').click());
    await page.waitForTimeout(900);
    const p = await st(page);
    check(!p.on && p.gain < 0.01, `pausing silences it (on ${p.on}, gain ${p.gain.toFixed(4)})`);
    await page.evaluate(() => document.querySelector('.pauseGo').click());
    await live(page); await page.waitForTimeout(1600);
    check((await st(page)).on, 'resuming brings it back');
    /* the end */
    await page.evaluate(() => document.getElementById('quitBtn').click());
    await page.waitForSelector('.pauseEnd', { timeout: 5000 });
    await page.evaluate(() => document.querySelector('.pauseEnd').click());
    await page.waitForTimeout(3200);
    const e = await st(page);
    const e2 = (await page.waitForTimeout(600), await st(page));
    check(!e.on && e2.steps === e.steps, `Game Over resolves it and it stops (steps ${e.steps} then ${e2.steps})`);
  }
  await ctx.close();
}

/* ── 2. it stays silent when it should ── */
for (const [state, what, start] of [[{ music: false }, 'Music is off', 'moodPlay'], [{ sound: false }, 'Sound is off', 'moodPlay'],
                                    [{ musicVol: 0 }, 'the music volume is at zero', 'moodPlay'], [{}, 'in Fidget Loop', 'zenBtn']]){
  const { page, ctx } = await open(state, start);
  await page.waitForTimeout(4500);
  const s = await st(page);
  check(!!s && !s.on, `it does not play when ${what}`);
  await ctx.close();
}

/* ── 3. the Music switch in Settings works mid-run ── */
{
  const { page, ctx } = await open();
  await live(page); await page.waitForTimeout(600);
  const before = await st(page);
  await page.evaluate(() => document.getElementById('swMusic').click());
  await page.waitForTimeout(600);
  const after = await st(page);
  check(before && before.on && after && !after.on, 'turning Music off in a run stops it');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).music);
  check(saved === false, 'and the switch is kept');
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nall passed');
process.exit(bad ? 1 : 0);
