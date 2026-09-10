import 'dart:async';

import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// A pattern flashes once, then you rebuild it.
///
/// Spatial working memory, where Echo is sequential — the two feel completely
/// different to play despite both being "remember the lights".
class Blink extends PuzzleMode {
  const Blink();

  @override
  String get id => 'blink';
  @override
  String get name => 'Blink';
  @override
  String get blurb => 'Rebuild the pattern you just saw';
  @override
  Duration get par => const Duration(milliseconds: 5000);
  @override
  Duration get bonus => const Duration(milliseconds: 2000);

  @override
  Widget build(PuzzleContext ctx) => _BlinkBoard(ctx: ctx);
}

class _BlinkBoard extends StatefulWidget {
  const _BlinkBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_BlinkBoard> createState() => _BlinkBoardState();
}

class _BlinkBoardState extends State<_BlinkBoard> {
  final List<Timer> _timers = [];
  late final int _size;
  late final Set<int> _pattern;
  final Set<int> _found = {};
  bool _showing = true;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _size = ctx.level < 5 ? 3 : 4;
    final count = (3 + ctx.level ~/ 3).clamp(3, _size * _size - 2);
    _pattern = ctx.rng.distinct(count, _size * _size).toSet();

    // Long enough to take in, short enough that nobody counts it out loud.
    final look = Duration(milliseconds: 700 + count * 110);
    _timers.add(Timer(look, () {
      if (mounted) setState(() => _showing = false);
    }));
  }

  @override
  void dispose() {
    for (final t in _timers) {
      t.cancel();
    }
    super.dispose();
  }

  void _tap(int index) {
    if (_showing || _found.contains(index)) return;
    if (!_pattern.contains(index)) {
      widget.ctx.onMissed();
      return;
    }
    setState(() => _found.add(index));
    if (_found.length == _pattern.length) widget.ctx.onSolved();
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: _showing
          ? 'Remember these…'
          : 'Tap the ${_pattern.length} you saw',
      child: PuzzleGrid(
        columns: _size,
        children: List.generate(_size * _size, (i) {
          final lit = _showing && _pattern.contains(i);
          final found = _found.contains(i);
          return Cell(
            semanticLabel: 'Cell ${i + 1}',
            color: lit
                ? DD.zap
                : found
                    ? DD.cool
                    : DD.ink3,
            onTap: _showing ? null : () => _tap(i),
            child: const SizedBox.expand(),
          );
        }),
      ),
    );
  }
}
