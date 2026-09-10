import 'dart:math' as math;

import 'package:flutter/material.dart';

/// The game commits to one visual world — a handheld arcade screen at night —
/// rather than following the system light/dark setting. Everything is painted
/// explicitly so no colour is inherited from the platform.
abstract final class DD {
  // Ground and raised surfaces.
  static const ink = Color(0xFF0D0918);
  static const ink2 = Color(0xFF171029);
  static const ink3 = Color(0xFF20163C);
  static const edge = Color(0xFF31235C);
  static const edgeSoft = Color(0xFF271B49);

  // Text. Neutrals are biased toward the accent rather than pure grey.
  static const haze = Color(0xFF9C90C4);
  static const cream = Color(0xFFFFF3E6);

  // Accents. Boldness is spent on flare; everything else stays quiet.
  static const flare = Color(0xFFFF5B39);
  static const flareDeep = Color(0xFFC93A1E);
  static const zap = Color(0xFFFFC53D);
  static const cool = Color(0xFF33E6C8);
  static const bad = Color(0xFFFF3D6E);

  static const rSm = 9.0;
  static const rMd = 15.0;
  static const rLg = 24.0;

  /// Colours the puzzles draw from.
  ///
  /// Each carries a name (Color Trap shows it) and a shape. The shape is the
  /// redundant channel that makes hue-dependent puzzles playable without colour
  /// vision — see `Settings.colorAssist`. Red and green sit at opposite ends of
  /// the shape list on purpose: they are the pair most often confused, so they
  /// get the two least similar outlines.
  static const inks = <PuzzleInk>[
    PuzzleInk(name: 'RED', color: Color(0xFFFF3D4E), shape: InkShape.circle),
    PuzzleInk(name: 'BLUE', color: Color(0xFF3D7BFF), shape: InkShape.square),
    PuzzleInk(name: 'GREEN', color: Color(0xFF2ED66F), shape: InkShape.triangle),
    PuzzleInk(name: 'YELLOW', color: Color(0xFFFFC53D), shape: InkShape.diamond),
    PuzzleInk(name: 'PURPLE', color: Color(0xFFA75BFF), shape: InkShape.cross),
    PuzzleInk(name: 'ORANGE', color: Color(0xFFFF8A2B), shape: InkShape.chevron),
  ];

  // ── Type ───────────────────────────────────────────────────────────────
  // Archivo for display, Instrument Sans for text, Martian Mono for anything
  // that counts. All three are bundled assets, never fetched: google_fonts
  // pulls typefaces over the network at runtime and does not reliably fall
  // back when that fails, which rendered the entire game with no text at all.
  // Every style also names a real fallback stack, so a missing asset degrades
  // to the platform font instead of to nothing.

  static const _displayFallback = ['Roboto', 'Arial', 'sans-serif'];
  static const _bodyFallback = ['Roboto', 'Helvetica', 'Arial', 'sans-serif'];
  static const _monoFallback = ['Roboto Mono', 'Courier New', 'monospace'];

  static TextStyle display(double size, {Color color = cream}) => TextStyle(
        fontFamily: 'Archivo',
        fontFamilyFallback: _displayFallback,
        fontSize: size,
        fontWeight: FontWeight.w800,
        color: color,
        height: 0.94,
        letterSpacing: -0.4,
      );

  static TextStyle body(double size,
          {Color color = cream, FontWeight weight = FontWeight.w400}) =>
      TextStyle(
        fontFamily: 'InstrumentSans',
        fontFamilyFallback: _bodyFallback,
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: 1.4,
      );

  /// Anything numeric. Tabular figures stop scores jittering as they climb.
  static TextStyle data(double size,
          {Color color = cream, FontWeight weight = FontWeight.w700}) =>
      TextStyle(
        fontFamily: 'MartianMono',
        fontFamilyFallback: _monoFallback,
        fontSize: size,
        fontWeight: weight,
        color: color,
        letterSpacing: -1.0,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  static TextStyle label(double size, {Color color = haze}) => TextStyle(
        fontFamily: 'InstrumentSans',
        fontFamilyFallback: _bodyFallback,
        fontSize: size,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: 1.6,
      );

  static ThemeData theme() => ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: ink,
        fontFamily: 'InstrumentSans',
        fontFamilyFallback: _bodyFallback,
        colorScheme: ColorScheme.fromSeed(
          seedColor: flare,
          brightness: Brightness.dark,
          surface: ink,
        ),
      );
}


/// Shapes are chosen to stay distinguishable at ~20px and at a glance: a filled
/// blob, a straight-edged blob, and three with obvious corners or strokes.
enum InkShape { circle, square, triangle, diamond, cross, chevron }

@immutable
class PuzzleInk {
  const PuzzleInk({required this.name, required this.color, required this.shape});
  final String name;
  final Color color;
  final InkShape shape;
}

/// A colour swatch that can also show its shape.
///
/// With [showShape] off this is exactly the flat swatch the game has always
/// drawn, so turning colour assist on adds a channel rather than replacing one —
/// a player who can see colour keeps using it.
class ShapeMark extends StatelessWidget {
  const ShapeMark({
    super.key,
    required this.ink,
    required this.showShape,
    this.radius = 14,
    this.filled = true,
  });

  final PuzzleInk ink;
  final bool showShape;
  final double radius;

  /// False draws the shape alone on a transparent ground, for places that
  /// already have a background of their own.
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _MarkPainter(
        ink: ink,
        showShape: showShape,
        radius: radius,
        filled: filled,
      ),
      child: const SizedBox.expand(),
    );
  }
}

class _MarkPainter extends CustomPainter {
  const _MarkPainter({
    required this.ink,
    required this.showShape,
    required this.radius,
    required this.filled,
  });

  final PuzzleInk ink;
  final bool showShape;
  final double radius;
  final bool filled;

  @override
  void paint(Canvas canvas, Size size) {
    if (filled) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)),
        Paint()..color = ink.color,
      );
    }
    if (!showShape) return;

    // Drawn in the ground colour, not white: it has to read as a cut-out in the
    // swatch rather than as a sticker on top of it.
    final paint = Paint()
      ..color = filled ? DD.ink : ink.color
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(2.0, size.shortestSide * 0.11)
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final c = size.center(Offset.zero);
    final r = size.shortestSide * 0.24;

    switch (ink.shape) {
      case InkShape.circle:
        canvas.drawCircle(c, r, paint);
      case InkShape.square:
        canvas.drawRect(Rect.fromCenter(center: c, width: r * 1.9, height: r * 1.9), paint);
      case InkShape.triangle:
        canvas.drawPath(_polygon(c, r * 1.2, 3, -math.pi / 2), paint);
      case InkShape.diamond:
        canvas.drawPath(_polygon(c, r * 1.25, 4, -math.pi / 2), paint);
      case InkShape.cross:
        canvas.drawLine(c + Offset(-r, -r), c + Offset(r, r), paint);
        canvas.drawLine(c + Offset(r, -r), c + Offset(-r, r), paint);
      case InkShape.chevron:
        canvas.drawPath(
          Path()
            ..moveTo(c.dx - r, c.dy + r * 0.5)
            ..lineTo(c.dx, c.dy - r * 0.7)
            ..lineTo(c.dx + r, c.dy + r * 0.5),
          paint,
        );
    }
  }

  Path _polygon(Offset center, double radius, int sides, double startAngle) {
    final path = Path();
    for (var i = 0; i < sides; i++) {
      final a = startAngle + i * 2 * math.pi / sides;
      final p = center + Offset(math.cos(a) * radius, math.sin(a) * radius);
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    return path..close();
  }

  @override
  bool shouldRepaint(_MarkPainter old) =>
      old.ink != ink || old.showShape != showShape || old.filled != filled;
}
