/* The level-up moment, and the reward that travels.
 *
 *   - a level earned mid-run waits for the run to end (it never freezes the board)
 *   - the card then stays until the player closes it: it used to be gone after 1.9 s
 *   - it says what the run was worth (XP), the colour that level unlocked and what is next
 *   - it closes with its button, Escape or a tap outside the card, and hands focus back
 *   - it is a dialog (name, modal), in four languages, and reachable on a short landscape phone
 *   - a solve sends a token from the solved piece to the score (none with reduced motion)
 *
 *   node tools/probe/levelup.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

/* Level 9 with five points to go: one solve (+8) makes level 10, which unlocks the gold victory colour. */
const SEED = { xp: 805, runs: 12, solved: 80, sound: false, haptics: false, onboarded: true, seen: { odd: 1 }, schema: 11 };

const oddIndex = page => page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')];
  const prompt = document.getElementById('prompt').textContent.trim();
  const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cols = tiles.map(rgb), key = c => c.join(',');
  let odd;
  if (/lightest|plus clair|más claro|hellste/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) > lum(cols[b]) ? i : b, 0);
  else if (/darkest|plus foncé|más oscuro|dunkelste/i.test(prompt)) odd = cols.reduce((b, c, i) => lum(c) < lum(cols[b]) ? i : b, 0);
  else { const n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1); odd = cols.findIndex(c => n[key(c)] === 1); }
  const r = tiles[odd].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));

/* Solve one board (flyers are looked for on the way), then lose on purpose. */
async function playAndLose(page, wantFlyer){
  let flyer = false, solved = false;
  for (let k = 0; k < 8 && !solved; k++){
    await page.waitForSelector('#surface .oddwrap .tile'); await page.waitForTimeout(500);
    if (await score(page) > 0) break;
    const at = await oddIndex(page);
    await page.mouse.click(at.x, at.y);
    if (wantFlyer !== null){
      for (let w = 0; w < 6 && !flyer; w++){ await page.waitForTimeout(60); flyer = await page.evaluate(() => !!document.querySelector('.flyer')); }
    }
    await page.waitForTimeout(700);
    solved = (await score(page)) > 0;
  }
  const midRun = await page.evaluate(() => !document.getElementById('levelup').hidden);
  for (let k = 0; k < 16; k++){
    if (await page.evaluate(() => !document.getElementById('over').hidden)) break;
    await page.evaluate(() => { const t = document.querySelector('#surface .tile:not(.ruled):not([disabled])'); if (t) t.click(); });
    await page.waitForTimeout(2300);
  }
  return { solved, flyer, midRun };
}

async function newRun(vp, extra = {}){
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { ...SEED, ...extra });
  await openModeList(page); await clickMode(page, 'odd');
  await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(900);
  return page;
}
const card = page => page.evaluate(() => {
  const h = document.getElementById('levelup'), c = h.querySelector('.card'), ok = document.getElementById('luOk');
  const r = ok ? ok.getBoundingClientRect() : { height: 0, top: -1, bottom: -1 };
  return { shown: !h.hidden && h.getBoundingClientRect().height > 0, title: document.getElementById('luTitle').textContent,
    rew: [...document.querySelectorAll('#luRew li')].map(l => ({ t: l.textContent, dot: !!l.querySelector('.dot'), next: l.classList.contains('next') })),
    role: h.getAttribute('role'), modal: h.getAttribute('aria-modal'), named: !!h.getAttribute('aria-labelledby'),
    focusOk: !!ok && document.activeElement === ok, okH: Math.round(r.height), okInside: r.top >= 0 && r.bottom <= innerHeight,
    scrolls: h.scrollHeight > h.clientHeight + 1, cardW: Math.round(c ? c.getBoundingClientRect().width : 0), sideways: document.documentElement.scrollWidth - innerWidth };
});

/* ── 1. the whole moment, in English on a phone, closed three ways ── */
for (const how of ['button', 'escape', 'outside']){
  const page = await newRun({ width: 360, height: 640 }, { reduceMotion: false, lang: 'en' });
  const r = await playAndLose(page, how === 'button' ? true : null);
  check(r.solved, `${how}: one board solved`);
  check(!r.midRun, `${how}: the level card waits for the run to end`);
  await page.waitForTimeout(2300);
  let c = await card(page);
  check(c.shown && /10/.test(c.title), `${how}: the card shows level 10 after the run ("${c.title}")`);
  check(c.role === 'dialog' && c.modal === 'true' && c.named, `${how}: it is a named modal dialog`);
  check(c.focusOk && c.okH >= 44, `${how}: focus is on a button at least 44px tall (${c.okH}px)`);
  check(c.rew.some(x => /\+\d+ XP/.test(x.t)), `${how}: it says what the run was worth (${c.rew.map(x => x.t).join(' | ')})`);
  check(c.rew.some(x => x.dot && !x.next && /Gold/i.test(x.t)), `${how}: it names the colour level 10 unlocked`);
  check(c.rew.some(x => x.next), `${how}: it says what comes next`);
  if (how === 'button'){
    check(r.flyer, 'a solve sends a token toward the score');
    const gone = await page.evaluate(() => new Promise(res => setTimeout(() => res(!document.querySelector('.flyer')), 900)));
    check(gone, 'and the token is removed again');
  }
  await page.waitForTimeout(4500);
  c = await card(page);
  check(c.shown, `${how}: still there four and a half seconds later (it used to vanish after 1.9)`);
  if (how === 'button') await page.evaluate(() => { const b = document.getElementById('luOk'); if (b) b.click(); });
  else if (how === 'escape') await page.keyboard.press('Escape');
  else await page.mouse.click(8, 8);
  await page.waitForTimeout(400);
  c = await card(page);
  check(!c.shown, `${how}: it closes`);
  const home = await page.evaluate(() => { const b = document.getElementById('homeBtn').getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return t && (t.id === 'homeBtn' || !!t.closest('#homeBtn')); });
  check(home, `${how}: Game Over is underneath, with Back to menu reachable`);
  await page.close();
}

/* ── 2. reduced motion: the card is the same, nothing flies or sparks ── */
{
  const page = await newRun({ width: 360, height: 640 }, { reduceMotion: true, lang: 'en' });
  const r = await playAndLose(page, true);
  check(r.solved && !r.flyer, 'reduced motion: a solve sends no token');
  await page.waitForTimeout(2300);
  const c = await card(page);
  const sparks = await page.evaluate(() => document.querySelectorAll('#levelup .burst').length);
  check(c.shown && sparks === 0, `reduced motion: the card shows with no sparks (${sparks})`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.close();
}

/* ── 3. other languages and shapes ── */
for (const [w, h, lang, hint] of [[320, 568, 'de', /Level 10/], [568, 320, 'fr', /Niveau 10/], [390, 844, 'es', /Nivel 10/]]){
  const page = await newRun({ width: w, height: h }, { reduceMotion: true, lang });
  const r = await playAndLose(page, null);
  await page.waitForTimeout(2300);
  const c = await card(page);
  const tag = `${w}x${h} ${lang}`;
  check(r.solved && c.shown && hint.test(c.title), `${tag}: the card shows in the player's language ("${c.title}")`);
  check(c.rew.length >= 2 && c.rew.every(x => !/\{|undefined/.test(x.t)), `${tag}: every line is filled in (${c.rew.map(x => x.t).join(' | ')})`);
  check(c.sideways <= 0, `${tag}: no sideways scroll`);
  check(c.okInside || c.scrolls, `${tag}: the button is on screen, or the card scrolls to it`);
  if (!c.okInside) await page.evaluate(() => { const o = document.getElementById('luOk'); if (o) o.scrollIntoView(); });
  const reach = await page.evaluate(() => { const o = document.getElementById('luOk'); if (!o) return false; const b = o.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!t && !!t.closest('#luOk'); });
  check(reach, `${tag}: the button is topmost where a thumb would land`);
  await page.evaluate(() => { const b = document.getElementById('luOk'); if (b) b.click(); }); await page.waitForTimeout(300);
  check(!(await card(page)).shown, `${tag}: it closes`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nA level-up stays until you close it, says what it brought, and a solve sends its reward to the score');
process.exit(bad ? 1 : 0);
