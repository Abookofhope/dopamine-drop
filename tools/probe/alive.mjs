/* Does the board answer when you touch it?
 *
 * The sweep opens every mode and looks; the monkey taps at random and only says
 * whether anything threw. Neither says whether a board is DEAD: laid out
 * perfectly, named, the right size, and ignoring every finger. That is the worst
 * failure a game has and the one nothing was built to notice, because a dead
 * board raises no error.
 *
 * This finds what can be touched on each board, touches each of them in turn (a
 * real mouse click at its centre, the way a finger does), then drags across the
 * board a few times, and counts what responded: the board changed, the prompt
 * changed, the score moved, the round ended. A mode where nothing ever responds
 * is reported. It also reports how many distinct things could be touched, so a
 * board that is a single unreachable element does not slip by as "clean".
 *
 *   node tools/probe/alive.mjs
 *   MAX=1 node tools/probe/alive.mjs
 *   ONLY=odd,forge node tools/probe/alive.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, modeIdsFromBuild, floorOrDie, touchTargets } from './harness.mjs';

const MAX = !!process.env.MAX;
const PROF = MAX ? { xp: 900000, solved: 40000, runs: 900 } : { xp: 9000, solved: 600, runs: 40 };
const allIds = modeIdsFromBuild(process.env.SITE || '/tmp/pw/_site');
const ids = process.env.ONLY ? process.env.ONLY.split(',') : allIds;
const SEEN = Object.fromEntries(allIds.map(i => [i, 1]));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 100)));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 100)); });

const targets = () => touchTargets(page);

const arm = () => page.evaluate(() => {
  window.__mut = 0; window.__score = document.getElementById('hudScore') ? document.getElementById('hudScore').textContent : '';
  const s = document.getElementById('surface'), pr = document.getElementById('prompt');
  if (window.__mo) window.__mo.disconnect();
  window.__mo = new MutationObserver(m => { window.__mut += m.length; });
  window.__mo.observe(s, { subtree: true, childList: true, attributes: true, characterData: true });
  if (pr) window.__mo.observe(pr, { subtree: true, childList: true, attributes: true, characterData: true });
});
const responded = () => page.evaluate(() => {
  const sc = document.getElementById('hudScore') ? document.getElementById('hudScore').textContent : '';
  return window.__mut > 0 || sc !== window.__score || !document.getElementById('over').hidden;
});
const over = () => page.evaluate(() => !document.getElementById('over').hidden);

const rows = [];
for (const id of ids){
  errs.length = 0;
  await openApp(page, Object.assign({ reduceMotion: false, sound: false, haptics: false, onboarded: true, seen: SEEN }, PROF));
  await openModeList(page);
  try { await clickMode(page, id); } catch (e){ rows.push({ id, err: e.message }); continue; }
  await page.waitForFunction(() => [...document.getElementById('surface').children]
    .some(c => c.id !== 'count' && !c.classList.contains('swap')), null, { timeout: 9000, polling: 50 }).catch(() => {});
  await page.waitForTimeout(900);
  const list = await targets();
  /* Spread across the whole list, not the first fourteen: on Spool Shots the first
     dozens of controls are the picture's target squares, and the cannons come last,
     so tapping only the head of the list found a board that "did nothing". */
  const sample = list.length <= 14 ? list : Array.from({ length: 14 }, (_, i) => list[Math.floor(i * list.length / 14)]);
  let answered = 0, tried = 0, ended = false;
  for (const t of sample){
    if (await over()){ ended = true; break; }
    await arm();
    await page.mouse.click(t.x, t.y); tried++;
    await page.waitForTimeout(170);
    if (await responded()) answered++;
    /* A tap can end the round and deal the next; measure the next one fresh. */
    if (await over()){ ended = true; break; }
  }
  /* Drags: many boards are not made of things to tap. Patchwork's pieces only
     move when dragged, so each drag starts on a real control where there is one. */
  let dragged = 0;
  if (!ended){
    const box = await (await page.$('#surface')).boundingBox();
    const fresh = await targets();
    for (let d = 0; d < 4 && !ended; d++){
      await arm();
      const from = fresh.length ? fresh[Math.floor((d + 0.5) * fresh.length / 4)] : null;
      const x0 = from ? from.x : box.x + box.width * (0.2 + 0.2 * d), y0 = from ? from.y : box.y + box.height * 0.25;
      await page.mouse.move(x0, y0); await page.mouse.down();
      await page.mouse.move(x0 + 40, y0 + box.height * 0.35, { steps: 6 });
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8, { steps: 6 });
      await page.mouse.up(); await page.waitForTimeout(170);
      if (await responded()) dragged++;
      if (await over()) ended = true;
    }
  }
  rows.push({ id, found: list.length, tried, answered, dragged, ended, errs: [...new Set(errs)].slice(0, 2) });
}
await browser.close();

let dead = 0;
for (const r of rows){
  const isDead = !r.err && r.answered === 0 && r.dragged === 0 && !r.ended;
  const bad = r.err || isDead || (r.errs || []).length;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${r.id.padEnd(9)} ${r.err ? '! ' + r.err
    : `${String(r.found).padStart(3)} touchable · ${r.answered}/${r.tried} taps answered · ${r.dragged}/4 drags answered${r.ended ? ' · round ended' : ''}`}`
    + `${(r.errs || []).length ? ' | ' + r.errs.join(' | ') : ''}${isDead ? '  <- DEAD: nothing responded' : ''}`);
  if (bad) dead++;
}
floorOrDie('alive', rows.length, Math.min(40, ids.length));
console.log(dead ? `\n${dead} mode(s) do not respond` : `\nevery board answers a touch (${rows.length} modes${MAX ? ', maximum difficulty' : ''})`);
process.exit(dead ? 1 : 0);
