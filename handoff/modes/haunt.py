"""Peekaboo (haunt): watch on for a pot, two at once, a belled cat, a move in the dark. Run from the repo root."""
import sys, re
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.184.0'
a = s.index("  haunt: {\n    name:'Peekaboo'")
e = s.index("\n  },\n\n  /* ── Tidy", a)
body = s[a:e]
def bsub(old, new):
    global body
    assert body.count(old) == 1, old[:90]
    body = body.replace(old, new)

bsub("""    build(ctx){
      const g = ctx.level""", """    /* Since __VER__ the watching is a choice. When the set swaps are over the cats keep moving, and every move you sit through
       puts more in the pot; call it whenever you are sure, and a clean find pays the pot (half of it after a wrong basket). From
       level 6 two cats can move in one beat. From 12 one cat wears a bell, and finding her first pays. From 20 one move happens
       in the dark: only the two baskets it joined light up, and where the cats were tells you which way it went. */
    build(ctx){
      const lv = ctx.level;
      const twins = lv >= 6, hasBell = lv >= 12, hasDark = lv >= 20;
      const g = ctx.level""")
bsub("          + '<path d=\"M3.6 11.2", "          + '<path d=\"M3.6 11.2")
bsub("""class="whisk"/></svg></span>';
        b.setAttribute('aria-label', t('a.tile', { n: i+1 }));""", """class="whisk"/><path d="M7.4 18.4q4.6 2.2 9.2 0" class="collar"/><circle cx="12" cy="20.1" r="1.6" class="bellball"/></svg></span>';
        b.setAttribute('aria-label', t('a.tile', { n: i+1 }));""")
bsub("""      tools.appendChild(peek); col.appendChild(tools);
      const reveal = on => els.forEach((e,i) => e.classList.toggle('open', on && where.includes(i)));""", """      /* Call it: lit once the set swaps are over, and worth more for every move you watch after that. */
      const callBtn = mk('button','sumtool'); callBtn.type = 'button'; callBtn.style.marginLeft = '10px'; callBtn.disabled = true;
      let pot = 0, called = false, wrongs = 0, bellPaid = false, firstFound = true, startPick = () => {};
      const potStep = 8 + Math.floor(lv/2), extraMax = 6;
      const paintCall = () => { callBtn.textContent = t('haunt.call', { p: pot }); };
      paintCall();
      tools.appendChild(peek); tools.appendChild(callBtn); col.appendChild(tools);
      const reveal = on => els.forEach((e,i) => {
        e.classList.toggle('open', on && where.includes(i));
        e.classList.toggle('bell', on && hasBell && where[0] === i);
      });
      const darkAt = hasDark ? 1 + Math.floor(ctx.rnd() * Math.max(1, swaps - 1)) : -1;""")
bsub("""      reveal(true);
      ctx.prompt(t('p.hauntLook', { n: ghosts }));""", """      reveal(true);
      /* The newest rule is said while the cats are showing: taught in the prompt, never in a tutorial. */
      ctx.prompt(t(hasDark ? 'p.hauntDark' : hasBell ? 'p.hauntBell' : twins && ghosts > 1 ? 'p.hauntTwin' : 'p.hauntLook', { n: ghosts }));""")
bsub("""        let k = 0;
        const step = () => {
          if (k++ >= swaps){
            phase = 'pick';
            try { if (localStorage.getItem('dd.probe')) grid.dataset.where = JSON.stringify(where); } catch(e){}
            peek.disabled = false;
            ctx.prompt(t('p.hauntPick', { n: ghosts }));
            return;
          }""", """        let k = 0, extra = 0;
        startPick = () => {
          if (phase === 'pick') return;
          phase = 'pick'; callBtn.disabled = true; grid.classList.remove('dark');
          try { if (localStorage.getItem('dd.probe')){ grid.dataset.where = JSON.stringify(where); grid.dataset.pot = pot; grid.dataset.bell = hasBell ? where[0] : -1; } } catch(e){}
          peek.disabled = false;
          ctx.prompt(t('p.hauntPick', { n: ghosts }));
        };
        callBtn.classList.add('aid'); onTap(callBtn, () => {
          if (phase !== 'call' || called) return;
          called = true; sfx.tap(); startPick();
        });
        /* One cat to an empty basket. `not` keeps a second move in the same beat off the baskets the first one used. */
        const moveOne = (not, dark) => {
          const cats = where.filter(w => !not.includes(w));
          if (!cats.length) return null;
          const from = cats[Math.floor(ctx.rnd()*cats.length)];
          const free = [];
          for (let i=0;i<n;i++) if (!where.includes(i) && !not.includes(i)) free.push(i);
          if (!free.length) return null;
          const to = free[Math.floor(ctx.rnd()*free.length)];
          where = where.map(w => w === from ? to : w);
          if (!dark) drift(from, to);
          [from,to].forEach(i => {
            els[i].classList.remove('crswap'); void els[i].offsetWidth; els[i].classList.add('crswap');
            ctx.after(360, () => els[i].classList.remove('crswap'));
          });
          return [from, to];
        };
        const step = () => {
          if (called || phase === 'pick') return;
          if (k >= swaps){
            if (phase !== 'call'){
              /* The set swaps are done: from here on, every move you watch is worth more. A breath first, to call it at nothing. */
              phase = 'call'; callBtn.disabled = false; ctx.prompt(t('p.hauntCall'));
              return ctx.after(Math.round(pace * 1.6), step);
            }
            if (extra >= extraMax) return startPick();
            extra++;
            const m = moveOne([], false);
            if (m){ pot += potStep; paintCall(); ctx.grace(pace + 200); }
            sfx.tap();
            return ctx.after(pace, step);
          }
          const dark = k === darkAt;
          grid.classList.toggle('dark', dark);
          const m1 = moveOne([], dark);
          /* Two in one beat, every third beat, once there are two cats to move. */
          if (m1 && twins && where.length > 1 && k % 3 === 2) moveOne(m1, dark);
          k++;
          sfx.tap();
          if (dark) ctx.after(pace, () => grid.classList.remove('dark'));
          ctx.after(pace, step);
        };""")
# the old body of the swap step after the return block must go
old_tail_start = body.index("          /* Move a tile that actually holds a ghost, into one that does not.")
old_tail_end = body.index("        ctx.after(260, step);")
body = body[:old_tail_start] + body[old_tail_end:]
bsub("""        if (phase !== 'pick' || picked.has(i)) return;
        picked.add(i);
        if (!where.includes(i)){
          b.classList.add('wrong');""", """        /* A basket tapped while the cats are still moving calls it there and then. */
        if (phase === 'call' && !called){ called = true; startPick(); }
        if (phase !== 'pick' || picked.has(i)) return;
        picked.add(i);
        if (!where.includes(i)){
          b.classList.add('wrong'); wrongs++;""")
bsub("""        b.classList.add('open','found');
        sfx.good(picked.size); buzz('good');
        if (where.every(w => picked.has(w))) return ctx.win(b);""", """        b.classList.add('open','found');
        sfx.good(picked.size); buzz('good');
        /* The belled cat, found before any other: she rings. */
        if (firstFound && hasBell && where[0] === i){
          bellPaid = true; b.classList.add('bell'); grid.dataset.bellPaid = '1';
          ctx.points(15 + Math.min(30, lv), b); floatPts(b, t('fx.hauntBell'), 2);
        }
        firstFound = false;
        if (where.every(w => picked.has(w))){
          if (pot){ const paid = wrongs ? Math.round(pot/2) : pot; ctx.points(paid, b); grid.dataset.paid = paid; floatPts(b, '+' + paid, paid >= 40 ? 3 : 2); }
          return ctx.win(b);
        }""")
body = body.replace('__VER__', VER)
s = s[:a] + body + s[e:]

css_old = ".cell.crypt.crswap{animation:cryptSwap .34s ease}\n"
assert s.count(css_old) == 1
s = s.replace(css_old, css_old + """/* Peekaboo's own rules (__VER__): a cat with a bell, and a move made in the dark. */
.cell.crypt .gh .collar{fill:none;stroke:#FFC53D;stroke-width:1.5;stroke-linecap:round;display:none}
.cell.crypt .gh .bellball{fill:#FFC53D;stroke:#7A4A00;stroke-width:.6;display:none}
.cell.crypt.bell .gh .collar,.cell.crypt.bell .gh .bellball{display:inline}
.ghostdrift .collar,.ghostdrift .bellball{display:none}
.grid.crypts .cell.crypt{transition:filter var(--t-med)}
.grid.crypts.dark .cell.crypt:not(.crswap){filter:brightness(.42)}
""".replace('__VER__', VER))

adds = [
 {'p.hauntTwin':'{n} cats · two can move at once','p.hauntBell':'{n} cats · find the belled one first','p.hauntDark':'{n} cats · one move is in the dark','p.hauntCall':'Keep watching for more, or call it','haunt.call':'Call it +{p}','fx.hauntBell':'Ding!'},
 {'p.hauntTwin':'{n} chats · deux peuvent bouger ensemble','p.hauntBell':'{n} chats · trouvez d’abord celui à clochette','p.hauntDark':'{n} chats · un mouvement dans le noir','p.hauntCall':'Regardez encore pour plus, ou annoncez','haunt.call':'Annoncer +{p}','fx.hauntBell':'Ding !'},
 {'p.hauntTwin':'{n} gatos · dos pueden moverse a la vez','p.hauntBell':'{n} gatos · primero el del cascabel','p.hauntDark':'{n} gatos · un movimiento a oscuras','p.hauntCall':'Sigue mirando por más, o dilo ya','haunt.call':'¡Ya! +{p}','fx.hauntBell':'¡Tilín!'},
 {'p.hauntTwin':'{n} Katzen · zwei können gleichzeitig ziehen','p.hauntBell':'{n} Katzen · zuerst die mit Glöckchen','p.hauntDark':'{n} Katzen · ein Zug im Dunkeln','p.hauntCall':'Weiter zusehen für mehr, oder ansagen','haunt.call':'Ansagen +{p}','fx.hauntBell':'Kling!'},
]
anchors = re.findall(r"'p\.hauntLook':'[^']*'", s)
assert len(anchors) == 4, anchors
pos = 0
for anc, add in zip(anchors, adds):
    i = s.index(anc, pos); j = i + len(anc)
    ins = ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items())
    s = s[:j] + ins + s[j:]; pos = j + len(ins)
open(p, 'w').write(s)
print('haunt applied')
