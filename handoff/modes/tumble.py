"""Tumble Dryer (tumble): colour runs, wild socks, lint, inside-out socks. Run from the repo root."""
import sys, re
p = 'site/app.html'; s = open(p).read()
VER = sys.argv[1] if len(sys.argv) > 1 else '0.185.0'
a = s.index("  tumble: {\n    name:'Tumble Dryer'")
e = s.index("\n  },\n\n  /* ── Skim", a)
body = s[a:e]
def bsub(old, new):
    global body
    assert body.count(old) == 1, old[:90]
    body = body.replace(old, new)

bsub("""    build(ctx){
      const g = ctx.level < 6""", """    /* Since __VER__ the drum asks for more than speed. Pairs of the colour you paired last make a run, and a run pays more each
       time: take the pair in front of you, or hunt for the one that keeps the run going. From level 6 striped socks tumble in, two
       at a time, and a striped sock takes a whole pair of any colour with it (that colour carries the run on). From 12 lint
       blows in and sits in a space until you tap it away. From 20 some pairs land inside out, grey, and a tap turns one round. */
    build(ctx){
      const lv = ctx.level;
      const hasWild = lv >= 6, hasLint = lv >= 12, hasInside = lv >= 20;
      const WILD = { name:'WILD', hex:'#F6EBD9', shape:'yarn' }, GREY = { name:'GREY', hex:'#6C6191', shape:'yarn' };
      const LINT = '<svg viewBox="0 0 24 24" aria-hidden="true" class="lintsvg"><path d="M6 13c-2-3 1-7 4-5 1-3 6-3 6 1 3-1 5 3 2 5 2 2-1 5-3 3-1 2-5 2-6 0-3 1-5-2-3-4z" fill="#CDBCF7" fill-opacity=".55" stroke="#CDBCF7" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 12q2-2 4 0M11 15q2-1 3 1" fill="none" stroke="#2A1B4D" stroke-opacity=".5" stroke-width="1"/></svg>';
      const g = ctx.level""")
bsub("""      const paint = i => {
        const v = slots[i], e = els[i];
        e.classList.toggle('full', !!v);
        e.classList.remove('sel','tangled','hint');
        if (v){
          e.dataset.hex = v.ink.hex;
          e.innerHTML = PIECE.sock(v.ink);
          e.setAttribute('aria-label', inkName(v.ink));
        } else {""", """      const paint = i => {
        const v = slots[i], e = els[i];
        e.classList.toggle('full', !!v);
        e.classList.remove('sel','tangled','hint','wild','lint','inside');
        if (v && v.lint){
          delete e.dataset.hex; e.classList.add('lint'); e.innerHTML = LINT;
          e.setAttribute('aria-label', t('a.tumbleLint'));
        } else if (v){
          const shown = v.wild ? WILD : v.inside ? GREY : v.ink;
          if (v.wild) e.classList.add('wild');
          if (v.inside) e.classList.add('inside');
          e.dataset.hex = v.wild ? 'wild' : v.inside ? 'inside' : v.ink.hex;
          e.innerHTML = PIECE.sock(shown);
          e.setAttribute('aria-label', v.wild ? t('a.tumbleWild') : v.inside ? t('a.tumbleInside') : inkName(v.ink));
        } else {""")
bsub("""      const addPair = () => {
        const open = free();
        if (open.length < 2) return false;
        const ink = pal[Math.floor(ctx.rnd()*pal.length)];
        shuffle(open, ctx.rnd).slice(0,2).forEach(i => { slots[i] = { ink }; paint(i); });
        return true;
      };""", """      let added = 0;
      const addPair = () => {
        const open = free();
        if (open.length < 2) return false;
        added++;
        /* Striped ones come two at a time, so a striped sock left alone at the end always has a partner or nothing to take. */
        const wild = hasWild && added % 5 === 3;
        const inside = !wild && hasInside && added % 3 === 2;
        const ink = pal[Math.floor(ctx.rnd()*pal.length)];
        shuffle(open, ctx.rnd).slice(0,2).forEach(i => { slots[i] = wild ? { wild: true } : { ink, inside }; paint(i); });
        return true;
      };
      /* Lint never fills the last spaces: the drum is lost to socks, not fluff. */
      let fills = 0;
      const addLint = () => {
        if (!hasLint || ++fills % 3) return;
        const open = free();
        if (open.length < 4) return;
        const i = open[Math.floor(ctx.rnd()*open.length)];
        slots[i] = { lint: true }; paint(i);
      };""")
bsub("""      let sel = -1, done = false, tangles = 0, lastPair = 0, chain = 0;
      const left = () => slots.filter(Boolean).length;
      const say = () => ctx.prompt(t('p.tumble', { n: left() }));""", """      let sel = -1, done = false, tangles = 0, lastPair = 0, chain = 0, run = 0, runInk = null, pairs = 0;
      const left = () => slots.filter(v => v && !v.lint).length;
      /* The newest rule rides on the count until the first pair: taught in the prompt, never in a tutorial. */
      const teach = hasInside ? 'p.tumbleInside' : hasLint ? 'p.tumbleLint' : hasWild ? 'p.tumbleWild' : 'p.tumbleRun';
      const say = () => ctx.prompt(t(pairs ? 'p.tumble' : teach, { n: left() }));
      const runChip = mk('div','parchip tumrun');
      const paintRun = () => {
        runChip.innerHTML = '';
        runChip.classList.toggle('made', run >= 2);
        if (runInk){ const dot = mk('i','tumdot'); dot.style.background = runInk.hex; runChip.appendChild(dot); }
        runChip.appendChild(document.createTextNode(t('tumble.run', { n: run })));
        grid.dataset.run = run; grid.dataset.runInk = runInk ? runInk.hex : '';
      };""")
bsub("""        addPair();
        say();
        ctx.after(fillEvery, fill);""", """        addPair(); addLint();
        say();
        ctx.after(fillEvery, fill);""")
bsub("""      const go = i => {
        const e = els[i];
        if (done || !slots[i] || e.classList.contains('tangled')) return;
        if (sel === i){ sel = -1; e.classList.remove('sel'); return; }
        if (sel < 0){ sel = i; e.classList.add('sel'); sfx.tap(); return; }
        const a = slots[sel], bItem = slots[i];
        if (a.ink === bItem.ink){
          const was = sel;
          slots[was] = null; slots[i] = null;
          paint(was); paint(i);
          sel = -1;""", """      const go = i => {
        const e = els[i];
        if (done || !slots[i] || e.classList.contains('tangled')) return;
        /* Lint is tapped away; a grey sock is turned the right way out. Neither picks anything up or puts it down. */
        if (slots[i].lint){ slots[i] = null; paint(i); if (sel >= 0) els[sel].classList.add('sel'); sfx.tap(); return; }
        if (slots[i].inside){ slots[i].inside = false; paint(i); if (sel >= 0) els[sel].classList.add('sel'); sfx.tap(); return; }
        if (sel === i){ sel = -1; e.classList.remove('sel'); return; }
        if (sel < 0){ sel = i; e.classList.add('sel'); sfx.tap(); return; }
        const a = slots[sel], bItem = slots[i];
        if (a.ink === bItem.ink || a.wild || bItem.wild){
          const was = sel;
          /* A striped sock takes the whole pair of the colour it was put with: the sock it touched and that sock's partner. */
          let ink = a.wild && bItem.wild ? null : (a.wild ? bItem : a).ink;
          const gone = [was, i];
          if ((a.wild || bItem.wild) && ink){
            const mate = slots.findIndex((v, k) => v && !v.lint && !v.wild && v.ink === ink && !gone.includes(k));
            if (mate >= 0) gone.push(mate);
          }
          gone.forEach(k => { slots[k] = null; paint(k); });
          sel = -1; pairs++;
          /* The run: the same colour as last time adds to it, another colour starts a new one; two striped socks leave it be. */
          if (ink){ run = ink === runInk ? run + 1 : 1; runInk = ink; }
          paintRun();""")
bsub("""          ctx.points(10 + chain*5, e);
          if (cozyAdds > 0 && free().length >= 2){ cozyAdds--; addPair(); }
          if (left() === 0){ done = true; return ctx.win(e); }""", """          ctx.points(10 + chain*5 + Math.min(40, Math.max(0, run - 1)*10), e);
          if (run >= 2 && ink) floatPts(e, t('fx.tumbleRun', { n: run }), run >= 4 ? 3 : 2);
          if (cozyAdds > 0 && free().length >= 2){ cozyAdds--; addPair(); addLint(); }
          /* A striped sock left on its own, with nothing left to take, folds itself away. */
          if (left() === 1){ const k = slots.findIndex(v => v && v.wild); if (k >= 0){ slots[k] = null; paint(k); } }
          if (left() === 0){ done = true; return ctx.win(e); }""")
bsub("""        const by = new Map();
        slots.forEach((v, i) => { if (v && !els[i].classList.contains('tangled')){ if (!by.has(v.ink)) by.set(v.ink, []); by.get(v.ink).push(i); } });
        const pair = Array.from(by.values()).find(a => a.length >= 2);""", """        const by = new Map();
        slots.forEach((v, i) => { if (v && !v.lint && !v.wild && !v.inside && !els[i].classList.contains('tangled')){ if (!by.has(v.ink)) by.set(v.ink, []); by.get(v.ink).push(i); } });
        /* the run's colour first, if it has a pair showing */
        const pair = (runInk && by.get(runInk) && by.get(runInk).length >= 2) ? by.get(runInk) : Array.from(by.values()).find(a => a.length >= 2);""")
bsub("""      tools.appendChild(hintB); col.appendChild(tools);
      say();""", """      tools.appendChild(hintB); tools.insertBefore(runChip, tools.firstChild); col.appendChild(tools);
      paintRun();
      grid._slots = () => slots.map(v => v ? (v.lint ? 'lint' : v.wild ? 'wild' : v.inside ? 'in:' + v.ink.hex : v.ink.hex) : null);
      say();""")
body = body.replace('__VER__', VER)
s = s[:a] + body + s[e:]

css_old = ".cell.sock.hint{outline:3px solid #ffc53d;outline-offset:-3px;box-shadow:0 0 14px #ffc53d88}\n"
assert s.count(css_old) == 1
s = s.replace(css_old, css_old + """/* Tumble Dryer's own rules (__VER__): the run, a striped sock, lint, a sock inside out. */
.tumrun{display:flex;align-items:center;gap:6px}
.tumdot{display:block;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 1.5px #0006}
.cell.sock.wild{background:repeating-linear-gradient(135deg,#ff3d4e33 0 6px,#ffc53d33 6px 12px,#2ed66f33 12px 18px,#3d7bff33 18px 24px)!important;border-radius:var(--r-sm)}
.cell.sock.inside .art{opacity:.75}
.cell.sock.inside{background:repeating-linear-gradient(45deg,#ffffff0d 0 4px,transparent 4px 8px)!important}
.cell.sock.lint{display:grid;place-items:center}
.cell.sock.lint .lintsvg{width:62%;height:62%;display:block}
""".replace('__VER__', VER))

adds = [
 {'p.tumbleRun':'{n} in the drum · same colour again pays more','p.tumbleWild':'{n} in the drum · striped socks take any pair','p.tumbleLint':'{n} in the drum · tap lint away','p.tumbleInside':'{n} in the drum · tap a grey one to turn it','tumble.run':'Run ×{n}','fx.tumbleRun':'Run ×{n}','a.tumbleWild':'Striped sock: takes any pair','a.tumbleLint':'Lint','a.tumbleInside':'Sock inside out'},
 {'p.tumbleRun':'{n} dans le tambour · même couleur, plus de points','p.tumbleWild':'{n} dans le tambour · la rayée prend toute paire','p.tumbleLint':'{n} dans le tambour · touchez les peluches','p.tumbleInside':'{n} dans le tambour · touchez une grise','tumble.run':'Série ×{n}','fx.tumbleRun':'Série ×{n}','a.tumbleWild':'Chaussette rayée : prend toute paire','a.tumbleLint':'Peluche','a.tumbleInside':'Chaussette à l’envers'},
 {'p.tumbleRun':'{n} en el tambor · el mismo color paga más','p.tumbleWild':'{n} en el tambor · la rayada toma cualquier par','p.tumbleLint':'{n} en el tambor · toca la pelusa','p.tumbleInside':'{n} en el tambor · toca una gris','tumble.run':'Racha ×{n}','fx.tumbleRun':'Racha ×{n}','a.tumbleWild':'Calcetín rayado: toma cualquier par','a.tumbleLint':'Pelusa','a.tumbleInside':'Calcetín del revés'},
 {'p.tumbleRun':'{n} in der Trommel · gleiche Farbe zahlt mehr','p.tumbleWild':'{n} in der Trommel · gestreifte nehmen jedes Paar','p.tumbleLint':'{n} in der Trommel · Fussel wegtippen','p.tumbleInside':'{n} in der Trommel · graue umdrehen','tumble.run':'Serie ×{n}','fx.tumbleRun':'Serie ×{n}','a.tumbleWild':'Gestreifte Socke: nimmt jedes Paar','a.tumbleLint':'Fussel','a.tumbleInside':'Socke auf links'},
]
anchors = re.findall(r"'p\.tumble':'[^']*'", s)
assert len(anchors) == 4, anchors
pos = 0
for anc, add in zip(anchors, adds):
    i = s.index(anc, pos); j = i + len(anc)
    ins = ', ' + ', '.join("'%s':'%s'" % kv for kv in add.items())
    s = s[:j] + ins + s[j:]; pos = j + len(ins)
open(p, 'w').write(s)
print('tumble applied')
