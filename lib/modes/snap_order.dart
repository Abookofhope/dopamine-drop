import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Scattered numbers, tapped 1..N ascending. Visual search plus sequencing.
class SnapOrder extends PuzzleMode {
  const SnapOrder();

  @override
  String get id => 'order';
  @override
  String get name => 'Snap Order';
  @override
  String get blurb => 'Tap the numbers in order, fast';
  @override
  Duration get par => const Duration(milliseconds: 3800);
  @override
  Duration get bonus => const Duration(milliseconds: 1500);

  @override
  Widget build(PuzzleContext ctx) => _OrderBoard(ctx: ctx);
}

class _OrderBoard extends StatefulWidget {
  const _OrderBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_OrderBoard> createState() => _OrderBoardState();
}

class _OrderBoardState extends State<_OrderBoard> {
  late final int _count;
  late final double _radius;
  late final List<Offset> _points;
  final Set<int> _done = {};
  int _next = 1;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _count = (3 + ctx.level ~/ 2).clamp(3, 8);
    _radius = _count <= 4
        ? 0.16
        : _count <= 6
            ? 0.135
            : 0.115;
    _points = _layout(ctx);
  }

  /// Rejection sampling with a relaxed fallback, so a crowded board still
  /// produces [_count] bubbles rather than silently dropping one.
  List<Offset> _layout(PuzzleContext ctx) {
    final pts = <Offset>[];
    final span = 1 - 2 * _radius;
    for (var guard = 0; guard < 3000 && pts.length < _count; guard++) {
      final p = Offset(
        _radius + ctx.rng.nextDouble() * span,
        _radius + ctx.rng.nextDouble() * span,
      );
      if (pts.every((q) => (q - p).distance > 2 * _radius + 0.015)) pts.add(p);
    }
    while (pts.length < _count) {
      pts.add(Offset(
        _radius + ctx.rng.nextDouble() * span,
        _radius + ctx.rng.nextDouble() * span,
      ));
    }
    return ctx.rng.shuffled(pts);
  }

  void _tap(int number) {
    if (number != _next) {
      widget.ctx.onMissed();
      return;
    }
    setState(() {
      _done.add(number);
      _next++;
    });
    if (_next > _count) widget.ctx.onSolved();
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Tap 1 to $_count in order',
      child: AspectRatio(
        aspectRatio: 1,
        child: LayoutBuilder(
          builder: (context, box) {
            final size = box.maxWidth;
            final d = _radius * 2 * size;
            return Stack(
              children: List.generate(_count, (i) {
                final number = i + 1;
                final done = _done.contains(number);
                return Positioned(
                  left: _points[i].dx * size - d / 2,
                  top: _points[i].dy * size - d / 2,
                  width: d,
                  height: d,
                  child: AnimatedScale(
                    scale: done ? 0.82 : 1,
                    duration: const Duration(milliseconds: 140),
                    child: AnimatedOpacity(
                      opacity: done ? 0.5 : 1,
                      duration: const Duration(milliseconds: 140),
                      child: Cell(
                        radius: d,
                        semanticLabel: 'Number $number',
                        color: done ? DD.cool : DD.ink3,
                        border: done ? DD.cool : DD.edge,
                        onTap: done ? null : () => _tap(number),
                        child: FittedBox(
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Text(
                              '$number',
                              style: DD.data(24,
                                  color: done ? DD.ink : DD.cream),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }),
            );
          },
        ),
      ),
    );
  }
}
