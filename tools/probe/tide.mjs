/* Purr: the same speed on every screen, and a purr you can feel.
 *
 *   - holding for 0.6 s swells the cat by the same amount on a 60 Hz screen, on a 120 Hz one (the page's animation frames are
 *     replaced by a 120 Hz clock) and at 30 Hz: it used to move one step per frame, so a 120 Hz phone ran it twice as fast
 *   - the Game speed setting slows it: Slow is about 0.62 of normal
 *   - holding the bubble in the band, with a real mouse, fills the paws and wins, at a new and at a higher level
 *   - while the cat is in the band the phone pulses a few times a second, and is quiet when it is out
 *
 *   node tools/probe/tide.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, { hz = 0, speed = 'normal', haptics = false } = {}) => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(([hz, count]) => {
    window.__buzz = 0;
    if (count) navigator.vibrate = () => { window.__buzz++; return true; };
    if (hz){
      window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 1000 / hz);
      window.cancelAnimationFrame = id => clearTimeout(id);
    }
  }, [hz, haptics]);
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics, gameSpeed: speed, onboarded: true, seen: { tide: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'tide');
  await page.waitForSelector('#surface .tidebox .tidebub', { timeout: 9000 }); await page.waitForTimeout(900);
  return page;
};
const size = page => page.evaluate(() => ({ bub: parseFloat(document.querySelector('.tidebub').style.width) / 100, band: parseFloat(document.querySelector('.tideband').style.width) / 100,
  ok: document.querySelector('.tidebox').classList.contains('ok'), done: document.querySelectorAll('.tidepip.on').length, pips: document.querySelectorAll('.tidepip').length, buzz: window.__buzz }));
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const box = page => page.evaluate(() => { const r = document.querySelector('.tidebox').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.8]; });

/* ── the same speed on every screen ───────────────────────────────────────────────────────────────────────────────────── */
const grew = {};
for (const [label, hz, speed, lo, hi] of [['60 Hz', 0, 'normal', 0.17, 0.33], ['120 Hz', 120, 'normal', 0.17, 0.33], ['30 Hz', 30, 'normal', 0.17, 0.33], ['Slow game speed', 0, 'slow', 0.09, 0.22]]){
  const page = await open(0, { hz, speed }); const [x, y] = await box(page);
  const a = await size(page);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(600); const b = await size(page); await page.mouse.up();
  const d = b.bub - a.bub; grew[label] = d;
  check(d > lo && d < hi, `${label}: holding for 0.6 s swells the cat by ${d.toFixed(3)} (wanted ${lo} to ${hi})`);
  await page.close();
}
check(Math.abs(grew['120 Hz'] - grew['60 Hz']) < 0.07 && Math.abs(grew['30 Hz'] - grew['60 Hz']) < 0.07, `60, 120 and 30 Hz agree (${grew['60 Hz'].toFixed(3)}, ${grew['120 Hz'].toFixed(3)}, ${grew['30 Hz'].toFixed(3)})`);

/* ── a servo that holds the cat in the band wins, and the phone purrs while it does ──────────────────────────────────── */
for (const [xp, label, hz] of [[0, 'a new player', 0], [12000, 'a higher level', 0], [0, 'a new player at 120 Hz', 120]]){
  const page = await open(xp, { hz, haptics: true }); const [x, y] = await box(page);
  await page.mouse.move(x, y);
  let down = false, won = false, sawOk = 0, sawOut = 0, buzzIn = 0, lastBuzz = 0, lastOk = false, t0 = Date.now(), fills = 0;
  while (Date.now() - t0 < 60000){
    const s = await size(page);
    const want = s.bub < s.band;               /* swell when below the band, settle when above it */
    if (want && !down){ await page.mouse.down(); down = true; } else if (!want && down){ await page.mouse.up(); down = false; }
    if (s.ok) sawOk++; else sawOut++;
    fills = Math.max(fills, s.done);
    if (await score(page) > 0){ won = true; break; }
    await page.waitForTimeout(25);
  }
  if (down) await page.mouse.up();
  const fin = await size(page).catch(() => ({ buzz: 0 }));
  check(won, `${label}: holding the cat in the band wins the round (${Math.round((Date.now() - t0) / 1000)}s, ${fills} paws filled before the end)`);
  check(fin.buzz >= 3, `${label}: the phone pulsed while the cat was in the band (${fin.buzz} pulses)`);
  await page.close();
}
{
  /* and it is quiet when you are not in the band: never touching the screen, the cat sinks to the floor of the box, and on its way it may
     pass through the band once. Every pulse must come while the cat is in the band (or in the sample just before or after). */
  const page = await open(0, { haptics: true });
  const samples = [];
  for (let k = 0; k < 90; k++){ const s = await size(page); samples.push({ ok: s.ok, buzz: s.buzz }); await page.waitForTimeout(40); }
  let stray = 0;
  for (let i = 1; i < samples.length; i++){
    const grew = samples[i].buzz - samples[i - 1].buzz;
    const near = [samples[i - 2], samples[i - 1], samples[i], samples[i + 1]].some(x => x && x.ok);
    if (grew > 0 && !near) stray += grew;
  }
  check(stray === 0, `the phone pulses only while the cat is in the band (${samples[samples.length - 1].buzz} pulses in 3.6 s, ${stray} outside it)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nPurr runs at the same speed on every screen');
process.exit(bad ? 1 : 0);
