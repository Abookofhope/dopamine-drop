import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Loads the real typefaces so golden images show real text.
///
/// Without this every glyph renders as a box, which makes a golden useless for
/// its actual job — noticing that a screen no longer looks right.
Future<void> loadTestFonts() async {
  const families = {
    'Archivo': ['assets/fonts/Archivo-ExtraBold.ttf'],
    'InstrumentSans': [
      'assets/fonts/InstrumentSans-Regular.ttf',
      'assets/fonts/InstrumentSans-SemiBold.ttf',
      'assets/fonts/InstrumentSans-Bold.ttf',
    ],
    'MartianMono': ['assets/fonts/MartianMono-Bold.ttf'],
  };

  for (final entry in families.entries) {
    final loader = FontLoader(entry.key);
    for (final path in entry.value) {
      loader.addFont(
        File(path).readAsBytes().then((b) => ByteData.view(b.buffer)),
      );
    }
    await loader.load();
  }

  await _loadMaterialIcons();
}

/// Icons are a font too, and an unloaded one draws a placeholder box.
///
/// Found by walking up from the Dart binary rather than hardcoded, so this
/// works on any machine that can run these tests at all. If it cannot be
/// located the goldens still generate — icons just render as boxes, which is a
/// cosmetic loss rather than a failure.
Future<void> _loadMaterialIcons() async {
  var dir = File(Platform.resolvedExecutable).parent;
  for (var up = 0; up < 6; up++) {
    final candidate = File(
      '${dir.path}/artifacts/material_fonts/MaterialIcons-Regular.otf',
    );
    if (candidate.existsSync()) {
      final loader = FontLoader('MaterialIcons')
        ..addFont(
          candidate.readAsBytes().then((b) => ByteData.view(b.buffer)),
        );
      await loader.load();
      return;
    }
    dir = dir.parent;
  }
}
