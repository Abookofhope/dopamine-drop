import 'package:flutter/material.dart';

import '../engine/progression.dart';
import '../engine/registry.dart';
import '../engine/run.dart';
import '../theme.dart';

class GameOverSheet extends StatelessWidget {
  const GameOverSheet({
    super.key,
    required this.run,
    required this.personalBest,
    required this.target,
    required this.title,
    required this.levelBefore,
    required this.levelAfter,
    required this.onAgain,
    required this.onHome,
  });

  final RunState run;
  final bool personalBest;
  final int target;
  final String title;
  final int levelBefore;
  final int levelAfter;
  final VoidCallback onAgain;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    final scored = run.spec.scored;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title.toUpperCase(), style: DD.label(10)),
          Text('${scored ? run.score : run.solved}', style: DD.data(64)),
          if (personalBest) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
              decoration: BoxDecoration(
                color: DD.zap,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text('NEW PERSONAL BEST',
                  style: DD.label(10, color: DD.ink)),
            ),
          ],
          const SizedBox(height: 16),
          _XpStrip(
            gained: run.xpEarned,
            levelBefore: levelBefore,
            levelAfter: levelAfter,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _Stat(value: '${run.solved}', label: 'Solved'),
              const SizedBox(width: 8),
              _Stat(value: '${run.bestStreak}', label: 'Best streak'),
              const SizedBox(width: 8),
              _Stat(
                value: run.solved + run.missed == 0
                    ? '—'
                    : '${run.accuracyPercent}%',
                label: 'Accuracy',
              ),
            ],
          ),
          const SizedBox(height: 18),
          _PrimaryButton(
            title: 'Go again',
            subtitle: scored
                ? (personalBest ? 'Can you do it twice?' : 'Beat $target')
                : 'Another round',
            onTap: onAgain,
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onHome,
              style: OutlinedButton.styleFrom(
                foregroundColor: DD.cream,
                side: const BorderSide(color: DD.edge),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(DD.rMd),
                ),
              ),
              child: Text('Back to menu', style: DD.body(14)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(DD.rMd),
          border: Border.all(color: DD.edgeSoft),
        ),
        child: Column(
          children: [
            Text(value, style: DD.data(17)),
            const SizedBox(height: 2),
            Text(label.toUpperCase(),
                textAlign: TextAlign.center, style: DD.label(9)),
          ],
        ),
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [DD.flare, DD.flareDeep],
          ),
          borderRadius: BorderRadius.circular(DD.rLg),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title.toUpperCase(),
                      style: DD.display(22, color: const Color(0xFF1A0A04))),
                  Text(subtitle,
                      style: DD.body(11.5,
                          color: const Color(0xFF1A0A04), weight: FontWeight.w600)),
                ],
              ),
            ),
            const Icon(Icons.refresh_rounded, color: Color(0xFF1A0A04)),
          ],
        ),
      ),
    );
  }
}


/// XP earned, and the unlock it moved toward. This is the screen people see
/// most often, so it is where the ladder has to be legible — a level-up that
/// happens silently in a stats table motivates nobody.
class _XpStrip extends StatelessWidget {
  const _XpStrip({
    required this.gained,
    required this.levelBefore,
    required this.levelAfter,
  });

  final int gained;
  final int levelBefore;
  final int levelAfter;

  @override
  Widget build(BuildContext context) {
    final leveled = levelAfter > levelBefore;
    final unlocked = realRungs
        .where((u) => u.level > levelBefore && u.level <= levelAfter)
        .toList();
    final next = nextUnlock(levelAfter);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(
        color: leveled ? DD.zap.withValues(alpha: 0.1) : DD.ink3,
        borderRadius: BorderRadius.circular(DD.rMd),
        border: Border.all(color: leveled ? DD.zap : DD.edgeSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('+$gained XP', style: DD.data(15, color: DD.zap)),
              const Spacer(),
              Text(
                'LEVEL $levelAfter',
                style: DD.label(10, color: leveled ? DD.zap : DD.haze),
              ),
            ],
          ),
          if (unlocked.isNotEmpty) ...[
            const SizedBox(height: 6),
            for (final u in unlocked)
              Text(
                'Unlocked: ${unlockName(u)}',
                style: DD.body(12, color: DD.cream, weight: FontWeight.w600),
              ),
          ] else if (next != null) ...[
            const SizedBox(height: 5),
            Text(
              '${next.level - levelAfter} levels to ${unlockName(next)}'
              '${next.isPlanned ? ' (upcoming update)' : ''}',
              style: DD.body(11.5, color: DD.haze),
            ),
          ],
        ],
      ),
    );
  }
}
