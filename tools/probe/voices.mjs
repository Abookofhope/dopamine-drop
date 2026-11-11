/* Every game's taps speak in its family's voice (v0.169.0).
 *
 * Every game used to click the same square blip. Now a tap inside a live round plays the family's voice (a wave, a
 * register, a length), in the family's key like every other sound; menus keep the plain tap. Read off the oscillators
 * the page starts (their wave, and the pitch each schedules):
 *   1. Every family has a voice, and no two families share one (from the build).
 *   2. Odd Skein's Smooth button (focus) and Pond Skate's Hint (logic) each play their family's voice at its pitch in the
 *      family's key.
 *   3. A tap in the menus is still the plain square tap.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/voices.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, goTab } from './harness.mjs';
import { builtSource } from './built.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 140)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const src = builtSource(process.env.SITE || '/tmp/pw/_site');

/* ── 1. the voices, from the build ── */
const vsrc = (src.match(/const VOICE = \{([\s\S]*?)\n\};/) || [])[1] || '';
const VOICE = Object.fromEntries([...vsrc.matchAll(/\n  (\w+):\s*\{ w: '(\w+)',\s*f: ([\d.]+)/g)].map(m => [m[1], { w: m[2], f: +m[3] }]));
const CATS = [...((src.match(/const CATS = \[([\s\S]*?)\n\];/) || [])[1] || '').matchAll(/id:'(\w+)'/g)].map(m => m[1]);
const TONE = Object.fromEntries([...((src.match(/const CAT_TONE = \{([^}]*)\}/) || [])[1] || '').matchAll(/(\w+):\s*(-?\d+)/g)].map(m => [m[1], +m[2]]));
check(CATS.length >= 8 && CATS.every(c => VOICE[c]), `every family has a voice (${Object.keys(VOICE).length} voices for ${CATS.length} families)`);
const sig = Object.values(VOICE).map(v => v.w + v.f);
check(new Set(sig).size === sig.length, 'and no two families share one');

const browser = await chromium.launch();
const errs = [];
async function open(){
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem('dd.probe', '1');
    window.__osc = [];
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const make = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function(){ const o = make.call(this); const st = o.start.bind(o), sv = o.frequency.setValueAtTime.bind(o.frequency);
      o.frequency.setValueAtTime = (v, t) => { if (o.__f === undefined) o.__f = v; return sv(v, t); };
      o.start = (...a) => { window.__osc.push({ type: o.type, f: o.__f !== undefined ? o.__f : o.frequency.value, t: performance.now() }); return st(...a); }; return o; };
  });
  await openApp(page, { reduceMotion: true, onboarded: true, sound: true, xp: 9000, runs: 40, solved: 600, seen: { odd: 1, skate: 1 } });
  return page;
}
const since = (page, t) => page.evaluate(t => window.__osc.filter(o => o.t >= t), t);
const now = page => page.evaluate(() => performance.now());
const near = (f, want) => Math.abs(f / want - 1) < 0.02;   /* the tap detunes by up to 1.5 percent */
const expect = fam => VOICE[fam] ? VOICE[fam].f * Math.pow(2, (TONE[fam] || 0) / 12) : NaN;

/* ── 2. two families in play ── */
for (const [id, fam, press] of [['odd', 'focus', () => [...document.querySelectorAll('#surface .sumtool')].find(b => /smooth/i.test(b.textContent))],
                                 ['skate', 'logic', () => document.querySelector('#surface .pondtools .sumtool')]]){
  const page = await open();
  await page.evaluate(id => localStorage.setItem('dd.pool', id), id);
  await openModeList(page); await clickMode(page, id);
  for (let k = 0; k < 100 && !(await page.evaluate(() => document.getElementById('play').classList.contains('live'))); k++) await page.waitForTimeout(100);
  await page.waitForTimeout(300);
  const t0 = await now(page);
  await page.evaluate(f => { const b = (0, eval)('(' + f + ')')(); if (b) b.click(); }, press.toString());
  await page.waitForTimeout(250);
  const o = await since(page, t0), want = expect(fam);
  check(!!VOICE[fam] && o.some(x => x.type === VOICE[fam].w && near(x.f, want)), `${id} (${fam}): a tap plays the ${fam} voice, ${(VOICE[fam] || {}).w} near ${Math.round(want)} Hz (${o.map(x => x.type + ' ' + Math.round(x.f)).join(', ') || 'nothing'})`);
  await page.close();
}

/* ── 3. the menus keep the plain tap ── */
{
  const page = await open();
  const t0 = await now(page);
  /* What's new, then "Older updates": a menu button that plays the tap */
  await page.evaluate(() => document.getElementById('logBtn').click()); await page.waitForTimeout(300);
  const t1 = await now(page);
  await page.evaluate(() => { const b = document.querySelector('#logList .logmore'); if (b) b.click(); });
  await page.waitForTimeout(250);
  const o = await since(page, t1);
  check(o.some(x => x.type === 'square' && near(x.f, 520)), `a tap in the menus is still the plain square tap near 520 Hz (${o.map(x => x.type + ' ' + Math.round(x.f)).join(', ') || 'silent'})`);
  await page.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nevery family of games has a voice of its own');
process.exit(bad ? 1 : 0);
