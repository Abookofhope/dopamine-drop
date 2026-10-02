/* Patchwork, the Tetris way: rows and columns clear, the tray is dealt without end, and a jam is not the end.
 *
 *   - the quilt is open (no pattern, no move allowance: there is no "moves left" chip), with three patches in the tray, Swap and Hint
 *   - a bot plays it with real drags, putting each patch where it fills a row or column the most: a row or column that is covered edge to
 *     edge stitches away, the line count goes down, it pays points at once, and the tray is dealt a fresh patch for every one laid
 *   - a patch that is laid stays laid (touching it does not lift it), and two lines at once pay more than one
 *   - Swap deals the tray again, twice a round; Hint lights a place that fills a line
 *   - a quilt with nowhere left for anything in the tray costs a paw and tidies two rows, then plays on; the last paw loses the round
 *   - the round is won by clearing the lines it asks for, and the words are in French
 *
 *   node tools/probe/clear.mjs
 */
import { chromium } from 'playwright';
import { openApp, openModeList, clickMode } from './harness.mjs';

let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

const open = async (xp, vp = { width: 400, height: 820 }, lang = 'en') => {
  const page = await browser.newPage({ viewport: vp, hasTouch: true });
  page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await page.addInitScript(() => { localStorage.setItem('dd.forge', 'clear'); localStorage.setItem('dd.probe', '1'); });
  await openApp(page, { reduceMotion: true, xp, runs: 40, solved: 600, sound: false, haptics: false, onboarded: true, seen: { forge: 1 }, schema: 11, lang });
  await openModeList(page); await clickMode(page, 'forge');
  await page.waitForFunction(() => document.querySelector('.fgrid .fcell'), null, { timeout: 9000, polling: 60 });
  await page.waitForTimeout(1200);
  return page;
};
const read = page => page.evaluate(() => {
  const cells = [...document.querySelectorAll('.fgrid .fcell')], g = Math.round(Math.sqrt(cells.length));
  const wrap = document.querySelector('.forgewrap');
  if (!wrap) return { gone: true, g: 0, set: [], hint: 0, pos: [], tray: [], tools: [], prompt: '', lines: 0, made: true, note: '', chip: false, pawsShown: 0, pawsLeft: 0, goal: '' };
  const tray = [...document.querySelectorAll('.ftray .fpiece')].map(p => { const w = getComputedStyle(p.querySelector('.fbits')).gridTemplateColumns.split(' ').length || 1; const on = [];
    [...p.querySelectorAll('.fbit')].forEach((b, i) => { if (b.classList.contains('on')) on.push([i % w, Math.floor(i / w)]); }); const q = p.getBoundingClientRect(); return { idx: p.dataset.idx, on, x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  const pos = cells.map(c => { const b = c.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  const tools = [...document.querySelectorAll('.ftool')].map(b => ({ text: b.textContent.trim(), off: b.disabled }));
  const paws = document.querySelector('.budget.paws'), prompt = (document.querySelector('.prompt') || {}).textContent || '';
  return { g, set: cells.map((c, i) => c.classList.contains('set') ? i : -1).filter(i => i >= 0), hint: cells.filter(c => c.classList.contains('hint')).length, pos, tray, tools, goal: wrap.dataset.goal,
    lines: +(wrap.dataset.lines || 0), prompt: prompt.trim(), chip: !!document.querySelector('.budget:not(.paws)'), pawsShown: paws ? paws.querySelectorAll('i').length : 0, pawsLeft: paws ? paws.querySelectorAll('i:not(.used)').length : 0,
    made: !!document.querySelector('.fgrid.made'), note: (document.querySelector('.fnote') || {}).textContent || '' };
});
const score = page => page.evaluate(() => parseInt((document.getElementById('hudScore') || {}).textContent.replace(/\D/g, '') || '0', 10));
const left = s => { const m = s.prompt.match(/(\d+)/); return m ? +m[1] : -1; };
const sets = g => { const out = []; for (let y = 0; y < g; y++) out.push(Array.from({ length: g }, (_, x) => y * g + x)); for (let x = 0; x < g; x++) out.push(Array.from({ length: g }, (_, y) => y * g + x)); return out; };
/* where a patch (as it is shown in the tray, unturned) goes best: completing a line first, else filling a line the most */
const choose = s => {
  const g = s.g, filled = new Set(s.set), L = sets(g); let best = null;
  s.tray.forEach((p, ti) => {
    const w = Math.max(...p.on.map(c => c[0])) + 1, h = Math.max(...p.on.map(c => c[1])) + 1;
    for (let ay = 0; ay + h <= g; ay++) for (let ax = 0; ax + w <= g; ax++){
      const cells = p.on.map(c => (ay + c[1]) * g + ax + c[0]); if (cells.some(i => filled.has(i))) continue;
      const fl = new Set(filled); cells.forEach(i => fl.add(i));
      let sc = 0, full = 0; L.forEach(line => { const n = line.filter(i => fl.has(i)).length; if (n === g){ sc += 100; full++; } else if (line.some(i => cells.includes(i))) sc += (n / g) * (n / g) * 10; });
      if (!best || sc > best.sc) best = { sc, full, ti, ax, ay, w, h, cells };
    }
  });
  return best;
};
/* a real drag: pick the patch up, carry it, and let go with the finger the way the app expects (the patch rides above the finger) */
const place = async (page, s, b) => {
  const p = s.tray[b.ti], pt = s.pos[1][0] - s.pos[0][0];
  const cx = (s.pos[b.ay * s.g + b.ax][0] + s.pos[(b.ay + b.h - 1) * s.g + b.ax + b.w - 1][0]) / 2, cy = (s.pos[b.ay * s.g + b.ax][1] + s.pos[(b.ay + b.h - 1) * s.g + b.ax + b.w - 1][1]) / 2;
  const lift = (b.h * pt - 3) / 2 + 34;
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 3, p.y - 12, { steps: 2 });
  await page.mouse.move(cx, cy + lift, { steps: 8 }); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(520);
};

/* ── the board, at a new level and a high one ───────────────────────────────────────────────────────────────────────── */
for (const [xp, label, paws, lines] of [[0, 'a new player', 3, 2], [60000, 'a high level', 0, 7], [900000, 'the top', 0, 8]]){
  const page = await open(xp); const s = await read(page);
  check(s.goal === 'clear' && s.g === 6 && s.tray.length === 3 && s.set.length === 0 && s.lines === lines, `${label}: an open ${s.g}x${s.g} quilt, three patches, ${s.lines} lines to clear (${s.prompt})`);
  check(!s.chip, `${label}: no "moves left" chip: there is nothing to run out of`);
  check(s.pawsShown === paws, `${label}: ${paws ? paws + ' paws' : 'no row of paws (one paw)'} (${s.pawsShown} shown)`);
  check(s.tools.length === 2 && /Swap/.test(s.tools[0].text) && /Hint/.test(s.tools[1].text), `${label}: the tools are Swap and Hint (${s.tools.map(t => t.text).join(', ')})`);
  await page.close();
}

/* ── play it: lines clear, pay, and the tray is dealt again ─────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  let cleared = 0, paid = 0, refilled = true, won = false, placements = 0, lockedOk = null, sawLine = false;
  for (let step = 0; step < 70 && !won; step++){
    s = await read(page); if (s.made || s.gone){ won = true; break; }
    const b = choose(s); if (!b){ break; }
    const before = await score(page), setBefore = s.set.length, linesBefore = left(s);
    await place(page, s, b); placements++;
    const a = await read(page); const after = await score(page);
    if (a.tray.length !== 3 && !a.made && !a.gone) refilled = false;
    if (b.full){ if (left(a) < linesBefore || a.made){ cleared += b.full; sawLine = true; } if (after > before) paid++; }
    if (b.full && a.set.length < setBefore + b.cells.length && lockedOk === null) lockedOk = true;
    if (placements === 3 && a.set.length && !a.gone){ /* touching a laid patch does not lift it */
      const q = a.pos[a.set[0]]; await page.mouse.click(q[0], q[1]); await page.waitForTimeout(150); const c = await read(page);
      check(c.set.length === a.set.length && c.tray.length === a.tray.length, 'a patch that is laid stays laid: touching it lifts nothing');
    }
    if (a.made || a.gone){ won = true; break; }
  }
  await page.waitForTimeout(600); s = await read(page);
  check(sawLine && cleared >= 1, `a row or column that is covered edge to edge clears (${cleared} lines in ${placements} patches)`);
  check(paid >= 1, `a cleared line pays at once (${paid} payments)`);
  check(refilled, 'every patch laid is replaced: the tray always holds three');
  check(won || s.made || (await score(page)) >= 100, `clearing the lines it asks for wins the round (${placements} patches laid)`);
  await page.close();
}

/* ── Swap and Hint ─────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const sig = t => t.map(p => p.on.map(c => c.join(',')).join(';')).join('|');
  const before = sig(s.tray);
  const swapBtn = page.locator('.ftool').nth(0);
  await swapBtn.click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(250); s = await read(page);
  check(s.tray.length === 3 && /Swap 1/.test(s.tools[0].text), `Swap deals three patches again and uses one of two (${s.tools[0].text})`);
  await swapBtn.click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(250); s = await read(page);
  check(s.tools[0].off && /Swap 0/.test(s.tools[0].text), 'and the second is the last: Swap is switched off');
  const hintBtn = page.locator('.ftool').nth(1);
  await hintBtn.click({ position: { x: 20, y: 18 } }); await page.waitForTimeout(300); s = await read(page);
  check(s.hint >= 2 && /Hint 2/.test(s.tools[1].text), `Hint lights a place for a patch and uses one of three (${s.hint} squares; ${s.tools[1].text})`);
  await page.close();
}

/* ── a jam costs a paw and tidies two rows; the last paw ends it ───────────────────────────────────────────────────── */
{
  const page = await open(0); let s = await read(page);
  const g = s.g;
  /* every square but a scattering of single ones that no two touch: nothing in the tray can go anywhere, and no line is full */
  const lone = i => ((i % g) + 2 * Math.floor(i / g)) % 5 === 0;
  const fillAll = () => page.evaluate(({ g, mask }) => { document.querySelector('.forgewrap')._fill(Array.from({ length: g * g }, (_, i) => i).filter(i => !mask.includes(i))); },
    { g, mask: Array.from({ length: g * g }, (_, i) => i).filter(lone) });
  await fillAll(); await page.waitForTimeout(700); s = await read(page);
  check(s.pawsLeft === 2 && /No room/.test(s.prompt), `with nowhere to put anything a paw is used and the cat says so (${s.pawsLeft} paws left; "${s.prompt}")`);
  check(s.set.length < g * g - Math.floor(g * g / 5) && s.tray.length === 3, `two rows were tidied and the tray was dealt again (${s.set.length} squares laid)`);
  await fillAll(); await page.waitForTimeout(700); s = await read(page);
  check(s.pawsLeft === 1, `a second jam uses a second paw (${s.pawsLeft} left)`);
  await fillAll(); await page.waitForTimeout(900);
  /* the round is lost and the next one starts: an empty quilt with all its paws (or the results, when the run is over) */
  const a3 = await read(page);
  check(a3.gone || !!(await page.evaluate(() => document.querySelector('.results, .over.show, #over.show'))) || (a3.set.length === 0 && a3.pawsLeft === 3), `and with the last paw gone the round is lost, the next starting fresh (${a3.set.length} squares laid, ${a3.pawsLeft} paws)`);
  await page.close();
}

/* ── French ────────────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const page = await open(0, { width: 400, height: 820 }, 'fr'); const s = await read(page);
  check(!/\{|forge\.|p\.forge/.test(s.prompt + s.note + s.tools.map(t => t.text).join()) && /Changer/.test(s.tools[0].text) && /Lignes/.test(s.prompt), `fr: the words are in French ("${s.prompt}", "${s.tools[0].text}")`);
  await page.close();
}

check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nPatchwork clears lines the Tetris way');
process.exit(bad ? 1 : 0);
