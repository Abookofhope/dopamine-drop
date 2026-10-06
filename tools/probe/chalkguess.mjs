/* Chalk Line's last resort. When the search cannot find an answer inside its budget, the round is offered a straight ramp. That ramp
 * used to start on the basket's side of the ball, so the ball fell past the end of it: on an empty field it could never win, and about
 * one top-level board in forty took that road. It now crosses under the ball from the far side and is only used if it lands on every
 * field shape. This forces the road (localStorage dd.chalkguess, with dd.probe) and draws the ramp on empty fields.
 *
 *   node tools/probe/chalkguess.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const px = (s, p) => [s.x + p[0] / 100 * s.w, s.y + p[1] / 100 * s.h];
const BOARDS = 10;
let wins = 0, guessedAll = true, empty = true;

for (let i = 0; i < BOARDS; i++){
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.addInitScript(() => { localStorage.setItem('dd.probe', '1'); localStorage.setItem('dd.chalkguess', '1'); });
  await openApp(page, { reduceMotion: true, xp: 0, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { chalk: 1 }, schema: 11 });
  await openModeList(page); await clickMode(page, 'chalk');
  await page.waitForSelector('.chalkbox', { timeout: 9000 }); await page.waitForTimeout(600);
  const s = await page.evaluate(() => { const b = document.querySelector('.chalkbox'); const r = b.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, sol: b.dataset.solution ? JSON.parse(b.dataset.solution) : null, guessed: b.dataset.guessed,
      things: ['cblock', 'cbump', 'cpad', 'cscis', 'cportal', 'cribbon', 'cpaw'].reduce((n, c) => n + b.querySelectorAll('.' + c).length, 0) }; });
  if (s.guessed !== '1') guessedAll = false;
  if (s.things) empty = false;
  if (!s.sol){ await page.close(); continue; }
  for (const st of s.sol){ const a = px(s, st[0]); await page.mouse.move(a[0], a[1]); await page.mouse.down(); for (const p of st.slice(1)){ const q = px(s, p); await page.mouse.move(q[0], q[1]); } await page.mouse.up(); }
  await page.locator('.ctool.drop').click({ position: { x: 20, y: 18 } });
  const out = await page.waitForFunction(() => document.querySelector('.cbasket.caught') ? 'win' : (document.querySelector('.cball.lost') ? 'miss' : false), null, { timeout: 14000, polling: 40 }).then(h => h.jsonValue()).catch(() => 'none');
  if (out === 'win') wins++;
  await page.close();
}
check(guessedAll, 'the last resort was the road taken on every board');
check(empty, 'on fields with nothing on them');
check(wins === BOARDS, `the ramp wins on every one (${wins} of ${BOARDS})`);
check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nChalk Line’s last-resort ramp can be won');
process.exit(bad ? 1 : 0);
