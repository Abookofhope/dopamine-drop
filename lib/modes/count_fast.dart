import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// How many of the target colour are in the field? Four answers.
///
/// A counting axis nothing else in the roster touches — the other modes reward
/// recognition or memory, this one rewards enumeration under time pressure.
class CountFast extends PuzzleMode {
  const CountFast();

  @override
  String get id => 'count';
  @override
  String get name => 'Count Fast';
  @override
  String get blurb => 'Count the target colour before the clock does';
  @override
  Duration get par => const Duration(milliseconds: 4200);
  @override
  Duration get bonus => const Duration(milliseconds: 1600);

  @override
  Widget build(PuzzleContext ctx) => _CountBoard(ctx: ctx);
}

class _Dot {
  const _Dot(this.x, this.y, this.size, this.ink, this.isTarget);
  final double x, y, size;
  final PuzzleInk ink;
  final bool isTarget;
}

class _CountBoard extends StatefulWidget {
  const _CountBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_CountBoard> createState() => _CountBoardState();
}

class _CountBoardState extends State<_CountBoard> {
  late final List<_Dot> _dots;
  late final PuzzleInk _target;
  late final int _answer;
  late final List<int> _options;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    final palette = ctx.rng.shuffled(DD.inks).take(3).toList();
    _target = palette.first;

    final total = (10 + ctx.level * 1.4).clamp(10, 26).round();
    _answer = 3 + ctx.rng.nextInt((4 + ctx.level ~/ 3).clamp(4, 8));

    final dots = <_Dot>[];
    for (var i = 0; i < total; i++) {
      final isTarget = i < _answer;
      final ink = isTarget ? _target : palette[1 + ctx.rng.nextInt(2)];
      final size = 0.09 + ctx.rng.nextDouble() * 0.035;

      // Dots must not overlap. Two of the target colour merging into one blob
      // makes the right answer genuinely unknowable, which turns a counting
      // puzzle into a guess.
      var x = 0.0, y = 0.0;
      for (var attempt = 0; attempt < 60; attempt++) {
        x = size / 2 + ctx.rng.nextDouble() * (1 - size);
        y = size / 2 + ctx.rng.nextDouble() * (1 - size);
        final clear = dots.every((d) =>
            (Offset(d.x, d.y) - Offset(x, y)).distance >
            (d.size + size) / 2 + 0.012);
        if (clear) break;
      }
      dots.add(_Dot(x, y, size, ink, isTarget));
    }
    _dots = ctx.rng.shuffled(dots);

    // Neighbours, not random numbers: a wrong answer should cost a real count,
    // not be eliminated at a glance.
    final near = <int>{_answer};
    for (var d = 1; near.length < 4; d++) {
      if (_answer - d >= 1) near.add(_answer - d);
      if (near.length < 4) near.add(_answer + d);
    }
    _options = ctx.rng.shuffled(near.toList());
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      // Names the shape too, so the question is answerable without colour.
      prompt: widget.ctx.colorAssist
          ? 'How many ${_shapeWord(_target.shape)}?'
          : 'How many ${_target.name.toLowerCase()}?',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: AspectRatio(
              aspectRatio: 1,
              child: LayoutBuilder(
                builder: (context, box) {
                  final side = box.maxWidth;
                  return Stack(
                    children: [
                      for (final dot in _dots)
                        Positioned(
                          left: (dot.x - dot.size / 2) * side,
                          top: (dot.y - dot.size / 2) * side,
                          width: dot.size * side,
                          height: dot.size * side,
                          child: widget.ctx.colorAssist
                              ? ShapeMark(
                                  ink: dot.ink,
                                  showShape: true,
                                  radius: dot.size * side / 2,
                                )
                              : DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: dot.ink.color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final option in _options) ...[
                if (option != _options.first) const SizedBox(width: 8),
                SizedBox(
                  width: 58,
                  height: 52,
                  child: Cell(
                    radius: DD.rMd,
                    semanticLabel: '$option',
                    color: DD.ink3,
                    border: DD.edge,
                    onTap: option == _answer
                        ? widget.ctx.onSolved
                        : widget.ctx.onMissed,
                    child: Text('$option', style: DD.data(19)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

String _shapeWord(InkShape shape) => switch (shape) {
      InkShape.circle => 'circles',
      InkShape.square => 'squares',
      InkShape.triangle => 'triangles',
      InkShape.diamond => 'diamonds',
      InkShape.cross => 'crosses',
      InkShape.chevron => 'arrows',
    };
