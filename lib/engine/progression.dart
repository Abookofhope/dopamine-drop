import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'run.dart';

/// Persistent player level, XP, unlock ladder and difficulty scaling.
///
/// The level count is unbounded. Difficulty is not, and cannot be: board
/// complexity has a hard ceiling on a phone screen, so it ramps structurally
/// until each mode reaches its own limit and then keeps rising through time
/// pressure instead. See [effectiveLevel] and [pressure].
abstract final class Progression {
  /// XP to get from [level] to the next one. Linear growth: early levels come
  /// fast enough to feel like progress, later ones slow enough to mean
  /// something.
  static int xpToNext(int level) => 50 + 10 * (level - 1);

  /// Total XP banked by the time a player reaches [level].
  ///
  /// Closed form of `sum(xpToNext(i) for i in 1..level-1)`, so the home screen
  /// can draw an XP bar without looping.
  static int totalXpForLevel(int level) {
    if (level <= 1) return 0;
    return (level - 1) * (5 * level + 40);
  }

  /// Inverse of [totalXpForLevel]. Solves the quadratic rather than counting up
  /// from zero, so it stays O(1) at level 10,000.
  static int levelForXp(int xp) {
    if (xp <= 0) return 1;
    final level = (-35 + math.sqrt(1225 + 20 * (40 + xp))) / 10;
    return math.max(1, level.floor());
  }

  static int xpIntoLevel(int xp) => xp - totalXpForLevel(levelForXp(xp));

  static int xpSpanOfLevel(int xp) => xpToNext(levelForXp(xp));

  /// XP for one solve. Deliberately flatter than the score: score rewards a
  /// hot run, XP rewards showing up. A player who is having a bad session
  /// should still see the bar move.
  static int xpForSolve(int multiplier) => 8 + (multiplier - 1) * 2;

  /// What a mode actually sees as its difficulty knob.
  ///
  /// Two terms: the in-run ramp, so a run gets harder as you earn it, plus a
  /// veteran offset so a level-200 player does not start every run on a 2x2
  /// grid. The offset is capped because every mode's generator clamps anyway —
  /// past the cap, [pressure] is what keeps raising the difficulty.
  static int effectiveLevel(int solvedThisRun, int playerLevel) =>
      solvedThisRun ~/ 3 + (playerLevel ~/ 12).clamp(0, 8);

  /// Scales the par time and the time bonus, so at high level you get a
  /// narrower speed-bonus window and less clock back per solve.
  ///
  /// Asymptotic on purpose: it decays toward 0.55 rather than toward zero, so
  /// level 5,000 is sharper than level 250 but never impossible. This is the
  /// half of the difficulty curve that actually scales forever.
  static double pressure(int playerLevel) =>
      0.55 + 0.45 * math.pow(0.985, playerLevel).toDouble();

  static Duration scale(Duration base, int playerLevel) => Duration(
        milliseconds:
            (base.inMilliseconds * pressure(playerLevel)).round(),
      );
}

/// One rung of the unlock ladder.
@immutable
class Unlock {
  const Unlock({
    required this.level,
    this.modeId,
    this.runKind,
    this.plannedName,
  }) : assert(
            (modeId != null ? 1 : 0) +
                    (runKind != null ? 1 : 0) +
                    (plannedName != null ? 1 : 0) ==
                1,
            'A rung grants exactly one of: a mode, a run type, or a promise');

  final int level;
  final String? modeId;
  final RunKind? runKind;

  /// A rung for content that does not exist in this build yet.
  ///
  /// It grants nothing and can never enter the playable pool — it exists so
  /// the road ahead is visible past the last real unlock. Shown as an upcoming
  /// update, never as something the player has failed to reach.
  final String? plannedName;

  bool get isPlanned => plannedName != null;
}

/// The shipping ladder.
///
/// Two modes from the first launch so the rotation — the actual product — is
/// real immediately, the rest of the base game inside the first sitting, then
/// fifty-level spacing for modes that do not exist yet.
///
/// Swap this constant to change the whole economy: nothing else in the
/// codebase reads unlock levels directly. [kLadderFast] and [kLadderClassic]
/// are the two ends this sits between.
///
/// Cost at roughly 15 solves a run, ~10 XP a solve, 90-second runs:
///   all six modes      level 19  ->   ~2,400 XP ->    16 runs ->  ~24 min
///   all four run types level 26  ->   ~4,250 XP ->    28 runs ->  ~42 min
///   first new mode     level 50  ->  ~14,200 XP ->    95 runs ->   ~2.4 h
///   last planned mode  level 250 -> ~321,000 XP -> ~2,140 runs ->  ~53 h
const List<Unlock> kLadder = kLadderMiddle;

/// The last rung of the opening ladder.
///
/// Everything a new player needs to have seen the whole game arrives at or
/// before this level; past it, the ladder is new content. Named because the
/// distinction is load-bearing — "all six base modes" and "every mode in the
/// build" stopped meaning the same thing the moment modes 7-12 landed.
const int kBaseGameTopLevel = 26;

/// Rungs that make up the opening ladder.
Iterable<Unlock> get baseGameRungs =>
    kLadder.where((u) => u.level <= kBaseGameTopLevel && !u.isPlanned);

/// Base game inside the first sitting; the long ladder spends its pull on new
/// content instead of on content already built.
const List<Unlock> kLadderMiddle = [
  // Two to start: one mode alone is the single-mechanic game this one exists
  // to beat, and the first run has to show the rotation to sell it.
  Unlock(level: 1, modeId: 'odd'),
  Unlock(level: 1, modeId: 'order'),
  Unlock(level: 4, modeId: 'stroop'),
  Unlock(level: 6, runKind: RunKind.fidget),
  Unlock(level: 8, modeId: 'echo'),
  Unlock(level: 12, runKind: RunKind.marathon),
  Unlock(level: 13, modeId: 'rewire'),
  Unlock(level: 19, modeId: 'sum'),
  // Daily Drop last: it is the retention hook, so it lands as the payoff for
  // finishing the opening ladder rather than as one more button on day one.
  Unlock(level: 26, runKind: RunKind.daily),

  // Modes 7-12, ordered by how immediately they land rather than by when they
  // were designed: the first new mode after the base game has to be an easy
  // delight, and the two heaviest puzzles are the long-tail prizes. Word Snap
  // is last because it is the only mode with a language dependency.
  Unlock(level: 50, modeId: 'count'),
  Unlock(level: 100, modeId: 'mirror'),
  Unlock(level: 150, modeId: 'rising'),
  Unlock(level: 200, modeId: 'blink'),
  Unlock(level: 250, modeId: 'slide'),
  Unlock(level: 300, modeId: 'word'),
];

/// One mode every fifty levels, run types together at 250. Strongest long-tail
/// pull, at the cost of ~2.4 hours on a single mode and Daily Drop — the
/// retention mechanic — staying invisible for ~53 hours.
const List<Unlock> kLadderClassic = [
  Unlock(level: 1, modeId: 'odd'),
  Unlock(level: 50, modeId: 'order'),
  Unlock(level: 100, modeId: 'stroop'),
  Unlock(level: 150, modeId: 'echo'),
  Unlock(level: 200, modeId: 'rewire'),
  Unlock(level: 250, modeId: 'sum'),
  Unlock(level: 250, runKind: RunKind.marathon),
  Unlock(level: 250, runKind: RunKind.daily),
  Unlock(level: 250, runKind: RunKind.fidget),
];

/// The alternative: all six modes inside the first half hour, with the long
/// ladder spending levels 50-250 on content that does not yet exist (modes
/// 7-12, themes) instead of on content already built.
///
/// Rotation is the product. A player who only has one mode for their first two
/// hours is playing the single-mechanic game this one exists to beat.
const List<Unlock> kLadderFast = [
  Unlock(level: 1, modeId: 'odd'),
  Unlock(level: 1, modeId: 'order'),
  Unlock(level: 1, modeId: 'stroop'),
  Unlock(level: 3, modeId: 'echo'),
  Unlock(level: 6, modeId: 'rewire'),
  Unlock(level: 10, modeId: 'sum'),
  Unlock(level: 4, runKind: RunKind.fidget),
  Unlock(level: 8, runKind: RunKind.marathon),
  Unlock(level: 14, runKind: RunKind.daily),
];

/// Rungs that actually grant something, for anything that must not be fooled
/// by a promise.
Iterable<Unlock> get realRungs => kLadder.where((u) => !u.isPlanned);

/// Blitz is never locked — there has to be something to press on first launch.
bool isRunKindUnlocked(RunKind kind, int playerLevel) {
  if (kind == RunKind.blitz) return true;
  final rung = kLadder.where((u) => u.runKind == kind).firstOrNull;
  return rung == null || playerLevel >= rung.level;
}

int? unlockLevelForRunKind(RunKind kind) =>
    kLadder.where((u) => u.runKind == kind).firstOrNull?.level;

int? unlockLevelForMode(String modeId) =>
    kLadder.where((u) => u.modeId == modeId).firstOrNull?.level;

bool isModeUnlocked(String modeId, int playerLevel) {
  final level = unlockLevelForMode(modeId);
  return level == null || playerLevel >= level;
}

/// The next thing the player is working toward, for the home screen. Null once
/// everything on the ladder is theirs.
Unlock? nextUnlock(int playerLevel) {
  final ahead = kLadder.where((u) => u.level > playerLevel).toList()
    ..sort((a, b) => a.level.compareTo(b.level));
  return ahead.firstOrNull;
}
