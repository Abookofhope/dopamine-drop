import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../ui/widgets/board.dart';

/// Grid of tiles, one is off. Ramps by shrinking the gap and growing the grid —
/// the two levers that make it harder without making it slower.
///
/// With colour assist the odd tile also differs in **lightness**, floored at a
/// value that stays visible. Lightness is the one channel every form of colour
/// vision deficiency can still read, including total achromatopsia, and unlike
/// a shape overlay it keeps the mode what it is: a discrimination puzzle, not a
/// find-the-different-symbol puzzle.
class OddOneOut extends PuzzleMode {
  const OddOneOut();

  @override
  String get id => 'odd';
  @override
  String get name => 'Odd One Out';
  @override
  String get blurb => 'Spot the tile that doesn’t match';
  @override
  Duration get par => const Duration(milliseconds: 2600);
  @override
  Duration get bonus => const Duration(milliseconds: 1200);

  @override
  Widget build(PuzzleContext ctx) => _OddBoard(ctx: ctx);
}

class _OddBoard extends StatefulWidget {
  const _OddBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_OddBoard> createState() => _OddBoardState();
}

class _OddBoardState extends State<_OddBoard> {
  late final int _columns;
  late final int _oddIndex;
  late final double _hue;
  late final double _delta;
  late final double _lightDelta;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _columns = (2 + ctx.level ~/ 2).clamp(2, 5);
    _delta = (52 - ctx.level * 3.4).clamp(7, 52).toDouble();
    // Floored, not ramped to nothing: past this point difficulty comes from the
    // grid growing and from time pressure, never from making the tile
    // invisible to a player who cannot use hue at all.
    _lightDelta = ctx.colorAssist
        ? (0.20 - ctx.level * 0.012).clamp(0.085, 0.20).toDouble()
        : 0.0;
    _hue = ctx.rng.nextDouble() * 360;
    _oddIndex = ctx.rng.nextInt(_columns * _columns);
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Tap the odd one out',
      child: PuzzleGrid(
        columns: _columns,
        children: List.generate(_columns * _columns, (i) {
          final odd = i == _oddIndex;
          final hue = odd ? (_hue + _delta) % 360 : _hue;
          final light = odd ? 0.58 + _lightDelta : 0.58;
          return Cell(
            semanticLabel: 'Tile ${i + 1}',
            color: HSLColor.fromAHSL(1, hue, 0.68, light).toColor(),
            onTap: i == _oddIndex ? widget.ctx.onSolved : widget.ctx.onMissed,
            child: const SizedBox.expand(),
          );
        }),
      ),
    );
  }
}
