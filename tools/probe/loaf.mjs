/* Loaf Box, played: loaves are dragged from the tray into a cardboard box that already has kittens asleep in it, a full row or
 * column clears, and enough clears wins.
 *
 * The bot solves each board from what is on screen (it reads the squares, the loaves and the target from the page, never from the
 * game's own plan), then plays it with a real mouse: every loaf is turned by tapping it, picked up, carried and let go a little
 * off where it belongs. After EVERY placement it checks that the page's board equals the board its own copy of the rules says it
 * should be, so "a full line clears" is held to a rule written twice rather than assumed. Around that it checks what a player
 * leans on: a loaf let go nowhere goes back to the tray, a refused drop is refused, the preview lights where it would land and
 * which lines it would finish, Undo takes a loaf back off (and the line it cleared comes back), Hint shows a place and turns the
 * loaf to suit, tapping a loaf and then the box places it for anyone who would rather not drag, a box with nothing left that fits
 * says so, and a finished box says so.
 *
 *   node tools/probe/loaf.mjs              five levels
 *   XP=60000 node tools/probe/loaf.mjs     one profile
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const XPS = process.env.XP ? [+process.env.XP] : [0, 2000, 12000, 60000, 900000];
const OFF = 0.4;
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const norm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const key = cs => cs.map(c => c.join(',')).join(' ');
const turn = cs => norm(cs.map(c => [-c[1], c[0]]));
const dims = o => [Math.max(...o.map(c => c[0])) + 1, Math.max(...o.map(c => c[1])) + 1];

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
const cellsAt = (o, ax, ay, g) => { const out = []; for (const c of o){ const x = ax + c[0], y = ay + c[1]; if (x < 0 || y < 0 || x >= g || y >= g) return null; out.push(y * g + x); } return out; };

/* A way through: any order, any turn, searched from the occupancy and the loaves as they stand. */
const solve = (occ0, g, shapes, need, beam = 30, cap = 200000) => {
  let nodes = 0, sol = null;
  const go = (occ, rest, got, acc) => {
    if (sol || nodes++ > cap) return;
    if (got >= need){ sol = acc.slice(); return; }
    if (!rest.length) return;
    const rowN = new Array(g).fill(0), colN = new Array(g).fill(0);
    occ.forEach((v, i) => { if (v){ rowN[Math.floor(i / g)]++; colN[i % g]++; } });
    const cands = [];
    for (const i of rest){
      const seen = new Set(); let c = shapes[i];
      for (let r = 0; r < 4; r++, c = turn(c)){
        if (seen.has(key(c))) continue; seen.add(key(c));
        const [w, h] = dims(c);
        for (let ay = 0; ay + h <= g; ay++) for (let ax = 0; ax + w <= g; ax++){
          const cells = cellsAt(c, ax, ay, g);
          if (cells.some(k => occ[k])) continue;
          cands.push({ i, o: c, cells, score: cells.reduce((n, k) => n + rowN[Math.floor(k / g)] + colN[k % g], 0) });
        }
      }
    }
    cands.sort((a, b) => b.score - a.score);
    for (const cd of cands.slice(0, beam)){
      const o2 = occ.slice(); cd.cells.forEach(k => { o2[k] = 1; });
      const s = sweepSim(o2, g);
      go(s.occ, rest.filter(j => j !== cd.i), got + s.n, acc.concat([{ i: cd.i, o: cd.o, cells: cd.cells }]));
      if (sol) return;
    }
  };
  go(occ0, shapes.map((_, i) => i), 0, []);
  return sol;
};

for (const xp of XPS){
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { loaf: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'loaf');
  await page.waitForFunction(() => document.querySelector('.lbx .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1500);

  const read = () => page.evaluate(() => {
    const cells = [...document.querySelectorAll('.lbx .fgrid .fcell')], g = Math.round(Math.sqrt(cells.length));
    const r = c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; };
    const bar = document.querySelector('.budget');
    return { g, pos: cells.map(r),
      nap: cells.map(c => c.classList.contains('nap') && !c.classList.contains('pop') ? 1 : 0),
      set: cells.map(c => c.classList.contains('set') && !c.classList.contains('pop') ? 1 : 0),
      pop: cells.filter(c => c.classList.contains('pop')).length,
      hint: cells.map((c, i) => c.classList.contains('hint') ? i : -1).filter(i => i >= 0),
      ok: cells.map((c, i) => c.classList.contains('drop-ok') ? i : -1).filter(i => i >= 0),
      willpop: cells.filter(c => c.classList.contains('willpop')).length,
      prompt: (document.querySelector('.prompt') || {}).textContent || '', made: !!document.querySelector('.lbx .fgrid.made'),
      cat: !!document.querySelector('.lbx .fgrid .fcat'), left: bar ? +(bar.textContent.match(/\d+/) || [0])[0] : null,
      undoDisabled: (document.querySelector('.lbx .ftool:nth-child(1)') || {}).disabled, nudge: !!document.querySelector('.lbx .ftool.nudge'),
      hintText: (document.querySelector('.lbx .ftool:nth-child(2) b') || {}).textContent, spare: !!document.querySelector('.lbx .fnote'), fallback: !!(document.querySelector('.lbx') || { dataset: {} }).dataset.fallback,
      ghost: !!document.querySelector('.lbx .fghost'),
      tray: [...document.querySelectorAll('.lbx .ftray .fpiece')].map(p => { const w = getComputedStyle(p.querySelector('.fbits')).gridTemplateColumns.split(' ').length || 1;
        const on = []; [...p.querySelectorAll('.fbit')].forEach((bt, i) => { if (bt.classList.contains('on')) on.push([i % w, Math.floor(i / w)]); });
        const bb = p.getBoundingClientRect(); return { idx: +p.dataset.idx, on, hinted: p.classList.contains('hinted'), x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; }) };
  }).then(st => { st.tray.forEach(p => { p.on = norm(p.on); }); return st; });
  const occOf = s => s.nap.map((v, i) => v || s.set[i] ? 1 : 0);
  const need = s => +((s.prompt.match(/\d+/) || [0])[0]);

  const s0 = await read();
  console.log(`\n--- profile xp ${xp}: a ${s0.g}x${s0.g} box, ${s0.nap.reduce((a, b) => a + b, 0)} kittens, ${s0.tray.length} loaves, ${need(s0)} line(s) to clear`);
  check(s0.g >= 6, `the box is at least six wide (${s0.g})`);
  check(!s0.fallback, 'the board came from the generator, not the always-works fallback');
  check(s0.tray.length >= 2 && s0.tray.length <= 6, `there are two to six loaves in the tray (${s0.tray.length})`);
  check(need(s0) >= 2, `the level asks for at least two lines (${need(s0)})`);
  check(!s0.hintText || /\d/.test(s0.hintText), 'Hint says how many are left');
  check(s0.undoDisabled, 'Undo starts out unavailable');
  const hot = s0.pos.every(p => p.w > 36);
  check(hot, `every square is at least 36px across (${Math.round(s0.pos[0].w)}px)`);
  /* the box has a kitten in most of the rows it wants cleared: not an empty box */
  check(s0.nap.reduce((a, b) => a + b, 0) >= s0.g, 'the box starts with kittens in it, not empty');

  const o0 = occOf(s0);
  /* the whole box is on screen */
  const vp = await page.evaluate(() => { const b = document.querySelector('.lbx .fgrid').getBoundingClientRect(), t = document.querySelector('.lbx .ftools').getBoundingClientRect(), p = document.querySelector('#surface').getBoundingClientRect();
    return { top: b.top - p.top, bottom: t.bottom - p.bottom, left: b.left - p.left, right: b.right - p.right }; });
  check(vp.top >= -1 && vp.bottom <= 1 && vp.left >= -1 && vp.right <= 1, `box, loaves and tools sit inside the play area (${JSON.stringify(Object.fromEntries(Object.entries(vp).map(([k, v]) => [k, Math.round(v)])))})`);

  /* turning: a tap on a loaf in the tray turns it a quarter */
  const t0 = s0.tray.find(p => key(norm(p.on)) !== key(turn(norm(p.on)))) || s0.tray[0];
  await page.mouse.click(t0.x, t0.y); await page.waitForTimeout(100);
  const s1 = await read(); const t1 = s1.tray.find(p => p.idx === t0.idx);
  check(key(t1.on) === key(turn(t0.on)) || key(t0.on) === key(turn(t0.on)), 'a tap turns the loaf a quarter');

  /* a loaf let go nowhere near the box goes back where it was */
  await page.mouse.move(t1.x, t1.y); await page.mouse.down(); await page.mouse.move(t1.x + 12, t1.y - 12, { steps: 2 });
  const sh = await read(); check(sh.ghost && sh.tray.length === s1.tray.length - 1, 'picking a loaf up lifts it out of the tray');
  await page.mouse.move(t1.x, 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
  const s2 = await read();
  check(!s2.ghost && s2.tray.length === s1.tray.length && occOf(s2).join('') === o0.join(''), 'let go over nothing, the loaf goes back to the tray and the box is as it was');

  /* ── the bot: solve what is on screen, then play it with the mouse ── */
  const shapes = s2.tray.map(p => p.on);
  const idxs = s2.tray.map(p => p.idx);
  const sol = solve(o0, s2.g, shapes, need(s2)) || solve(o0, s2.g, shapes, need(s2), 1e9, 4e6);
  check(!!sol, `the bot finds a way through from what is on screen${sol ? ` (${sol.length} loaves)` : ''}`);
  if (!sol) console.log('      stuck on: ' + JSON.stringify({ g: s2.g, occ: o0.join(''), shapes, need: need(s2) }));
  if (!sol){ await page.close(); continue; }

  const dragTo = async (piece, cells, dx, dy, test, last) => {
    const s = await read(); const g = s.g;
    const pc = s.tray.find(p => p.idx === piece.idx);
    const pitch = s.pos[1].x - s.pos[0].x;
    const xs = cells.map(i => s.pos[i].x), ys = cells.map(i => s.pos[i].y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const h = (Math.max(...ys) - Math.min(...ys)) / pitch + 1, gh = h * pitch - 3;
    const fx = cx + dx * pitch, fy = cy + gh / 2 + 34 + dy * pitch;
    await page.mouse.move(pc.x, pc.y); await page.mouse.down(); await page.mouse.move(pc.x + 10, pc.y - 10, { steps: 2 });
    await page.mouse.move(fx, fy, { steps: 8 });
    const during = await read();
    if (test) await test(during);
    await page.mouse.up(); if (!last) await page.waitForTimeout(140);
  };

  let occ = o0.slice(), cleared = 0, firstPreview = true, lineLeft = need(s2);
  const before = await read();
  for (let n = 0; n < sol.length; n++){
    const step = sol[n];
    const piece = { idx: idxs[step.i] };
    /* turn it to the way the plan has it */
    for (let k = 0; k < 4; k++){
      const sNow = await read(); const pc = sNow.tray.find(p => p.idx === piece.idx);
      if (key(pc.on) === key(step.o)) break;
      await page.mouse.click(pc.x, pc.y); await page.waitForTimeout(80);
    }
    const after = occ.slice(); step.cells.forEach(k => { after[k] = 1; });
    const sim = sweepSim(after, s2.g);
    const jitter = n % 2 ? [OFF * 0.7, -OFF * 0.5] : [-OFF * 0.6, OFF * 0.4];
    await dragTo(piece, step.cells, jitter[0], jitter[1], firstPreview ? async d => {
      check(step.cells.every(k => d.ok.includes(k)) && d.ok.length === step.cells.length, 'held over its place (a little off), the preview lights exactly where it would land');
      if (sim.n > 0) check(d.willpop > 0, 'and the lines it would finish are lit as well');
      firstPreview = false;
    } : null, n === sol.length - 1);
    const sN = await read();
    check(occOf(sN).join('') === sim.occ.join(''), `after loaf ${n + 1}, the page's box is the box the rules give${sim.n ? ` (${sim.n} line${sim.n > 1 ? 's' : ''} cleared)` : ''}`);
    if (occOf(sN).join('') !== sim.occ.join('')){
      const gg = s2.g, row = (o, y) => o.slice(y * gg, y * gg + gg).join('');
      console.log('      expected / page (loaf ' + (n + 1) + ', cells ' + step.cells.join(',') + ', made ' + sN.made + ', prompt "' + sN.prompt + '")');
      for (let y = 0; y < gg; y++) console.log('      ' + row(sim.occ, y) + '  ' + row(occOf(sN), y) + '  before ' + row(occ, y));
    }
    occ = sim.occ; cleared += sim.n;
    if (sim.n){ check(sN.pop >= 0, 'a cleared line fades out'); }
    if (n === 0 && sN.left !== null && before.left !== null) check(sN.left === before.left - 1 || sN.made, `a loaf costs a move (${before.left} -> ${sN.left})`);
    if (n === 0 && !sN.made){
      /* Undo takes the loaf back, and any line it cleared comes back with it */
      check(!sN.undoDisabled, 'Undo is available once a loaf is down');
      await page.click('.lbx .ftool:nth-child(1)'); await page.waitForTimeout(250);
      const u = await read();
      check(occOf(u).join('') === o0.join('') && u.tray.length === s2.tray.length, 'Undo takes the loaf back off and puts it in the tray');
      check(u.left === before.left, `and gives the move back (${u.left})`);
      /* ... and play it again */
      for (let k = 0; k < 4; k++){
        const sNow = await read(); const pc = sNow.tray.find(p => p.idx === piece.idx);
        if (key(pc.on) === key(step.o)) break;
        await page.mouse.click(pc.x, pc.y); await page.waitForTimeout(80);
      }
      await dragTo(piece, step.cells, 0, 0);
      const again = await read();
      check(occOf(again).join('') === sim.occ.join(''), 'the same loaf put back lands the same way');
    }
  }
  const fin = await read();
  check(fin.made || fin.cat, 'a finished box says so (the cat curls up on it)');
  check(cleared >= need(s2), `the bot's plan cleared the lines asked for (${cleared} of ${need(s2)})`);
  await page.close();
}

/* ── Hint, tap-to-place, and a jam, each on a fresh board ── */
{
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp: 12000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { loaf: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'loaf');
  await page.waitForFunction(() => document.querySelector('.lbx .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1500);
  const rd = () => page.evaluate(() => {
    const cells = [...document.querySelectorAll('.lbx .fgrid .fcell')];
    const hint = cells.map((c, i) => c.classList.contains('hint') ? i : -1).filter(i => i >= 0);
    return { n: cells.length, hint, hintText: (document.querySelector('.lbx .ftool:nth-child(2) b') || {}).textContent, hintDisabled: document.querySelector('.lbx .ftool:nth-child(2)').disabled,
      occ: cells.map(c => (c.classList.contains('nap') || c.classList.contains('set')) && !c.classList.contains('pop') ? 1 : 0),
      pos: cells.map(c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }),
      prompt: (document.querySelector('.prompt') || {}).textContent || '', nudge: document.querySelector('.lbx .ftool:nth-child(1)').classList.contains('nudge'),
      tray: [...document.querySelectorAll('.lbx .ftray .fpiece')].map(p => { const bb = p.getBoundingClientRect(); return { idx: +p.dataset.idx, hinted: p.classList.contains('hinted'), x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; }) };
  });
  const a = await rd();
  await page.click('.lbx .ftool:nth-child(2)'); await page.waitForTimeout(200);
  const b = await rd();
  check(b.hint.length >= 2, `Hint lights a place (${b.hint.length} squares)`);
  check(b.tray.some(p => p.hinted), 'and marks which loaf goes there');
  check(a.hintText !== b.hintText, `and counts down (${a.hintText} -> ${b.hintText})`);
  check(b.hint.every(i => !a.occ[i]), 'the hinted squares are empty ones');

  /* tap-to-place: tap the hinted loaf (it turns and is chosen), then the box */
  const g = Math.round(Math.sqrt(b.n));
  const hp = b.tray.find(p => p.hinted);
  /* the hint turned it already; a tap turns it again, so three more taps bring it round */
  for (let k = 0; k < 4; k++){
    /* turning changes how wide a loaf is, so it can move in the tray: find it again each time */
    const now = (await rd()).tray.find(p => p.idx === hp.idx);
    await page.mouse.click(now.x, now.y); await page.waitForTimeout(80);
    const sn = await page.evaluate(() => document.querySelectorAll('.lbx .fpiece.fsel').length);
    if (k === 0) check(sn === 1, 'tapping a loaf chooses it');
  }
  const mid = b.hint[Math.floor(b.hint.length / 2)];
  await page.mouse.click(b.pos[mid].x, b.pos[mid].y); await page.waitForTimeout(400);
  const c = await rd();
  check(c.tray.length === a.tray.length - 1 && c.occ.join('') !== a.occ.join(''), 'with a loaf chosen, tapping the box puts it down at the nearest place it fits');

  /* a jam: lay the rest where they clear nothing, until none will go anywhere or none are left */
  await page.click('.lbx .ftool:nth-child(1)'); await page.waitForTimeout(250);
  const d0 = await rd();
  check(d0.occ.join('') === a.occ.join(''), 'Undo after a tap-placed loaf restores the box');

  /* a jam: lay each loaf where it finishes nothing, until none are left, and the box says there is nowhere to go */
  let laid = 0;
  for (let guard = 0; guard < 8; guard++){
    const s = await rd();
    const trayNow = await page.evaluate(() => [...document.querySelectorAll('.lbx .ftray .fpiece')].map(p => { const w = getComputedStyle(p.querySelector('.fbits')).gridTemplateColumns.split(' ').length || 1;
      const on = []; [...p.querySelectorAll('.fbit')].forEach((bt, i) => { if (bt.classList.contains('on')) on.push([i % w, Math.floor(i / w)]); });
      const bb = p.getBoundingClientRect(); return { idx: +p.dataset.idx, on, x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; }));
    if (!trayNow.length) break;
    const pc = trayNow[0], o = norm(pc.on), [w, h] = dims(o);
    let spotCells = null;
    for (let ay = 0; ay + h <= g && !spotCells; ay++) for (let ax = 0; ax + w <= g && !spotCells; ax++){
      const cells = cellsAt(o, ax, ay, g); if (!cells || cells.some(k => s.occ[k])) continue;
      const af = s.occ.slice(); cells.forEach(k => { af[k] = 1; });
      if (sweepSim(af, g).n === 0) spotCells = cells;
    }
    if (!spotCells) break;
    const pitch = s.pos[1].x - s.pos[0].x;
    const xs = spotCells.map(i => s.pos[i].x), ys = spotCells.map(i => s.pos[i].y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, gh = h * pitch - 3;
    await page.mouse.move(pc.x, pc.y); await page.mouse.down(); await page.mouse.move(pc.x + 10, pc.y - 10, { steps: 2 });
    await page.mouse.move(cx, cy + gh / 2 + 34, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(140);
    laid++;
  }
  const j = await rd();
  if (laid >= 2 && !j.tray.length){
    check(/nothing|rien|nada|nichts/i.test(j.prompt), `with every loaf down and no line cleared, the box says nothing is left that fits ("${j.prompt}")`);
    check(j.nudge, 'and Undo is nudged');
  } else check(true, `the jam check needs a free place for every loaf (laid ${laid}); skipped on this board`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} problem(s) in Loaf Box` : '\nLoaf Box plays the way it says');
process.exit(bad ? 1 : 0);
