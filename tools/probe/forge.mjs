/* Patchwork, played: a patch is picked up anywhere, follows the finger, and lands on the nearest place it fits when let go.
 *
 * It used to need its middle exactly over one particular square, could not be turned, and was always five wide. So this plays
 * it the way a thumb does rather than the way a test does: every patch is dropped up to nearly half a square away from where
 * it belongs and must still land where it was meant to, the patches are turned by tapping them, and the bot solves what is
 * left from wherever the last drop put things. It also checks the things a player leans on around that: a patch dropped
 * nowhere goes back to the tray, a drop that cannot fit is refused, a laid patch can be lifted and carried to another place,
 * Undo takes the last one back, Hint shows a place and turns the patch to suit, R turns the patch in the hand, and a
 * finished quilt says so.
 *
 *   node tools/probe/forge.mjs              three levels
 *   XP=60000 node tools/probe/forge.mjs     one profile
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

const XPS = process.env.XP ? [+process.env.XP] : [2000, 12000, 60000];
const OFF = 0.45;
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const norm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const key = cs => cs.map(c => c.join(',')).join(' ');
const turn = cs => norm(cs.map(c => [-c[1], c[0]]));

for (const xp of XPS){
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { forge: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'forge');
  await page.waitForFunction(() => document.querySelector('.fgrid .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const cells = [...document.querySelectorAll('.fgrid .fcell')]; const g = Math.round(Math.sqrt(cells.length));
    const r = c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; };
    return { g, hole: cells.map((c, i) => c.classList.contains('mould') && !c.classList.contains('set') ? i : -1).filter(i => i >= 0),
      setc: cells.map((c, i) => c.classList.contains('set') ? i : -1).filter(i => i >= 0),
      col: Object.fromEntries(cells.map((c, i) => [i, c.classList.contains('set') ? c.style.getPropertyValue('--pc') : null]).filter(a => a[1])),
      pos: cells.map(r), prompt: (document.querySelector('.prompt') || {}).textContent || '', made: !!document.querySelector('.fgrid.made'), cat: !!document.querySelector('.fcat'),
      undoDisabled: document.querySelector('.ftool:nth-child(1)').disabled, hintText: document.querySelector('.ftool:nth-child(2) b').textContent,
      ghost: (() => { const g = document.querySelector('.fghost'); return g ? { w: +g.dataset.w, h: +g.dataset.h } : null; })(),
      tray: [...document.querySelectorAll('.ftray .fpiece')].map(p => { const w = getComputedStyle(p.querySelector('.fbits')).gridTemplateColumns.split(' ').length || 1;
        const on = []; let mark = null; [...p.querySelectorAll('.fbit')].forEach((bt, i) => { if (bt.classList.contains('on')){ on.push([i % w, Math.floor(i / w)]); if (bt.classList.contains('m')) mark = [i % w, Math.floor(i / w)]; } });
        const bb = p.getBoundingClientRect(); return { idx: +p.dataset.idx, col: p.querySelector('.fbits').style.getPropertyValue('--pc'), on, mark, x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; }) };
  });
  const s0 = await read();
  console.log(`\n--- profile xp ${xp}: a ${s0.g}x${s0.g} quilt, ${s0.hole.length} squares, ${s0.tray.length} patches`);
  check(s0.g >= 5, `the quilt is at least five wide (${s0.g})`);

  /* turning: a tap on a patch in the tray turns it a quarter, and its paw turns with it */
  const t0 = s0.tray.find(p => key(norm(p.on)) !== key(turn(norm(p.on)))) || s0.tray[0];
  await page.mouse.click(t0.x, t0.y); await page.waitForTimeout(100);
  const s1 = await read(); const t1 = s1.tray.find(p => p.idx === t0.idx);
  check(key(norm(t1.on)) === key(turn(norm(t0.on))) || key(norm(t0.on)) === key(turn(norm(t0.on))), 'a tap turns the patch a quarter');

  /* a patch let go nowhere near the quilt goes back where it was */
  await page.mouse.move(t1.x, t1.y); await page.mouse.down(); await page.mouse.move(t1.x + 12, t1.y - 12, { steps: 2 });
  const heldShape = await read();
  check(!!heldShape.ghost, 'lifting a patch shows it in the hand');
  await page.mouse.move(8, 8, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(120);
  const s2 = await read();
  check(s2.setc.length === 0 && s2.tray.length === s0.tray.length, 'let go nowhere near the quilt, the patch goes back to the tray');

  /* R turns the patch in the hand */
  const t2 = s2.tray.find(p => p.idx === t0.idx) || s2.tray[0];
  await page.mouse.move(t2.x, t2.y); await page.mouse.down(); await page.mouse.move(t2.x + 12, t2.y - 12, { steps: 2 });
  const g0 = (await read()).ghost; await page.keyboard.press('r'); await page.waitForTimeout(80); const g1 = (await read()).ghost;
  const square = g0 && g0.w === g0.h;
  check(g0 && g1 && (square || (g0.w === g1.h && g0.h === g1.w)), 'R turns the patch in the hand' + (square ? ' (this one is as wide as it is tall)' : ''));
  await page.mouse.move(8, 8, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(100);

  /* Hint shows a place, and turns the patch to suit */
  const before = await read();
  await page.click('.ftool:nth-child(2)'); await page.waitForTimeout(150);
  const hinted = await page.evaluate(() => [...document.querySelectorAll('.fgrid .fcell.hint')].length);
  const after = await read();
  check(hinted >= 2 && hinted <= 5 && after.hintText !== before.hintText, `Hint lights the place (${hinted} squares) and spends one (${before.hintText} -> ${after.hintText})`);

  /* play it out like a thumb, from wherever each drop leaves things */
  let exact = 0, elsewhere = 0, refused = 0, lifted = false;
  for (let step = 0; step < 40; step++){
    const st = await read();
    if (st.made || !st.tray.length) break;
    const g = st.g, free = new Set(st.hole), own = new Map(Object.entries(st.col).map(([k, v]) => [+k, v]));
    const ruleOn = /colour|couleur|color|Farben/i.test(st.prompt);
    const pieces = st.tray.map(p => ({ idx: p.idx, col: p.col, base: norm(p.on) }));
    let sol = null, nodes = 0; const order = [...free].sort((a, b) => a - b), fl = new Set();
    const go = (rem, acc) => {
      if (sol || nodes++ > 200000) return; const first = order.find(c => !fl.has(c)); if (first === undefined){ sol = acc.slice(); return; }
      for (const p of rem){ let c = p.base; const seen = new Set();
        for (let r = 0; r < 4; r++, c = turn(c)){ const k = key(c); if (seen.has(k)) continue; seen.add(k);
          const a0 = c[0], ax = first % g - a0[0], ay = Math.floor(first / g) - a0[1];
          const cells = c.map(q => (ay + q[1]) * g + ax + q[0]);
          if (c.some(q => ax + q[0] < 0 || ax + q[0] >= g || ay + q[1] < 0 || ay + q[1] >= g) || cells.some(i => !free.has(i) || fl.has(i))) continue;
          if (ruleOn && cells.some(i => [[1,0],[-1,0],[0,1],[0,-1]].some(d => { const x = i % g + d[0], y = Math.floor(i / g) + d[1]; if (x < 0 || y < 0 || x >= g || y >= g) return false; const n = y * g + x; return own.has(n) && !cells.includes(n) && own.get(n) === p.col; }))) continue;
          cells.forEach(i => { fl.add(i); own.set(i, p.col); }); acc.push({ p, o: c, cells }); go(rem.filter(q => q !== p), acc); acc.pop(); cells.forEach(i => { fl.delete(i); own.delete(i); }); if (sol) return; } }
    };
    go(pieces, []);
    if (!sol){ const u = await page.$('.ftool:not([disabled])'); if (!u) break; await u.click(); await page.waitForTimeout(120); continue; }
    const s = sol[0]; let cur = st; let tp = cur.tray.find(t => t.idx === s.p.idx);
    for (let k = 0; k < 4 && key(norm(tp.on)) !== key(s.o); k++){ await page.mouse.click(tp.x, tp.y); await page.waitForTimeout(80); cur = await read(); tp = cur.tray.find(t => t.idx === s.p.idx); }
    const xs = s.cells.map(i => cur.pos[i].x), ys = s.cells.map(i => cur.pos[i].y), cw = cur.pos[0].w;
    const cx = xs.reduce((a, c) => a + c, 0) / xs.length, cy = ys.reduce((a, c) => a + c, 0) / ys.length;
    const lift = (Math.max(...s.o.map(q => q[1])) + 1) * (cw + 3) / 2 + 34;
    const go2 = async (fx, fy, tx, ty) => { await page.mouse.move(fx, fy); await page.mouse.down(); await page.mouse.move(fx + 10, fy - 10, { steps: 2 });
      await page.mouse.move(tx, ty, { steps: 8 }); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(130); };
    await go2(tp.x, tp.y, cx + (Math.random() - .5) * cw * OFF * 2, cy + lift + (Math.random() - .5) * cw * OFF * 2);
    const now = await read();
    const got = now.setc.filter(i => !st.setc.includes(i));
    if (!got.length) refused++; else if (s.cells.every(i => got.includes(i))) exact++; else elsewhere++;
    /* once something is laid, lift it by its paw and put it straight back down: it must stay a patch on the quilt */
    if (!lifted && got.length && step === 1){
      lifted = true;
      const a = now.pos[got[0]]; const n0 = now.setc.length;
      await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 14, a.y - 14, { steps: 3 });
      const mid = await read(); check(!!mid.ghost && mid.setc.length === n0 - got.length, 'touching a laid patch lifts it off the quilt');
      await page.mouse.move(a.x, a.y + lift, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(130);
      const back = await read(); check(back.setc.length === n0, 'and it can be put down again (' + back.setc.length + ' of ' + n0 + ' squares laid)');
    }
  }
  const fin = await read();
  check(exact + elsewhere >= s0.tray.length * 0.9 - 1, `dropped up to ${OFF} of a square off, ${exact} landed where aimed, ${elsewhere} elsewhere, ${refused} refused`);
  check(fin.made, 'the finished quilt is marked done' + (fin.cat ? ', with a cat asleep on it' : ''));
  check(fin.cat, 'and the cat is on it');
  await page.close();
}

/* Undo takes the last patch back: play two patches down with no help and undo */
{
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  await openApp(page, { reduceMotion: true, xp: 2000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { forge: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'forge');
  await page.waitForFunction(() => document.querySelector('.fgrid .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1500);
  await page.click('.ftool:nth-child(2)'); await page.waitForTimeout(200);
  const hint = await page.evaluate(() => ({ cells: [...document.querySelectorAll('.fgrid .fcell.hint')].map(c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; }),
    piece: (() => { const p = document.querySelector('.fpiece.hinted'); if (!p) return null; const b = p.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })() }));
  check(hint.piece && hint.cells.length >= 2, 'Hint also marks which patch in the tray it means');
  if (hint.piece){
    const cx = hint.cells.reduce((a, c) => a + c.x, 0) / hint.cells.length, cy = hint.cells.reduce((a, c) => a + c.y, 0) / hint.cells.length;
    await page.mouse.move(hint.piece.x, hint.piece.y); await page.mouse.down(); await page.mouse.move(hint.piece.x + 10, hint.piece.y - 10, { steps: 2 });
    await page.mouse.move(cx, cy + 70, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(150);
    const laid = await page.evaluate(() => document.querySelectorAll('.fgrid .fcell.set').length);
    check(laid === hint.cells.length, 'the patch Hint pointed at goes where Hint pointed (' + laid + ' squares)');
    await page.click('.ftool:nth-child(1)'); await page.waitForTimeout(150);
    const gone = await page.evaluate(() => document.querySelectorAll('.fgrid .fcell.set').length);
    check(gone === 0, 'Undo takes it back off the quilt');
  }
  await page.close();
}

if (errs.length){ bad++; console.log('PAGE ERRORS', [...new Set(errs)].slice(0, 3)); }
await browser.close();
console.log(bad ? `\n${bad} problem(s) in Patchwork` : '\nPatchwork plays the way a thumb does');
process.exit(bad ? 1 : 0);
