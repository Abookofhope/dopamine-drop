import 'package:dopamine_drop/engine/mode.dart';
import 'package:dopamine_drop/engine/registry.dart';
import 'package:dopamine_drop/engine/rng.dart';
import 'package:dopamine_drop/theme.dart';
import 'package:flutter/material.dart';
import 'package:dopamine_drop/engine/settings.dart';
import 'package:dopamine_drop/engine/store.dart';
import 'package:dopamine_drop/ui/settings_screen.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Goldens for the three hue-dependent modes with colour assist on.
///
/// These are the images to check against a colour-blindness simulator when the
/// palette changes. Regenerate with:
///
///     flutter test --update-goldens test/golden_assist_test.dart

void main() {
  setUpAll(loadTestFonts);

  testWidgets('the settings screen', (tester) async {
    SharedPreferences.setMockInitialValues(
        {'dd.v1': '{"colorAssist":true,"reduceMotion":true}'});
    tester.view.physicalSize = const Size(390, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final store = await Store.open();
    await tester.pumpWidget(MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: DD.theme(),
      home: RepaintBoundary(
        child: SettingsScreen(settings: Settings(store), store: store),
      ),
    ));
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(RepaintBoundary).first,
      matchesGoldenFile('golden/settings.png'),
    );
  });

  // Only the modes that would otherwise ask the player to tell two hues apart.
  for (final id in ['odd', 'stroop', 'count']) {
    testWidgets('$id is playable without colour', (tester) async {
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
              child: modeById(id).build(PuzzleContext(
                level: 6,
                rng: Rng.seeded(42),
                onSolved: () {},
                onMissed: () {},
                colorAssist: true,
              )),
            ),
          ),
        ),
      ));
      await tester.pump(const Duration(milliseconds: 40));
      await tester.pump(const Duration(seconds: 3));

      await expectLater(
        find.byType(RepaintBoundary).first,
        matchesGoldenFile('golden/assist_$id.png'),
      );
    });
  }
}
