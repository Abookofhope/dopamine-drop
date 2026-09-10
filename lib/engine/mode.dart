import 'package:flutter/widgets.dart';

import 'rng.dart';

/// Everything a puzzle is given, and the only channel it uses to talk back.
///
/// This is the contract the whole game rests on: the shell owns the run timer,
/// scoring, streak multiplier, difficulty ramp and teardown, so a new mode is
/// only ever the puzzle itself.
@immutable
class PuzzleContext {
  const PuzzleContext({
    required this.level,
    required this.rng,
    required this.onSolved,
    required this.onMissed,
    this.colorAssist = false,
  });

  /// 0..N. Every mode reads this to scale its own generator. The shell raises
  /// it every few solves, so difficulty ramps inside a run rather than across
  /// sessions.
  final int level;

  /// Seeded for Daily Drop, system-random otherwise.
  final Rng rng;

  /// Call at most once per round. The shell ignores anything after the first.
  final VoidCallback onSolved;
  final VoidCallback onMissed;

  /// Whether this puzzle must be solvable without telling two hues apart.
  ///
  /// On the contract rather than read from the widget tree because it changes
  /// what the puzzle *is*, not only how it is painted: Odd One Out generates a
  /// different tile, not just a differently drawn one.
  final bool colorAssist;
}

/// One puzzle type. Implementations live in `lib/modes/`.
@immutable
abstract class PuzzleMode {
  const PuzzleMode();

  String get id;
  String get name;

  /// One line, shown on the home screen. Not the in-round instruction.
  String get blurb;

  /// Target solve time. Beating it earns a speed bonus; it does not cut the
  /// round off.
  Duration get par;

  /// Time returned to the clock on a solve, in timed runs.
  Duration get bonus;

  /// False for modes where a wrong tap is impossible — Rewire costs time, not
  /// accuracy. The shell uses this to keep accuracy stats honest.
  bool get canMiss => true;

  Widget build(PuzzleContext ctx);
}
