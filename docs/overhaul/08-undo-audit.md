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

## Games with a move budget and no Undo: decided (2026-11-06, v0.155.0)

The owner asked for each to be investigated. Each was read in the code and checked against the probe that already plays it. None needs an Undo added: in each, either a wrong move cannot damage the board, or playing already takes it back for free.

| Game | id | What a wrong move does (from the code) | Decision | Held by |
|---|---|---|---|---|
| Mirror Stitch | mirror | lighting a wrong square; putting it out returns its move | **no change**: putting a square out is the undo, and it is free | `mirror.mjs` |
| Darning | bridge | a stitch on the wrong square spends a move; tapping or dragging over it again lifts it and gives the move back | **no change**: lifting is the undo, and it is free | `bridge.mjs` ("laying a stitch costs a move and lifting it gives the move back") |
| Splice | splice | a wrong pairing is refused: both halves flash and it costs a move, but nothing is joined | **no change**: the board is never damaged, so there is nothing to undo | `splice.mjs` ("a wrong pairing costs a move") |
| Balance | lever | a drag moves the balance point; the next drag can move it back | **no change** (inferred from its rules, not tested): every move is reversible by playing | — |
| Kitten's Snack Attack | forage | a swarm sent at a colour the edge cannot reach yet waits in a basket slot | **no change**, as recommended (the owner's answer named the other four, so this one stays open to their word): the send order is the puzzle (its own comments), and the spare moves already forgive a careless order; a free Undo would let a player try a send, look, and take it back | `forage.mjs` |
| Spool Shots | volley | a shot paints squares | **no change**: tapping a square the last shot painted winds it back and gives its move back, and when the board is stuck the hint lights the squares to wind back. The code comment that said winding back "costs a move" was wrong and is corrected | `volley.mjs` ("winding the last shot back by tapping a square it painted gives its move back") |
| Sandbox of Softness | sift | a grain that finds no scoop rolls round again, costing a move, never the picture | **no change**: the picture can always be finished | `sand.mjs` ("a grain that finds no scoop rolls round again (it costs a move, not the picture)") |

The owner asked for Darning, Splice, Spool Shots and Sandbox of Softness to be investigated; each already meets the rule. Snack Attack stays without an Undo as recommended, open to the owner's word.
