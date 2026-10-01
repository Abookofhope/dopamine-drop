/* Loaf Box, played: an endless cardboard box with kittens asleep in it, and cat loaves that keep arriving at the bottom.
 *
 * A bot plays it the way a thumb does, with a real mouse: it reads the box and the tray from the page (never from the game's own
 * state), chooses where each loaf should go the way a person would (finish a line if it can, otherwise lean on what is there), turns
 * the loaf by tapping it, carries it and lets go a little off. After EVERY loaf it checks that the page's box equals the box its own
 * copy of the rules gives (a full line clears, nothing else changes), and that the slot it came from has been given a new loaf.
 * It plays until the round's lines are cleared, and then checks that the box carries on into the next round.
 *
 * Around that: the tray does not move when a loaf is lifted or turned (it used to re-centre, shifting every other loaf), Undo gives
 * back the box AND the tray, Hint lights a place and turns the loaf to suit, tapping a loaf and then the box places it for anyone
 * who would rather not drag, and a drag stays cheap on a slow phone (measured at 4x CPU slowdown: no layout while the finger
 * moves, and no frame over 34ms).
 *
 *   node tools/probe/loaf.mjs              three levels
 *   XP=60000 node tools/probe/loaf.mjs     one profile
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const XPS = process.env.XP ? [+process.env.XP] : [0, 2000, 12000];
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const norm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const key = cs => cs.map(c => c.join(',')).join(' ');
const turn = cs => norm(cs.map(c => [-c[1], c[0]]));
const dims = o => [Math.max(...o.map(c => c[0])) + 1, Math.max(...o.map(c => c[1])) + 1];
const turnsOf = sh => { const out = []; let c = norm(sh); for (let r = 0; r < 4; r++){ if (!out.some(s => key(s) === key(c))) out.push(c); c = turn(c); } return out; };

/* The rules, written again, here. */
const sweepSim = (occ, g) => {
  const rs = [], cs = [];
  for (let y = 0; y < g; y++) if (Array.from({ length: g }, (_, x) => occ[y * g + x]).every(Boolean)) rs.push(y);
  for (let x = 0; x < g; x++) if (Array.from({ length: g }, (_, y) => occ[y * g + x]).every(Boolean)) cs.push(x);
  const o2 = occ.slice();
  rs.forEach(y => { for (let x = 0; x < g; x++) o2[y * g + x] = 0; });
  cs.forEach(x => { for (let y = 0; y < g; y++) o2[y * g + x] = 0; });
  return { occ: o2, n: rs.length + cs.length };
};
/* Where a person would put it: finish a line if one can be finished, otherwise lean on what is already there. */
const choose = (occ, g, pieces) => {
  const rowN = new Array(g).fill(0), colN = new Array(g).fill(0);
  occ.forEach((v, i) => { if (v){ rowN[Math.floor(i / g)]++; colN[i % g]++; } });
  let best = null;
  for (const p of pieces) for (const o of turnsOf(p.on)){
    const [w, h] = dims(o);
    for (let ay = 0; ay + h <= g; ay++) for (let ax = 0; ax + w <= g; ax++){
      const cells = o.map(c => (ay + c[1]) * g + ax + c[0]);
      if (cells.some(i => occ[i])) continue;
      const af = occ.slice(); cells.forEach(i => { af[i] = 1; });
      const sw = sweepSim(af, g);
      const sc = sw.n * 100 + cells.reduce((n, i) => n + rowN[Math.floor(i / g)] + colN[i % g], 0);
      if (!best || sc > best.sc) best = { sc, slot: p.slot, o, cells, sim: sw };
    }
  }
  return best;
};

const open = async (xp, vp = { width: 400, height: 820 }, rm = true) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: rm, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { loaf: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'loaf');
  await page.waitForFunction(() => document.querySelector('.lbx .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1200);
  return page;
};
const read = page => page.evaluate(() => {
  const cells = [...document.querySelectorAll('.lbx .fgrid .fcell')], g = Math.round(Math.sqrt(cells.length));
  const r = c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; };
  const slots = [...document.querySelectorAll('.lbx .fpiece')].map((p, s) => {
    const w = (getComputedStyle(p.querySelector('.fbits') || p).gridTemplateColumns || '').split(' ').length || 1, on = [];
    [...p.querySelectorAll('.fbit')].forEach((bt, i) => { if (bt.classList.contains('on')) on.push([i % w, Math.floor(i / w)]); });
    const bb = p.getBoundingClientRect();
    return { slot: s, on, has: !!p.querySelector('.fbits'), hinted: p.classList.contains('hinted'), sel: p.classList.contains('fsel'), x: bb.left + bb.width / 2, y: bb.top + bb.height / 2, w: bb.width, h: bb.height, l: bb.left, t: bb.top };
  });
  const tool = i => { const e = document.querySelectorAll('.lbx .ftool')[i]; return e ? { off: e.disabled, text: e.textContent.trim() } : null; };
  return { g, pos: cells.map(r), nap: cells.map(c => c.classList.contains('nap') && !c.classList.contains('pop') ? 1 : 0),
    set: cells.map(c => c.classList.contains('set') && !c.classList.contains('pop') ? 1 : 0),
    hint: cells.map((c, i) => c.classList.contains('hint') ? i : -1).filter(i => i >= 0), ok: cells.map((c, i) => c.classList.contains('drop-ok') ? i : -1).filter(i => i >= 0),
    willpop: cells.filter(c => c.classList.contains('willpop')).length, prompt: (document.querySelector('.prompt') || {}).textContent || '',
    made: !!document.querySelector('.lbx .fgrid.made'), carried: !!(document.querySelector('.lbx') || { dataset: {} }).dataset.carried, ghost: !!document.querySelector('.lbx .fghost'),
    undo: tool(0), hintBtn: tool(1), moves: !!document.querySelector('.budget'), slots: slots.map(s => ({ ...s, on: s.on.length ? s.on : [] })) };
}).then(st => { st.slots.forEach(s => { if (s.on.length) s.on = norm(s.on); }); return st; });
const occOf = s => s.nap.map((v, i) => v || s.set[i] ? 1 : 0);
const plays = s => s.slots.filter(p => p.has).map(p => ({ slot: p.slot, on: p.on }));

/* turn a loaf in its slot until it has the shape asked for, then carry it to the cells */
const place = async (page, mv, off, last) => {
  for (let k = 0; k < 4; k++){
    const s = await read(page), sl = s.slots[mv.slot];
    if (key(sl.on) === key(mv.o)) break;
    await page.mouse.click(sl.x, sl.y); await page.waitForTimeout(60);
  }
  const s = await read(page), sl = s.slots[mv.slot], pitch = s.pos[1].x - s.pos[0].x;
  const xs = mv.cells.map(i => s.pos[i].x), ys = mv.cells.map(i => s.pos[i].y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const h = (Math.max(...ys) - Math.min(...ys)) / pitch + 1, gh = h * pitch - 3;
  await page.mouse.move(sl.x, sl.y); await page.mouse.down(); await page.mouse.move(sl.x + 10, sl.y - 10, { steps: 2 });
  await page.mouse.move(cx + off[0] * pitch, cy + gh / 2 + 34 + off[1] * pitch, { steps: 8 });
  await page.waitForTimeout(40);
  const over = await read(page);
  await page.mouse.up(); if (!last) await page.waitForTimeout(80);
  return { over };
};

for (const xp of XPS){
  const page = await open(xp);
  const s0 = await read(page);
  console.log(`\n--- profile xp ${xp}: a ${s0.g}x${s0.g} box, ${s0.nap.reduce((a, b) => a + b, 0)} kittens, ${plays(s0).length} loaves, "${s0.prompt.trim()}"`);
  check(s0.g >= 6, `the box is at least six wide (${s0.g})`);
  check(s0.slots.length === 3 && plays(s0).length === 3, 'the tray is three fixed places, each with a loaf in it');
  check(!s0.moves, 'there is no move counter: nothing runs out but room');
  check(s0.pos[0].w > 36, `every square is at least 36px across (${Math.round(s0.pos[0].w)}px)`);
  check(s0.undo.off, 'Undo starts out unavailable');
  check(s0.nap.reduce((a, b) => a + b, 0) >= s0.g, 'the box starts with kittens in it, not empty');
  const vp = await page.evaluate(() => { const b = document.querySelector('.lbx .fgrid').getBoundingClientRect(), t = document.querySelector('.lbx .ftools').getBoundingClientRect(), p = document.querySelector('#surface').getBoundingClientRect();
    return { top: b.top - p.top, bottom: t.bottom - p.bottom, left: b.left - p.left, right: b.right - p.right }; });
  check(vp.top >= -1 && vp.bottom <= 1 && vp.left >= -1 && vp.right <= 1, 'box, tray and tools sit inside the play area');

  /* turning moves nothing else, and neither does lifting a loaf out */
  const a = s0.slots[0];
  await page.mouse.click(a.x, a.y); await page.waitForTimeout(80);
  const s1 = await read(page);
  check(s1.slots.every((p, i) => Math.abs(p.l - s0.slots[i].l) < 1 && Math.abs(p.t - s0.slots[i].t) < 1 && Math.abs(p.w - s0.slots[i].w) < 1), 'turning a loaf moves nothing in the tray, and the slot does not change size');
  const turned = key(s1.slots[0].on) !== key(s0.slots[0].on) || key(turn(s0.slots[0].on)) === key(s0.slots[0].on);
  check(turned, 'a tap turns the loaf a quarter');
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 12, a.y - 12, { steps: 2 }); await page.waitForTimeout(80);
  const lifted = await read(page);
  check(lifted.ghost && lifted.slots.every((p, i) => Math.abs(p.l - s0.slots[i].l) < 1 && Math.abs(p.t - s0.slots[i].t) < 1), 'lifting a loaf out leaves the tray exactly as it was (nothing slides over)');
  await page.mouse.move(a.x, 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
  const back = await read(page);
  check(!back.ghost && plays(back).length === 3 && occOf(back).join('') === occOf(s0).join(''), 'let go over nothing, the loaf stays in its place and the box is as it was');

  /* ── play it: finish lines, and check every move against the rules ── */
  let occ = occOf(back), moves = 0, cleared = 0, won = false, refills = 0, refillMiss = 0, previewChecked = false, undoChecked = false, ruleBad = 0;
  for (let step = 0; step < 80 && !won; step++){
    const st = await read(page);
    const mv = choose(occ, st.g, plays(st));
    if (!mv){ console.log('      (no loaf fits anywhere: the box is jammed after ' + moves + ' loaves, "' + st.prompt.trim() + '")'); break; }
    const off = step % 2 ? [0.3, -0.2] : [-0.25, 0.3];
    const before = occ.slice();
    const r = await place(page, mv, off, false);
    if (!previewChecked){
      previewChecked = true;
      check(mv.cells.every(i => r.over.ok.includes(i)) && r.over.ok.length === mv.cells.length, 'held over its place (a little off), the preview lights exactly where it would land');
      if (mv.sim.n > 0) check(r.over.willpop > 0, 'and the lines it would finish are lit as well');
    }
    const after = await read(page);
    const af = occ.slice(); mv.cells.forEach(i => { af[i] = 1; });
    const sim = sweepSim(af, st.g);
    if (occOf(after).join('') !== sim.occ.join('')){ ruleBad++; if (ruleBad <= 2) console.log('      page differs from the rules after loaf ' + (moves + 1) + ' (cells ' + mv.cells.join(',') + ')'); }
    if (after.made){ won = true; cleared += sim.n; moves++; check(sim.n > 0, 'the last loaf finished a line'); break; }
    /* the slot is given a new loaf */
    await page.waitForTimeout(260);
    const filled = await read(page);
    if (filled.slots[mv.slot].has) refills++; else refillMiss++;
    occ = sim.occ; cleared += sim.n; moves++;
    if (!undoChecked && moves === 1 && sim.n === 0){
      undoChecked = true;
      const u0 = await read(page);
      check(!u0.undo.off && /3/.test(u0.undo.text), `Undo is available after a loaf (${u0.undo.text})`);
      await page.click('.lbx .ftool:nth-child(1)'); await page.waitForTimeout(200);
      const u1 = await read(page);
      check(occOf(u1).join('') === before.join('') && plays(u1).length === 3, 'Undo gives the box and the loaf back');
      check(/2/.test(u1.undo.text), `and costs one of three (${u1.undo.text})`);
      occ = before.slice(); moves = 0; cleared = 0; refills = 0; refillMiss = 0; step = -1;
    }
  }
  check(ruleBad === 0, `after every loaf the page's box was the box the rules give (${moves} loaves, ${cleared} lines cleared)`);
  check(refillMiss === 0 && refills >= 1, `every loaf placed was followed by a new one in its slot (${refills} of ${refills + refillMiss})`);
  check(won, `the lines asked for were cleared by playing it${won ? '' : ' (not within 80 loaves)'}`);

  /* the box carries on into the next round */
  if (won){
    await page.waitForFunction(() => { const l = document.querySelector('.lbx'); return l && l.dataset.carried === '1'; }, null, { timeout: 12000, polling: 80 }).catch(() => {});
    const next = await read(page).catch(() => null);
    check(!!next && next.carried, 'the box carries on into the next round (it is the same box)');
    if (next && next.carried) check(/carries|continue|sigue|geht weiter/i.test(next.prompt), `and says so ("${next.prompt.trim()}")`);
  }
  await page.close();
}

/* ── Hint, tap-to-place ── */
{
  const page = await open(12000);
  const a = await read(page);
  await page.click('.lbx .ftool:nth-child(2)'); await page.waitForTimeout(250);
  const b = await read(page);
  check(b.hint.length >= 2, `Hint lights a place (${b.hint.length} squares)`);
  check(b.slots.some(p => p.hinted), 'and marks which loaf goes there');
  check(a.hintBtn.text !== b.hintBtn.text, `and counts down (${a.hintBtn.text} -> ${b.hintBtn.text})`);
  check(b.hint.every(i => !occOf(a)[i]), 'the hinted squares are empty ones');
  const hp = b.slots.find(p => p.hinted);
  /* tap the loaf (chooses it; four taps bring it round to the way the hint turned it), then the box */
  for (let k = 0; k < 4; k++){ const now = (await read(page)).slots[hp.slot]; await page.mouse.click(now.x, now.y); await page.waitForTimeout(70); if (k === 0) check((await read(page)).slots[hp.slot].sel, 'tapping a loaf chooses it'); }
  const mid = b.hint[Math.floor(b.hint.length / 2)];
  await page.mouse.click(b.pos[mid].x, b.pos[mid].y); await page.waitForTimeout(450);
  const c = await read(page);
  check(occOf(c).join('') !== occOf(a).join('') && c.slots[hp.slot].has, 'with a loaf chosen, tapping the box puts it down at the nearest place it fits, and a new loaf comes');
  await page.close();
}

/* ── Smooth on a slow phone: measured at 4x CPU slowdown ── */
{
  const page = await open(12000, { width: 400, height: 820 }, false);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = t => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const s = await read(page), sl = s.slots[0];
  await page.mouse.move(sl.x, sl.y); await page.mouse.down(); await page.mouse.move(sl.x + 10, sl.y - 10, { steps: 2 }); await page.waitForTimeout(150);
  const f0 = await page.evaluate(() => window.__frames.length), m0 = await metrics();
  const gx = s.pos[Math.floor(s.pos.length / 2)];
  await page.mouse.move(gx.x, gx.y, { steps: 80 }); await page.waitForTimeout(120);
  const m1 = await metrics(), frames = await page.evaluate(f => window.__frames.slice(f), f0);
  await page.mouse.up();
  const layouts = m1.LayoutCount - m0.LayoutCount, per = (m1.TaskDuration - m0.TaskDuration) * 1000 / 80, worst = Math.max(...frames);
  check(layouts <= 4, `no layout while a finger drags a loaf (${layouts} over 80 moves)`);
  check(per < 14, `a move of the finger costs ${per.toFixed(1)}ms on a phone four times slower than this machine (under 14)`);
  check(worst < 34, `no frame took longer than 34ms (worst ${worst.toFixed(1)}ms)`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} problem(s) in Loaf Box` : '\nLoaf Box plays the way it says');
process.exit(bad ? 1 : 0);
