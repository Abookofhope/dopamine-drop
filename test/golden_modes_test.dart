import 'package:dopamine_drop/engine/mode.dart';
import 'package:dopamine_drop/engine/registry.dart';
import 'package:dopamine_drop/engine/rng.dart';
import 'package:dopamine_drop/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fonts.dart';

/// Renders every mode to a golden image.
///
/// The render tests prove a mode does not throw or overflow; these prove it
/// actually looks like the puzzle it claims to be. Regenerate after a
/// deliberate visual change:
///
///     flutter test --update-goldens test/golden_modes_test.dart
///
/// A failure here is a screenshot diff in `test/failures/`, which is usually
/// faster to read than the code that caused it.

void main() {
  setUpAll(loadTestFonts);

  for (final mode in kModes) {
    testWidgets('${mode.name} looks like itself', (tester) async {
      tester.view.physicalSize = const Size(380, 480);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: DD.theme(),
        home: Scaffold(
          backgroundColor: DD.ink,
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: RepaintBoundary(
              child: mode.build(PuzzleContext(
                level: 6,
                rng: Rng.seeded(42),
                onSolved: () {},
                onMissed: () {},
              )),
            ),
          ),
        ),
      ));

      // Let any reveal phase finish so the golden shows the playable state
      // rather than a mode mid-flash.
      await tester.pump(const Duration(milliseconds: 40));
      await tester.pump(const Duration(seconds: 3));

      await expectLater(
        find.byType(RepaintBoundary).first,
        matchesGoldenFile('golden/${mode.id}.png'),
      );
    });
  }
}
