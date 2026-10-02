/* Spool Shots: a hint that names the next spool, and moves that are not wasted.
 *
 *   - Hint (two a round) lights one spool; firing it leaves the picture exactly one shot nearer (a search over the board as drawn
 *     checks it)
 *   - a spool that cannot fire (spent, or the wrong colour for where it would land) kicks back and costs nothing
 *   - winding the last shot back by tapping a square it painted gives its move back
 *   - firing the spools the search names paints the picture and wins
 *
 *   node tools/probe/volley.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }, lang = 'en') => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { volley: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'volley');
  await page.waitForSelector('#surface .vbox .vpix', { timeout: 9000 }); await page.waitForTimeout(700);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const pix = [...document.querySelectorAll('.vpix')], guns = [...document.querySelectorAll('.vgun')];
  const xs = new Set(pix.map(e => Math.round(e.getBoundingClientRect().left))), W = xs.size, H = pix.length / W;
  const tool = document.querySelector('.sumcol .sumtool');
  return { W, H, pix: pix.map(e => ({ colour: getComputedStyle(e).backgroundColor, on: e.classList.contains('on'), ...R(e) })),
    guns: guns.map(e => ({ colour: getComputedStyle(e).backgroundColor, hinted: e.classList.contains('hinted'), spent: e.classList.contains('spent'), ...R(e) })),
    tool: tool ? { text: tool.textContent.trim(), ...R(tool) } : null, budget: (document.querySelector('.budget') || {}).textContent || '', surface: R(document.getElementById('surface')) };
});
const left = s => parseInt((s.budget.match(/\d+/) || ['0'])[0], 10);
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const mid = e => [e.x + e.w / 2, e.y + e.h / 2];
/* cannons in the order the app makes them: into each row from the left then the right, then into each column from above then below */
const paths = (W, H) => { const g = []; for (let r = 0; r < H; r++){ g.push(Array.from({ length: W }, (_, c) => r * W + c)); g.push(Array.from({ length: W }, (_, c) => r * W + (W - 1 - c))); }
  for (let c = 0; c < W; c++){ g.push(Array.from({ length: H }, (_, r) => r * W + c)); g.push(Array.from({ length: H }, (_, r) => (H - 1 - r) * W + c)); } return g; };
const solve = s => {
  const P = paths(s.W, s.H), target = s.pix.map(p => p.colour), tint = s.guns.map(g => g.colour);
  const shot = (grid, gi) => { const hit = []; for (const i of P[gi]){ if (grid[i]) break; hit.push(i); } return hit; };
  const start = s.pix.map(p => p.on ? p.colour : null), goal = target.join('|');
  if (start.join('|') === goal) return { d: 0, first: -1 };
  const seen = new Set([start.map(x => x || '').join('|')]); let front = [{ g: start, first: -1 }];
  for (let d = 1; d <= 16; d++){
    const next = [];
    for (const { g, first } of front) for (let gi = 0; gi < P.length; gi++){
      const hit = shot(g, gi); if (!hit.length || hit.some(i => target[i] !== tint[gi])) continue;
      const nx = g.slice(); hit.forEach(i => { nx[i] = tint[gi]; });
      const key = nx.map(x => x || '').join('|'); if (seen.has(key)) continue; seen.add(key);
      const f = first < 0 ? gi : first; if (nx.join('|') === goal) return { d, first: f }; next.push({ g: nx, first: f });
    }
    if (!next.length) break; front = next;
  }
  return { d: -1, first: -1 };
};
const fire = async (page, g) => { const [x, y] = mid(g); await page.mouse.click(x, y); await page.waitForTimeout(900); };

for (const [xp, label, vp] of [[0, 'a new player', { width: 400, height: 820 }], [12000, 'a higher level', { width: 400, height: 820 }]]){
  const page = await open(xp, vp); let s = await read(page);
  check(!!s.tool && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1, `${label}: Hint is inside the board and big enough to hit (${s.tool && Math.round(s.tool.h)}px)`);
  const d0 = solve(s);
  check(d0.d > 0, `${label}: the picture is ${d0.d} shots away`);
  /* the hint */
  const [hx, hy] = mid(s.tool); await page.mouse.click(hx, hy); await page.waitForTimeout(250);
  s = await read(page);
  const lit = s.guns.map((g, i) => g.hinted ? i : -1).filter(i => i >= 0);
  check(lit.length === 1 && /1/.test(s.tool.text), `${label}: Hint lights one spool and uses one of two (${s.tool.text})`);
  const b0 = left(s);
  await fire(page, s.guns[lit[0]]); s = await read(page);
  const d1 = solve(s);
  check(d1.d === d0.d - 1 && left(s) === b0 - 1, `${label}: firing it leaves the picture one shot nearer (${d0.d} -> ${d1.d}) and costs a move (${b0} -> ${left(s)})`);
  /* a kick costs nothing: fire a spool that cannot fire */
  const blocked = s.guns.findIndex((g, i) => { const P = paths(s.W, s.H)[i]; const hit = []; for (const k of P){ if (s.pix[k].on) break; hit.push(k); } return hit.length === 0 || hit.some(k => s.pix[k].colour !== g.colour); });
  if (blocked >= 0){ const b = left(s); await fire(page, s.guns[blocked]); const a = await read(page); check(left(a) === b, `${label}: a spool that cannot fire kicks back and costs nothing (${b} -> ${left(a)})`); }
  /* wind the last shot back by tapping a square it painted */
  s = await read(page);
  const painted = s.pix.find(p => p.on);
  if (painted){ const b = left(s); const [px, py] = mid(painted); await page.mouse.click(px, py); await page.waitForTimeout(250); const a = await read(page);
    check(left(a) === b + 1 && a.pix.filter(p => p.on).length < s.pix.filter(p => p.on).length, `${label}: winding the last shot back gives its move back (${b} -> ${left(a)})`); }
  /* then follow the search to the end */
  for (let guard = 0; guard < 16; guard++){
    s = await read(page); const q = solve(s); if (q.d <= 0 || q.first < 0) break;
    await fire(page, s.guns[q.first]);
    if (await score(page) > 0) break;
  }
  await page.waitForTimeout(500);
  check(await score(page) > 0, `${label}: firing the spools the search names paints the picture and wins`);
  await page.close();
}
{
  const page = await open(0, { width: 320, height: 568 }, 'fr'); const s = await read(page);
  check(!!s.tool && /Indice/.test(s.tool.text), `fr: Hint is in French (${s.tool && s.tool.text})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nSpool Shots names the next spool and does not waste a move');
process.exit(bad ? 1 : 0);
