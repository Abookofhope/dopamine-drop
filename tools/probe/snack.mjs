/* Kitten's Snack Attack: shaped patches, a tighter budget, and a board that can always be won.
 *
 *   - a new player's patch is a plain square; from level 3 it is sometimes cut (rounded corners, a plus, a ring, a diamond), so over a dozen
 *     boards at a middle level there are at least three different shapes
 *   - the places outside a shape are walls: not buttons, never tapped, and tapping one costs nothing
 *   - the spare moves over the perfect line are five for a new player and one at a high level (the shared budget gave eight, then three)
 *   - every board, whatever its shape, has a perfect line (each colour sent once, outside in): this reads the board from the page, finds that
 *     line with its own search, plays it with the finger and wins inside the budget
 *
 *   node tools/probe/snack.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async xp => {
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => localStorage.setItem('dd.probe', '1'));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { forage: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'forage');
  await page.waitForSelector('#surface .patch .cell.bug', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const grid = document.querySelector('#surface .patch'), cells = [...grid.querySelectorAll('.cell')];
  const left = parseInt(((document.querySelector('.budget') || {}).textContent || '').replace(/\D/g, '') || '-1', 10);
  return { n: Math.round(Math.sqrt(cells.length)), shape: grid.dataset.shape, pen: +grid.dataset.pen, budget: left, cap: document.querySelectorAll('.antslot').length,
    g: cells.map(c => c.classList.contains('wall') ? 'wall' : c.classList.contains('gone') ? 'gone' : c.dataset.hex),
    walls: cells.filter(c => c.classList.contains('wall')).length, wallButtons: cells.filter(c => c.classList.contains('wall') && c.tagName === 'BUTTON').length,
    prompt: document.getElementById('prompt').textContent.trim() };
});
/* The perfect line, found here from what is on the page: send each colour once, outside in, holding at most `cap` unfinished swarms. */
const perfectLine = b => {
  const N = b.n, colours = [...new Set(b.g.filter(v => v !== 'gone' && v !== 'wall'))];
  const nb = i => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => { const r = Math.floor(i / N) + dr, c = i % N + dc; return r >= 0 && c >= 0 && r < N && c < N ? r * N + c : -1; }).filter(j => j >= 0);
  const play = order => {
    const g = b.g.slice(), out = [];
    for (const col of order){
      if (!out.includes(col) && out.length >= b.cap) return false;
      for (;;){ const wave = []; g.forEach((v, i) => { if (v === col && nb(i).some(j => g[j] === 'gone')) wave.push(i); }); if (!wave.length) break; wave.forEach(i => { g[i] = 'gone'; }); }
      const still = g.includes(col), at = out.indexOf(col);
      if (still && at < 0) out.push(col); if (!still && at >= 0) out.splice(at, 1);
    }
    return g.every(v => v === 'gone' || v === 'wall');
  };
  const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map(p => [x, ...p]));
  return perms(colours).find(play) || null;
};

/* ── a new player: a plain square, and five spare moves ──────────────────────────────────────────────────────────────── */
{
  const shapes = [], spare = [];
  for (let i = 0; i < 5; i++){ const page = await open(0); const b = await read(page); const k = new Set(b.g.filter(v => v !== 'gone' && v !== 'wall')).size; shapes.push(b.shape); spare.push(b.budget - k); await page.close(); }
  check(shapes.every(s => s === 'square'), `a new player's patch is a plain square (${shapes.join(', ')})`);
  check(spare.every(x => x <= 5 && x >= 4), `a new player has five spare moves over the perfect line (${spare.join(', ')})`);
}

/* ── a middle level: different shapes, walls that do nothing, and a perfect line that wins ───────────────────────────── */
{
  const shapes = new Set(); let wallsOk = true, line = 0, played = 0, won = 0, overBudget = 0;
  for (let i = 0; i < 12; i++){
    const page = await open(12000); const b = await read(page); shapes.add(b.shape);
    if (b.shape !== 'square' && !(b.walls > 0 && b.wallButtons === 0)) wallsOk = false;
    const order = perfectLine(b); if (order) line++;
    if (i === 0 && b.walls){ /* a tap on a wall costs nothing */
      const r = await page.evaluate(() => { const w = document.querySelector('.patch .cell.wall'); const q = w.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
      await page.mouse.click(r[0], r[1]); await page.waitForTimeout(150);
      const a = await read(page); check(a.budget === b.budget && a.prompt === b.prompt, 'a tap on a wall costs nothing and changes nothing');
    }
    if (order && played < 5){
      played++;
      for (const col of order){
        const cell = page.locator(`#surface .patch .cell.bug[data-hex="${col}"]:not(.gone)`).first();
        const box = await cell.boundingBox(); if (!box) break;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(260);
      }
      await page.waitForTimeout(500);
      const sc = await page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
      if (sc > 0) won++; else overBudget++;
    }
    await page.close();
  }
  check(shapes.size >= 3, `a middle level shows at least three different shapes in twelve boards (${[...shapes].join(', ')})`);
  check(wallsOk, 'outside a shape the cells are walls, not buttons');
  check(line === 12, `every board has a perfect line (${line} of 12)`);
  check(won === played && played >= 4, `playing the perfect line with a finger wins inside the budget (${won} of ${played})`);
}

/* ── a high level: one spare move, and boards that are not easy to stumble through ───────────────────────────────────── */
{
  const spare = [], pens = []; let line = 0;
  for (let i = 0; i < 6; i++){ const page = await open(60000); const b = await read(page); const k = new Set(b.g.filter(v => v !== 'gone' && v !== 'wall')).size; spare.push(b.budget - k); pens.push(b.pen); if (perfectLine(b)) line++; await page.close(); }
  check(spare.every(x => x === 1), `a high level has one spare move (${spare.join(', ')})`);
  check(pens.every(x => x >= 4), `and a careless order costs at least four extra sends on average (${pens.join(', ')})`);
  check(line === 6, `and every board still has its perfect line (${line} of 6)`);
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : "\nKitten's Snack Attack has shapes, and can always be won");
process.exit(bad ? 1 : 0);
