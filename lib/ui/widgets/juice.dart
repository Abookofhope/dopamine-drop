import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import '../../theme.dart';

/// Burst particles and screen shake — the two effects that carry most of the
/// "that felt good" in the web prototype.
///
/// Both are drawn by one painter over the play surface rather than by spawning
/// widgets, so a fast streak cannot pile up dozens of AnimatedContainers.
/// Everything honours `prefers-reduced-motion` through
/// [MediaQuery.disableAnimationsOf].
class Spark {
  Spark({
    required this.origin,
    required this.angle,
    required this.distance,
    required this.color,
    required this.bornAt,
  });

  final Offset origin;
  final double angle;
  final double distance;
  final Color color;
  final Duration bornAt;
}

class JuiceOverlay extends StatefulWidget {
  const JuiceOverlay({
    super.key,
    required this.controller,
    required this.child,
    this.reduceMotion = false,
  });

  final JuiceController controller;
  final Widget child;

  /// The player's own switch. It can only ever add to the platform setting —
  /// a system asking for less motion always wins.
  final bool reduceMotion;

  @override
  State<JuiceOverlay> createState() => _JuiceOverlayState();
}

class JuiceController extends ChangeNotifier {
  final List<Spark> sparks = [];
  Duration shakeStartedAt = Duration.zero;
  bool shaking = false;

  /// Set by the overlay each frame so effects can age without their own clocks.
  Duration now = Duration.zero;

  void burst(Offset origin, {Color color = DD.cool, int count = 12}) {
    for (var i = 0; i < count; i++) {
      final angle = (i / count) * math.pi * 2 + math.Random().nextDouble() * 0.5;
      sparks.add(Spark(
        origin: origin,
        angle: angle,
        distance: 34 + math.Random().nextDouble() * 46,
        color: color,
        bornAt: now,
      ));
    }
    notifyListeners();
  }

  void shake() {
    shaking = true;
    shakeStartedAt = now;
    notifyListeners();
  }

  bool get idle => sparks.isEmpty && !shaking;
}

class _JuiceOverlayState extends State<JuiceOverlay>
    with SingleTickerProviderStateMixin {
  static const _sparkLife = Duration(milliseconds: 560);
  static const _shakeLife = Duration(milliseconds: 340);

  /// A bare Ticker, not an AnimationController: this is a free-running clock
  /// with no start, end or curve, and an unbounded controller cannot `repeat()`
  /// without tripping an assertion on its lower bound.
  late final Ticker _clock;

  @override
  void initState() {
    super.initState();
    _clock = createTicker(_frame);
    widget.controller.addListener(_wake);
  }

  /// Only runs while there is something to draw. An idle play surface costs no
  /// frames at all, which matters on the cheap phones this game is aimed at.
  void _wake() {
    if (!_clock.isActive) _clock.start();
  }

  void _frame(Duration elapsed) {
    final c = widget.controller;
    c.now = elapsed;
    c.sparks.removeWhere((s) => c.now - s.bornAt > _sparkLife);
    if (c.shaking && c.now - c.shakeStartedAt > _shakeLife) c.shaking = false;
    if (c.idle) _clock.stop();
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.controller.removeListener(_wake);
    _clock.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced =
        widget.reduceMotion || MediaQuery.disableAnimationsOf(context);
    final c = widget.controller;

    var offset = Offset.zero;
    if (c.shaking && !reduced) {
      final t = ((c.now - c.shakeStartedAt).inMilliseconds /
              _shakeLife.inMilliseconds)
          .clamp(0.0, 1.0);
      // Decaying oscillation: hard first kick, settles rather than stopping dead.
      final amplitude = 9 * (1 - t);
      offset = Offset(math.sin(t * math.pi * 7) * amplitude, 0);
    }

    return Transform.translate(
      offset: offset,
      child: Stack(
        fit: StackFit.expand,
        children: [
          widget.child,
          if (!reduced && c.sparks.isNotEmpty)
            IgnorePointer(
              child: CustomPaint(
                painter: _SparkPainter(
                  sparks: List.of(c.sparks),
                  now: c.now,
                  life: _sparkLife,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SparkPainter extends CustomPainter {
  const _SparkPainter({
    required this.sparks,
    required this.now,
    required this.life,
  });

  final List<Spark> sparks;
  final Duration now;
  final Duration life;

  @override
  void paint(Canvas canvas, Size size) {
    for (final spark in sparks) {
      final t = ((now - spark.bornAt).inMilliseconds / life.inMilliseconds)
          .clamp(0.0, 1.0);
      // Ease out: fast away from the tap, then drifting as it fades.
      final eased = 1 - math.pow(1 - t, 3).toDouble();
      final at = spark.origin +
          Offset(math.cos(spark.angle), math.sin(spark.angle)) *
              (spark.distance * eased);
      final side = 7 * (1 - t * 0.8);
      final paint = Paint()..color = spark.color.withValues(alpha: 1 - t);

      canvas.save();
      canvas.translate(at.dx, at.dy);
      canvas.rotate(t * math.pi);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset.zero, width: side, height: side),
          const Radius.circular(2),
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_SparkPainter old) => true;
}

/// The "+120" that floats off a solved puzzle.
class ScorePop extends StatelessWidget {
  const ScorePop({super.key, required this.text, required this.progress});

  final String text;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final rise = -52 * Curves.easeOutCubic.transform(progress);
    final fade = progress < 0.2
        ? progress / 0.2
        : 1 - ((progress - 0.2) / 0.8).clamp(0.0, 1.0);
    return Transform.translate(
      offset: Offset(0, rise),
      child: Opacity(
        opacity: fade.clamp(0.0, 1.0),
        child: Text(
          text,
          style: DD.data(19, color: DD.zap).copyWith(
            shadows: const [Shadow(color: Colors.black, blurRadius: 10)],
          ),
        ),
      ),
    );
  }
}
