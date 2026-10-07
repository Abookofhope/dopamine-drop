/* Sound captions: a short word on screen for each sound that carries information.
 *
 *   - a switch in Sound settings, off by default, in a 44px row with a name; the Easy to see preset
 *     turns it on and Reset to defaults turns it off again
 *   - off: a solve and a miss show nothing
 *   - on: a solve, a miss, the count-in, the go and the end of a run each show their word, whether or
 *     not the sound itself is on (the probe seeds sound off), it goes away by itself, it is hidden
 *     from screen readers (the live toasts already say these things) and it never takes a tap
 *   - it sits inside a 320px screen at 150 percent text
 *   - it is in en, fr, es and de
 *
 * A run is held on one board (Odd Skein) with a probe-only pool. Captions are read by watching the
 * pill's text change from page load on, so a word that shows for a second is still seen.
 *
 *   node tools/probe/captions.mjs
 */
import { chromium } from 'playwright';
import { openApp, startShuffle, goTab, openPanels } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const oddAt = (page, wrong) => page.evaluate(wrong => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  const light = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  const dark = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1);
  const uniq = cols.findIndex(c => n[key(c)] === 1);
  let pick = /lightest|plus claire|más claro|hellste/i.test(prompt) ? light : /darkest|plus foncée|más oscuro|dunkelste/i.test(prompt) ? dark : uniq;
  if (wrong){ pick = tiles.findIndex((t, i) => !t.disabled && i !== light && i !== dark && i !== uniq); }
  if (pick < 0) return null;
  const r = tiles[pick].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, wrong);
const boardUp = async page => {
  await page.waitForFunction(() => { const t = document.querySelector('#surface .oddwrap .tile'); return t && !t.dataset.old && !t.disabled; },
    null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(150);
};
const mark = page => page.evaluate(() => document.querySelectorAll('#surface .oddwrap .tile').forEach(t => { t.dataset.old = '1'; }));
const doneCount = page => page.evaluate(() => +document.getElementById('play').dataset.done || 0);
async function playRound(page, step){
  const before = await doneCount(page);
  for (let i = 0; i < 12; i++){
    if (step === 'hit'){ await boardUp(page); await mark(page); }
    else await page.waitForFunction(() => [...document.querySelectorAll('#surface .oddwrap .tile')].some(t => !t.disabled), null, { timeout: 8000, polling: 100 });
    const at = await oddAt(page, step === 'miss');
    if (!at) return;
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(260);
    if (await doneCount(page) > before) return;
  }
}
/* Every word the pill has shown, in order, from now on. */
const watch = page => page.evaluate(() => {
  window.__caps = [];
  const t = document.getElementById('sndCapTxt'), box = document.getElementById('sndCap');
  if (!t) return;
  new MutationObserver(() => { if (t.textContent) window.__caps.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true });
});
const caps = page => page.evaluate(() => window.__caps || []);
const shown = page => page.evaluate(() => { const b = document.getElementById('sndCap'); return !!b && !b.hidden && b.getClientRects().length > 0; });

async function open(state, { vw = 360, vh = 640, lang = 'en' } = {}){
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ xp: 4000, runs: 12, solved: 80, seen: { odd: 1, order: 1 }, schema: 11,
    sound: false, haptics: false, reduceMotion: true, lang }, state));
  return page;
}

/* ── 1. the setting ── */
{
  const page = await open({});
  await goTab(page, 'Settings');
  await openPanels(page, 'feedback');
  const sw = await page.evaluate(() => {
    const s = document.getElementById('swCaps'); if (!s) return null;
    const row = s.closest('.setrow').getBoundingClientRect();
    return { on: s.getAttribute('aria-checked'), h: row.height, label: s.getAttribute('aria-label'), inSound: !!s.closest('#accB_feedback') };
  });
  check(!!sw, 'Settings has a Sound captions switch');
  if (!sw){
    console.log('\nthis build has no sound captions: the rest of the probe is skipped');
    console.log(`\n${bad} check(s) FAILED`);
    await browser.close(); process.exit(1);
  }
  check(sw.on === 'false', 'it is off by default');
  check(sw.h >= 44, 'its row is at least 44px high (' + Math.round(sw.h) + ')');
  check(/caption/i.test(sw.label || ''), 'it has an accessible name (' + sw.label + ')');
  check(sw.inSound, 'it sits with the other sound settings');
  /* The Easy to see preset turns it on; Reset to defaults turns it off. */
  await page.evaluate(() => document.querySelector('#accB_presets [data-p="easy"]').click());
  await page.waitForTimeout(300);
  check(await page.evaluate(() => document.getElementById('swCaps').getAttribute('aria-checked')) === 'true', 'the Easy to see preset turns it on');
  await page.evaluate(() => document.querySelector('#accB_presets [data-p="default"]').click());
  await page.waitForTimeout(300);
  check(await page.evaluate(() => document.getElementById('swCaps').getAttribute('aria-checked')) === 'false', 'Reset to defaults turns it off');
  await page.close();
}

/* ── 2. off: nothing shows ── */
{
  const page = await open({});
  await watch(page);
  await startShuffle(page);
  await boardUp(page);
  await playRound(page, 'hit');
  await playRound(page, 'miss');
  await page.waitForTimeout(400);
  check((await caps(page)).length === 0 && !(await shown(page)), 'with captions off a solve, a miss and the count-in show nothing (' + JSON.stringify(await caps(page)) + ')');
  await page.close();
}

/* ── 3. on: each sound has its word ── */
{
  const page = await open({ captions: true });
  await watch(page);
  await startShuffle(page);
  await boardUp(page);
  const seen = await caps(page);
  check(seen.some(x => /tick/i.test(x)), 'the count-in shows its tick (' + JSON.stringify(seen) + ')');
  check(seen.some(x => /ping|go/i.test(x)), 'and the go (' + JSON.stringify(seen) + ')');
  await playRound(page, 'hit');
  check((await caps(page)).some(x => /chime|solved/i.test(x)), 'a solve shows its chime');
  const hit = await page.evaluate(() => {
    const b = document.getElementById('sndCap'), r = b.getBoundingClientRect();
    return { hidden: b.hidden, aria: b.getAttribute('aria-hidden'), pe: getComputedStyle(b).pointerEvents, w: Math.round(r.width) };
  });
  check(hit.aria === 'true', 'the pill is hidden from screen readers (the toasts already speak)');
  check(hit.pe === 'none', 'and takes no taps (pointer-events ' + hit.pe + ')');
  await playRound(page, 'miss');
  check((await caps(page)).some(x => /buzz|miss/i.test(x)), 'a miss shows its buzz (' + JSON.stringify((await caps(page)).slice(-3)) + ')');
  await page.waitForTimeout(1900);
  check(!(await shown(page)), 'the caption goes away by itself');
  /* End the run: the falling notes. */
  await page.click('#quitBtn'); await page.waitForTimeout(300);
  await page.click('.pausebox .pauseEnd'); await page.waitForTimeout(900);
  check((await caps(page)).some(x => /falling|run over/i.test(x)), 'the end of a run shows its notes');
  await page.close();
}

/* ── 4. a 320px phone at 150 percent text ── */
{
  const page = await open({ captions: true, textSize: '150' }, { vw: 320, vh: 568 });
  await startShuffle(page);
  await boardUp(page);
  await playRound(page, 'hit');
  const widest = await page.evaluate(() => {
    const b = document.getElementById('sndCap');
    const words = ['Rising chimes: streak up', 'Falling notes: run over', 'Rising notes: level up'];
    const t = document.getElementById('sndCapTxt');
    let out = [];
    for (const w of words){
      t.textContent = w; b.hidden = false;
      const r = b.getBoundingClientRect();
      out.push({ w, left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, bottom: Math.round(r.bottom) });
    }
    b.hidden = true;
    return out;
  });
  check(widest.every(x => x.left >= 0 && x.right <= x.vw && x.bottom <= x.vh), 'the longest words fit inside 320x568 at 150 percent text (' + widest.map(x => x.left + '..' + x.right).join(', ') + ')');
  await page.close();
}

/* ── 5. every language ── */
for (const [lang, good, bad2] of [['fr', /carillon/i, /bourdonnement/i], ['es', /campanilla/i, /zumbido/i], ['de', /glöckchen/i, /brummen/i]]){
  const page = await open({ captions: true, lang });
  await watch(page);
  await startShuffle(page);
  await boardUp(page);
  await playRound(page, 'hit');
  await playRound(page, 'miss');
  const seen = await caps(page);
  check(seen.some(x => good.test(x)) && seen.some(x => bad2.test(x)), lang + ': the solve and the miss are captioned in ' + lang + ' (' + JSON.stringify(seen.slice(-3)) + ')');
  await page.close();
}

check(errs.length === 0, 'no page errors' + (errs.length ? ' (' + errs[0] + ')' : ''));
await browser.close();
console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed');
process.exit(bad ? 1 : 0);
