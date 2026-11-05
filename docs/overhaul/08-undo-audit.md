# Undo audit (bible Q14)

The rule, from the project's notes: **undo belongs where a wrong move damages the board, not where it only costs a
resource.** An undo that costs a move is worse than the mistake. A board that resets each round, or one where a wrong
touch ends the round anyway, doesn't need one.

Read from the code on 2026-11-05 (v0.150.0) by scanning each game's block for Undo, Hint and move budgets. The
"Decision" column is a judgement from reading the code and the changelog, and the rows marked **review** are follow-ups, not changes made here.

## Games that have Undo (7)

| Game | id | Why it has it |
|---|---|---|
| Untangle | rewire | turns cost moves from a budget; a wrong turn changes the board |
| Let the Cat Out | slide | sliding bars: a wrong slide can box the cat in |
| Chalk Line | chalk | strokes are spent from a budget of chalk |
| Patchwork | forge | a patch laid in the wrong place blocks lines (Undo turns into Swap on "clear" boards) |
| Latch Hook | latch | rows turned with a move budget |
| Even Skeins | halve | moves between baskets, budgeted |
| Loaf Box | loaf | a loaf placed wrong blocks rows |

## Games with no move budget (the scan found none)

A wrong move in these costs time or ends the round rather than spending a resource, so by the rule they need no Undo.
This is what the scan shows, not a game-by-game playtest; Tidy Up, Dye Pots and Yarn Tangled Tangle have the most
steps among them and are the first to check by hand.

Odd Skein (a slip uses a try), Count the Stitches, Dye Trap, Stitch Count, Quick Count, Off Beat, Sorting Basket,
Cat's Cradle, Cat Fight, Tumble Dryer, Needle Pass, Mending, Peekaboo, Snip, Ripples, Dropped Stitch, Folds,
Tangle Watch, Catch the Balls, Heft, Yarn Ball Blaster, Purr, Cat's Eyes, Basket Drop (nudge is a move, not an
aid), Tidy Up, Dye Pots, Follow the Thread, Yarn Tangled Tangle, No Crossing (inferred: dragging a peg back is the undo).

## Games with a move budget and no Undo: review

| Game | id | What a wrong move does | Proposed decision |
|---|---|---|---|
| Mirror Stitch | mirror | lighting a wrong square; putting it out returns its move (per the changelog) | **no change**: putting a square out is the undo, and it is free |
| Darning | bridge | a stitch laid on the wrong square spends a move | **review**: if a laid stitch cannot be lifted, add a free Undo of the last stitch |
| Splice | splice | joining the wrong word halves | **review**: if a join cannot be broken, add a free Undo |
| Balance | lever | a drag moves the balance point; the next drag can move it back | **no change** (inferred from its rules, not tested): every move is reversible by playing |
| Kitten's Snack Attack | forage | sending a kitten to the wrong treat fills a holding slot | **review**: a filled slot can jam the board, which is damage, so Undo of the last send is a candidate |
| Spool Shots | volley | a shot paints squares; the hint already offers "wind back" when the board is stuck | **review**: make wind-back a visible Undo rather than a hint-only path |
| Sandbox of Softness | sift | a scoop poured in the wrong place layers wrong sand | **review**: layering is the puzzle; an Undo may trivialise it, so playtest before adding |

The five **review** games are listed in the roadmap as follow-ups. Each needs its own probe (a wrong move, then Undo,
leaves the board exactly as before and the move budget whole) before it ships.
