import 'dart:async';

import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Pads flash a sequence, the player repeats it.
///
/// The one mode that rewards sitting still. Deliberate contrast — a run made
/// entirely of reaction tests flattens out, and this is what keeps the rotation
/// feeling like variety rather than reskins.
class Echo extends PuzzleMode {
  const Echo();

  @override
  String get id => 'echo';
  @override
  String get name => 'Echo';
  @override
  String get blurb => 'Watch the flashes, repeat them back';
  @override
  Duration get par => const Duration(milliseconds: 6000);
  @override
  Duration get bonus => const Duration(milliseconds: 2400);

  @override
  Widget build(PuzzleContext ctx) => _EchoBoard(ctx: ctx);
}

class _EchoBoard extends StatefulWidget {
  const _EchoBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_EchoBoard> createState() => _EchoBoardState();
}

class _EchoBoardState extends State<_EchoBoard> {
  static const _flashOn = Duration(milliseconds: 360);
  static const _flashGap = Duration(milliseconds: 170);

  final List<Timer> _timers = [];
  late final int _columns;
  late final List<int> _sequence;
  int _lit = -1;
  int _at = 0;
  bool _accepting = false;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _columns = ctx.level < 4 ? 2 : 3;
    final length = (3 + ctx.level ~/ 2.5).clamp(3, 7).toInt();
    final cells = _columns * _columns;
    _sequence = <int>[];
    for (var i = 0; i < length; i++) {
      var v = ctx.rng.nextInt(cells);
      // No immediate repeats: two flashes on the same pad are impossible to
      // tell from one long flash.
      if (i > 0 && v == _sequence[i - 1]) v = (v + 1 + ctx.rng.nextInt(cells - 1)) % cells;
      _sequence.add(v);
    }
    _playSequence();
  }

  void _playSequence() {
    final step = _flashOn + _flashGap;
    for (var i = 0; i < _sequence.length; i++) {
      _schedule(step * i, () => setState(() => _lit = _sequence[i]));
      _schedule(step * i + _flashOn, () => setState(() => _lit = -1));
    }
    _schedule(
      step * _sequence.length + const Duration(milliseconds: 120),
      () => setState(() => _accepting = true),
    );
  }

  void _schedule(Duration delay, VoidCallback action) {
    _timers.add(Timer(delay, () {
      if (mounted) action();
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
    if (!_accepting) return;
    if (_sequence[_at] != index) {
      _accepting = false;
      widget.ctx.onMissed();
      return;
    }
    _at++;
    if (_at >= _sequence.length) {
      _accepting = false;
      widget.ctx.onSolved();
    } else {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: _accepting
          ? 'Now repeat it — ${_sequence.length} taps'
          : 'Watch…',
      child: PuzzleGrid(
        columns: _columns,
        children: List.generate(_columns * _columns, (i) {
          final lit = _lit == i;
          return Cell(
            semanticLabel: 'Pad ${i + 1}',
            color: lit ? DD.zap : DD.ink3,
            onTap: _accepting ? () => _tap(i) : null,
            child: const SizedBox.expand(),
          );
        }),
      ),
    );
  }
}
