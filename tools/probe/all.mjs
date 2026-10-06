/* Every probe, in the order that fails fastest: the quick ones first, the sweep
 * — which opens every mode and takes minutes — last. Exits non-zero on
 * the first failure.
 *
 *   node tools/probe/all.mjs
 *   FROM=tide.mjs node tools/probe/all.mjs      start at that probe
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const probes = ['firstvisit.mjs', 'threads.mjs', 'layoutshift.mjs', 'geometry.mjs', 'tidyspawn.mjs', 'alive.mjs', 'settings.mjs', 'settingsacc.mjs', 'panels.mjs', 'board.mjs', 'mix.mjs', 'home.mjs', 'timing.mjs', 'momentum.mjs', 'fx_unit.mjs', 'meta.mjs', 'forge.mjs', 'odd.mjs', 'trace.mjs', 'roomscroll.mjs', 'hudstates.mjs', 'pegs.mjs', 'clear.mjs', 'snack.mjs', 'chalkpaws.mjs', 'slack.mjs', 'heft.mjs', 'bruise.mjs', 'tumble.mjs', 'peril.mjs', 'hints.mjs', 'volley.mjs', 'slide.mjs', 'gather.mjs', 'slice.mjs', 'paws.mjs', 'lever.mjs', 'descent.mjs', 'cairn.mjs', 'skim.mjs', 'bridge.mjs', 'halve.mjs', 'splice.mjs', 'latch.mjs', 'framerate.mjs', 'tide.mjs', 'glimmer.mjs', 'loaf.mjs', 'blast.mjs', 'sand.mjs', 'yarn.mjs', 'gate.mjs', 'mirror.mjs', 'depth.mjs', 'chalk.mjs', 'zone_unit.mjs', 'drag.mjs', 'stable.mjs', 'sweep.mjs'];

/* FROM=tide.mjs starts at that probe: after a failure and a fix, the ones before it need not run again. */
const from = process.env.FROM ? probes.indexOf(process.env.FROM) : 0;
for (const p of probes.slice(Math.max(0, from))){
  console.log(`\n=== ${p} ${'='.repeat(Math.max(0, 60 - p.length))}`);
  const r = spawnSync(process.execPath, [join(HERE, p)], { stdio: 'inherit' });
  if (r.status !== 0){
    console.log(`\n${p} failed — stopping here.`);
    process.exit(r.status || 1);
  }
}
console.log('\nall probes clean');
