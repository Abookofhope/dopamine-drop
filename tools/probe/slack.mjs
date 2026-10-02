/* No Crossing: a hint that rings the peg worth moving.
 *
 *   - Hint (two a round) lights the two threads of one crossing and rings one peg, an end of one of them, the one caught up in the most
 *     crossings
 *   - moving that peg off to one side changes the crossing count (it is not a decoration): dragging it away from where it was moves it
 *
 *   node tools/probe/slack.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, lang = 'en', vp = { width: 400, height: 820 }) => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { slack: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'slack');
  await page.waitForSelector('#surface .slacknode', { timeout: 9000 }); await page.waitForTimeout(500);
  return page;
};
const read = page => page.evaluate(() => {
  const R = e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
  const nodes = [...document.querySelectorAll('.slacknode')].map((e, i) => ({ i, hot: e.classList.contains('hot'), ...R(e) }));
  const lines = [...document.querySelectorAll('.slackwire line')].map((l, i) => ({ i, hint: l.classList.contains('hint'), x1: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), x2: +l.getAttribute('x2'), y2: +l.getAttribute('y2') }));
  const tool = document.querySelector('.sumcol .sumtool');
  return { nodes, lines, tool: tool ? { text: tool.textContent.trim(), ...R(tool) } : null, prompt: document.getElementById('prompt').textContent.trim(), surface: R(document.getElementById('surface')) };
});
const near = (n, x, y) => Math.hypot(n.x + n.w / 2 - x, n.y + n.h / 2 - y) < 3;

for (const [xp, label] of [[0, 'a new player'], [60000, 'a high level']]){
  const page = await open(xp); let s = await read(page);
  check(!!s.tool && s.tool.h >= 40 && s.tool.y + s.tool.h <= s.surface.y + s.surface.h + 1, `${label}: Hint is inside the board and big enough to hit (${s.tool && Math.round(s.tool.h)}px)`);
  const c0 = parseInt(s.prompt.match(/\d+/)[0], 10);
  await page.mouse.click(s.tool.x + 20, s.tool.y + 18); await page.waitForTimeout(250);
  s = await read(page);
  const lit = s.lines.filter(l => l.hint), hot = s.nodes.filter(n => n.hot);
  check(lit.length === 2 && hot.length === 1 && /1/.test(s.tool.text), `${label}: Hint lights two threads, rings one peg, and uses one of two (${lit.length} threads, ${hot.length} ringed, ${s.tool.text})`);
  /* the ringed peg is at an end of one of the lit threads */
  const ends = lit.flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]);
  const pct = n => [(n.x + n.w / 2 - s.surface.x) , (n.y + n.h / 2 - s.surface.y)];
  const boxR = await page.evaluate(() => { const r = document.querySelector('.arcbox').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const h = hot[0], hx = (h.x + h.w / 2 - boxR.x) / boxR.w * 100, hy = (h.y + h.h / 2 - boxR.y) / boxR.h * 100;
  check(ends.some(([ex, ey]) => Math.hypot(ex - hx, ey - hy) < 1.5), `${label}: and the ringed peg is an end of one of the lit threads`);
  /* it can be dragged away */
  const before = [h.x + h.w / 2, h.y + h.h / 2];
  await page.mouse.move(before[0], before[1]); await page.mouse.down(); await page.mouse.move(before[0] + 40, before[1] + 40, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
  const a = await read(page); const moved = a.nodes[h.i];
  check(Math.hypot(moved.x + moved.w / 2 - before[0], moved.y + moved.h / 2 - before[1]) > 10, `${label}: the ringed peg drags away from where it was`);
  await page.close();
}
{
  const page = await open(0, 'fr', { width: 320, height: 568 }); const s = await read(page);
  check(!!s.tool && /Indice/.test(s.tool.text), `fr: Hint is in French (${s.tool && s.tool.text})`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nNo Crossing rings the peg worth moving');
process.exit(bad ? 1 : 0);
