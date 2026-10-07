/* One-handed layout: Settings, Accessibility, Right hand / Left hand.
 *
 *   - a three-way control in 44px segments, off by default, saved, summarised, reset by Reset to defaults
 *   - off, the exit button is where it always was (top left, 44x44)
 *   - on, in a run it is a 48px button in the lower corner on the chosen side (the lower fifth of a
 *     portrait phone; the side column of a phone held sideways), nothing is drawn over it, and the board
 *     gives up a strip for it: the board does not reach it, every tile is still inside the board, and
 *     the board has lost no more than 80px of height
 *   - the pause sheet is built from the bottom: its buttons sit lower than they do with the setting off,
 *     and on a short screen the sheet still scrolls from its title
 *   - a round is still playable, the button opens the pause sheet, and Game Over still shows Back to menu
 *   - it is in en, fr, es and de
 *
 *   node tools/probe/onehand.mjs
 */
import { chromium } from 'playwright';
import { openApp, startShuffle, goTab, openPanels } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

async function open(state, { vw = 360, vh = 640 } = {}){
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.pool', 'odd'); });
  await openApp(page, Object.assign({ xp: 4000, runs: 12, solved: 80, seen: { odd: 1, order: 1 }, schema: 11,
    sound: false, haptics: false, reduceMotion: true, lang: 'en' }, state));
  return page;
}
const boardUp = async page => {
  await page.waitForFunction(() => { const t = document.querySelector('#surface .oddwrap .tile'); return t && !t.dataset.old && !t.disabled; },
    null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(400);
};
const geo = page => page.evaluate(() => {
  const r = e => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
  const qb = document.getElementById('quitBtn'), q = qb.getBoundingClientRect();
  const s = document.getElementById('surface'), sr = s.getBoundingClientRect();
  const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
  const tiles = [...s.querySelectorAll('.oddwrap .tile')].map(r);
  return { q: r(qb), s: r(s), hit: !!top && !!top.closest('#quitBtn'), vw: innerWidth, vh: innerHeight,
    hand: document.documentElement.dataset.hand || '',
    tilesIn: tiles.length > 0 && tiles.every(t => t.l >= sr.left - 1 && t.r <= sr.right + 1 && t.t >= sr.top - 1 && t.b <= sr.bottom + 1) };
});
const sheet = page => page.evaluate(() => {
  const box = document.querySelector('.pausebox');
  const go = box.querySelector('.pauseGo').getBoundingClientRect(), end = box.querySelector('.pauseEnd').getBoundingClientRect();
  box.scrollTop = 0;
  const first = box.firstElementChild.getBoundingClientRect();
  return { goY: Math.round(go.top + go.height / 2), endY: Math.round(end.top + end.height / 2), firstTop: Math.round(first.top), vh: innerHeight,
    goH: Math.round(go.height), endH: Math.round(end.height), scrolls: box.scrollHeight > box.clientHeight + 1 };
});
async function run(page){ await startShuffle(page); await boardUp(page); }

/* ── 1. the setting ── */
{
  const page = await open({});
  await goTab(page, 'Settings');
  await openPanels(page, 'access');
  const row = await page.evaluate(() => {
    const r = document.getElementById('handRow'); if (!r) return null;
    return { n: r.children.length, hs: [...r.children].map(b => Math.round(b.getBoundingClientRect().height)),
      pressed: [...r.children].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.hand), label: r.getAttribute('aria-label') };
  });
  check(!!row, 'Settings has a One-handed layout control');
  if (!row){
    console.log('\nthis build has no one-handed layout: the rest of the probe is skipped');
    console.log(`\n${bad} check(s) FAILED`);
    await browser.close(); process.exit(1);
  }
  check(row.n === 3 && row.hs.every(h => h >= 44), 'it has three segments, each at least 44px high (' + row.hs.join(', ') + ')');
  check(row.pressed.join() === 'off', 'it is off by default (' + row.pressed.join() + ')');
  check(/one-handed/i.test(row.label || ''), 'and it has a group name (' + row.label + ')');
  for (const hand of ['right', 'left', 'off']){
    await page.evaluate(h => document.querySelector(`#handRow [data-hand="${h}"]`).click(), hand);
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => ({ attr: document.documentElement.dataset.hand || '', saved: JSON.parse(localStorage.getItem('dd.v1')).oneHand,
      sum: document.getElementById('accS_access').textContent, pressed: [...document.getElementById('handRow').children].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.hand).join() }));
    check(st.attr === (hand === 'off' ? '' : hand) && st.saved === hand && st.pressed === hand, hand + ': the page, the pressed segment and the save agree (' + st.attr + ', ' + st.saved + ', ' + st.pressed + ')');
    if (hand === 'right') check(/one-handed/i.test(st.sum) && /right/i.test(st.sum), 'and the panel summary says so (' + JSON.stringify(st.sum) + ')');
  }
  /* Reset to defaults turns it off again. */
  await page.evaluate(() => document.querySelector('#handRow [data-hand="left"]').click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#accB_presets [data-p="default"]').click());
  await page.waitForTimeout(300);
  check(await page.evaluate(() => !document.documentElement.dataset.hand), 'Reset to defaults puts the layout back');
  await page.close();
}

/* ── 2. where the exit button is ── */
const base = {};
for (const [vw, vh] of [[320, 568], [360, 640], [390, 844], [412, 915]]){
  const off = await open({}, { vw, vh });
  await run(off);
  const o = await geo(off);
  base[vw] = o;
  check(o.q.l < 30 && o.q.t < 60 && o.q.w >= 44 && o.q.h >= 44, `${vw}x${vh} off: the exit button is top left, 44px (${o.q.l},${o.q.t} ${o.q.w}x${o.q.h})`);
  await off.close();
  for (const hand of ['right', 'left']){
    const page = await open({ oneHand: hand }, { vw, vh });
    await run(page);
    const g = await geo(page);
    const sideOk = hand === 'right' ? g.vw - g.q.r <= 24 : g.q.l <= 24;
    check(g.q.w >= 44 && g.q.h >= 44, `${vw}x${vh} ${hand}: the exit button is ${g.q.w}x${g.q.h}`);
    check(sideOk && g.q.t >= g.vh * 0.78 && g.q.b <= g.vh, `${vw}x${vh} ${hand}: it is in the lower ${hand} corner (${g.q.l},${g.q.t}-${g.q.r},${g.q.b} of ${g.vw}x${g.vh})`);
    check(g.hit, `${vw}x${vh} ${hand}: nothing is drawn over it`);
    check(g.s.b <= g.q.t + 1, `${vw}x${vh} ${hand}: the board stops above it (board bottom ${g.s.b}, button top ${g.q.t})`);
    check(g.tilesIn, `${vw}x${vh} ${hand}: every tile is still inside the board`);
    check(o.s.h - g.s.h <= 80, `${vw}x${vh} ${hand}: the board lost ${o.s.h - g.s.h}px of height (limit 80)`);
    await page.close();
  }
}
for (const [vw, vh] of [[568, 320], [844, 390]]){
  const off = await open({}, { vw, vh }); await run(off); const o = await geo(off); await off.close();
  for (const hand of ['right', 'left']){
    const page = await open({ oneHand: hand }, { vw, vh });
    await run(page);
    const g = await geo(page);
    check(g.q.w >= 44 && g.q.h >= 44 && g.hit, `${vw}x${vh} ${hand}: the exit button is ${g.q.w}x${g.q.h} and nothing covers it`);
    const edge = hand === 'right' ? g.vw - g.q.r <= 24 : g.q.l <= 24;
    check(edge && g.q.b >= g.vh - 24, `${vw}x${vh} ${hand}: it is in the lower ${hand} corner (${g.q.l},${g.q.t}-${g.q.r},${g.q.b})`);
    check(hand === 'right' ? g.s.r <= g.q.l + 1 : g.s.l >= g.q.r - 1, `${vw}x${vh} ${hand}: the board stays out of its column`);
    check(g.tilesIn, `${vw}x${vh} ${hand}: every tile is inside the board`);
    check(o.s.w - g.s.w <= 90, `${vw}x${vh} ${hand}: the board lost ${o.s.w - g.s.w}px of width (limit 90)`);
    await page.close();
  }
}

/* Tablets: the game is a 460px column in the middle of the screen, and the button is at that column's corner on the chosen side. */
for (const [vw, vh] of [[768, 1024], [1024, 768]]){
  for (const hand of ['right', 'left']){
    const page = await open({ oneHand: hand }, { vw, vh });
    await run(page);
    const g = await geo(page);
    const mid = g.vw / 2, cx = g.q.l + g.q.w / 2;
    check(g.q.w >= 44 && g.q.h >= 44 && g.hit, `${vw}x${vh} ${hand}: the exit button is ${g.q.w}x${g.q.h} and nothing covers it`);
    check((hand === 'right' ? cx > mid : cx < mid) && g.q.b >= g.vh - 30, `${vw}x${vh} ${hand}: it is low and on the ${hand} half (${g.q.l},${g.q.t}-${g.q.r},${g.q.b})`);
    check(g.tilesIn && (vw > vh ? (hand === 'right' ? g.s.r <= g.q.l + 1 || g.s.b <= g.q.t + 1 : g.s.l >= g.q.r - 1 || g.s.b <= g.q.t + 1) : g.s.b <= g.q.t + 1), `${vw}x${vh} ${hand}: the board stays clear of it, every tile inside the board`);
    await page.close();
  }
}

/* ── 3. the button works, and the sheet it opens is reachable ── */
{
  const offp = await open({}, { vw: 360, vh: 640 }); await run(offp);
  await offp.click('#quitBtn'); await offp.waitForSelector('.pausebox'); await offp.waitForTimeout(300);
  const so = await sheet(offp); await offp.close();
  for (const hand of ['right', 'left']){
    const page = await open({ oneHand: hand }, { vw: 360, vh: 640 });
    await run(page);
    const q = await geo(page);
    await page.mouse.click(q.q.l + q.q.w / 2, q.q.t + q.q.h / 2);
    const opened = await page.waitForSelector('.pausebox', { timeout: 3000 }).then(() => true, () => false);
    check(opened, hand + ': a tap on the moved exit button opens the pause sheet');
    if (!opened){ await page.close(); continue; }
    await page.waitForTimeout(300);
    const s = await sheet(page);
    check(s.endY > so.endY + 40, hand + ': the sheet sits lower than with the setting off (End the run at ' + s.endY + ' against ' + so.endY + ' of ' + s.vh + ')');
    check(s.goH >= 44 && s.endH >= 44, hand + ': its buttons are thumb-sized (' + s.goH + ', ' + s.endH + ')');
    await page.close();
  }
  /* A short screen: the sheet scrolls from its title. */
  for (const hand of ['right', 'left']){
    const page = await open({ oneHand: hand }, { vw: 568, vh: 320 });
    await run(page);
    await page.click('#quitBtn'); await page.waitForSelector('.pausebox'); await page.waitForTimeout(300);
    const s = await sheet(page);
    check(s.firstTop >= 0, '568x320 ' + hand + ': the top of the sheet is reachable (first line at ' + s.firstTop + ')');
    await page.close();
  }
}

/* ── 4. a round is still playable, and Game Over still shows the way out ── */
{
  const page = await open({ oneHand: 'right' }, { vw: 320, vh: 568 });
  await run(page);
  const before = await page.evaluate(() => +document.getElementById('play').dataset.done || 0);
  for (let i = 0; i < 12; i++){
    const at = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#surface .oddwrap .tile')].filter(t => !t.disabled);
      const p = document.getElementById('prompt').textContent;
      const rgb = e => getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const cols = tiles.map(rgb), key = c => c.join(','), n = {}; cols.forEach(c => n[key(c)] = (n[key(c)] || 0) + 1);
      const k = /lightest|plus claire|más claro|hellste/i.test(p) ? cols.reduce((b, c, j) => lum(c) > lum(cols[b]) ? j : b, 0)
        : /darkest|plus foncée|más oscuro|dunkelste/i.test(p) ? cols.reduce((b, c, j) => lum(c) < lum(cols[b]) ? j : b, 0)
        : cols.findIndex(c => n[key(c)] === 1);
      if (k < 0 || !tiles[k]) return null;
      const r = tiles[k].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (at) await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(450);
    if (await page.evaluate(() => +document.getElementById('play').dataset.done || 0) > before) break;
  }
  check(await page.evaluate(() => +document.getElementById('play').dataset.done || 0) > before, '320x568 right: a round can be played and solved with the button in the corner');
  await page.click('#quitBtn'); await page.waitForTimeout(300);
  await page.click('.pausebox .pauseEnd');
  await page.waitForFunction(() => { const o = document.getElementById('over'); return o && !o.hidden && o.getClientRects().length > 0; }, null, { timeout: 8000, polling: 100 });
  await page.waitForTimeout(500);
  const home = await page.evaluate(() => { const b = document.getElementById('homeBtn').getBoundingClientRect();
    const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { inside: b.top >= 0 && b.bottom <= innerHeight, top: !!top && !!top.closest('#homeBtn') }; });
  check(home.inside && home.top, 'Game Over still shows Back to menu, on screen and topmost');
  await page.close();
}

/* The button is fixed to the screen in landscape: it must not show through Game Over or sit over the pause sheet. */
for (const [vw, vh, hand] of [[568, 320, 'right'], [844, 390, 'left']]){
  const page = await open({ oneHand: hand }, { vw, vh });
  await run(page);
  await page.click('#quitBtn'); await page.waitForSelector('.pausebox'); await page.waitForTimeout(300);
  const under = await page.evaluate(() => { const b = document.getElementById('quitBtn').getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!t && !t.closest('#quitBtn'); });
  check(under, `${vw}x${vh} ${hand}: with the pause sheet open the exit button is behind it`);
  await page.click('.pausebox .pauseEnd');
  await page.waitForFunction(() => { const o = document.getElementById('over'); return o && !o.hidden && o.getClientRects().length > 0; }, null, { timeout: 8000, polling: 100 });
  await page.waitForTimeout(500);
  const over = await page.evaluate(() => { const b = document.getElementById('homeBtn').getBoundingClientRect();
    const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const q = document.getElementById('quitBtn'), qr = q.getBoundingClientRect();
    const tq = document.elementFromPoint(qr.left + qr.width / 2, qr.top + qr.height / 2);
    return { home: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth && !!t && !!t.closest('#homeBtn'),
      quitHidden: !qr.width || !tq || !tq.closest('#quitBtn') }; });
  check(over.home, `${vw}x${vh} ${hand}: Game Over shows Back to menu, on screen and topmost`);
  check(over.quitHidden, `${vw}x${vh} ${hand}: the exit button does not show through Game Over`);
  await page.close();
}

/* ── 5. every language ── */
for (const [lang, right, left, nameRe] of [['fr', /main droite/i, /main gauche/i, /une main/i], ['es', /mano derecha/i, /mano izquierda/i, /una mano/i], ['de', /rechte hand/i, /linke hand/i, /einhand/i]]){
  const page = await open({ lang });
  await goTab(page, 'Settings');
  await openPanels(page, 'access');
  const txt = await page.evaluate(() => [...document.getElementById('handRow').children].map(b => b.textContent.trim()));
  const name = await page.evaluate(() => document.getElementById('handRow').getAttribute('aria-label'));
  check(right.test(txt[1]) && left.test(txt[2]) && nameRe.test(name), lang + ': the segments and the group name are in ' + lang + ' (' + JSON.stringify(txt) + ', ' + JSON.stringify(name) + ')');
  await page.close();
}

check(errs.length === 0, 'no page errors' + (errs.length ? ' (' + errs[0] + ')' : ''));
await browser.close();
console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed');
process.exit(bad ? 1 : 0);
