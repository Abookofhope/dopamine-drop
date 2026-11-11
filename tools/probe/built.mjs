/* The built game: the page, with the script the build lifted into app.js (0.165.0) put back, so a probe that reads the
 * game's source reads all of it. On its own (not in harness.mjs) so a unit probe needs no browser tooling to use it. */
import { readFileSync } from 'fs';
import { join } from 'path';

export function builtSource(dir){
  let src = readFileSync(join(dir, 'index.html'), 'utf8');
  try { src = src.replace(/<script src="app\.js(\?v=[0-9a-f]+)?"><\/script>/, () => '<script>' + readFileSync(join(dir, 'app.js'), 'utf8') + '</script>'); } catch {}
  return src;
}
