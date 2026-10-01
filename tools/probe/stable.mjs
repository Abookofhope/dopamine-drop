/* Do the pieces of a board hold their size and their place while it draws itself in, and while you play it?
 *
 * The board used to grow in from 97% and slide up four pixels as it appeared, so every square in every mode shrank and moved for a
 * quarter of a second each round, and some modes shrank a square again as you picked it. A square is a slot: it is there or it is
 * not, and the only thing allowed to change is how visible it is, its colour, and what is drawn on it.
 *
 * Every element in the board that has a box of its own (a background, a border or a shadow) is watched every 16ms from the moment the
 * board appears until 1.2s later, and again for 1s after the first real tap. One that is visible and changes size by more than 1.5px
 * or moves by more than 2px is reported, unless it belongs to something that is meant to move (a ball, a peg you drag, a thread).
 *
 *   node tools/probe/stable.mjs              all modes, 400x820
 *   ONLY=odd,sum node tools/probe/stable.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, quitToHome, modeList } from './harness.mjs';

const VW = +(process.env.VW || 400), VH = +(process.env.VH || 820);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH }, hasTouch: true });
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
await openApp(page, { reduceMotion: false, xp: 9000, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, schema: 11 });
const modes = await modeList(page);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;

/* Things that are supposed to move or change shape. Matched against the class list of the element or any ancestor inside the board. */
const MOVES = /(^|\s)(duel|duelbtn|lvrload|lvrwedge|lvrbeam|gbowl|gpail|sortrule|ddot|skimzone|skimtrack|side|dbar|tell|tideband|cmove|countfield|plinklane|cball|cthread|cpaw|cribbon|fghost|ball|bub|drop|gdrop|plinkball|pup|dstar|falling|thread|peg|slacknode|node|arcdot|cdot|trcdot|leaf|lamp|glimbug|glimlamp|tidyitem|hbit|wake|ring|spark|swarm|beatdot|hand|needle|cur|jel|vial|cat|catart|sifttok|belt|spool|gate|rgate|tidebub|fill|meter|bar|fx|float|pop|tide|fall|wave|lever|beam|fulcrum|blk|hlvtray|hlvchip|antslot|blob|dot|tick|cd|cdnum|timer|hp|ink|cink)(\s|$)/;

const watch = async ms => page.evaluate(ms => new Promise(done => {
  const s = document.getElementById('surface'); let sb = s.getBoundingClientRect();
  const ids = new WeakMap(); let n = 0; const rec = new Map();
  const vis = (e, cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
  /* A drawn piece (svg.art) is a square in everything but name: it has no box of its own, so it is counted by what it is. */
  const boxy = (cs, e) => (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none' || (e.classList && e.classList.contains('art')));
  const tick = () => {
    sb = s.getBoundingClientRect();   /* the whole board shakes on a miss; only a piece moving against the board counts */
    for (const e of s.querySelectorAll('*')){
      const cs = getComputedStyle(e); if (!vis(e, cs) || !boxy(cs, e)) continue;
      const r = e.getBoundingClientRect(); if (r.width < 14 || r.height < 14 || r.width > sb.width * 0.96) continue;
      let id = ids.get(e); if (!id){ id = ++n; ids.set(e, id); }
      /* opacity counts: an element still fading in is not yet a square */
      const o = parseFloat(cs.opacity) * (e.parentElement ? 1 : 1);
      if (o < 0.9) continue;
      /* Which ancestors it sat under, written down now: a piece that is redrawn before the watch ends has no parents left to ask. */
      let chain = '', q = e; while (q && q !== s){ chain += ' ' + (q.className && q.className.baseVal === undefined ? q.className : ''); q = q.parentElement; }
      const m = rec.get(id) || { e, chain, w0: r.width, h0: r.height, x0: r.left - sb.left, y0: r.top - sb.top, dw: 0, dh: 0, dx: 0, dy: 0 };
      m.dw = Math.max(m.dw, Math.abs(r.width - m.w0)); m.dh = Math.max(m.dh, Math.abs(r.height - m.h0));
      m.dx = Math.max(m.dx, Math.abs(r.left - sb.left - m.x0)); m.dy = Math.max(m.dy, Math.abs(r.top - sb.top - m.y0));
      rec.set(id, m);
    }
  };
  const t = setInterval(tick, 16);
  setTimeout(() => { clearInterval(t); const out = [];
    rec.forEach(m => { if (m.dw > 1.5 || m.dh > 1.5 || m.dx > 2 || m.dy > 2){
      let cls = m.e.className && m.e.className.baseVal === undefined ? m.e.className : (m.e.tagName), anc = m.chain;
      out.push({ cls: String(cls).slice(0, 40), anc: anc.trim().slice(0, 120), d: [Math.round(m.dw * 10) / 10, Math.round(m.dh * 10) / 10, Math.round(m.dx * 10) / 10, Math.round(m.dy * 10) / 10], w: Math.round(m.w0), h: Math.round(m.h0) }); } });
    done(out); }, ms);
}), ms);

let bad = 0, clean = 0, moved = 0;
for (const m of modes){
  if (only && !only.includes(m.id)) continue;
  await openModeList(page); await clickMode(page, m.id);
  await page.waitForFunction(() => { const s = document.getElementById('surface'); return s && s.children.length && !document.getElementById('play').hidden; }, null, { timeout: 12000, polling: 50 }).catch(() => {});
  const fromAppear = await watch(1300);
  /* then real presses across the board, held long enough for a :active or a selected state to show itself */
  const b = await page.evaluate(() => { const r = document.getElementById('surface').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const pts = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7], [0.5, 0.85]];
  const watching = watch(pts.length * 520 + 300);
  for (const [fx, fy] of pts){ await page.mouse.move(b.x + b.w * fx, b.y + b.h * fy); await page.mouse.down(); await page.waitForTimeout(160); await page.mouse.up(); await page.waitForTimeout(330); }
  const afterTap = await watching;
  const all = [...fromAppear.map(x => ({ ...x, when: 'drawing in' })), ...afterTap.map(x => ({ ...x, when: 'after a tap' }))];
  const real = all.filter(x => !MOVES.test(x.cls) && !MOVES.test(x.anc));
  const skipped = all.length - real.length;
  if (real.length){ bad++; console.log(`FAIL ${m.id.padEnd(8)} ${real.length} piece${real.length > 1 ? 's' : ''} changed size or place`);
    const seen = new Set(); real.forEach(x => { const k = x.cls + '|' + x.when; if (seen.has(k)) return; seen.add(k); console.log(`       ${x.when}: .${x.cls} in [${x.anc.slice(0, 50)}] ${x.w}x${x.h}  Δw ${x.d[0]} Δh ${x.d[1]} Δx ${x.d[2]} Δy ${x.d[3]}`); }); }
  else { clean++; console.log(`ok   ${m.id.padEnd(8)}${skipped ? ' (' + skipped + ' moving parts ignored)' : ''}`); }
  await quitToHome(page);
}
console.log(`\n${clean} modes hold their squares still, ${bad} do not`);
if (errs.length) console.log('page errors: ' + errs[0]);
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
