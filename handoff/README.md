# Depth-plan work in progress (not released)

Unreleased mode reworks from the depth plan. Live main is v0.181.0 (Cat's Cradle and No Crossing shipped).

On this branch, in `site/app.html`, built and probed but not released:
- Latch Hook (`latch`): linked rows L6 (reverse links L12), double hook L12, ratchet row L20, exact least-turns bonus. Probe `latch.mjs` passes; wide checks passed.
- Even Skeins (`halve`): tied pairs L6, cat's weight L12, pinned skein L20, fewest-moves bonus. `halve.mjs` and `drag.mjs` pass; wide checks passed.
- Peekaboo (`haunt`): watch on to grow a pot and call it; two cats move at once L6, belled cat L12, a move in the dark L20. `peekaboo.mjs` passes.
- Tumble Dryer (`tumble`): same-colour runs; striped wild socks L6, lint L12, inside-out socks L20. `tumble.mjs` passes.
- Cat's Eyes (`glimmer`): oil burns as the light moves; gold twins L6, shy eyes L12, glowworms L20; bright-finish bonus. `glimmer.mjs` passes.
- Follow the Thread (`trace`): beads, steady-hand bonus; knots L6, frayed stretch L12, burr L20. **Probe `trace.mjs` FAILS (6 checks), not yet diagnosed.**

`handoff/modes/<id>.py` are re-appliable replace scripts: on a clean main, `python3 handoff/modes/<id>.py <version>` applies that mode's change alone (arc and slack are already on main). Use them to release one mode per version: apply, add the CHANGELOG entry and VERSION_TAG, run the probe, ship.

Delete the `handoff/` folder before merging anything to main.
