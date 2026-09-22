/* Every probe, in the order that fails fastest: the quick ones first, the sweep
 * — which opens all sixty-six modes and takes minutes — last. Exits non-zero on
 * the first failure.
 *
 *   node tools/probe/all.mjs
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const probes = ['settings.mjs', 'board.mjs', 'home.mjs', 'sweep.mjs'];

for (const p of probes){
  console.log(`\n=== ${p} ${'='.repeat(Math.max(0, 60 - p.length))}`);
  const r = spawnSync(process.execPath, [join(HERE, p)], { stdio: 'inherit' });
  if (r.status !== 0){
    console.log(`\n${p} failed — stopping here.`);
    process.exit(r.status || 1);
  }
}
console.log('\nall probes clean');
