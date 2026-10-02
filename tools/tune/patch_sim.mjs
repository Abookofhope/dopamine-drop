/* A standalone model of Patchwork's Tetris way (the 'clear' goal): the same rules as the app (shapes, dealing, line clears, a jam costing a paw and
 * sweeping two rows), used to tune the numbers rather than to test the app. Three kinds of player: 'greedy' (always the best place), 'mixed' (half
 * and half), 'random' (any place at all, any turn), and 'upright' (a random place for a random patch as it is shown, turning only when nothing
 * fits: how a bot with real drags plays). The model is somewhat harsher than the real game: at the top level the upright player wins 57% here and
 * 80% of 40 real rounds.
 *
 *   node tools/tune/patch_sim.mjs
 */
const BASE = [[[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[1,0],[0,1]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[1,1]], [[0,0],[1,0],[2,0],[2,1]], [[1,0],[2,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[3,0]], [[1,0],[0,1],[1,1],[2,1],[1,2]], [[0,0],[1,0],[0,1],[1,1],[0,2]]];
const norm = cs => { const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(c => [c[0] - mx, c[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]); };
const key = cs => cs.map(c => c.join(',')).join(' ');
const turn = cs => norm(cs.map(c => [-c[1], c[0]]));
const turnsOf = b => { const out = []; let c = norm(b); for (let r = 0; r < 4; r++){ if (!out.some(s => key(s) === key(c))) out.push(c); c = turn(c); } return out; };
const FAM = BASE.map(turnsOf);
let seed = 1; const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x80000000; };

/* The numbers the app ships: six across, 2 + level/4 lines up to eight, the kind deal (tries to find a patch that fits) fading 14, 10, 6, 3. */
export const params = (level, o = {}) => ({
  g: o.g || 6,
  want: o.want || Math.min(8, Math.max(2, 2 + Math.floor(level / 4))),
  fams: FAM.slice(0, o.nfam || (level < 5 ? 7 : level < 10 ? 8 : 10)),
  paws: o.paws || (level < 8 ? 3 : level < 20 ? 2 : 1),
  tries: o.tries || (level < 8 ? 14 : level < 16 ? 10 : level < 24 ? 6 : 3), tray: o.tray || 3,
});
const fitsAny = (g, filled, fam) => { for (const c of fam) for (let ay = 0; ay < g; ay++) for (let ax = 0; ax < g; ax++){ let ok = true; for (const q of c){ const x = ax + q[0], y = ay + q[1]; if (x >= g || y >= g || filled.has(y * g + x)){ ok = false; break; } } if (ok) return true; } return false; };
const placements = (g, filled, fam) => { const out = []; for (const c of fam) for (let ay = 0; ay < g; ay++) for (let ax = 0; ax < g; ax++){ const cells = []; let ok = true; for (const q of c){ const x = ax + q[0], y = ay + q[1]; if (x >= g || y >= g || filled.has(y * g + x)){ ok = false; break; } cells.push(y * g + x); } if (ok) out.push(cells); } return out; };
const lineSets = g => { const out = []; for (let y = 0; y < g; y++) out.push(Array.from({ length: g }, (_, x) => y * g + x)); for (let x = 0; x < g; x++) out.push(Array.from({ length: g }, (_, y) => y * g + x)); return out; };
const score = (g, filled, cells, L) => { const fl = new Set(filled); cells.forEach(i => fl.add(i)); let sc = 0; L.forEach(line => { const n = line.filter(i => fl.has(i)).length; if (n === g) sc += 100; else if (line.some(i => cells.includes(i))) sc += (n / g) ** 2 * 10; }); return sc; };

export const playRound = (P, policy) => {
  if (policy === 'upright') return playUpright(P);
  return playRoundAll(P, policy);
};
const playUpright = P => {
  const { g, want } = P, filled = new Set(), L = lineSets(g);
  const deal = () => { let f = null; for (let t = 0; t < P.tries; t++){ f = P.fams[Math.floor(rnd() * P.fams.length)]; if (fitsAny(g, filled, f)) break; } return { f, rot: Math.floor(rnd() * 4) }; };
  const shown = p => p.f[p.rot % p.f.length];
  let tray = Array.from({ length: P.tray }, deal), lines = 0, paws = P.paws, placed = 0, jams = 0;
  for (let step = 0; step < 600; step++){
    const opts = []; tray.forEach((p, ti) => placements(g, filled, [shown(p)]).forEach(cells => opts.push({ ti, cells })));
    if (!opts.length){ tray.forEach(p => { p.rot++; }); if (tray.every(p => p.rot > 40)) return { win: false, placed, jams, lines }; continue; }
    const pick = opts[Math.floor(rnd() * opts.length)];
    pick.cells.forEach(i => filled.add(i)); placed++;
    tray[pick.ti] = deal();
    const full = L.filter(line => line.every(i => filled.has(i)));
    if (full.length){ new Set(full.flat()).forEach(i => filled.delete(i)); lines += full.length; if (lines >= want) return { win: true, placed, jams, lines }; }
    if (!tray.some(p => fitsAny(g, filled, p.f))){
      jams++; paws--; if (paws <= 0) return { win: false, placed, jams, lines };
      const byRow = Array.from({ length: g }, (_, y) => ({ y, n: [...Array(g).keys()].filter(x => filled.has(y * g + x)).length })).sort((a, b) => b.n - a.n).slice(0, 2);
      byRow.forEach(r => { for (let x = 0; x < g; x++) filled.delete(r.y * g + x); });
      tray = Array.from({ length: P.tray }, deal);
    }
  }
  return { win: false, placed, jams, lines };
};
const playRoundAll = (P, policy) => {
  const { g, want } = P, L = lineSets(g), filled = new Set();
  const deal = () => { let f = null; for (let t = 0; t < P.tries; t++){ f = P.fams[Math.floor(rnd() * P.fams.length)]; if (fitsAny(g, filled, f)) break; } return f; };
  let tray = Array.from({ length: P.tray }, deal), lines = 0, paws = P.paws, placed = 0, jams = 0;
  for (let step = 0; step < 400; step++){
    /* pick */
    const opts = []; tray.forEach((f, ti) => placements(g, filled, f).forEach(cells => opts.push({ ti, cells })));
    let pick;
    const greedy = () => opts.map(o => ({ o, sc: score(g, filled, o.cells, L) + rnd() * 0.01 })).sort((a, b) => b.sc - a.sc)[0].o;
    if (policy === 'greedy') pick = greedy(); else if (policy === 'random') pick = opts[Math.floor(rnd() * opts.length)]; else pick = rnd() < 0.5 ? greedy() : opts[Math.floor(rnd() * opts.length)];
    pick.cells.forEach(i => filled.add(i)); placed++;
    tray[pick.ti] = deal();
    const full = L.filter(line => line.every(i => filled.has(i)));
    if (full.length){ new Set(full.flat()).forEach(i => filled.delete(i)); lines += full.length; if (lines >= want) return { win: true, placed, jams, lines }; }
    if (!tray.some(f => fitsAny(g, filled, f))){
      jams++; paws--; if (paws <= 0) return { win: false, placed, jams, lines };
      const byRow = Array.from({ length: g }, (_, y) => ({ y, n: [...Array(g).keys()].filter(x => filled.has(y * g + x)).length })).sort((a, b) => b.n - a.n).slice(0, 2);
      byRow.forEach(r => { for (let x = 0; x < g; x++) filled.delete(r.y * g + x); });
      tray = Array.from({ length: P.tray }, deal);
    }
  }
  return { win: false, placed, jams, lines };
};
export const stats = (P, policy, n = 1500) => { let w = 0, pl = 0, jm = 0, jamRounds = 0; for (let i = 0; i < n; i++){ const r = playRound(P, policy); if (r.win) w++; pl += r.placed; jm += r.jams; if (r.jams) jamRounds++; } return { win: w / n, placed: pl / n, jams: jm / n, jamRounds: jamRounds / n }; };

if (process.argv[1] && process.argv[1].endsWith('patch_sim.mjs')){
  seed = 1;
  const fmt = s => `win ${(s.win * 100).toFixed(0).padStart(3)}%  patches ${s.placed.toFixed(1).padStart(5)}  jams/round ${s.jams.toFixed(2)}  rounds with a jam ${(s.jamRounds * 100).toFixed(0).padStart(3)}%`;
  for (const level of [0, 4, 8, 12, 16, 20, 30, 40]){
    const P = params(level);
    console.log(`level ${String(level).padStart(2)}: ${P.g}x${P.g}, ${P.want} lines, ${P.fams.length} shapes, ${P.paws} paw(s)`);
    for (const pol of ['greedy', 'mixed', 'upright', 'random']) console.log(`   ${pol.padEnd(7)} ${fmt(stats(P, pol, 800))}`);
  }
}
