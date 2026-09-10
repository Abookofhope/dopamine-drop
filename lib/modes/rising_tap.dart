import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Targets appear and shrink. Tap them before they vanish.
///
/// The only mode with a clock of its own, and the only one where doing nothing
/// is a mistake — everything else waits patiently for an answer.
class RisingTap extends PuzzleMode {
  const RisingTap();

  @override
  String get id => 'rising';
  @override
  String get name => 'Rising Tap';
  @override
  String get blurb => 'Catch the targets before they vanish';
  @override
  Duration get par => const Duration(milliseconds: 5200);
  @override
  Duration get bonus => const Duration(milliseconds: 1800);

  @override
  Widget build(PuzzleContext ctx) => _RisingBoard(ctx: ctx);
}

class _Target {
  _Target(this.id, this.x, this.y, this.bornAt);
  final int id;
  final double x, y;

  /// Elapsed time on the board's own Ticker, not a wall clock.
  ///
  /// A frame-synced clock is both more correct — a shrink animation should
  /// advance with frames, not with however long the last frame happened to
  /// take — and the only way this mode is testable: DateTime.now() cannot be
  /// advanced by a test, so its rendering was unreproducible.
  final Duration bornAt;

  bool caught = false;
}

class _RisingBoard extends StatefulWidget {
  const _RisingBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_RisingBoard> createState() => _RisingBoardState();
}

class _RisingBoardState extends State<_RisingBoard>
    with SingleTickerProviderStateMixin {
  static const _radius = 0.11;

  late final Ticker _ticker;
  late final int _needed;
  late final Duration _life;
  late final Duration _spawnEvery;

  final List<_Target> _targets = [];
  Duration _elapsed = Duration.zero;
  Timer? _spawner;
  int _caught = 0;
  int _nextId = 0;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    final level = widget.ctx.level;
    _needed = (3 + level ~/ 3).clamp(3, 7);
    // Both tighten with level: less time on screen, less time between.
    _life = Duration(milliseconds: (1500 - level * 55).clamp(700, 1500).round());
    _spawnEvery =
        Duration(milliseconds: (850 - level * 30).clamp(420, 850).round());

    _spawn();
    _spawner = Timer.periodic(_spawnEvery, (_) => _spawn());
    _ticker = createTicker(_sweep)..start();
  }

  @override
  void dispose() {
    _spawner?.cancel();
    _ticker.dispose();
    super.dispose();
  }

  void _spawn() {
    if (!mounted || _done) return;
    final rng = widget.ctx.rng;
    final live = _targets.where((t) => !t.caught).toList();

    // Never on top of a target that is already on screen: overlapping circles
    // make a tap ambiguous, and two at the same spot read as one blob rather
    // than as two things to catch.
    var x = 0.0, y = 0.0;
    for (var attempt = 0; attempt < 40; attempt++) {
      x = _radius + rng.nextDouble() * (1 - 2 * _radius);
      y = _radius + rng.nextDouble() * (1 - 2 * _radius);
      final clear = live.every((t) =>
          (Offset(t.x, t.y) - Offset(x, y)).distance > _radius * 2.2);
      if (clear) break;
    }

    setState(() => _targets.add(_Target(_nextId++, x, y, _elapsed)));
  }

  /// A target that shrinks to nothing is a miss — that is the whole tension.
  void _sweep(Duration elapsed) {
    if (!mounted || _done) return;
    _elapsed = elapsed;
    final expired = _targets
        .where((t) => !t.caught && elapsed - t.bornAt >= _life)
        .toList();
    if (expired.isEmpty) {
      setState(() {});
      return;
    }
    _done = true;
    _ticker.stop();
    _spawner?.cancel();
    widget.ctx.onMissed();
  }

  void _tap(_Target target) {
    if (_done || target.caught) return;
    setState(() {
      target.caught = true;
      _caught++;
    });
    if (_caught >= _needed) {
      _done = true;
      _ticker.stop();
      _spawner?.cancel();
      widget.ctx.onSolved();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Catch $_needed — ${_needed - _caught} to go',
      child: AspectRatio(
        aspectRatio: 1,
        child: LayoutBuilder(
          builder: (context, box) {
            final side = box.maxWidth;
            return Stack(
              children: [
                for (final t in _targets)
                  if (!t.caught)
                    Builder(builder: (context) {
                      final age = (_elapsed - t.bornAt).inMilliseconds /
                          _life.inMilliseconds;
                      final scale = (1 - age).clamp(0.0, 1.0);
                      final d = _radius * 2 * side;
                      return Positioned(
                        left: t.x * side - d / 2,
                        top: t.y * side - d / 2,
                        width: d,
                        height: d,
                        child: Transform.scale(
                          scale: scale,
                          child: Cell(
                            radius: d,
                            semanticLabel: 'Target',
                            color: DD.flare,
                            border: DD.zap,
                            onTap: () => _tap(t),
                            child: const SizedBox.expand(),
                          ),
                        ),
                      );
                    }),
              ],
            );
          },
        ),
      ),
    );
  }
}
