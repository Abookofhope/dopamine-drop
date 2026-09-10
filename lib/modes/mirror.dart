import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Reflect the pattern across the centre line.
///
/// Taps toggle, so there is no wrong answer to punish — like Rewire, a mistake
/// costs time rather than the streak. Spatial reasoning deserves room to think.
class Mirror extends PuzzleMode {
  const Mirror();

  @override
  String get id => 'mirror';
  @override
  String get name => 'Mirror';
  @override
  String get blurb => 'Reflect the pattern across the line';
  @override
  Duration get par => const Duration(milliseconds: 7500);
  @override
  Duration get bonus => const Duration(milliseconds: 2400);
  @override
  bool get canMiss => false;

  @override
  Widget build(PuzzleContext ctx) => _MirrorBoard(ctx: ctx);
}

class _MirrorBoard extends StatefulWidget {
  const _MirrorBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_MirrorBoard> createState() => _MirrorBoardState();
}

class _MirrorBoardState extends State<_MirrorBoard> {
  late final int _width;
  late final int _height;
  late final Set<int> _pattern; // indices in the left half
  late final Set<int> _wanted; // their reflections, in full-grid indices
  final Set<int> _placed = {};

  int _half = 0;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _half = ctx.level < 5 ? 2 : 3;
    _width = _half * 2;
    _height = _half * 2;

    final cells = _half * _height;
    final lit = (2 + ctx.level ~/ 2).clamp(2, cells - 1);
    _pattern = ctx.rng.distinct(lit, cells).toSet();
    _wanted = _pattern.map((i) {
      final x = i % _half, y = i ~/ _half;
      return y * _width + (_width - 1 - x);
    }).toSet();
  }

  void _toggle(int index) {
    setState(() {
      if (!_placed.remove(index)) _placed.add(index);
    });
    if (_placed.length == _wanted.length &&
        _placed.containsAll(_wanted)) {
      widget.ctx.onSolved();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Mirror it to the right',
      child: PuzzleGrid(
        columns: _width,
        children: [
          for (var y = 0; y < _height; y++)
            for (var x = 0; x < _width; x++) _cell(x, y),
        ],
      ),
    );
  }

  Widget _cell(int x, int y) {
    final index = y * _width + x;
    if (x < _half) {
      // The given half: shown, never editable.
      final on = _pattern.contains(y * _half + x);
      return DecoratedBox(
        decoration: BoxDecoration(
          color: on ? DD.flare : Colors.white.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(DD.rSm),
          border: Border.all(
            color: on ? DD.flare : Colors.white.withValues(alpha: 0.05),
          ),
        ),
        child: const SizedBox.expand(),
      );
    }
    final on = _placed.contains(index);
    return Cell(
      semanticLabel: 'Column ${x + 1}, row ${y + 1}${on ? ', filled' : ''}',
      color: on ? DD.cool : Colors.white.withValues(alpha: 0.03),
      border: on ? DD.cool : DD.edgeSoft,
      onTap: () => _toggle(index),
      child: const SizedBox.expand(),
    );
  }
}
