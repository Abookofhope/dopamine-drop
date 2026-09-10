import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Slide the blockers out of the corridor so the car can leave.
///
/// Planning, like Rewire, but the constraint is different: Rewire is about
/// orientation, this is about order and space. Taps cost time, never accuracy —
/// a thinking puzzle that punishes a wrong move stops being one.
class SlidePath extends PuzzleMode {
  const SlidePath();

  @override
  String get id => 'slide';
  @override
  String get name => 'Slide Path';
  @override
  String get blurb => 'Clear the corridor so the car can leave';
  @override
  Duration get par => const Duration(milliseconds: 9000);
  @override
  Duration get bonus => const Duration(milliseconds: 2800);
  @override
  bool get canMiss => false;

  @override
  Widget build(PuzzleContext ctx) => _SlideBoard(ctx: ctx);
}

/// A two-cell vertical bar. [top] is the row of its upper cell.
class _Blocker {
  _Blocker({required this.column, required this.top});
  final int column;
  int top;
  bool covers(int row) => row == top || row == top + 1;
}

class _SlideBoard extends StatefulWidget {
  const _SlideBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_SlideBoard> createState() => _SlideBoardState();
}

class _SlideBoardState extends State<_SlideBoard> {
  late final int _size;
  late final int _carRow;
  late final List<_Blocker> _blockers;
  bool _solved = false;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _size = ctx.level < 6 ? 4 : 5;
    // Row 2 always leaves a blocker room to retreat upward, whatever the grid
    // size, so a generated board is solvable by construction rather than by a
    // search that might fail.
    _carRow = 2;

    final count = (1 + ctx.level ~/ 4).clamp(1, _size - 2);
    final columns = ctx.rng.distinct(count, _size - 2).map((c) => c + 2).toList();
    _blockers = columns
        .map((c) => _Blocker(column: c, top: ctx.rng.nextBool0() ? _carRow - 1 : _carRow))
        .toList();
  }

  bool _canMove(_Blocker b, int delta) {
    final top = b.top + delta;
    if (top < 0 || top + 1 >= _size) return false;
    return !_blockers.any((o) =>
        o != b && o.column == b.column && (o.covers(top) || o.covers(top + 1)));
  }

  void _move(_Blocker b, int delta) {
    if (_solved || !_canMove(b, delta)) return;
    setState(() => b.top += delta);
    if (!_blockers.any((o) => o.covers(_carRow))) {
      setState(() => _solved = true);
      widget.ctx.onSolved();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Tap above or below a bar to slide it',
      child: PuzzleGrid(
        columns: _size,
        children: [
          for (var y = 0; y < _size; y++)
            for (var x = 0; x < _size; x++) _cell(x, y),
        ],
      ),
    );
  }

  Widget _cell(int x, int y) {
    final blocker = _blockers.where((b) => b.column == x && b.covers(y)).firstOrNull;

    if (blocker != null) {
      // Tap the upper cell of a bar to send it up, the lower cell to send it
      // down: the half you touch is the way it goes.
      final delta = y == blocker.top ? -1 : 1;
      final blocked = !_canMove(blocker, delta);
      return Cell(
        semanticLabel: 'Bar in column ${x + 1}, tap to slide ${delta < 0 ? "up" : "down"}',
        color: blocked ? DD.ink3 : DD.haze.withValues(alpha: 0.35),
        border: DD.edge,
        onTap: () => _move(blocker, delta),
        child: Icon(
          delta < 0 ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
          size: 18,
          color: blocked ? DD.edge : DD.cream,
        ),
      );
    }

    if (y == _carRow && x <= 1) {
      return DecoratedBox(
        decoration: BoxDecoration(
          color: DD.flare,
          borderRadius: BorderRadius.horizontal(
            left: Radius.circular(x == 0 ? DD.rSm : 0),
            right: Radius.circular(x == 1 ? DD.rSm : 0),
          ),
        ),
        child: const SizedBox.expand(),
      );
    }

    final corridor = y == _carRow;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: corridor
            ? DD.cool.withValues(alpha: _solved ? 0.3 : 0.08)
            : Colors.white.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(DD.rSm),
        border: Border.all(
          color: corridor ? DD.cool.withValues(alpha: 0.3) : Colors.transparent,
        ),
      ),
      child: const SizedBox.expand(),
    );
  }
}
