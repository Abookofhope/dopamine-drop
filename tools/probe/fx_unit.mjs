/* The craft room's rules, checked by value.
 *
 * The app keeps everything inside one closure, so nothing here can be called from
 * a browser test. This lifts the actual source of the meta layer out of the built
 * page (the text between two comments, not a copy of it) and runs it in a sandbox
 * with just enough stubbed around it (a save, a calendar), then asks it exact
 * questions: what does Biscuit add at each bond, does Noodle's spare life run out,
 * do the wishes come out the same on the same date, can a cat be adopted without
 * the yarn.
 *
 * It is a test of the rules and not of the screens; the screens are tested by
 * playing them (meta.mjs).
 *
 *   node tools/probe/fx_unit.mjs
 *   SITE=_site node tools/probe/fx_unit.mjs
 */
import { readFileSync } from 'fs';
import vm from 'vm';

const SITE = process.env.SITE || '/tmp/pw/_site';
const html = readFileSync(SITE + '/index.html', 'utf8');
const from = html.indexOf('/* ── Cat art ');
const to = html.indexOf('/* ═══ The craft room, on screen');
if (from < 0 || to < 0) { console.log('FAIL could not find the meta layer in the build'); process.exit(1); }
const core = html.slice(from, to);
const pick = name => { const m = html.match(new RegExp('(?:^|\\n)(function ' + name + '\\([\\s\\S]*?\\n})', 'm')); return m ? m[1] : null; };

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/* A fresh world for every group of checks. */
function world(over = {}){
  const state = { day: '2026-09-30', level: 1, stars: 0 };
  const save = Object.assign({ yarn: 0, yarnFrac: 0, yarnEver: 0, pals: { biscuit: { bond: 0, pet: null, bow: '' } }, palsOn: ['biscuit'],
    room: {}, day: {}, wishes: {}, charmSeen: {}, twist: {}, marathon: {}, dailyBestStreak: 0 }, over);
  const src = `(function(save, S, persist, todayKey, mulberry32, hashStr, playerLevel, totalStars, masteredCount, starsFor, STAR_AT, CATS, catOf, fmt){
    ${core}
    return { PALS, PAL_BY_ID, PAL_FX, CHARMS, CHARM_FX, CHARM_BY_ID, TWISTS, MASTERY_AT, Room, Yarn, Pals, Fx, Day, Wish, Charm, Twist, BOND_AT, WISH_T, WEEK_GOAL, ensureMeta, newAcc, ROOM_COST, SEAT_AT, weekKey };
  })`;
  const fn = vm.runInNewContext(src, { Math, Date, Object, Array, JSON, Set, Map, Number, String, Boolean, parseInt, isFinite });
  const mul = new Function('return ' + pick('mulberry32'))();
  const hs = new Function('return ' + pick('hashStr'))();
  const stub = { clamp: (v, a, b) => v < a ? a : v > b ? b : v };
  const api = fn(save, state, () => {}, () => state.day, mul, hs, () => state.level, () => state.stars, () => 0,
    id => Math.min(3, ((save.marathon[id] || 0) >= 3200 ? 3 : (save.marathon[id] || 0) >= 1600 ? 2 : (save.marathon[id] || 0) >= 600 ? 1 : 0)),
    [600, 1600, 3200], [{ id: 'focus' }, { id: 'reflex' }, { id: 'logic' }, { id: 'numbers' }, { id: 'words' }, { id: 'calm' }, { id: 'physics' }, { id: 'make' }],
    id => 'focus', n => String(Math.round(n)));
  return { api, save, state };
}
const run = (over = {}) => Object.assign({ kind: 'shuffle', charms: [], fxs: null, time: 30000, lives: 0, livesMax: 0, rnd: Math.random }, over);
const info = (o = {}) => Object.assign({ mult: 1, speed: 0.5, saved: 1000, id: 'odd', fam: 'focus', fresh: false, varied: false, low: false, timed: true,
  streak: 1, n: 1, boss: false, modifier: false, back: false }, o);

/* ── yarn ─────────────────────────────────────────────────────────────────── */
{
  const { api, save } = world();
  for (let i = 0; i < 5; i++) api.Yarn.give(0.4);
  check(save.yarn === 2 && near(save.yarnFrac, 0, 1e-9), 'a payout of 0.4 five times is two whole yarn, not five rounded away (' + save.yarn + ')');
  check(save.yarnEver === 2, 'the lifetime total moves with it');
  check(api.Yarn.spend(5) === false && save.yarn === 2, 'spending more than you have does nothing');
  check(api.Yarn.spend(2) === true && save.yarn === 0, 'spending what you have works');
}

/* ── the room and its seats ───────────────────────────────────────────────── */
{
  const { api, save } = world({ yarn: 10000 });
  check(api.Room.seats() === 1 && api.Room.comfort() === 0, 'a bare room has one seat and no comfort');
  for (let i = 0; i < 10; i++){ const slot = ['rug', 'window', 'wall', 'shelf', 'tree'][i % 5]; api.Room.buy(slot); }
  check(api.Room.level() === 10 && api.Room.seats() === 2 && api.Room.comfort() === 10, 'grade ten opens the second seat and pays +10% (' + api.Room.level() + ' / ' + api.Room.seats() + ')');
  ['lamp', 'bed', 'plant', 'rug', 'window', 'wall', 'shelf', 'tree', 'lamp', 'bed'].forEach(s => api.Room.buy(s));
  check(api.Room.level() === 20 && api.Room.seats() === 3, 'grade twenty opens the third');
  for (let i = 0; i < 40; i++) ['rug', 'window', 'wall', 'shelf', 'tree', 'lamp', 'bed', 'plant'].forEach(s => api.Room.buy(s));
  check(api.Room.level() === 24 && api.Room.comfort() === 24, 'twenty-four grades is the most, and the comfort tops out at +24%');
  check(api.Room.buy('rug') === false, 'nothing above grade three');
  const poor = world({ yarn: 59 });
  check(poor.api.Room.buy('rug') === false && poor.save.yarn === 59, 'a 60-yarn rug is not sold for 59');
  check(poor.api.Yarn.mult(null) === 1, 'yarn is worth face value in a bare room');
  const cosy = world({ yarn: 0, room: { rug: 3, window: 3, wall: 3, shelf: 3, tree: 3, lamp: 3, bed: 3, plant: 3 } });
  check(near(cosy.api.Yarn.mult(null), 1.24), 'a finished room pays 24% more yarn');
}

/* ── pals: adopting, seating, bond ────────────────────────────────────────── */
{
  const { api, save, state } = world({ yarn: 149 });
  check(api.Pals.adopt('noodle') === false, 'Noodle at 150 yarn cannot be bought with 149');
  save.yarn = 150;
  check(api.Pals.adopt('noodle') === true && save.yarn === 0 && api.Pals.own('noodle'), 'and can with 150, which is then spent');
  check(save.palsOn.join() === 'biscuit', 'with one seat the new cat waits its turn');
  api.Pals.seat('noodle');
  check(save.palsOn.join() === 'noodle', 'choosing a cat when the seats are full replaces the last (' + save.palsOn.join() + ')');
  save.yarn = 5000; save.pals.luna = undefined;
  check(api.Pals.adopt('luna') === false, 'Luna needs 30 stars as well as the yarn');
  state.stars = 30;
  check(api.Pals.adopt('luna') === true, 'and has her once the stars are there');
  check(api.Pals.adopt('duchess') === false, 'Duchess needs level 25');
  save.yarn = 5000; state.level = 25; check(api.Pals.adopt('duchess') === true, 'and has her at level 25');
  check(api.Pals.adopt('comet') === false, 'Comet needs a 7-day Daily Drop streak');
  save.yarn = 5000; save.dailyBestStreak = 7; check(api.Pals.adopt('comet') === true, 'and has her at seven');
  check(api.Pals.adopt('biscuit') === false, 'a cat you have is not sold to you again');

  const b = world();
  check(b.api.Pals.tier('biscuit') === 0 && b.api.Pals.stars('biscuit') === 0, 'a new cat is at bond I with no marks');
  check(b.api.Pals.addBond('biscuit', 59) === 0 && b.api.Pals.tier('biscuit') === 0, '59 solves along: still bond I');
  check(b.api.Pals.addBond('biscuit', 1) === 1 && b.api.Pals.tier('biscuit') === 1, 'the 60th crosses the first mark and says so');
  check(b.api.Pals.addBond('biscuit', 240) === 2 && b.api.Pals.tier('biscuit') === 2, 'the 300th crosses the second: bond III numbers');
  check(b.api.Pals.addBond('biscuit', 600) === 3 && b.api.Pals.tier('biscuit') === 2, 'the 900th is a third mark that changes nothing but the look');
  b.state.day = '2026-10-01';
  const p1 = b.api.Pals.pet('biscuit'); const p2 = b.api.Pals.pet('biscuit');
  check(p1 && p1.yarn >= 2 && p2 === null, 'a cat is petted once a day for a little yarn');
  b.state.day = '2026-10-02';
  check(b.api.Pals.pet('biscuit') !== null, 'and again the next day');
}

/* ── what each cat does ───────────────────────────────────────────────────── */
{
  const g = (id, bond, extra) => { const w = world({ pals: { [id]: { bond } }, palsOn: [id], ...(extra || {}) }); return w; };
  for (const [bond, ms, pc] of [[0, 400, 4], [60, 700, 7], [300, 1000, 10]]){
    const { api } = g('biscuit', bond); const r = run(); api.Fx.start(r);
    const a = api.Fx.solve(r, info({ timed: true }));
    const b = api.Fx.solve(r, info({ timed: false }));
    check(a.time === ms && a.pts === 1, `Biscuit at bond ${[1, 2, 3][[0, 60, 300].indexOf(bond)]} adds ${ms}ms on a timed solve`);
    check(near(b.pts, 1 + pc / 100) && b.time === 0, `...and ${pc}% points where there is no clock`);
  }
  {
    const { api } = g('noodle', 0); const r = run(); api.Fx.start(r);
    check(api.Fx.freeMiss(r) === true && api.Fx.freeMiss(r) === false, 'Noodle at bond I forgives one miss a run, and only one');
    const w = g('noodle', 300); const r2 = run(); w.api.Fx.start(r2);
    check(w.api.Fx.freeMiss(r2) && w.api.Fx.freeMiss(r2) && !w.api.Fx.freeMiss(r2), 'at bond III, two');
    const l = world({ pals: { noodle: { bond: 0 } }, palsOn: ['noodle'] }); const r3 = run({ charms: ['locket'] }); l.api.Fx.start(r3);
    check(l.api.Fx.freeMiss(r3) && l.api.Fx.freeMiss(r3) && !l.api.Fx.freeMiss(r3), 'the Nine Lives Locket adds one on top');
  }
  {
    const { api } = g('mochi', 0); const r = run(); api.Fx.start(r);
    check(near(api.Fx.solve(r, info({ mult: 1 })).pts, 1) && near(api.Fx.solve(r, info({ mult: 5 })).pts, 1 + 0.06 * 4), 'Mochi pays nothing at x1 and +24% at x5 (bond I)');
  }
  {
    const { api } = g('shadow', 0); const r = run(); api.Fx.start(r);
    const calm = api.Fx.solve(r, info({ low: false })), tense = api.Fx.solve(r, info({ low: true }));
    check(calm.time === 0 && calm.pts === 1 && tense.time === 1000 && near(tense.pts, 1.1), 'Shadow does nothing until the light is going, then +1s and +10%');
  }
  {
    const { api } = g('patches', 0); const r = run(); api.Fx.start(r);
    const f = api.Fx.solve(r, info({ fresh: true })), o = api.Fx.solve(r, info({ fresh: false }));
    check(f.yarn === 3 && near(f.pts, 1.08) && o.yarn === 0, 'Patches: a new mode this run pays 3 yarn and 8%, an old one nothing');
  }
  {
    const { api } = g('luna', 0); const r = run(); api.Fx.start(r);
    const m = api.Fx.solve(r, info({ n: 7 })), n = api.Fx.solve(r, info({ n: 8 }));
    check(m.pts === 2 && m.time === 1500 && n.pts === 1, 'Luna: every 7th solve is a moon round, doubled with +1.5s');
  }
  {
    const { api } = g('nimbus', 0); const r = run(); api.Fx.start(r);
    const m = api.Fx.miss(r);
    check(m.timeBack === 2000 && r.fxs.soft === 15, 'Nimbus gives back 2s on a miss and softens the next clock by 15%');
    check(near(api.Fx.clockK(r), 1.15) && near(api.Fx.clockK(r), 1), 'the softer clock lasts one round');
  }
  {
    const { api } = g('duchess', 300); check(near(api.Yarn.mult(null), 1.35), 'Duchess at bond III makes all yarn 35% more');
    const c = g('comet', 0); const r = run(); c.api.Fx.start(r);
    const f = c.api.Fx.solve(r, info({ speed: 1, saved: 5000 })), s = c.api.Fx.solve(r, info({ speed: 0, saved: 0 }));
    check(near(f.pts, 1.1) && f.time === 500 && near(s.pts, 1), 'Comet pays for speed and refunds a tenth of the time it saved');
    const t = g('truffle', 0); const r2 = run(); t.api.Fx.start(r2);
    check(t.api.Fx.solve(r2, info({ boss: true })).pts === 1.5 && t.api.Fx.solve(r2, info({})).pts === 1 && t.api.Fx.stage(r2).stageK === 1.5, 'Truffle pays x1.5 on bosses and modifier rounds and on stage prizes');
  }
  {
    const w = world({ room: { rug: 3, window: 3, wall: 3, shelf: 3, tree: 3, lamp: 3, bed: 3, plant: 3 }, pals: { biscuit: { bond: 0 }, luna: { bond: 0 }, mochi: { bond: 0 } }, palsOn: ['biscuit', 'luna', 'mochi'] });
    const r = run(); w.api.Fx.start(r);
    check(w.api.Pals.on().length === 3, 'a finished room seats three cats');
    const a = w.api.Fx.solve(r, info({ mult: 5, n: 7 }));
    check(near(a.pts, 2 * (1 + 0.06 * 4)) && a.time === 400 + 1500, 'three cats stack: Luna doubles, Mochi adds 24%, Biscuit and Luna both add time');
    const two = world({ pals: { biscuit: { bond: 0 }, luna: { bond: 0 } }, palsOn: ['biscuit', 'luna'] });
    check(two.api.Pals.on().length === 1, 'with a bare room, a second cat in palsOn does not ride');
  }
}

/* ── charms ───────────────────────────────────────────────────────────────── */
{
  const w = world(); const r = run({ charms: ['goldbell', 'feather', 'catnip'] }); w.api.Fx.start(r);
  const a = w.api.Fx.solve(r, info({ streak: 6, n: 5 }));
  check(near(a.pts, 1.2 * 1.15 * 1.5), 'Golden Bell x Feather Wand x Catnip stack: ' + a.pts.toFixed(4));
  check(w.api.Fx.solve(run({ charms: ['feather'] }), info({ streak: 4 })).pts === 1, 'Feather Wand needs a streak of five');
  const s = run({ charms: ['scratchpost'] }); w.api.Fx.start(s);
  check(w.api.Fx.freeMiss(s) && !w.api.Fx.freeMiss(s), 'Scratching Post forgives the first miss of a stage');
  w.api.Fx.stage(s);
  check(w.api.Fx.freeMiss(s), 'and is ready again at the next stage');
  check(w.api.Fx.penaltyK(run({ charms: ['ghostcat'] })) === 2 && w.api.Fx.penaltyK(run()) === 1, 'Hungry Ghost doubles what a miss costs');
  check(near(w.api.Fx.clockK(run({ charms: ['sharpclaws'] })), 0.8) && near(w.api.Fx.clockK(run({ charms: ['sunbeam'] })), 1.2), 'round clocks: Sharp Claws 0.8, Sunbeam 1.2');
  check(w.api.Fx.zeal(run({ charms: ['bellcollar'] })) === 1 && w.api.Fx.zeal(run()) === 0, 'Bell Collar shifts the streak rungs by one');
  check(near(w.api.Yarn.mult(run({ charms: ['silverspool'] })), 1.5), 'Silver Spool makes yarn 50% more');
  const sf = run({ charms: ['tunatin'], livesMax: 3, lives: 3 }); w.api.Fx.start(sf);
  check(w.api.Fx.stage(sf).life === 1 && w.api.Fx.stage(run({ charms: ['tunatin'] })).time === 4000, 'Tuna Tin: a life where there are lives, 4s where there is a clock');
  check(w.api.CHARMS.length === Object.keys(w.api.CHARM_FX).length && w.api.CHARMS.every(c => w.api.CHARM_FX[c.id]), 'every charm has an effect, and every effect a charm (' + w.api.CHARMS.length + ')');
  check(w.api.PALS.every(p => w.api.PAL_FX[p.id] && w.api.PAL_FX[p.id].v.length === 3), 'every cat has three bonds of numbers (' + w.api.PALS.length + ')');
  const seen = new Set(); let rare = 0, total = 0; const held = ['goldbell'];
  for (let i = 0; i < 400; i++){
    const o = w.api.Charm.offer(run({ charms: held, stage: 2 }));
    check.calls = (check.calls || 0);
    if (o.length !== 3 || new Set(o.map(c => c.id)).size !== 3 || o.some(c => held.includes(c.id))){ check(false, 'an offer is three different charms you do not hold'); break; }
    o.forEach(c => { total++; if (c.rar === 2) rare++; seen.add(c.id); });
  }
  check(seen.size >= 18, 'over many offers nearly every charm shows up (' + seen.size + ' of 21)');
  check(rare / total > 0.05 && rare / total < 0.3, 'rares are offered a sensible share of the time (' + (rare / total * 100).toFixed(1) + '%)');
}

/* ── wishes and the day ───────────────────────────────────────────────────── */
{
  const a = world(), b = world();
  a.api.Wish.ensure(); b.api.Wish.ensure();
  check(JSON.stringify(a.save.wishes.list) === JSON.stringify(b.save.wishes.list), 'the same date gives the same three wishes on any device');
  check(a.save.wishes.list.length === 3 && new Set(a.save.wishes.list.map(x => x.t)).size === 3, 'three different wishes');
  const days = new Set();
  for (let d = 1; d <= 20; d++){ const w = world(); w.state.day = '2026-10-' + String(d).padStart(2, '0'); w.api.Wish.ensure(); days.add(w.save.wishes.list.map(x => x.t).join()); }
  check(days.size >= 12, 'the wishes change from day to day (' + days.size + ' different sets in 20 days)');
  const w = world(); w.api.Wish.ensure();
  const first = w.save.wishes.list[0], def = w.api.Wish.def(first);
  check(w.api.Wish.claim(0) === null, 'a wish that has not been done cannot be collected');
  w.api.Day.get();
  if (first.t === 'solve') w.save.day.solve = first.n;
  else if (first.t === 'streak') w.save.day.streak = first.n;
  else if (first.t === 'runs') w.save.day.run = first.n;
  else if (first.t === 'fam') w.save.day.fam[first.p] = first.n;
  else if (first.t === 'daily') w.save.day.daily = 1;
  else if (first.t === 'modes') for (let i = 0; i < first.n; i++) w.save.day.modes['m' + i] = 1;
  else if (first.t === 'score') w.save.day.score = first.n;
  else w.save.day[{ pet: 'pet', charm: 'charm', twist: 'twist', star: 'star' }[first.t]] = first.n;
  check(w.api.Wish.ready(first), 'a wish is ready once the day has done what it asked (' + first.t + ')');
  const before = w.save.yarn, got = w.api.Wish.claim(0);
  check(got && w.save.yarn > before && w.api.Wish.claim(0) === null, 'and pays once');
  w.state.day = '2026-10-05';
  check(w.api.Day.get().solve === 0, 'the day’s tally starts again at midnight');
  w.api.Wish.ensure(); check(w.save.wishes.list.every(x => !x.done), 'and so do the wishes');
  const wk = world(); wk.api.Wish.ensure(); wk.save.wishes.weekN = 9;
  check(wk.api.Wish.weekReady() && wk.api.Wish.claimWeek() && !wk.api.Wish.claimWeek(), 'nine wishes in a week pays the weekly one, once');
}

/* ── twists ───────────────────────────────────────────────────────────────── */
{
  const { api, save } = world();
  check(!api.Twist.open('odd', 'blitz') && api.Twist.open('odd', 'classic'), 'no twist is open on a mode with no star');
  save.marathon.odd = 600;
  check(api.Twist.open('odd', 'blitz') && api.Twist.open('odd', 'fog') && !api.Twist.open('odd', 'frenzy') && !api.Twist.open('odd', 'iron'), 'one star opens Blitz and Fog');
  save.marathon.odd = 1600; check(api.Twist.open('odd', 'frenzy') && !api.Twist.open('odd', 'iron'), 'two open Frenzy');
  save.marathon.odd = 3200; check(api.Twist.open('odd', 'iron'), 'three open Ironclad');
  check(api.Twist.record('odd', 'blitz', 900) === true && api.Twist.record('odd', 'blitz', 800) === false && api.Twist.best('odd', 'blitz') === 900, 'a twist keeps its own best, and only a higher score replaces it');
  check(api.Twist.record('odd', 'classic', 99999) === false && save.marathon.odd === 3200, 'the Classic board is never written by a twist');
  check(api.Twist.stars('odd', 'blitz') === 1 && api.Twist.total('odd') === 4, 'stars add across boards (3 + 1)');
  check(api.Twist.rank('odd') === 2, 'four stars is the third rank of six');
  save.twist['odd:fog'] = 3300; save.twist['odd:frenzy'] = 3300; save.twist['odd:iron'] = 3300; save.twist['odd:blitz'] = 3300;
  check(api.Twist.total('odd') === 15 && api.Twist.rank('odd') === 5, 'every board at three stars is the top rank');
}

if (bad) console.log(`\n${bad} rule(s) broken`);
else console.log('\nevery rule of the craft room holds');
process.exit(bad ? 1 : 0);
