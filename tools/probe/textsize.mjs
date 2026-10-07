/* Text size: 100, 115, 130 and 150 percent.
 *
 * Every font size in the stylesheet is written calc(Npx * var(--ts)); the player's choice sets --ts on the page and the puzzle boards
 * put it back to 1 (their tiles are drawn to fit). This checks, on the two smallest phones and every shell screen:
 *   - the words really are that much bigger (computed sizes in menus, prompts and sheets), and the boards' are not
 *   - nothing makes the page scroll sideways, and no line of text is pushed out of the screen or clipped by its box
 *   - the control, the Easy to see preset and Reset to defaults set it, undo puts it back, and a saved size applies at boot
 *
 *   PORT=8400 SITE=/tmp/pw/cur node tools/probe/textsize.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode, goTab, openPanels } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];
const SIZES = ['100', '115', '130', '150'];
const px = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; }, sel);

/* What a screen does wrong at a large size: pushes the page sideways, or leaves a line of text outside the screen's
 * scrolling column, or cuts a line off inside a box that hides overflow (an ellipsis someone chose is not counted). */
const faults = (page, root) => page.evaluate(sel => {
  const host = document.querySelector(sel) || document.body, hb = host.getBoundingClientRect(), out = [];
  const ws = document.documentElement.scrollWidth - innerWidth;
  const leaves = [...host.querySelectorAll('*')].filter(e => {
    if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]');
  });
  for (const e of leaves){
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const label = (e.id ? '#' + e.id : e.className ? '.' + String(e.className).split(' ')[0] : e.tagName) + ' "' + e.textContent.trim().slice(0, 18) + '"';
    if (r.right > innerWidth + 1.5 || r.left < -1.5) out.push('off-screen ' + label);
    else if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && cs.whiteSpace !== 'normal')
      out.push('clipped ' + label);
  }
  return { sideways: ws, list: out.slice(0, 6), n: leaves.length };
}, root);

/* ── the sizes, screen by screen ── */
const base = {};     /* computed sizes at 100, to compare against */
for (const [w, h] of [[320, 568], [360, 640]]){
  for (const ts of SIZES){
    const tag = `${w}x${h} at ${ts}%`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
    /* xp 820 is the start of level 10, so a run that happens to solve a few boards cannot cross into level 11 and put the level-up card over the very button this checks */
    await openApp(page, { xp: 820, runs: 12, solved: 80, onboarded: true, sound: false, haptics: false, textSize: ts, reduceMotion: true, seen: { odd: 1 }, schema: 11 });
    const set = await page.evaluate(() => document.documentElement.dataset.ts);
    check(set === ts, `${tag}: a saved size is applied at boot (${set})`);

    const rows = [];
    const seeScreen = async (name, fn, sel) => { await fn(); await page.waitForTimeout(350); const f = await faults(page, sel); rows.push([name, f]); };
    await seeScreen('The header', async () => {}, '#chrome');
    await seeScreen('Play', async () => {}, '#tabPlay');
    await seeScreen('Games', () => goTab(page, 'Modes'), '#tabModes');
    await seeScreen('Room', async () => { await goTab(page, 'Room'); await openPanels(page); }, '#tabRoom');
    await seeScreen('You', async () => { await goTab(page, 'Stats'); await openPanels(page); }, '#tabStats');
    await seeScreen('Settings', async () => { await goTab(page, 'Settings'); await openPanels(page); }, '#tabSettings');
    const px1 = await px(page, '#tabSettings .acct b');
    const pxBoardless = await px(page, '#tabSettings .setrow .txt b');
    if (ts === '100'){ base.head = px1; base.row = pxBoardless; }
    else {
      check(Math.abs(px1 / base.head - Number(ts) / 100) < 0.02, `${tag}: Settings headings are ${ts}% (${px1.toFixed(1)}px against ${base.head.toFixed(1)}px)`);
      check(Math.abs(pxBoardless / base.row - Number(ts) / 100) < 0.02, `${tag}: setting names are ${ts}% (${pxBoardless.toFixed(1)}px)`);
    }
    for (const [name, f] of rows){
      check(f.sideways <= 0, `${tag}: ${name} does not scroll sideways (${f.sideways}px)`);
      check(f.list.length === 0, `${tag}: ${name} has no text outside the screen or clipped` + (f.list.length ? ' — ' + f.list.join('; ') : ` (${f.n} lines)`));
    }

    /* a round: the prompt scales, the board does not */
    await goTab(page, 'Play');
    await openModeList(page); await clickMode(page, 'odd');
    await page.waitForSelector('#surface .oddwrap .tile', { timeout: 9000 }); await page.waitForTimeout(900);
    const pr = await px(page, '#prompt'), sniff = await px(page, '#surface .sumtool');
    if (ts === '100'){ base.prompt = pr; base.sniff = sniff; }
    else {
      check(Math.abs(pr / base.prompt - Number(ts) / 100) < 0.03, `${tag}: the prompt is ${ts}% (${pr.toFixed(1)}px against ${base.prompt.toFixed(1)}px)`);
      check(Math.abs(sniff - base.sniff) < 0.3, `${tag}: the board's own words keep their size (${sniff.toFixed(1)}px against ${base.sniff.toFixed(1)}px)`);
    }
    const fr = await faults(page, '#play');
    check(fr.sideways <= 0 && fr.list.length === 0, `${tag}: the round (HUD, prompt, board) fits` + (fr.list.length ? ' — ' + fr.list.join('; ') : ''));

    /* the pause sheet, and Game Over after a lost run */
    await page.evaluate(() => document.getElementById('quitBtn').click()); await page.waitForTimeout(650);
    const fp = await faults(page, '.pausebox');
    const fits = await page.evaluate(() => { const b = document.querySelector('.pausebox'); return b ? b.scrollHeight <= b.clientHeight + 1 || /auto|scroll/.test(getComputedStyle(b).overflowY) : false; });
    check(fp.sideways <= 0 && fp.list.length === 0 && fits, `${tag}: the pause sheet fits or scrolls` + (fp.list.length ? ' — ' + fp.list.join('; ') : ''));
    await page.evaluate(() => { const b = [...document.querySelectorAll('.pausebox button')].find(x => /back to it/i.test(x.textContent)); if (b) b.click(); }); await page.waitForTimeout(700);
    /* Odd Skein forgives a first wrong tap and a lucky tap can solve a board, so how many taps it takes to lose three lives varies (10 to 14 and more in eight runs); the loop stops the moment Game Over is up */
    for (let k = 0; k < 30; k++){
      if (await page.evaluate(() => !document.getElementById('over').hidden)) break;
      await page.evaluate(() => { const t = document.querySelector('#surface .tile:not(.ruled):not([disabled])'); if (t) t.click(); }); await page.waitForTimeout(2300);
    }
    await page.waitForTimeout(1600);
    const fo = await faults(page, '#over');
    const way = await page.evaluate(() => { const b = document.getElementById('homeBtn').getBoundingClientRect(); const t = document.elementFromPoint(Math.min(innerWidth - 1, b.left + b.width / 2), Math.min(innerHeight - 1, b.top + b.height / 2)); return { inside: b.top >= 0 && b.bottom <= innerHeight, top: !!t && !!t.closest('#homeBtn') }; });
    check(fo.sideways <= 0 && fo.list.length === 0, `${tag}: Game Over fits` + (fo.list.length ? ' — ' + fo.list.join('; ') : ''));
    check(way.inside && way.top, `${tag}: and Back to menu is on screen and topmost`);
    await ctx.close();
  }
}

/* ── the welcome screen, which a player sees before they can have chosen a size (a restored backup can carry one) ── */
for (const [w, h] of [[320, 568], [360, 640], [568, 320]]){
  for (const ts of ['100', '150']){
    const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
    page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
    await page.addInitScript(v => localStorage.setItem('dd.v1', v), JSON.stringify({ schema: 11, onboarded: false, textSize: ts, lang: 'en', xp: 0, runs: 0 }));
    await page.goto((await import('./harness.mjs')).BASE, { waitUntil: 'networkidle' }); await page.waitForTimeout(700);
    const f = await faults(page, '#welcome');
    const g = await page.evaluate(() => { const wc = document.getElementById('welcome'), b = document.getElementById('wcStart').getBoundingClientRect();
      const t = document.elementFromPoint(Math.min(innerWidth - 1, b.left + b.width / 2), Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)));
      return { inside: b.top >= 0 && b.bottom <= innerHeight, scrolls: wc.scrollHeight > wc.clientHeight + 1, top: !!t && !!t.closest('#wcStart') }; });
    check(f.sideways <= 0 && f.list.length === 0, `${w}x${h} at ${ts}%: the welcome screen fits` + (f.list.length ? ' — ' + f.list.join('; ') : ''));
    check(g.inside || g.scrolls, `${w}x${h} at ${ts}%: Start is on screen, or the panel scrolls to it (${g.inside ? 'on screen' : 'scrolls'})`);
    await page.close();
  }
}

/* ── the control, the preset, the reset, undo, persistence ── */
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await openApp(page, { xp: 900, runs: 12, solved: 80, onboarded: true, sound: false, haptics: false, reduceMotion: true, schema: 11 });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).textSize);
  const ds = () => page.evaluate(() => document.documentElement.dataset.ts);
  await goTab(page, 'Settings'); await openPanels(page, 'access', 'presets');
  check((await ds()) === '100' && (await page.getAttribute('#textRow [data-ts="100"]', 'aria-pressed')) === 'true', 'the default is 100% and says so');
  const heights = await page.evaluate(() => [...document.querySelectorAll('#textRow .seg')].map(b => Math.round(b.getBoundingClientRect().height)));
  check(heights.length === 4 && heights.every(x => x >= 44), `four steps, each a 44px target (${heights.join(', ')})`);
  await page.click('#textRow [data-ts="130"]'); await page.waitForTimeout(250);
  check((await ds()) === '130' && (await stored()) === '130', 'choosing 130% applies it at once and saves it');
  const sum = await page.evaluate(() => document.getElementById('accS_access').textContent);
  check(/130/.test(sum), `the Accessibility heading says so (${sum})`);
  await page.click('[data-p="easy"]'); await page.waitForTimeout(250);
  check((await ds()) === '115' && (await stored()) === '115', 'the Easy to see preset sets 115%');
  await page.click('#setUndo'); await page.waitForTimeout(250);
  check((await ds()) === '130' && (await stored()) === '130', 'and Undo puts 130% back');
  await page.click('[data-p="default"]'); await page.waitForTimeout(250);
  check((await ds()) === '100' && (await stored()) === '100', 'Reset to defaults returns to 100%');
  await page.fill('#setQ', 'text size'); await page.waitForTimeout(300);
  const found = await page.evaluate(() => [...document.querySelectorAll('#tabSettings .setrow')].filter(r => !r.classList.contains('sfhide') && r.getBoundingClientRect().height > 0).map(r => r.querySelector('b').textContent));
  check(found.some(x => /text size/i.test(x)), `search finds it (${found.join(', ')})`);
  await page.close();
} catch (e) { check(false, 'the Text size control works: ' + String(e).split('\n')[0].slice(0, 120)); }

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nText can be made 50 percent bigger and the app still fits');
process.exit(bad ? 1 : 0);
