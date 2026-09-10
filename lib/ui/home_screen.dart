import 'package:flutter/material.dart';

import '../engine/feedback.dart';
import '../engine/progression.dart';
import '../engine/registry.dart';
import '../engine/settings.dart';
import '../engine/rng.dart';
import '../engine/run.dart';
import '../engine/store.dart';
import '../money/ads.dart';
import '../money/billing.dart';
import '../theme.dart';
import '../version.dart';
import 'game_over_screen.dart';
import 'play_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.store,
    required this.settings,
    required this.feedback,
    required this.ads,
    required this.billing,
  });

  final Store store;
  final Settings settings;
  final GameFeedback feedback;
  final Ads ads;
  final Billing billing;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final AdPacing _pacing = AdPacing();

  Future<void> _start(RunKind kind, {String? modeId}) async {
    final result = await Navigator.of(context).push<RunResult>(
      MaterialPageRoute(
        builder: (_) => PlayScreen(
          kind: kind,
          modeId: modeId,
          store: widget.store,
          settings: widget.settings,
          feedback: widget.feedback,
          ads: widget.ads,
        ),
      ),
    );
    if (!mounted) return;
    setState(() {}); // Personal bests on this screen may have moved.
    if (result == null) return;
    if (result.leveledUp) widget.feedback.levelUp();

    final target = switch (kind) {
      RunKind.blitz => widget.store.bestBlitz,
      RunKind.marathon => widget.store.bestMarathon(modeId ?? ''),
      RunKind.daily => widget.store.bestDaily(todayKey()),
      RunKind.fidget => 0,
    };

    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: DD.ink2,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) => GameOverSheet(
        run: result.run,
        personalBest: result.personalBest,
        target: target,
        levelBefore: result.levelBefore,
        levelAfter: result.levelAfter,
        title: modeId != null
            ? '${modeById(modeId).name} · ${result.run.spec.label}'
            : result.run.spec.label,
        onAgain: () {
          Navigator.of(sheetContext).pop();
          _start(kind, modeId: modeId);
        },
        onHome: () => Navigator.of(sheetContext).pop(),
      ),
    );

    // After the sheet, never during a run and never instead of the result.
    // The pacing rules decide; this call site only asks.
    _pacing.onRunFinished();
    if (!mounted) return;
    if (widget.ads.interstitialReady && _pacing.mayShowInterstitial()) {
      final shown = await widget.ads.showInterstitial();
      if (shown) _pacing.onAdShown();
    }
  }

  Future<void> _buyRemoveAds() async {
    final bought = await widget.billing.buy(Product.removeAds);
    if (!bought || !mounted) return;
    await widget.store.setAdsRemoved(true);
    if (mounted) setState(() {});
  }

  Future<void> _restore() async {
    await widget.billing.restore();
    if (!mounted) return;
    final owned = widget.billing.owns(Product.removeAds);
    await widget.store.setAdsRemoved(owned);
    if (!mounted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      backgroundColor: DD.ink2,
      content: Text(
        owned ? 'Purchases restored.' : 'Nothing to restore on this account.',
        style: DD.body(13),
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final level = Progression.levelForXp(store.xp);
    final dailyBest = store.bestDaily(todayKey());

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text('DOPAMINE ', style: DD.display(15)),
                      Text('DROP', style: DD.display(15, color: DD.flare)),
                      const Spacer(),
                      IconButton(
                        onPressed: () async {
                          await Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => SettingsScreen(
                              settings: widget.settings,
                              store: widget.store,
                            ),
                          ));
                          if (mounted) setState(() {});
                        },
                        color: DD.haze,
                        icon: const Icon(Icons.tune_rounded),
                        tooltip: 'Settings',
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Six games.', style: DD.display(46)),
                  Text('One tap.', style: DD.display(46, color: DD.flare)),
                  const SizedBox(height: 10),
                  Text(
                    'Twelve bite-size brain snacks on shuffle. The puzzle '
                    'switches every round, so your brain never gets a chance '
                    'to wander off.',
                    style: DD.body(14.5, color: DD.haze),
                  ),
                  const SizedBox(height: 14),
                  _LevelBar(xp: store.xp),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _Pb(value: '${store.bestBlitz}', label: 'Best blitz'),
                      const SizedBox(width: 8),
                      _Pb(value: '${store.bestStreak}', label: 'Best streak'),
                      const SizedBox(width: 8),
                      _Pb(value: '${store.runs}', label: 'Runs played'),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _Cta(
                    title: 'Blitz',
                    subtitle: '60 seconds · modes rotate every round',
                    onTap: () => _start(RunKind.blitz),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _Secondary(
                          title: 'Daily Drop',
                          subtitle: dailyBest > 0
                              ? 'Today’s best: $dailyBest'
                              : '12 rounds · same for everyone',
                          lockedAt: isRunKindUnlocked(RunKind.daily, level)
                              ? null
                              : unlockLevelForRunKind(RunKind.daily),
                          onTap: () => _start(RunKind.daily),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _Secondary(
                          title: 'Fidget Loop',
                          subtitle: 'No timer, no score',
                          lockedAt: isRunKindUnlocked(RunKind.fidget, level)
                              ? null
                              : unlockLevelForRunKind(RunKind.fidget),
                          onTap: () => _start(RunKind.fidget,
                              modeId: unlockedModes(level).first.id),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text('BRAIN SNACKS · PLAY ONE SOLO', style: DD.label(10)),
                      const SizedBox(width: 9),
                      const Expanded(child: Divider(color: DD.edgeSoft)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Flexible(
                    child: ListView.separated(
                      itemCount: kModes.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 7),
                      itemBuilder: (context, i) {
                        final mode = kModes[i];
                        // Two different locks, and conflating them is a lie:
                        // the mode itself can be yours while Marathon — the way
                        // you play it solo — is still gated.
                        final modeOpen = isModeUnlocked(mode.id, level);
                        final soloOpen =
                            isRunKindUnlocked(RunKind.marathon, level);
                        return _ModeRow(
                          name: mode.name,
                          blurb: mode.blurb,
                          best: store.bestMarathon(mode.id),
                          modeLockedAt:
                              modeOpen ? null : unlockLevelForMode(mode.id),
                          soloLockedAt: soloOpen
                              ? null
                              : unlockLevelForRunKind(RunKind.marathon),
                          onTap: () =>
                              _start(RunKind.marathon, modeId: mode.id),
                        );
                      },
                    ),
                  ),
                  if (!widget.billing.owns(Product.removeAds)) ...[
                    const SizedBox(height: 10),
                    _RemoveAdsRow(
                      price: widget.billing.priceOf(Product.removeAds),
                      onBuy: _buyRemoveAds,
                      onRestore: _restore,
                    ),
                  ],
                  // Bottom right, quiet: nobody is here to read a version
                  // number, but a support request is useless without one.
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        kVersionLabel,
                        style: DD.data(9.5, color: DD.haze)
                            .copyWith(color: DD.haze.withValues(alpha: 0.55)),
                      ),
                    ),
                  ),
                  if (widget.ads.bannerAvailable) ...[
                    const SizedBox(height: 10),
                    // Home only. A banner during a run competes with the board
                    // for the one thing this game is asking for.
                    Container(
                      height: 50,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: DD.ink2,
                        borderRadius: BorderRadius.circular(DD.rSm),
                        border: Border.all(color: DD.edgeSoft),
                      ),
                      child: Text('Advertisement', style: DD.label(9)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The one purchase in the game, offered quietly.
///
/// No countdown, no "limited offer", no interstitial pushing it. A player who
/// wants it will find it; a player who does not should barely notice it.
class _RemoveAdsRow extends StatelessWidget {
  const _RemoveAdsRow({
    required this.price,
    required this.onBuy,
    required this.onRestore,
  });

  final String? price;
  final VoidCallback onBuy;
  final VoidCallback onRestore;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: onBuy,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(DD.rMd),
                border: Border.all(color: DD.edgeSoft),
              ),
              child: Row(
                children: [
                  const Icon(Icons.block_rounded, size: 15, color: DD.haze),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text('Remove ads',
                        style: DD.body(13, weight: FontWeight.w600)),
                  ),
                  Text(price ?? '', style: DD.data(12, color: DD.zap)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        // Play expects a visible restore path even though entitlements
        // re-sync on their own; a reinstalling player looks for the button.
        TextButton(
          onPressed: onRestore,
          style: TextButton.styleFrom(foregroundColor: DD.haze),
          child: Text('Restore', style: DD.body(12, color: DD.haze)),
        ),
      ],
    );
  }
}

class _Pb extends StatelessWidget {
  const _Pb({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.02),
            borderRadius: BorderRadius.circular(DD.rMd),
            border: Border.all(color: DD.edgeSoft),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: DD.data(18, color: DD.zap)),
              Text(label.toUpperCase(), style: DD.label(9)),
            ],
          ),
        ),
      );
}

class _Cta extends StatelessWidget {
  const _Cta({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [DD.flare, DD.flareDeep],
            ),
            borderRadius: BorderRadius.circular(DD.rLg),
            boxShadow: [
              BoxShadow(
                color: DD.flare.withValues(alpha: 0.35),
                blurRadius: 34,
                offset: const Offset(0, 14),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title.toUpperCase(),
                        style: DD.display(23, color: const Color(0xFF1A0A04))),
                    Text(subtitle,
                        style: DD.body(11.5,
                            color: const Color(0xFF1A0A04),
                            weight: FontWeight.w600)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_rounded, color: Color(0xFF1A0A04)),
            ],
          ),
        ),
      );
}

class _Secondary extends StatelessWidget {
  const _Secondary({
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.lockedAt,
  });
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  /// Level that opens this, or null when it is already open.
  final int? lockedAt;

  @override
  Widget build(BuildContext context) {
    final locked = lockedAt != null;
    return Semantics(
      button: true,
      enabled: !locked,
      child: GestureDetector(
        onTap: locked ? null : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: locked ? 0.01 : 0.03),
            borderRadius: BorderRadius.circular(DD.rMd),
            border: Border.all(color: locked ? DD.edgeSoft : DD.edge),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (locked) ...[
                    const Icon(Icons.lock_rounded, size: 12, color: DD.haze),
                    const SizedBox(width: 4),
                  ],
                  Flexible(
                    child: Text(
                      title,
                      overflow: TextOverflow.ellipsis,
                      style: DD.body(13,
                          color: locked ? DD.haze : DD.cream,
                          weight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              Text(
                locked ? 'Level $lockedAt' : subtitle,
                textAlign: TextAlign.center,
                style: DD.body(10, color: DD.haze),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModeRow extends StatelessWidget {
  const _ModeRow({
    required this.name,
    required this.blurb,
    required this.best,
    required this.onTap,
    this.modeLockedAt,
    this.soloLockedAt,
  });
  final String name;
  final String blurb;
  final int best;
  final VoidCallback onTap;

  /// Level that grants the mode itself, or null when the player already has it.
  /// Locked rows stay on screen on purpose: the ladder ahead is most of the
  /// reason to come back, and a hidden reward motivates nobody.
  final int? modeLockedAt;

  /// Level that grants Marathon — playing this mode on its own. A mode already
  /// in the Blitz rotation can still be gated here, and saying "locked" would
  /// misdescribe it.
  final int? soloLockedAt;

  @override
  Widget build(BuildContext context) {
    final hasMode = modeLockedAt == null;
    final locked = !hasMode || soloLockedAt != null;
    final subtitle = !hasMode
        ? 'Unlocks at level $modeLockedAt'
        : soloLockedAt != null
            ? 'In the Blitz rotation · solo play at level $soloLockedAt'
            : blurb;
    return Semantics(
      button: true,
      enabled: !locked,
      label: hasMode ? name : '$name, locked until level $modeLockedAt',
      child: GestureDetector(
        onTap: locked ? null : onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: locked ? 0.01 : 0.02),
            borderRadius: BorderRadius.circular(DD.rMd),
            border: Border.all(color: DD.edgeSoft),
          ),
          child: Row(
            children: [
              if (!hasMode) ...[
                const Icon(Icons.lock_rounded, size: 15, color: DD.haze),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: DD.body(14.5,
                            color: locked ? DD.haze : DD.cream,
                            weight: FontWeight.w600)),
                    Text(subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: DD.body(11.5, color: DD.haze)),
                  ],
                ),
              ),
              if (!locked)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('BEST', style: DD.label(8.5)),
                    Text('$best', style: DD.data(11, color: DD.haze)),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Level, progress to the next one, and what that next one buys.
class _LevelBar extends StatelessWidget {
  const _LevelBar({required this.xp});
  final int xp;

  @override
  Widget build(BuildContext context) {
    final level = Progression.levelForXp(xp);
    final into = Progression.xpIntoLevel(xp);
    final span = Progression.xpSpanOfLevel(xp);
    final next = nextUnlock(level);

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 11),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(DD.rMd),
        border: Border.all(color: DD.edgeSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('LEVEL', style: DD.label(9)),
              const SizedBox(width: 6),
              Text('$level', style: DD.data(20, color: DD.zap)),
              const Spacer(),
              Text('$into / $span XP', style: DD.data(10, color: DD.haze)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: SizedBox(
              height: 6,
              child: Stack(
                children: [
                  const ColoredBox(color: DD.ink3, child: SizedBox.expand()),
                  FractionallySizedBox(
                    widthFactor: span == 0 ? 0 : (into / span).clamp(0.0, 1.0),
                    child: const ColoredBox(color: DD.zap),
                  ),
                ],
              ),
            ),
          ),
          if (next != null) ...[
            const SizedBox(height: 7),
            Text.rich(
              TextSpan(children: [
                TextSpan(text: 'Next at level ${next.level}: '),
                TextSpan(
                  text: unlockName(next),
                  style: DD.body(11,
                      color: DD.cream, weight: FontWeight.w600),
                ),
                if (next.isPlanned)
                  const TextSpan(text: ' — in an upcoming update'),
              ]),
              style: DD.body(11, color: DD.haze),
            ),
          ],
        ],
      ),
    );
  }
}
