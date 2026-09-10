import 'package:dopamine_drop/engine/progression.dart';
import 'package:dopamine_drop/engine/registry.dart';
import 'package:dopamine_drop/engine/rng.dart';
import 'package:dopamine_drop/engine/run.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('xp curve', () {
    test('the closed form matches counting up level by level', () {
      var running = 0;
      for (var level = 1; level <= 400; level++) {
        expect(Progression.totalXpForLevel(level), running,
            reason: 'cumulative XP at level $level');
        running += Progression.xpToNext(level);
      }
    });

    test('levelForXp inverts totalXpForLevel exactly at the boundaries', () {
      for (var level = 1; level <= 400; level++) {
        final at = Progression.totalXpForLevel(level);
        expect(Progression.levelForXp(at), level);
        if (level > 1) expect(Progression.levelForXp(at - 1), level - 1);
      }
    });

    test('level never drops below one, including on a fresh install', () {
      expect(Progression.levelForXp(0), 1);
      expect(Progression.levelForXp(-500), 1);
    });

    test('xp into the current level never exceeds its span', () {
      for (var xp = 0; xp < 60000; xp += 137) {
        expect(Progression.xpIntoLevel(xp), lessThan(Progression.xpSpanOfLevel(xp)));
        expect(Progression.xpIntoLevel(xp), greaterThanOrEqualTo(0));
      }
    });

    test('the curve keeps going — there is no level cap', () {
      expect(Progression.levelForXp(100000000), greaterThan(4000));
    });
  });

  group('difficulty scaling', () {
    test('ramps inside a run', () {
      expect(Progression.effectiveLevel(0, 1), 0);
      expect(Progression.effectiveLevel(9, 1), 3);
    });

    test('a veteran does not start every run on a 2x2 grid', () {
      expect(Progression.effectiveLevel(0, 120), greaterThan(0));
    });

    test('the veteran offset is capped, because boards have a ceiling', () {
      expect(Progression.effectiveLevel(0, 100000),
          Progression.effectiveLevel(0, 500));
    });

    test('pressure decreases with level but never past its floor', () {
      expect(Progression.pressure(0), closeTo(1.0, 0.0001));
      expect(Progression.pressure(250), lessThan(Progression.pressure(50)));
      for (final level in [0, 1, 250, 5000, 100000]) {
        expect(Progression.pressure(level), greaterThanOrEqualTo(0.55));
        expect(Progression.pressure(level), lessThanOrEqualTo(1.0));
      }
    });

    test('pressure is monotonic, so difficulty never dips as you level', () {
      var previous = 2.0;
      for (var level = 0; level < 1000; level++) {
        final now = Progression.pressure(level);
        expect(now, lessThanOrEqualTo(previous));
        previous = now;
      }
    });

    test('scaling par at high level tightens the speed-bonus window', () {
      const base = Duration(seconds: 3);
      expect(Progression.scale(base, 0), base);
      expect(Progression.scale(base, 300).inMilliseconds,
          lessThan(base.inMilliseconds));
    });
  });

  group('unlock ladder', () {
    test('every mode on the ladder actually exists', () {
      for (final rung in kLadder.where((u) => u.modeId != null)) {
        expect(() => modeById(rung.modeId!), returnsNormally,
            reason: 'ladder references mode "${rung.modeId}"');
      }
    });

    test('every mode is reachable — none is stranded off the ladder', () {
      for (final mode in kModes) {
        expect(unlockLevelForMode(mode.id), isNotNull,
            reason: '${mode.name} has no unlock rung');
      }
    });

    test('Blitz is playable on a fresh install', () {
      expect(isRunKindUnlocked(RunKind.blitz, 1), isTrue);
    });

    test('a fresh install always has at least one mode', () {
      expect(unlockedModes(1), isNotEmpty);
    });

    test('the unlocked set only ever grows', () {
      var previous = 0;
      for (var level = 1; level <= 300; level++) {
        final count = unlockedModes(level).length;
        expect(count, greaterThanOrEqualTo(previous));
        previous = count;
      }
    });

    test('everything real is unlocked by the top of the ladder', () {
      final top = kLadder.map((u) => u.level).reduce((a, b) => a > b ? a : b);
      expect(unlockedModes(top).length, kModes.length);
      for (final kind in RunKind.values) {
        expect(isRunKindUnlocked(kind, top), isTrue);
      }
    });

    test('rotation is real from the very first run', () {
      // One mode alone is the single-mechanic game this one exists to beat.
      expect(unlockedModes(1).length, greaterThanOrEqualTo(2));
    });

    test('the whole base game arrives inside the first sitting', () {
      // Six modes by 19, every run type by 26 — about 42 minutes of play.
      // Modes 7-12 are the long tail and deliberately are not part of this.
      expect(unlockedModes(19).length, 6);
      for (final kind in RunKind.values) {
        expect(isRunKindUnlocked(kind, kBaseGameTopLevel), isTrue,
            reason: '${kind.name} still locked at level $kBaseGameTopLevel');
      }
    });

    test('every base-game rung lands on or before the opening ladder ends', () {
      expect(baseGameRungs, isNotEmpty);
      for (final rung in baseGameRungs) {
        expect(rung.level, lessThanOrEqualTo(kBaseGameTopLevel));
      }
    });

    test('the long tail is all modes, and all of them real', () {
      final tail = kLadder.where((u) => u.level > kBaseGameTopLevel);
      expect(tail, isNotEmpty);
      for (final rung in tail) {
        expect(rung.modeId, isNotNull,
            reason: 'level ${rung.level} should grant a mode');
      }
      expect(unlockedModes(9999).length, kModes.length);
    });

    test('past the base game the ladder keeps fifty-level spacing', () {
      final tail = kLadder
          .where((u) => u.level > kBaseGameTopLevel)
          .map((u) => u.level)
          .toList()
        ..sort();
      expect(tail, isNotEmpty);
      for (var i = 1; i < tail.length; i++) {
        expect(tail[i] - tail[i - 1], 50);
      }
    });
  });

  group('planned rungs are promises, not grants', () {
    test('a promise names content and grants nothing', () {
      for (final rung in kLadder.where((u) => u.isPlanned)) {
        expect(rung.modeId, isNull);
        expect(rung.runKind, isNull);
        expect(rung.plannedName, isNotEmpty);
      }
    });

    test('realRungs excludes every promise', () {
      expect(realRungs.any((u) => u.isPlanned), isFalse);
      expect(realRungs.length + kLadder.where((u) => u.isPlanned).length,
          kLadder.length);
    });

    test('a promise never enters the playable pool', () {
      // Levelling past every planned rung must not add a seventh mode.
      expect(unlockedModes(9999).length, kModes.length);
    });

    test('every rung can be named without crashing', () {
      for (final rung in kLadder) {
        expect(unlockName(rung), isNotEmpty);
      }
    });

    test('planned names are unique, so the road ahead reads as a list', () {
      final names =
          kLadder.where((u) => u.isPlanned).map((u) => u.plannedName!).toList();
      expect(names.toSet().length, names.length);
    });

    test('nextUnlock walks the ladder in order and then runs out', () {
      final top = kLadder.map((u) => u.level).reduce((a, b) => a > b ? a : b);
      var level = 1;
      var previous = 0;
      while (true) {
        final next = nextUnlock(level);
        if (next == null) break;
        expect(next.level, greaterThan(previous - 1));
        previous = next.level;
        level = next.level;
      }
      expect(nextUnlock(top), isNull);
    });
  });

  group('rotation under a thin unlock set', () {
    test('a single unlocked mode repeats instead of hanging', () {
      final pool = [kModes.first];
      final rng = Rng.seeded(3);
      var last = kModes.first.id;
      for (var i = 0; i < 50; i++) {
        final mode = nextMode(rng, last, pool: pool);
        expect(mode.id, kModes.first.id);
        last = mode.id;
      }
    });

    test('two unlocked modes still alternate without repeating', () {
      final pool = kModes.take(2).toList();
      final rng = Rng.seeded(11);
      String? last;
      for (var i = 0; i < 50; i++) {
        final mode = nextMode(rng, last, pool: pool);
        expect(mode.id, isNot(last));
        expect(pool.map((m) => m.id), contains(mode.id));
        last = mode.id;
      }
    });

    test('rotation never returns a locked mode', () {
      final pool = unlockedModes(1);
      final rng = Rng.seeded(5);
      String? last;
      for (var i = 0; i < 100; i++) {
        final mode = nextMode(rng, last, pool: pool);
        expect(isModeUnlocked(mode.id, 1), isTrue);
        last = mode.id;
      }
    });
  });

  group('what the ladder actually costs', () {
    // Not an assertion about good design — a guard so nobody retunes the curve
    // or the ladder without seeing what it does to time-to-unlock.
    const solvesPerRun = 15;
    const xpPerSolve = 10; // ~8 at x1, more on a streak

    int runsToReach(int level) =>
        (Progression.totalXpForLevel(level) / (solvesPerRun * xpPerSolve))
            .ceil();

    test('reaching each rung costs a plausible number of runs', () {
      for (final rung in kLadder) {
        final runs = runsToReach(rung.level);
        expect(runs, greaterThanOrEqualTo(0));
        // A 90-second run: flag anything past ~150 hours as a tuning mistake.
        expect(runs * 1.5 / 60, lessThan(150),
            reason: 'level ${rung.level} takes $runs runs');
      }
    });

    test('the base game is reachable in one sitting', () {
      final minutes = runsToReach(kBaseGameTopLevel) * 1.5;
      expect(minutes, lessThan(90),
          reason: 'base game complete at ${minutes.toStringAsFixed(0)} min');
    });

    test('the first mode the player does not already own is not a slog', () {
      final next = kLadder
          .where((u) => u.modeId != null && u.level > 1)
          .map((u) => u.level)
          .reduce((a, b) => a < b ? a : b);
      final minutes = runsToReach(next) * 1.5;
      expect(minutes, lessThan(15),
          reason: '3rd mode at ${minutes.toStringAsFixed(0)} min');
    });
  });
}
