/* What's new (v0.160.0): the sheet shows what is new to the player, and the rest only on request.
 *
 * The first launch after an update opens the changelog by itself. It used to build all of it (over two hundred
 * releases, some 1,600 elements) at once, which froze that launch for about half a second at 4x CPU slowdown, just
 * as the intro was playing. Now it shows every release since the player last closed the sheet (at most twelve, never
 * fewer than three), then an "Older updates" button that builds the rest.
 *
 * Checks: after an update from two releases back, the sheet opens by itself with the newest three entries and fewer
 * than 200 elements; from ten releases back it shows those ten; from an unknown version, three. The button is a full-
 * size target, names how many it holds, and builds every entry when pressed, with focus on the first new one.
 * Opening it from Settings when nothing is new shows the newest three. Closing it records the newest version, and
 * the open sheet passes axe.
 *
 *   PORT=8502 SITE=/path/to/built node tools/probe/logsheet.mjs
 */
import { chromium } from 'playwright';
import { BASE, save as seedSave, axeOn } from './harness.mjs';
import { builtSource } from './built.mjs';

let bad = 0;
const stop = e => { console.log('FAIL the probe could not go on: ' + String((e && e.message) || e).split('\n')[0].slice(0, 120)); console.log('\n' + (bad + 1) + ' failed'); process.exit(1); };
process.on('uncaughtException', stop); process.on('unhandledRejection', stop);
const check = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await chromium.launch();
const errs = [];

async function open(seenVersion){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(v => { if (window.top !== window) return; localStorage.setItem('dd.v1', v); },
    seedSave({ onboarded: true, xp: 9000, runs: 40, solved: 600, lang: 'en', seenVersion }));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => { const s = document.getElementById('logSheet'); return s && !s.hidden; }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  return { page, ctx };
}
const state = page => page.evaluate(() => {
  const s = document.getElementById('logSheet'), l = document.getElementById('logList');
  const more = l.querySelector('.logmore'), r = more && more.getBoundingClientRect();
  return { open: !s.hidden, entries: [...l.querySelectorAll('.logentry .logv b')].map(b => b.textContent),
    nodes: l.getElementsByTagName('*').length, more: more ? { text: more.textContent, w: Math.round(r.width), h: Math.round(r.height) } : null };
});
const versions = async page => page.evaluate(() => [...document.querySelectorAll('#logList .logv b')].map(b => b.textContent));

/* the release list, read from the build itself so the probe never goes stale */
/* the page with its script (app.js since v0.165.0) put back */
const html = process.env.SITE ? builtSource(process.env.SITE) : await (await fetch(BASE)).text();
const V = [...html.slice(html.indexOf('const CHANGELOG = [')).matchAll(/^  \{ v:'([\d.]+)'/gm)].map(m => m[1]);
if (V.length < 20) stop(`could not read the release list from the build (${V.length})`);

/* ── 1. two releases behind: the newest three, and the rest held back ── */
let total = 0, list = [];
{
  const { page, ctx } = await open(V[2]);
  const s = await state(page);
  check(s.open, 'the sheet opens by itself after an update');
  check(s.entries.length === 3 && s.entries[0] === 'v' + V[0], `two releases behind, it shows the newest three (${s.entries.join(', ')})`);
  check(s.nodes < 200, `and it builds fewer than 200 elements (${s.nodes})`);
  const m = s.more && /\((\d+)\)/.exec(s.more.text);
  total = m ? s.entries.length + Number(m[1]) : 0;
  check(!!s.more && s.more.h >= 44 && s.more.w >= 44 && total > 100, `an "Older updates" button holds the rest, full size (${s.more ? s.more.text + ', ' + s.more.w + 'x' + s.more.h : 'none'})`);
  const ax = await axeOn(page, '#logSheet');
  check(!ax.length, `the open sheet passes axe (${ax.map(x => x.id).join(', ') || 'clean'})`);
  /* press it: everything is built, and focus goes to the first entry it brought in */
  if (s.more){
    await page.locator('#logList .logmore').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    list = await versions(page);
    const f = await page.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('logentry') ? a.querySelector('.logv b').textContent : (a && (a.id || a.tagName)); });
    check(list.length === total && total === V.length && !(await page.locator('#logList .logmore').count()), `pressing it builds every entry (${list.length} of ${total})`);
    check(f === list[3], `and focus moves to the first entry it brought in (${f})`);
  } else { list = await versions(page); check(false, 'pressing it builds every entry (no button to press)'); }
  await page.click('#logClose');
  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')).seenVersion);
  check(seen === V[0], `closing it records the newest version (${seen})`);
  await ctx.close();
}

/* ── 2. ten releases behind: those ten ── */
{
  const behind = V[10];
  const { page, ctx } = await open(behind);
  const s = await state(page);
  check(s.entries.length === 10 && s.entries[9] === 'v' + V[9], `ten releases behind (${behind}), it shows those ten (${s.entries.length}, down to ${s.entries[s.entries.length - 1]})`);
  await ctx.close();
}

/* ── 3. a version it does not know: the newest three ── */
{
  const { page, ctx } = await open('0.0.1-unknown');
  const s = await state(page);
  check(s.entries.length === 3, `from a version it does not know, the newest three (${s.entries.length})`);
  await ctx.close();
}

/* ── 4. from Settings with nothing new: the newest three ── */
{
  const { page, ctx } = await open(V[0]);
  const s0 = await state(page);
  check(!s0.open, 'with nothing new it does not open by itself');
  await page.evaluate(() => document.getElementById('logBtn').click());
  await page.waitForTimeout(200);
  const s = await state(page);
  check(s.open && s.entries.length === 3 && !!s.more, `opened from Settings, it shows the newest three and the button (${s.entries.length})`);
  await ctx.close();
}

check(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ') || 'none'})`);
await browser.close();
console.log(bad ? `\n${bad} failed` : '\nWhat’s new shows what is new to you, and the rest on request');
process.exit(bad ? 1 : 0);
