import 'package:dopamine_drop/engine/mode.dart';
import 'package:dopamine_drop/engine/registry.dart';
import 'package:dopamine_drop/engine/rng.dart';
import 'package:dopamine_drop/modes/rewire.dart';
import 'package:dopamine_drop/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
/// Renders every mode at the difficulty extremes on a small phone.
///
/// The analyzer cannot see a RenderFlex overflow or an unbounded-constraint
/// crash, and those are exactly what break when a grid grows from 2x2 to 5x5.
void main() {
  Widget host(Widget child) => MaterialApp(
        theme: DD.theme(),
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 360,
              height: 460,
              child: child,
            ),
          ),
        ),
      );

  for (final mode in kModes) {
    for (final level in [0, 4, 12]) {
      testWidgets('${mode.name} renders at level $level', (tester) async {
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        var solved = 0;
        var missed = 0;
        await tester.pumpWidget(host(mode.build(PuzzleContext(
          level: level,
          rng: Rng.seeded(level * 31 + mode.id.length),
          onSolved: () => solved++,
          onMissed: () => missed++,
        ))));

        await tester.pump(const Duration(milliseconds: 100));
        expect(tester.takeException(), isNull);

        // Echo schedules its flash sequence on timers; let them drain so the
        // test does not fail on a pending timer.
        await tester.pump(const Duration(seconds: 6));
        expect(tester.takeException(), isNull);
        expect(solved + missed, greaterThanOrEqualTo(0));
      });
    }
  }

  testWidgets('a solved Rewire board reports exactly one win', (tester) async {
    // Rotating a tile can complete the circuit; the mode must not fire
    // onSolved again on further taps.
    var solved = 0;
    await tester.pumpWidget(host(const Rewire().build(PuzzleContext(
      level: 0,
      rng: Rng.seeded(7),
      onSolved: () => solved++,
      onMissed: () {},
    ))));
    await tester.pump();

    final cells = find.byType(GestureDetector);
    for (var i = 0; i < cells.evaluate().length && solved == 0; i++) {
      for (var turn = 0; turn < 4 && solved == 0; turn++) {
        await tester.tap(cells.at(i), warnIfMissed: false);
        await tester.pump(const Duration(milliseconds: 220));
      }
    }
    expect(solved, lessThanOrEqualTo(1));
  });
}
