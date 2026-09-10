import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Find two numbers that hit the target. A guaranteed pair always exists, and
/// any valid pair is accepted — there is no single "intended" answer to miss.
class SumSnap extends PuzzleMode {
  const SumSnap();

  @override
  String get id => 'sum';
  @override
  String get name => 'Sum Snap';
  @override
  String get blurb => 'Find two numbers that hit the target';
  @override
  Duration get par => const Duration(milliseconds: 5000);
  @override
  Duration get bonus => const Duration(milliseconds: 1800);

  @override
  Widget build(PuzzleContext ctx) => _SumBoard(ctx: ctx);
}

class _SumBoard extends StatefulWidget {
  const _SumBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_SumBoard> createState() => _SumBoardState();
}

class _SumBoardState extends State<_SumBoard> {
  late final int _columns;
  late final List<int> _values;
  late final int _target;
  int? _selected;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _columns = ctx.level < 4 ? 3 : 4;
    final max = (6 + (ctx.level * 1.6).clamp(0, 14)).round();
    final cells = _columns * _columns;
    _values = List.generate(cells, (_) => 1 + ctx.rng.nextInt(max));
    final pair = ctx.rng.distinct(2, cells);
    _target = _values[pair[0]] + _values[pair[1]];
  }

  void _tap(int index) {
    final selected = _selected;
    if (selected == index) {
      setState(() => _selected = null);
      return;
    }
    if (selected == null) {
      setState(() => _selected = index);
      return;
    }
    if (_values[selected] + _values[index] == _target) {
      setState(() => _selected = null);
      widget.ctx.onSolved();
    } else {
      setState(() => _selected = null);
      widget.ctx.onMissed();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Tap two that add to $_target',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('TARGET', style: DD.label(10)),
              const SizedBox(width: 9),
              Text('$_target', style: DD.data(32, color: DD.zap)),
            ],
          ),
          const SizedBox(height: 12),
          Flexible(
            child: PuzzleGrid(
              columns: _columns,
              children: List.generate(_values.length, (i) {
                final picked = _selected == i;
                return Cell(
                  semanticLabel: '${_values[i]}',
                  color: picked ? DD.flare : DD.ink3,
                  border: picked ? DD.flare : null,
                  onTap: () => _tap(i),
                  child: FittedBox(
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(
                        '${_values[i]}',
                        style: DD.data(22, color: picked ? DD.ink : DD.cream),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}
