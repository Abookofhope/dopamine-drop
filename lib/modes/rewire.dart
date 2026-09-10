import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Rotate pipe tiles until current flows from source to sink.
///
/// The only mode with no wrong answer: a bad rotation costs time, not accuracy.
/// That is deliberate texture — a run where every mode punishes mistakes the
/// same way gets tiring, and this one lets a player who is behind keep working
/// rather than bleed penalties.
class Rewire extends PuzzleMode {
  const Rewire();

  @override
  String get id => 'rewire';
  @override
  String get name => 'Rewire';
  @override
  String get blurb => 'Rotate the pipes until current flows';
  @override
  Duration get par => const Duration(milliseconds: 8000);
  @override
  Duration get bonus => const Duration(milliseconds: 2600);
  @override
  bool get canMiss => false;

  @override
  Widget build(PuzzleContext ctx) => _RewireBoard(ctx: ctx);
}

/// Openings are a bitmask: N=1, E=2, S=4, W=8. Rotating a piece 90° clockwise
/// is a one-bit rotate-left, which keeps the mask and the on-screen rotation in
/// step without a lookup table of piece shapes.
const _dirs = <({int bit, int dx, int dy, int opposite})>[
  (bit: 1, dx: 0, dy: -1, opposite: 4),
  (bit: 2, dx: 1, dy: 0, opposite: 8),
  (bit: 4, dx: 0, dy: 1, opposite: 1),
  (bit: 8, dx: -1, dy: 0, opposite: 2),
];

int rotateMask(int mask, int turns) {
  var v = mask;
  for (var i = 0; i < turns % 4; i++) {
    v = ((v << 1) | (v >> 3)) & 15;
  }
  return v;
}

class _Tile {
  _Tile({required this.x, required this.y, required this.base});
  final int x;
  final int y;
  final int base;
  int turns = 0;
  int get mask => rotateMask(base, turns);
  bool get isEndCap => base == 1 || base == 2 || base == 4 || base == 8;
}

class _RewireBoard extends StatefulWidget {
  const _RewireBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_RewireBoard> createState() => _RewireBoardState();
}

class _RewireBoardState extends State<_RewireBoard> {
  late final int _size;
  late final Map<String, _Tile> _tiles;
  late final String _sourceKey;
  late final String _sinkKey;
  Set<String> _powered = {};

  static String _key(int x, int y) => '$x,$y';

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    _size = ctx.level < 5 ? 3 : 4;
    final minLength = (3 + ctx.level ~/ 2).clamp(3, _size * _size - 1);
    final path = _generatePath(minLength);

    _tiles = {};
    for (var i = 0; i < path.length; i++) {
      final p = path[i];
      var mask = 0;
      for (final nb in [
        if (i > 0) path[i - 1],
        if (i < path.length - 1) path[i + 1],
      ]) {
        for (final d in _dirs) {
          if (p.$1 + d.dx == nb.$1 && p.$2 + d.dy == nb.$2) mask |= d.bit;
        }
      }
      _tiles[_key(p.$1, p.$2)] = _Tile(x: p.$1, y: p.$2, base: mask);
    }
    _sourceKey = _key(path.first.$1, path.first.$2);
    _sinkKey = _key(path.last.$1, path.last.$2);

    _scramble();
    _powered = _trace();
  }

  /// Self-avoiding walk from the left edge to the right edge. Falls back to a
  /// straight run so a bad seed can never hand the player an empty board.
  List<(int, int)> _generatePath(int minLength) {
    final rng = widget.ctx.rng;
    for (var attempt = 0; attempt < 400; attempt++) {
      final path = <(int, int)>[(0, rng.nextInt(_size))];
      final seen = <String>{_key(path.first.$1, path.first.$2)};
      for (var step = 0; step < _size * _size * 4; step++) {
        final cur = path.last;
        final options = rng
            .shuffled(_dirs)
            .map((d) => (cur.$1 + d.dx, cur.$2 + d.dy))
            .where((p) =>
                p.$1 >= 0 &&
                p.$2 >= 0 &&
                p.$1 < _size &&
                p.$2 < _size &&
                !seen.contains(_key(p.$1, p.$2)))
            .toList();
        if (options.isEmpty) break;
        final next = options.first;
        seen.add(_key(next.$1, next.$2));
        path.add(next);
        if (next.$1 == _size - 1 && path.length >= minLength) return path;
      }
    }
    final mid = _size ~/ 2;
    return List.generate(_size, (x) => (x, mid));
  }

  void _scramble() {
    final rng = widget.ctx.rng;
    for (final tile in _tiles.values) {
      tile.turns = rng.nextInt(4);
    }
    // A board that starts solved is a free point, not a puzzle.
    var guard = 0;
    while (_isSolved() && guard++ < 40) {
      final tiles = _tiles.values.toList();
      tiles[rng.nextInt(tiles.length)].turns += 1 + rng.nextInt(3);
    }
  }

  /// Flood fill from the source across mutually-open edges.
  Set<String> _trace() {
    final seen = <String>{_sourceKey};
    final stack = <String>[_sourceKey];
    while (stack.isNotEmpty) {
      final tile = _tiles[stack.removeLast()]!;
      for (final d in _dirs) {
        if (tile.mask & d.bit == 0) continue;
        final nk = _key(tile.x + d.dx, tile.y + d.dy);
        final next = _tiles[nk];
        if (next == null || seen.contains(nk)) continue;
        if (next.mask & d.opposite != 0) {
          seen.add(nk);
          stack.add(nk);
        }
      }
    }
    return seen;
  }

  bool _isSolved() => _trace().contains(_sinkKey);

  void _rotate(_Tile tile) {
    setState(() {
      tile.turns++;
      _powered = _trace();
    });
    if (_powered.contains(_sinkKey)) widget.ctx.onSolved();
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Connect orange to teal',
      child: PuzzleGrid(
        columns: _size,
        children: [
          for (var y = 0; y < _size; y++)
            for (var x = 0; x < _size; x++) _cell(_key(x, y)),
        ],
      ),
    );
  }

  Widget _cell(String key) {
    final tile = _tiles[key];
    if (tile == null) return const SizedBox.shrink();

    final isSource = key == _sourceKey;
    final isSink = key == _sinkKey;
    final live = _powered.contains(key);
    final wire = isSource
        ? DD.flare
        : isSink
            ? DD.cool
            : live
                ? DD.cool
                : DD.haze;

    return Cell(
      semanticLabel: isSource
          ? 'Power source, tap to rotate'
          : isSink
              ? 'Target, tap to rotate'
              : 'Pipe, tap to rotate',
      color: isSource
          ? DD.flare.withValues(alpha: 0.08)
          : isSink
              ? DD.cool.withValues(alpha: 0.08)
              : Colors.white.withValues(alpha: 0.03),
      border: isSource
          ? DD.flare.withValues(alpha: 0.27)
          : isSink
              ? DD.cool.withValues(alpha: 0.27)
              : Colors.white.withValues(alpha: 0.05),
      onTap: () => _rotate(tile),
      child: AnimatedRotation(
        turns: tile.turns / 4,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        child: CustomPaint(
          painter: _PipePainter(mask: tile.base, color: wire, cap: tile.isEndCap),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

class _PipePainter extends CustomPainter {
  const _PipePainter({required this.mask, required this.color, required this.cap});

  final int mask;
  final Color color;
  final bool cap;

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..color = color
      ..strokeWidth = size.width * 0.11
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    if (mask & 1 != 0) canvas.drawLine(c, Offset(c.dx, 0), paint);
    if (mask & 2 != 0) canvas.drawLine(c, Offset(size.width, c.dy), paint);
    if (mask & 4 != 0) canvas.drawLine(c, Offset(c.dx, size.height), paint);
    if (mask & 8 != 0) canvas.drawLine(c, Offset(0, c.dy), paint);
    // A ring marks the two ends of the run, so the player can see at a glance
    // which tile is the source and which is the target.
    if (cap) canvas.drawCircle(c, size.width * 0.14, paint);
  }

  @override
  bool shouldRepaint(_PipePainter old) =>
      old.mask != mask || old.color != color || old.cap != cap;
}
