/* Just Play's zone, by value: at the top multiplier the clock stops, but only while each puzzle is being solved at a real pace,
 * only for the run that says it has a zone, and never when the multiplier is below the top.
 *
 * Lifts `zoneOn` out of the build and asks it the questions the clock asks every frame.
 *
 *   node tools/probe/zone_unit.mjs
 */
import { readFileSync } from 'fs';
const SITE = process.env.SITE || '/tmp/pw/_site';
const html = readFileSync(SITE + '/index.html', 'utf8');
const m = html.match(/const zoneOn = \(\) => \{[\s\S]*?\n\};/);
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
if (!m){ console.log('FAIL could not find zoneOn in the build'); process.exit(1); }
const ask = (o = {}) => {
  const now = o.now ?? 1000, start = o.start ?? 0;
  const kinds = { shuffle: { zone: true }, mix: {}, survival: {} };
  const run = Object.assign({ kind: 'shuffle', started: true, curMode: { id: 'odd' }, lvl: 10, pressure: 0.66 }, o.run);
  return new Function('run', 'KINDS', 'roundLive', 'multiplier', 'parOf', 'performance', 'roundStart', m[0] + '; return zoneOn();')(
    run, kinds, o.live ?? true, () => o.mult ?? 5, () => o.par ?? 2400, { now: () => now }, start);
};
check(ask() === true, 'Just Play at the top multiplier, early in a round: the clock stops');
check(ask({ mult: 4 }) === false, 'one step short of the top: it runs');
check(ask({ mult: 1 }) === false, 'and at the bottom');
check(ask({ now: 1000 + 6301 + 500 }) === false, 'a round left sitting for longer than two and a half pars: it runs again');
check(ask({ now: 6000 }) === true, 'a round at a real pace (6s against a 2.4s par) still holds it');
check(ask({ run: { kind: 'mix' } }) === false, 'a run without a zone never has one (Mixtape)');
check(ask({ run: { kind: 'survival' } }) === false, 'nor Survival');
check(ask({ live: false }) === false, 'between rounds it does not claim to be stopped');
check(ask({ run: { started: false } }) === false, 'nor before the run has started');
check(ask({ par: 14000, now: 20000 }) === true, 'a slow mode has a longer grace than a fast one: 20s into a 14s par is still a pace');
check(ask({ par: 2400, now: 20000 }) === false, 'and the same 20s on a 2.4s par is not');
console.log(bad ? `\n${bad} FAILED` : '\nthe zone stops the clock only when it should');
process.exit(bad ? 1 : 0);
