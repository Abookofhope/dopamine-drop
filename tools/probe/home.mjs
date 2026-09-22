/* The home tab across the three save states it has to hold: a player who has
 * never played, one mid-climb, and one who has mastered everything. The last is
 * the one that matters — it is the state the suggestion logic falls through, and
 * an empty "why" or a repeated pick only shows up there.
 *
 *   node tools/probe/home.mjs
 */
import { chromium } from 'playwright';
import { openApp, axeOn, modeIdsFromBuild, floorOrDie } from './harness.mjs';

const SITE = process.env.SITE || '/tmp/pw/_site';
const ids = modeIdsFromBuild(SITE);
const mastered = Object.fromEntries(ids.map(id => [id, 4000]));

const dayKey = n => { const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const PROFILES = [
  ['fresh',   { xp: 0, solved: 0, runs: 0, onboarded: true }],
  ['playing', { xp: 9000, solved: 600, runs: 40, lastMode: 'cairn', pbBlitz: 3120,
                marathon: { odd: 2400, echo: 1700, cairn: 700 },
                mix: ['odd','echo','heft'], dailyStreak: 4, dailyLast: dayKey(-1) }],
  ['veteran', { xp: 400000, solved: 20000, runs: 900, lastMode: 'weave', pbBlitz: 9400,
                marathon: mastered, mix: ['odd','echo'], dailyStreak: 31, dailyLast: dayKey(0) }],
];

const browser = await chromium.launch();
let bad = 0;

for (const [label, extra] of PROFILES){
  for (const [vw, vh] of [[400, 820], [360, 640], [320, 568]]){
    for (const lang of (vw === 400 ? ['en','de','fr','es'] : ['en'])){
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: true });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      await openApp(page, { ...extra, lang });

      const m = await page.evaluate(() => {
        const scroll = document.querySelector('#tabPlay .scroll');
        const sr = scroll.getBoundingClientRect();
        const clipped = [...scroll.querySelectorAll('*')].filter(n => {
          const r = n.getBoundingClientRect();
          return r.width && (r.left < sr.left - 1 || r.right > sr.right + 1);
        }).map(n => `${n.className}(${Math.round(n.getBoundingClientRect().width)})`);
        const taps = [...scroll.querySelectorAll('button')]
          .filter(x => x.getBoundingClientRect().width)
          .map(x => { const r = x.getBoundingClientRect();
            return { id: x.id || x.className, s: Math.round(Math.min(r.width, r.height)) }; })
          .sort((a, c) => a.s - c.s);
        const names = [...document.querySelectorAll('#quickModes b')].map(w => w.textContent);
        return {
          carry: document.getElementById('carryOn').hidden ? '—'
            : document.getElementById('carryName').textContent + ' / '
              + document.getElementById('carryMeta').textContent,
          whys: [...document.querySelectorAll('#quickModes .why')].map(w => w.textContent),
          names, dupes: new Set(names).size,
          hscroll: scroll.scrollWidth > scroll.clientWidth + 1,
          clipped: clipped.slice(0, 3),
          minTap: taps.length ? taps[0].s : 0, minWho: taps.length ? taps[0].id : '' };
      });

      /* Four picks, each with a reason, none of them the same mode twice. */
      const ok = !m.hscroll && !m.clipped.length && m.minTap >= 30
        && m.dupes === m.names.length && m.whys.length === m.names.length
        && m.whys.every(w => w.trim()) && !errs.length;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(8)} ${vw}x${vh} ${lang}  `
        + `carry "${m.carry}"  picks ${m.whys.join('/')}  `
        + `${m.clipped.length ? 'clipped ' + m.clipped.join(',') : ''}${m.hscroll ? ' H-SCROLL' : ''}  `
        + `smallest tap ${m.minTap}px (${m.minWho}) dupes ${m.dupes}/${m.names.length}`
        + (errs.length ? ' ERR ' + errs[0] : ''));
      floorOrDie(`${label} picks`, m.names.length, 1);

      if (vw === 400 && lang === 'en'){
        const v = await axeOn(page, '#tabPlay');
        if (v.length) bad++;
        console.log('     ' + (v.length
          ? 'FAIL a11y: ' + v.map(x => `${x.id} x${x.n}`).join(' | ') : 'a11y clean'));
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log(bad ? `\n${bad} home-tab problem(s)` : '\nthe home tab holds in every save state');
process.exit(bad ? 1 : 0);
