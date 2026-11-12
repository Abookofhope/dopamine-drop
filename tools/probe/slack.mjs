/* No Crossing: a hint that rings the peg worth moving.
 *
 *   - Hint (two a round) lights the two threads of one crossing and rings one peg, an end of one of them, the one caught up in the most
 *     crossings
 *   - moving that peg off to one side changes the crossing count (it is not a decoration): dragging it away from where it was moves it
 *
 *   - 0.181.0: a par chip; a pinned peg (level 8) that will not drag; a cat (14) no peg can be set on; a short gold thread (20); the
 *     prompt teaches the newest; and the ring the board was built from is always a way out, by taps alone
 *
 *   node tools/probe/slack.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, lang = 'en', vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { slack: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'slack');
  await page.waitForSelector('#surface .slacknode', { timeout: 9000 });
  /* the Hint button can arrive a beat after the pegs (it read as missing once in a full chain): wait for it, then settle */
  await page.waitForSelector('.sumcol .sumtool', { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const nodes = [...document.querySelectorAll('.slacknode')].map((e, i) => ({ i, hot: e.classList.contains('hot'), ...R(e) }));
  const lines = [...document.querySelectorAll('.slackwire line')].map((l, i) => ({ i, hint: l.classList.contains('hint'), x1: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), x2: +l.getAttribute('x2'), y2: +l.getAttribute('y2') }));
  const tool = document.querySelector('.sumcol .sumtool');
  return { nodes, lines, tool: tool ? { text: tool.textContent.trim(), ...R(tool) } : null, prompt: document.getElementById('prompt').textContent.trim(), surface: R(document.getElementById('surface')) };
});
const near = (n, x, y) => Math.hypot(n.x + n.w / 2 - x, n.y + n.h / 2 - y) < 3;

for (const [xp, label] of [[0, 'a new player'], [60000, 'a high level']]){
  const page = await open(xp); let s = await read(page);
  check(!!s.tool && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1, `${label}: Hint is inside the board and big enough to hit (${s.tool && Math.round(s.tool.h)}px)`);
  const c0 = parseInt(s.prompt.match(/\d+/)[0], 10);
  await page.mouse.click(s.tool.x + 20, s.tool.y + 18); await page.waitForTimeout(250);
  s = await read(page);
  const lit = s.lines.filter(l => l.hint), hot = s.nodes.filter(n => n.hot);
  check(lit.length === 2 && hot.length === 1 && /1/.test(s.tool.text), `${label}: Hint lights two threads, rings one peg, and uses one of two (${lit.length} threads, ${hot.length} ringed, ${s.tool.text})`);
  /* the ringed peg is at an end of one of the lit threads */
  const ends = lit.flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]);
  const pct = n => [(n.x + n.w / 2 - s.surface.x) , (n.y + n.h / 2 - s.surface.y)];
  const boxR = await page.evaluate(() => { const r = document.querySelector('.arcbox').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const h = hot[0], hx = (h.x + h.w / 2 - boxR.x) / boxR.w * 100, hy = (h.y + h.h / 2 - boxR.y) / boxR.h * 100;
  check(ends.some(([ex, ey]) => Math.hypot(ex - hx, ey - hy) < 1.5), `${label}: and the ringed peg is an end of one of the lit threads`);
  /* it can be dragged away */
  const before = [h.x + h.w / 2, h.y + h.h / 2];
  await page.mouse.move(before[0], before[1]); await page.mouse.down(); await page.mouse.move(before[0] + 40, before[1] + 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
  const a = await read(page); const moved = a.nodes[h.i];
  check(Math.hypot(moved.x + moved.w / 2 - before[0], moved.y + moved.h / 2 - before[1]) > 10, `${label}: the ringed peg drags away from where it was`);
  await page.close();
}
{
  const page = await open(0, 'fr', { width: 320, height: 568 }); const s = await read(page);
  check(!!s.tool && /Indice/.test(s.tool.text), `fr: Hint is in French (${s.tool && s.tool.text})`);
  await page.close();
}

/* The rules of its own (0.181.0): a par, then a pinned peg (level 8), a napping cat (14), a short gold thread (20). */
for (const [xp, label, want] of [[0, 'level 2', { pins: 0, cat: false, short: false }], [4000, 'level 11', { pins: 1, cat: false, short: false, word: /pins/ }],
  [30000, 'level 19', { pins: 2, cat: true, short: false, word: /cat/ }], [60000, 'level 23', { pins: 2, cat: true, short: true, word: /gold/ }]]){
  for (const vp of [{ width: 400, height: 820 }, { width: 320, height: 568 }]){
    const page = await open(xp, 'en', vp); const tag = `${label} at ${vp.width}`;
    const st = () => page.evaluate(() => { const b = document.querySelector('.arcbox'); if (!b) return { gone: true };
      const r = b.getBoundingClientRect(), C = e => { const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; };
      const cat = b.querySelector('.slackcat'), chip = document.querySelector('.parchip');
      return { lv: +b.dataset.lv, pins: b.dataset.pins ? b.dataset.pins.split(',').map(Number) : [], cat: cat ? C(cat) : null, catW: cat ? cat.getBoundingClientRect().width : 0,
        short: +b.dataset.short, par: +b.dataset.par, wrong: +b.dataset.wrong, moves: +b.dataset.moves, chip: chip ? chip.textContent : '', chipFits: chip ? chip.scrollWidth <= chip.clientWidth + 1 : false,
        box: { x: r.left, y: r.top, w: r.width, h: r.height }, pegs: [...b.querySelectorAll('.slacknode')].map(C), pinCls: [...b.querySelectorAll('.slacknode')].map(e => e.classList.contains('pin')),
        clean: b.querySelector('.slackwire').classList.contains('clean'), neat: b.querySelector('.slackwire').classList.contains('neat'),
        shortLines: b.querySelectorAll('.slackwire line.short').length, prompt: document.getElementById('prompt').textContent.trim() }; });
    let s = await st();
    check(s.pins.length === want.pins && !!s.cat === want.cat && (s.short >= 0) === want.short && s.shortLines === (want.short ? 1 : 0),
      `${tag}: the rules on the board are the ones for the level (level ${s.lv}: ${s.pins.length} pinned, cat ${!!s.cat}, short thread ${s.short >= 0})`);
    check(s.pinCls.filter(Boolean).length === want.pins, `${tag}: a pinned peg looks pinned`);
    check(s.par >= 1 && s.par <= s.pegs.length - want.pins && new RegExp(`0\\D+${s.par}$`).test(s.chip) && s.chipFits, `${tag}: the chip shows no moves yet and a par (${s.chip})`);
    check(s.wrong > 0 && parseInt(s.prompt, 10) === s.wrong && (!want.word || want.word.test(s.prompt)), `${tag}: the prompt counts what is wrong and teaches the newest rule (${s.prompt})`);
    const tap = async q => { await page.mouse.click(q[0], q[1]); await page.waitForTimeout(60); };
    if (want.pins){
      const i = s.pins[0], at = s.pegs[i];
      await page.mouse.move(at[0], at[1]); await page.mouse.down(); await page.mouse.move(at[0] + 50, at[1] + 30, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(120);
      const a = await st();
      check(Math.hypot(a.pegs[i][0] - at[0], a.pegs[i][1] - at[1]) < 1 && /pinned/.test(a.prompt) && a.moves === 0, `${tag}: a pinned peg does not drag, says so, and costs no move (${a.prompt})`);
    }
    if (want.cat){
      const i = s.pegs.findIndex((q, k) => !s.pins.includes(k));
      await tap(s.pegs[i]); await tap(s.cat);
      const a = await st();
      check(Math.hypot(a.pegs[i][0] - s.pegs[i][0], a.pegs[i][1] - s.pegs[i][1]) < 1, `${tag}: a peg cannot be set down on the cat`);
      check(a.pegs.every(q => Math.hypot(q[0] - s.cat[0], q[1] - s.cat[1]) > s.catW / 2), `${tag}: no peg is dealt on the cat`);
    }
    /* out by the ring it was built from: every free peg to its place on it, by taps */
    s = await st(); const n = s.pegs.length, B = s.box;
    const spot = i => { const a = 2 * Math.PI * i / n - Math.PI / 2; return [B.x + B.w * (0.5 + 0.36 * Math.cos(a)), B.y + B.h * (0.5 + 0.36 * Math.sin(a))]; };
    const dw = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) / B.w * 100, spots = [...Array(n).keys()].map(spot);
    const park = w => { for (let gy = 0.2; gy <= 0.8; gy += 0.05) for (let gx = 0.12; gx <= 0.88; gx += 0.04){ const q = [B.x + B.w * gx, B.y + B.h * gy];
      if (w.every(o => dw(q, o) > 16) && spots.every(o => dw(q, o) > 14) && (!s.cat || dw(q, s.cat) > 18)) return q; } return null; };
    check(s.pins.every(i => dw(s.pegs[i], spots[i]) < 1.5), `${tag}: a pinned peg already sits at its place on the ring`);
    let last = s;
    for (let pass = 0; pass < 4 && !last.gone && !last.clean; pass++) for (let i = 0; i < n; i++){
      let w = (await st()); if (w.gone || w.clean){ last = w; break; } last = w; w = w.pegs;
      if (s.pins.includes(i) || dw(w[i], spots[i]) < 3) continue;
      const k = w.findIndex((q, j) => j !== i && dw(q, spots[i]) < 13);
      if (k >= 0){ const q = park(w); if (q){ await tap(w[k]); await tap(q); w = (await st()).pegs; if (!w) break; } }
      await tap(w[i]); await tap(spots[i]);
      const a = await st(); if (!a.gone) last = a; else { last = { ...last, gone: true }; break; }
    }
    const won = await page.evaluate(() => !document.querySelector('.arcbox') || document.querySelector('.slackwire').classList.contains('clean'));
    check(won, `${tag}: the ring is a way out, by taps alone (${last.wrong} wrong after ${last.moves} moves, par ${last.par})`);
    if (!last.gone && last.clean) check(last.neat === (last.moves <= last.par), `${tag}: finishing in par is marked, and only then (${last.moves} moves, par ${last.par}, marked ${last.neat})`);
    await page.close();
  }
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nNo Crossing rings the peg worth moving');
process.exit(bad ? 1 : 0);
