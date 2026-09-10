import 'package:dopamine_drop/engine/mode.dart';
import 'package:dopamine_drop/engine/registry.dart';
import 'package:dopamine_drop/engine/rng.dart';
import 'package:dopamine_drop/engine/settings.dart';
import 'package:dopamine_drop/engine/store.dart';
import 'package:dopamine_drop/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('colour is never the only channel', () {
    test('every ink has a distinct shape', () {
      // Two colours sharing a shape would leave the pair indistinguishable for
      // exactly the players this setting exists for.
      final shapes = DD.inks.map((i) => i.shape).toSet();
      expect(shapes.length, DD.inks.length);
    });

    test('every ink has a distinct name and colour too', () {
      expect(DD.inks.map((i) => i.name).toSet().length, DD.inks.length);
      expect(DD.inks.map((i) => i.color.toARGB32()).toSet().length,
          DD.inks.length);
    });

    testWidgets('every mode renders with colour assist on, at every level',
        (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      for (final mode in kModes) {
        for (final level in [0, 6, 14]) {
          await tester.pumpWidget(MaterialApp(
            theme: DD.theme(),
            home: Scaffold(
              body: SizedBox(
                width: 360,
                height: 460,
                child: mode.build(PuzzleContext(
                  level: level,
                  rng: Rng.seeded(level + mode.id.length),
                  onSolved: () {},
                  onMissed: () {},
                  colorAssist: true,
                )),
              ),
            ),
          ));
          await tester.pump(const Duration(milliseconds: 60));
          expect(tester.takeException(), isNull,
              reason: '${mode.name} at level $level with colour assist');
          await tester.pump(const Duration(seconds: 4));
          expect(tester.takeException(), isNull);
        }
      }
    });

    test('colour assist is off unless asked for, so nothing changes silently',
        () {
      final ctx = PuzzleContext(
        level: 0,
        rng: Rng.seeded(1),
        onSolved: _noop,
        onMissed: _noop,
      );
      expect(ctx.colorAssist, isFalse);
    });
  });

  group('settings', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('sensible defaults on a fresh install', () async {
      final settings = Settings(await Store.open());
      expect(settings.sound, isTrue);
      expect(settings.haptics, isTrue);
      // Both off by default: they are accommodations, not improvements, and
      // turning them on for everyone would be its own kind of wrong.
      expect(settings.reduceMotion, isFalse);
      expect(settings.colorAssist, isFalse);
    });

    test('a legacy mute choice survives the move to a named sound setting',
        () async {
      SharedPreferences.setMockInitialValues({'dd.v1': '{"muted":true}'});
      final settings = Settings(await Store.open());
      expect(settings.sound, isFalse);
    });

    test('changes persist and notify exactly once each', () async {
      final settings = Settings(await Store.open());
      var notifications = 0;
      settings.addListener(() => notifications++);

      await settings.setColorAssist(true);
      await settings.setColorAssist(true); // No-op: same value.
      await settings.setSound(false);

      expect(notifications, 2);
      expect(settings.colorAssist, isTrue);
      expect(settings.sound, isFalse);

      // And they survive a restart.
      final reopened = Settings(await Store.open());
      expect(reopened.colorAssist, isTrue);
      expect(reopened.sound, isFalse);
    });

    test('resetting progress keeps settings', () async {
      final store = await Store.open();
      final settings = Settings(store);
      await settings.setColorAssist(true);
      await settings.setSound(false);
      await store.recordBlitz(5000);
      await store.addXp(9000);

      await store.resetProgress();

      expect(store.bestBlitz, 0);
      expect(store.xp, 0);
      expect(store.runs, 0);
      // A player clearing their scores has not asked for sound back.
      expect(store.colorAssist, isTrue);
      expect(store.sound, isFalse);
    });

    test('reset clears every per-mode and per-day best', () async {
      final store = await Store.open();
      await store.recordMarathon('odd', 900);
      await store.recordDaily('2026-09-10', 700);
      expect(store.bestMarathon('odd'), 900);

      await store.resetProgress();

      expect(store.bestMarathon('odd'), 0);
      expect(store.bestDaily('2026-09-10'), 0);
    });
  });
}

void _noop() {}
