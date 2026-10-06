/* Settings as panels: closed by default with a summary on each header, a search
 * that finds a single row, presets and a reset that can be taken back, and an
 * easy-read typeface. The numbers this replaced: 3.2 screens tall at 360x640,
 * 17 of 25 buttons under 40px, every control a scroll away from the top.
 *
 *   PORT=8400 SITE=/tmp/pw/cur node tools/probe/settingsacc.mjs
 */
import { chromium } from 'playwright';
import { openApp, goTab } from './harness.mjs';

const browser = await chromium.launch();
let bad = 0;
const check = (name, ok, extra = '') => {
  if (!ok) bad++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
};
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('dd.v1')));
const settle = page => page.waitForTimeout(320);

const state = page => page.evaluate(() => {
  const cards = [...document.querySelectorAll('#tabSettings .setcard')];
  const vis = n => { const b = n.getBoundingClientRect(); const cs = getComputedStyle(n);
    return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const sc = document.querySelector('#tabSettings .scroll');
  return {
    cards: cards.map(c => ({
      id: c.dataset.acc, shown: !c.classList.contains('sfhide') && vis(c),
      open: c.querySelector('.acchead').getAttribute('aria-expanded') === 'true',
      bodyVisible: vis(c.querySelector('.accin')) && c.querySelector('.accin').getBoundingClientRect().height > 4,
      summary: c.querySelector('.acct small').textContent
    })),
    screens: +(sc.scrollHeight / sc.clientHeight).toFixed(2),
    none: !document.getElementById('setNone').hidden,
    rowsVisible: [...document.querySelectorAll('#tabSettings .setrow')]
      .filter(r => !r.classList.contains('sfhide') && vis(r)).map(r => r.querySelector('b').textContent)
  };
});

const openAll = async page => {
  const s = await state(page);
  if (!s.cards.every(c => c.open)) { await page.click('#setAll'); await settle(page); }
};

for (const [w, h, lang] of [[360, 640, 'en'], [320, 568, 'de'], [390, 844, 'fr'], [412, 915, 'es']]){
  console.log(`\n── ${w}x${h} ${lang}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await openApp(page, { lang, sound: true, haptics: true, reduceMotion: false });
  await goTab(page, 'Settings');
  await settle(page);

  /* ── closed at rest ── */
  let s = await state(page);
  check('seven panels', s.cards.length === 7, String(s.cards.length));
  check('all closed on first visit', s.cards.every(c => !c.open && !c.bodyVisible));
  check('every header says what is inside', s.cards.filter(c => c.id !== 'data').every(c => c.summary.length > 1),
    s.cards.map(c => c.summary).join(' | ').slice(0, 120));
  const spill = await page.evaluate(() => { const sc = document.querySelector('#tabSettings .scroll'); return sc.scrollHeight - sc.clientHeight; });
  check('closed Settings needs hardly any scrolling', spill <= 0.25 * h, `${spill}px of scroll, ${s.screens} screens (was 3.2)`);

  /* ── a header opens, closes, and is remembered ── */
  await page.click('#accH_feedback'); await settle(page);
  s = await state(page);
  const fb = s.cards.find(c => c.id === 'feedback');
  check('header opens its panel', fb.open && fb.bodyVisible);
  await page.click('#accH_feedback'); await settle(page);
  s = await state(page);
  check('header closes it again', !s.cards.find(c => c.id === 'feedback').open && !s.cards.find(c => c.id === 'feedback').bodyVisible);
  await page.click('#accH_access'); await settle(page);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  await page.evaluate(() => { const w = document.getElementById('wcSkip'); if (w && !document.getElementById('welcome').hidden) w.click(); });
  await goTab(page, 'Settings'); await settle(page);
  s = await state(page);
  check('an open panel is still open after a reload', s.cards.find(c => c.id === 'access').open);
  await page.click('#accH_access'); await settle(page);

  /* ── expand all / collapse all ── */
  await page.click('#setAll'); await settle(page);
  s = await state(page);
  check('expand all opens every panel', s.cards.every(c => c.open && c.bodyVisible));
  const lab = await page.getAttribute('#setAll', 'aria-label');
  await page.click('#setAll'); await settle(page);
  s = await state(page);
  check('the same button then collapses them', s.cards.every(c => !c.open));
  check('and its name changes with it', lab !== await page.getAttribute('#setAll', 'aria-label'), lab);

  /* ── touch targets, with everything open ── */
  await page.click('#setAll'); await settle(page);
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#tabSettings button, #tabSettings input').forEach(n => {
      const b = n.getBoundingClientRect(); const cs = getComputedStyle(n);
      if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden' || n.hidden || n.type === 'file') return;
      /* A switch is hit through its whole row (the row takes the tap), so the row is the target. */
      const t = n.classList.contains('sw') ? n.closest('.setrow').getBoundingClientRect() : b;
      if (t.height < 43.5 || t.width < 43.5) out.push((n.id || n.className || n.tagName) + ' ' + Math.round(t.width) + 'x' + Math.round(t.height));
    });
    return out;
  });
  check('every control is at least 44px', small.length === 0, small.join(', '));
  s = await state(page);
  console.log('     all open:', s.screens, 'screens');

  /* ── the search bar stays put while the list scrolls ── */
  const stick = await page.evaluate(async () => {
    const sc = document.querySelector('#tabSettings .scroll');
    sc.scrollTop = 400; await new Promise(r => setTimeout(r, 120));
    const a = document.querySelector('.setbar').getBoundingClientRect().top, b = sc.getBoundingClientRect().top;
    const moved = sc.scrollTop; sc.scrollTop = 0; return { gap: Math.round(a - b), moved };
  });
  check('search stays at the top while scrolled', stick.moved > 100 && Math.abs(stick.gap) <= 3, JSON.stringify(stick));
  await page.click('#setAll'); await settle(page);

  /* ── search ── */
  const word = await page.evaluate(() => {
    const el = document.querySelector('#accB_access .setrow b'); return el.textContent.split(' ').pop();
  });
  const plain = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  await page.fill('#setQ', plain); await settle(page);
  s = await state(page);
  const shown = s.cards.filter(c => c.shown).map(c => c.id);
  check('a word finds its row', s.rowsVisible.length >= 1 && shown.includes('access'), `"${plain}" -> ${shown.join(',')} / ${s.rowsVisible.join(', ')}`);
  check('and opens the panel it is in', s.cards.find(c => c.id === 'access').bodyVisible);
  check('panels with no match are gone', !shown.includes('data'));
  await page.fill('#setQ', 'zzqx'); await settle(page);
  s = await state(page);
  check('nothing found says so', s.none && s.cards.every(c => !c.shown));
  await page.fill('#setQ', ''); await settle(page);
  s = await state(page);
  check('clearing it puts the list back', !s.none && s.cards.every(c => c.shown && !c.open));
  await page.fill('#setQ', 'zzqx');
  await page.press('#setQ', 'Escape'); await settle(page);
  check('Escape clears the search', (await page.inputValue('#setQ')) === '');
  await page.fill('#setQ', 'x'); await settle(page);
  await page.click('#setQx'); await settle(page);
  check('the clear button empties it', (await page.inputValue('#setQ')) === '');
  const ph = await page.getAttribute('#setQ', 'placeholder');
  check('placeholder is translated', !!ph && ph.length > 3, ph);

  /* ── presets ── */
  await page.click('#accH_presets'); await settle(page);
  const before = await stored(page);
  await page.click('[data-p="calm"]'); await settle(page);
  let sv = await stored(page);
  check('Calm sets the settings', sv.flashes === false && sv.reduceMotion === true && sv.haptics === false
    && sv.gameSpeed === 'relaxed' && Math.abs(sv.volume - 0.4) < 0.01,
    JSON.stringify([sv.flashes, sv.reduceMotion, sv.haptics, sv.gameSpeed, sv.volume]));
  check('and says it did', await page.isVisible('#setStatus') && await page.isVisible('#setUndo'));
  check('the preset marks itself active', (await page.getAttribute('[data-p="calm"]', 'aria-pressed')) === 'true');
  check('the header names it', (await state(page)).cards.find(c => c.id === 'presets').summary.length > 2,
    (await state(page)).cards.find(c => c.id === 'presets').summary);
  const flashSw = await page.evaluate(() => document.getElementById('swFlashes').getAttribute('aria-checked'));
  check('the switches follow', flashSw === 'false');
  await page.click('#setUndo'); await settle(page);
  sv = await stored(page);
  check('Undo puts every setting back', sv.flashes === before.flashes && sv.reduceMotion === before.reduceMotion
    && sv.haptics === before.haptics && sv.gameSpeed === before.gameSpeed && Math.abs(sv.volume - before.volume) < 0.01);
  await page.click('[data-p="easy"]'); await settle(page);
  sv = await stored(page);
  check('Easy to see turns on contrast, assist and easy-read', sv.contrast && sv.colorAssist && sv.easyRead,
    JSON.stringify([sv.contrast, sv.colorAssist, sv.easyRead]));
  const cls = await page.evaluate(() => [document.documentElement.classList.contains('hc'), document.documentElement.classList.contains('easyread')]);
  check('and the page follows at once', cls[0] && cls[1]);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check('easy-read spacing does not push the page sideways', ov <= 0, 'overflow ' + ov);
  await page.click('[data-p="default"]'); await settle(page);
  sv = await stored(page);
  check('Reset to defaults clears them all', !sv.contrast && !sv.colorAssist && !sv.easyRead && sv.flashes === true
    && sv.reduceMotion === false && sv.gameSpeed === 'normal' && sv.volume === 1);
  check('progress is untouched by it', sv.xp === before.xp && sv.solved === before.solved && sv.lifetime === before.lifetime);
  await page.click('#setUndo'); await settle(page);
  sv = await stored(page);
  check('and that can be undone too', sv.contrast && sv.easyRead);
  const html = await page.evaluate(() => document.documentElement.classList.contains('easyread'));
  check('undo repaints the page', html);
  await page.click('[data-p="default"]'); await settle(page);

  /* ── the easy-read switch itself, and a reload ── */
  await page.click('#accH_access'); await settle(page);
  await page.click('#swEasy'); await settle(page);
  check('the easy-read switch works', (await stored(page)).easyRead === true
    && await page.evaluate(() => document.documentElement.classList.contains('easyread')));
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check('and changes the typeface', /Verdana|Tahoma/i.test(font), font.slice(0, 40));
  /* A fresh visit with the setting already saved: boot has to apply it, not only the switch. */
  const c2 = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const p2 = await c2.newPage();
  await openApp(p2, { lang, easyRead: true });
  check('a saved easy-read setting is applied at boot', await p2.evaluate(() => document.documentElement.classList.contains('easyread')));
  const ovPlay = await p2.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await c2.close();
  check('Play does not scroll sideways in easy-read', ovPlay <= 0, 'overflow ' + ovPlay);

  /* ── keyboard ── */
  await goTab(page, 'Settings'); await settle(page);
  await page.focus('#accH_data');
  await page.keyboard.press('Enter'); await settle(page);
  check('Enter on a header opens it', (await page.getAttribute('#accH_data', 'aria-expanded')) === 'true');
  await page.keyboard.press('Space'); await settle(page);
  check('Space closes it', (await page.getAttribute('#accH_data', 'aria-expanded')) === 'false');

  check('no page errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(bad ? `\n${bad} FAILED` : '\nall settings panel checks passed');
process.exit(bad ? 1 : 0);
