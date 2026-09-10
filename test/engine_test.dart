import 'package:dopamine_drop/engine/registry.dart';
import 'package:dopamine_drop/engine/rng.dart';
import 'package:dopamine_drop/engine/run.dart';
import 'package:dopamine_drop/engine/mode.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('scoring', () {
    test('a slow solve still scores the base', () {
      expect(pointsFor(const Duration(seconds: 30),
          const Duration(seconds: 3), 1), 100);
    });

    test('an instant solve earns the full speed bonus', () {
      expect(pointsFor(Duration.zero, const Duration(seconds: 3), 1), 230);
    });

    test('the multiplier scales the whole score', () {
      expect(pointsFor(Duration.zero, const Duration(seconds: 3), 3), 690);
    });
  });

  group('streak multiplier', () {
    test('starts at one and steps every four solves', () {
      expect(multiplierFor(0), 1);
      expect(multiplierFor(3), 1);
      expect(multiplierFor(4), 2);
      expect(multiplierFor(8), 3);
    });

    test('caps at five so one run cannot dwarf every other', () {
      expect(multiplierFor(100), 5);
    });
  });

  group('run state', () {
    test('solving tops the clock up but never past the cap', () {
      final run = RunState(kind: RunKind.blitz);
      run.remaining = const Duration(seconds: 59);
      run.recordSolve(const _StubMode(), const Duration(seconds: 1));
      expect(run.remaining, const Duration(seconds: 60));
    });

    test('a miss costs time and resets the streak but keeps the best', () {
      final run = RunState(kind: RunKind.blitz);
      for (var i = 0; i < 5; i++) {
        run.recordSolve(const _StubMode(), const Duration(seconds: 1));
      }
      expect(run.bestStreak, 5);
      run.recordMiss();
      expect(run.streak, 0);
      expect(run.bestStreak, 5);
      expect(run.remaining, const Duration(seconds: 56));
    });

    test('the clock never goes negative', () {
      final run = RunState(kind: RunKind.blitz);
      run.remaining = const Duration(seconds: 1);
      run.recordMiss();
      expect(run.remaining, Duration.zero);
      expect(run.isOver, isTrue);
    });

    test('marathon ends when lives run out, not on the clock', () {
      final run = RunState(kind: RunKind.marathon);
      expect(run.isOver, isFalse);
      for (var i = 0; i < 3; i++) {
        run.recordMiss();
      }
      expect(run.isOver, isTrue);
    });

    test('difficulty ramps every three solves', () {
      final run = RunState(kind: RunKind.blitz);
      expect(run.level, 0);
      for (var i = 0; i < 3; i++) {
        run.recordSolve(const _StubMode(), const Duration(seconds: 1));
      }
      expect(run.level, 1);
    });
  });

  group('daily seeding', () {
    test('the same day produces the same sequence of modes', () {
      List<String> runOnce() {
        final rng = Rng.seeded(stableHash('2026-09-09'));
        String? last;
        return List.generate(12, (_) {
          final mode = nextMode(rng, last);
          last = mode.id;
          return mode.id;
        });
      }

      expect(runOnce(), runOnce());
    });

    test('different days diverge', () {
      final a = Rng.seeded(stableHash('2026-09-09'));
      final b = Rng.seeded(stableHash('2026-09-10'));
      final aRolls = List.generate(20, (_) => a.nextInt(1000));
      final bRolls = List.generate(20, (_) => b.nextInt(1000));
      expect(aRolls, isNot(equals(bRolls)));
    });

    test('stableHash does not depend on String.hashCode', () {
      expect(stableHash('2026-09-09'), stableHash('2026-09-09'));
      expect(stableHash('a'), isNot(stableHash('b')));
    });

    test('todayKey is zero padded so it sorts and seeds consistently', () {
      expect(todayKey(DateTime(2026, 1, 5)), '2026-01-05');
    });
  });

  group('mode rotation', () {
    test('never repeats the previous mode back to back', () {
      final rng = Rng.seeded(1);
      String? last;
      for (var i = 0; i < 200; i++) {
        final mode = nextMode(rng, last);
        expect(mode.id, isNot(last));
        last = mode.id;
      }
    });

    test('every registered mode has a unique id', () {
      final ids = kModes.map((m) => m.id).toSet();
      expect(ids.length, kModes.length);
    });

    test('modeById finds every registered mode', () {
      for (final mode in kModes) {
        expect(modeById(mode.id).name, mode.name);
      }
    });
  });
}


/// Stands in for a real puzzle so the engine tests exercise scoring and run
/// state without dragging any mode's rendering in with them.
class _StubMode extends PuzzleMode {
  const _StubMode();

  @override
  String get id => 'stub';
  @override
  String get name => 'Stub';
  @override
  String get blurb => '';
  @override
  Duration get par => const Duration(milliseconds: 2600);
  @override
  Duration get bonus => const Duration(milliseconds: 1200);
  @override
  Widget build(PuzzleContext ctx) => const SizedBox.shrink();
}
