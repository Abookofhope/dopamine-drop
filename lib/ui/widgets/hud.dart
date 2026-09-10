import 'package:flutter/material.dart';

import '../../engine/run.dart';
import '../../theme.dart';

/// Run state at a glance: what you are playing, what you have, how much is
/// left. Kept to three rows so it never competes with the board for attention.
class Hud extends StatelessWidget {
  const Hud({
    super.key,
    required this.run,
    required this.title,
    required this.onQuit,
  });

  final RunState run;
  final String title;
  final VoidCallback onQuit;

  @override
  Widget build(BuildContext context) {
    final spec = run.spec;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              onPressed: onQuit,
              icon: const Icon(Icons.close_rounded, size: 20),
              color: DD.haze,
              tooltip: 'End run',
            ),
            Expanded(child: Text(title.toUpperCase(), style: DD.label(10))),
            if (spec.scored) ...[
              _StreakChip(multiplier: run.multiplier),
              const SizedBox(width: 10),
              Text('${run.score}', style: DD.data(26)),
            ] else
              Text('${run.solved} solved', style: DD.data(16, color: DD.haze)),
          ],
        ),
        const SizedBox(height: 9),
        if (spec.timed)
          _Meter(
            fraction: spec.cap.inMilliseconds == 0
                ? 0
                : (run.remaining.inMilliseconds / spec.cap.inMilliseconds)
                    .clamp(0.0, 1.0),
            warn: run.remaining.inSeconds < 10,
          )
        else if (spec.lives > 0)
          _Lives(total: spec.lives, left: run.lives)
        else
          const SizedBox(height: 7),
      ],
    );
  }
}

class _StreakChip extends StatelessWidget {
  const _StreakChip({required this.multiplier});
  final int multiplier;

  @override
  Widget build(BuildContext context) {
    final hot = multiplier > 1;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: hot ? DD.zap : Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: hot ? DD.zap : DD.edge),
      ),
      child: Text(
        '×$multiplier',
        style: DD.data(11, color: hot ? DD.ink : DD.haze),
      ),
    );
  }
}

class _Meter extends StatelessWidget {
  const _Meter({required this.fraction, required this.warn});
  final double fraction;
  final bool warn;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: SizedBox(
        height: 7,
        child: Stack(
          children: [
            const ColoredBox(color: DD.ink3, child: SizedBox.expand()),
            FractionallySizedBox(
              widthFactor: fraction,
              child: ColoredBox(color: warn ? DD.bad : DD.cool),
            ),
          ],
        ),
      ),
    );
  }
}

class _Lives extends StatelessWidget {
  const _Lives({required this.total, required this.left});
  final int total;
  final int left;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 7,
      child: Row(
        children: [
          for (var i = 0; i < total; i++) ...[
            if (i > 0) const SizedBox(width: 5),
            Expanded(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                decoration: BoxDecoration(
                  color: i < left ? DD.flare : DD.ink3,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
