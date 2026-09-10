import 'dart:async';

import 'package:flutter/material.dart';

import '../engine/feedback.dart';
import '../engine/mode.dart';
import '../engine/progression.dart';
import '../engine/registry.dart';
import '../engine/settings.dart';
import '../engine/rng.dart';
import '../engine/run.dart';
import '../engine/store.dart';
import '../money/ads.dart';
import '../theme.dart';
import 'widgets/hud.dart';
import 'widgets/juice.dart';

/// Outcome handed back to whoever pushed the run.
class RunResult {
  const RunResult({
    required this.run,
    required this.personalBest,
    required this.levelBefore,
    required this.levelAfter,
  });
  final RunState run;
  final bool personalBest;
  final int levelBefore;
  final int levelAfter;

  bool get leveledUp => levelAfter > levelBefore;
}

class PlayScreen extends StatefulWidget {
  const PlayScreen({
    super.key,
    required this.kind,
    required this.store,
    required this.settings,
    required this.feedback,
    required this.ads,
    this.modeId,
  });

  final RunKind kind;
  final String? modeId;
  final Store store;
  final Settings settings;
  final GameFeedback feedback;
  final Ads ads;

  @override
  State<PlayScreen> createState() => _PlayScreenState();
}

class _PlayScreenState extends State<PlayScreen>
    with SingleTickerProviderStateMixin {
  static const _tick = Duration(milliseconds: 50);

  final JuiceController _juice = JuiceController();
  late final AnimationController _pop;

  /// Where the last finger went down inside the play surface.
  ///
  /// Read from a Listener rather than passed through PuzzleContext: a burst
  /// origin is presentation, and threading it through the mode contract would
  /// make all twelve puzzles care about an effect none of them owns.
  Offset _lastTap = Offset.zero;
  String _popText = '';

  late RunState _run;
  Timer? _clock;
  Timer? _between;
  PuzzleMode? _mode;

  /// Guards the round against resolving twice — a fast double-tap can land two
  /// callbacks before the widget is replaced.
  bool _roundLive = false;
  DateTime _roundStart = DateTime.now();

  /// Snapshotted at run start. Difficulty must not shift mid-run because the
  /// player crossed a level boundary — that would change the rules underneath
  /// them between one round and the next.
  late final int _playerLevel;
  late final double _pressure;
  late final List<PuzzleMode> _pool;

  /// One continue per run, and only on a timed run. Offering it twice turns a
  /// generous mechanic into a slot machine, and offering it on Marathon would
  /// undo the only mode where lives mean anything.
  bool _continued = false;
  bool _offeringContinue = false;

  int _countdown = 3;
  bool _flashWin = false;
  bool _flashBad = false;
  String? _banner;
  bool _finished = false;

  @override
  void initState() {
    super.initState();
    _pop = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 720),
    );
    _playerLevel = Progression.levelForXp(widget.store.xp);
    _pressure = Progression.pressure(_playerLevel);
    _pool = unlockedModes(_playerLevel);
    _run = RunState(kind: widget.kind, fixedMode: widget.modeId);
    widget.store.countRun();
    _startCountdown();
  }

  @override
  void dispose() {
    _clock?.cancel();
    _between?.cancel();
    _pop.dispose();
    _juice.dispose();
    super.dispose();
  }

  void _startCountdown() {
    // Short on purpose. A long countdown is a place to lose someone, which is
    // the exact failure this game is designed around.
    Timer.periodic(const Duration(milliseconds: 330), (t) {
      if (!mounted) return t.cancel();
      setState(() => _countdown--);
      if (_countdown > 0) {
        widget.feedback.tick();
      } else {
        t.cancel();
        widget.feedback.go();
        _beginRun();
      }
    });
  }

  void _beginRun() {
    _clock = Timer.periodic(_tick, (_) {
      if (!mounted || !_run.spec.timed) return;
      setState(() => _run.remaining -= _tick);
      if (_run.remaining <= Duration.zero) _finish();
    });
    _nextRound();
  }

  void _nextRound() {
    if (_finished) return;
    final rounds = _run.spec.rounds;
    if (rounds != null && _run.roundIndex >= rounds) {
      _finish();
      return;
    }

    setState(() {
      _run.roundIndex++;
      _mode = widget.modeId != null
          ? modeById(widget.modeId!)
          : nextMode(_run.rng, _run.lastModeId, pool: _pool);
      _run.lastModeId = _mode!.id;
      _banner = null;
      _roundLive = true;
      _roundStart = DateTime.now();
    });
  }

  void _onSolved() {
    if (!_roundLive || _finished) return;
    _roundLive = false;
    final elapsed = DateTime.now().difference(_roundStart);
    final scoreBefore = _run.score;
    setState(() {
      _run.recordSolve(_mode!, elapsed, pressure: _pressure);
      _run.xpEarned += Progression.xpForSolve(_run.multiplier);
      _flashWin = true;
      _banner = _run.multiplier > 1 ? 'Streak ×${_run.multiplier}' : 'Nice';
      _popText = '+${_run.score - scoreBefore}';
    });
    widget.feedback.solved(_run.streak);
    _juice.burst(_lastTap, color: DD.cool);
    if (_run.spec.scored) _pop.forward(from: 0);
    _between = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() => _flashWin = false);
      _nextRound();
    });
  }

  void _onMissed() {
    if (!_roundLive || _finished) return;
    _roundLive = false;
    setState(() {
      _run.recordMiss();
      _flashBad = true;
      _banner = _run.spec.timed
          ? '−${_run.spec.penalty.inSeconds} seconds'
          : 'Missed';
    });
    widget.feedback.missed();
    _juice.shake();

    if (_run.isOver) {
      _between = Timer(const Duration(milliseconds: 520), _finish);
      return;
    }
    _between = Timer(const Duration(milliseconds: 560), () {
      if (!mounted) return;
      setState(() => _flashBad = false);
      _nextRound();
    });
  }

  /// The run is out of time or lives. Before ending it, the highest-value ad
  /// placement in the game: opt-in, at a natural stopping point, buying
  /// something the player actively wants.
  void _finish() {
    if (_finished || _offeringContinue) return;
    _clock?.cancel();
    _between?.cancel();

    final canOffer = !_continued &&
        _run.spec.timed &&
        _run.solved > 0 &&
        widget.ads.rewardedReady;
    if (canOffer) {
      setState(() => _offeringContinue = true);
      return;
    }
    _finishNow();
  }

  Future<void> _takeContinue() async {
    setState(() => _offeringContinue = false);
    final earned = await widget.ads.showRewarded();
    if (!mounted) return;
    if (!earned) {
      // A dismissed or failed ad grants nothing. Never pay out on good faith.
      _finishNow();
      return;
    }
    setState(() {
      _continued = true;
      _run.remaining = const Duration(seconds: 15);
      _banner = '+15 seconds';
    });
    widget.feedback.go();
    _beginRun();
  }

  Future<void> _finishNow() async {
    if (_finished) return;
    _finished = true;
    _clock?.cancel();
    _between?.cancel();
    widget.feedback.runOver();

    var best = false;
    if (_run.spec.scored) {
      best = switch (_run.kind) {
        RunKind.blitz => await widget.store.recordBlitz(_run.score),
        RunKind.marathon =>
          await widget.store.recordMarathon(widget.modeId ?? '', _run.score),
        RunKind.daily =>
          await widget.store.recordDaily(todayKey(), _run.score),
        RunKind.fidget => false,
      };
    }
    await widget.store.recordStreak(_run.bestStreak);

    final levelBefore = Progression.levelForXp(widget.store.xp);
    await widget.store.addXp(_run.xpEarned);
    final levelAfter = Progression.levelForXp(widget.store.xp);
    _run.levelsGained = levelAfter - levelBefore;

    if (!mounted) return;
    Navigator.of(context).pop(RunResult(
      run: _run,
      personalBest: best,
      levelBefore: levelBefore,
      levelAfter: levelAfter,
    ));
  }

  void _quit() {
    if (_run.solved > 0 || _run.missed > 0) {
      // Quitting is a decision to stop. Interrupting it with an offer to
      // continue is exactly the dark pattern this game does not run.
      _finishNow();
    } else {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.modeId != null
        ? modeById(widget.modeId!).name
        : _run.spec.label;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Column(
            children: [
              Hud(run: _run, title: title, onQuit: _quit),
              const SizedBox(height: 12),
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: AspectRatio(
                      aspectRatio: 0.86,
                      child: _surface(),
                    ),
                  ),
                ),
              ),
              if (_banner != null)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(
                    _banner!.toUpperCase(),
                    style: DD.label(12, color: _flashBad ? DD.bad : DD.cool),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _surface() {
    final overlay = _flashWin
        ? DD.cool.withValues(alpha: 0.16)
        : _flashBad
            ? DD.bad.withValues(alpha: 0.2)
            : Colors.transparent;

    return JuiceOverlay(
      controller: _juice,
      reduceMotion: widget.settings.reduceMotion,
      child: Listener(
        behavior: HitTestBehavior.translucent,
        onPointerDown: (event) => _lastTap = event.localPosition,
        child: DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(DD.rLg),
        border: Border.all(color: DD.edgeSoft),
        color: Colors.white.withValues(alpha: 0.02),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(DD.rLg),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Padding(
              padding: const EdgeInsets.all(14),
              child: _countdown > 0
                  ? Center(
                      child: Text('$_countdown', style: DD.display(88, color: DD.flare)),
                    )
                  : _mode == null
                      ? const SizedBox.shrink()
                      : KeyedSubtree(
                          // A fresh key per round forces a clean rebuild, so no
                          // mode can leak state from the round before it.
                          key: ValueKey('${_mode!.id}-${_run.roundIndex}'),
                          child: _mode!.build(PuzzleContext(
                            level: Progression.effectiveLevel(
                                _run.solved, _playerLevel),
                            rng: _run.rng,
                            onSolved: _onSolved,
                            onMissed: _onMissed,
                            colorAssist: widget.settings.colorAssist,
                          )),
                        ),
            ),
            IgnorePointer(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                color: overlay,
              ),
            ),
            if (_offeringContinue)
              _ContinueOffer(
                onWatch: _takeContinue,
                onDecline: _finishNow,
              ),
            IgnorePointer(
              child: AnimatedBuilder(
                animation: _pop,
                builder: (context, _) {
                  if (_pop.isDismissed) return const SizedBox.shrink();
                  return Stack(children: [
                    Positioned(
                      left: _lastTap.dx - 60,
                      top: _lastTap.dy - 26,
                      width: 120,
                      child: Center(
                        child: ScorePop(text: _popText, progress: _pop.value),
                      ),
                    ),
                  ]);
                },
              ),
            ),
          ],
        ),
      ),
        ),
      ),
    );
  }
}

/// Shown when a timed run ends and a rewarded ad is available.
///
/// Declining is a first-class button, not a small grey X: the offer has to read
/// as an offer. The run is already over either way — nothing here is withheld
/// from a player who says no.
class _ContinueOffer extends StatelessWidget {
  const _ContinueOffer({required this.onWatch, required this.onDecline});

  final VoidCallback onWatch;
  final VoidCallback onDecline;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: DD.ink.withValues(alpha: 0.94),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('OUT OF TIME', style: DD.label(11)),
              const SizedBox(height: 6),
              Text('+15 seconds?', style: DD.display(34)),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onWatch,
                  style: FilledButton.styleFrom(
                    backgroundColor: DD.flare,
                    foregroundColor: const Color(0xFF1A0A04),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(DD.rMd),
                    ),
                  ),
                  child: Text('Watch a short ad',
                      style: DD.body(15, color: const Color(0xFF1A0A04),
                          weight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: onDecline,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: DD.cream,
                    side: const BorderSide(color: DD.edge),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(DD.rMd),
                    ),
                  ),
                  child: Text('End the run', style: DD.body(14)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
