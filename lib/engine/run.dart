import 'package:flutter/foundation.dart';

import 'mode.dart';
import 'rng.dart';

enum RunKind { blitz, daily, marathon, fidget }

/// The rules for one kind of run. Everything that differs between Blitz,
/// Daily Drop, Marathon and Fidget Loop lives here rather than in branches
/// scattered through the play screen.
@immutable
class RunSpec {
  const RunSpec({
    required this.label,
    required this.timed,
    required this.scored,
    this.cap = Duration.zero,
    this.penalty = const Duration(seconds: 4),
    this.lives = 0,
    this.rounds,
  });

  final String label;
  final bool timed;
  final bool scored;

  /// Also the starting clock. Solves top the clock back up but never past it,
  /// so a run stays roughly a minute however well you play.
  final Duration cap;
  final Duration penalty;
  final int lives;

  /// Fixed-length runs (Daily Drop). Null means "until you run out".
  final int? rounds;

  static const Map<RunKind, RunSpec> all = {
    RunKind.blitz: RunSpec(
      label: 'Blitz',
      timed: true,
      scored: true,
      cap: Duration(seconds: 60),
    ),
    RunKind.daily: RunSpec(
      label: 'Daily Drop',
      timed: true,
      scored: true,
      cap: Duration(seconds: 90),
      rounds: 12,
    ),
    RunKind.marathon: RunSpec(
      label: 'Marathon',
      timed: false,
      scored: true,
      lives: 3,
    ),
    RunKind.fidget: RunSpec(
      label: 'Fidget Loop',
      timed: false,
      scored: false,
    ),
  };
}

/// Live state of one run. Mutable by design — the play screen owns exactly one
/// of these and rebuilds from it.
class RunState {
  RunState({required this.kind, this.fixedMode})
      : spec = RunSpec.all[kind]!,
        remaining = RunSpec.all[kind]!.cap,
        lives = RunSpec.all[kind]!.lives,
        rng = kind == RunKind.daily
            ? Rng.seeded(stableHash(todayKey()))
            : Rng.system();

  final RunKind kind;
  final RunSpec spec;

  /// Set for Marathon and Fidget Loop, where one mode repeats. Null in Blitz
  /// and Daily Drop, where the shell shuffles.
  final String? fixedMode;

  final Rng rng;

  Duration remaining;
  int lives;
  int score = 0;
  int solved = 0;
  int missed = 0;
  int streak = 0;
  int bestStreak = 0;
  int roundIndex = 0;
  int xpEarned = 0;
  String? lastModeId;

  /// Level-ups banked during this run, so the game-over screen can celebrate
  /// them without recomputing from the store.
  int levelsGained = 0;

  /// Difficulty ramps on solves, so a run gets harder only as you earn it.
  int get level => solved ~/ 3;

  int get multiplier => multiplierFor(streak);

  bool get isOver {
    if (spec.rounds != null && roundIndex > spec.rounds!) return true;
    if (spec.timed && remaining <= Duration.zero) return true;
    if (spec.lives > 0 && lives <= 0) return true;
    return false;
  }

  /// Only counts modes where missing is possible, so Rewire cannot inflate it.
  int get accuracyPercent {
    final attempts = solved + missed;
    return attempts == 0 ? 0 : (solved * 100 / attempts).round();
  }

  /// [pressure] compresses both the speed-bonus window and the time returned
  /// to the clock. It is how difficulty keeps climbing after every mode's board
  /// generator has hit its ceiling — see `Progression.pressure`.
  void recordSolve(PuzzleMode mode, Duration elapsed, {double pressure = 1.0}) {
    solved++;
    streak++;
    if (streak > bestStreak) bestStreak = streak;
    // The multiplier is the one that was on screen while the player solved it,
    // i.e. before this solve bumped the streak. Paying the new multiplier here
    // would credit a bonus the player had not earned yet.
    final par = Duration(
        milliseconds: (mode.par.inMilliseconds * pressure).round());
    if (spec.scored) {
      score += pointsFor(elapsed, par, multiplierFor(streak - 1));
    }
    if (spec.timed) {
      final gained = Duration(
          milliseconds: (mode.bonus.inMilliseconds * pressure).round());
      final topped = remaining + gained;
      remaining = topped > spec.cap ? spec.cap : topped;
    }
  }

  void recordMiss() {
    missed++;
    streak = 0;
    if (spec.timed) {
      final left = remaining - spec.penalty;
      remaining = left < Duration.zero ? Duration.zero : left;
    }
    if (spec.lives > 0) lives--;
  }
}

/// Streak pays, but caps — otherwise one lucky run dwarfs every other score
/// and the leaderboard stops meaning anything.
int multiplierFor(int streak) => (1 + streak ~/ 4).clamp(1, 5);

/// Speed and streak are separate ladders, so there are two ways to be good at
/// this rather than one.
int pointsFor(Duration elapsed, Duration par, int multiplier) {
  final speed =
      (1 - elapsed.inMilliseconds / par.inMilliseconds).clamp(0.0, 1.0);
  return ((100 + 130 * speed) * multiplier).round();
}
