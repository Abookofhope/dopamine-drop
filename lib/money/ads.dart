import 'dart:async';

import 'package:flutter/foundation.dart';

/// Where an ad is allowed to appear.
///
/// Naming the placements as a type rather than sprinkling `showAd()` calls
/// means the pacing rules below are enforceable in one place and testable
/// without an ad network.
enum AdSlot { homeBanner, betweenRuns, rewardedExtraTime }

/// The ad surface the game codes against.
///
/// Everything outside this file talks to this interface, never to AdMob. That
/// keeps the SDK out of tests, out of the widget tree, and out of the decision
/// about *when* an ad is allowed — which is [AdPacing]'s job.
abstract interface class Ads {
  Future<void> init();

  bool get bannerAvailable;
  bool get interstitialReady;
  bool get rewardedReady;

  /// Returns true if an interstitial was actually shown.
  Future<bool> showInterstitial();

  /// Returns true only if the viewer earned the reward. A dismissed or failed
  /// ad returns false and the caller must not grant anything.
  Future<bool> showRewarded();

  void dispose();
}

/// The default everywhere except a release build with ads enabled: tests, dev
/// runs, and any player who has bought Remove Ads.
class NoAds implements Ads {
  const NoAds();

  @override
  Future<void> init() async {}
  @override
  bool get bannerAvailable => false;
  @override
  bool get interstitialReady => false;
  @override
  bool get rewardedReady => false;
  @override
  Future<bool> showInterstitial() async => false;
  @override
  Future<bool> showRewarded() async => false;
  @override
  void dispose() {}
}

/// When an ad may be shown, independent of who serves it.
///
/// The rules exist because the failure mode is a one-star review, not lost
/// revenue: an interstitial in the wrong place ends the session and the
/// install. They are deliberately conservative, and they are unit-tested
/// precisely so nobody loosens them by accident while chasing a revenue number.
class AdPacing {
  AdPacing({
    this.runsBeforeFirstAd = 3,
    this.runsBetweenAds = 3,
    this.minSecondsBetweenAds = 120,
  });

  /// No interstitial until the player has finished this many runs. A first
  /// session that shows an ad before the game has earned any goodwill churns.
  final int runsBeforeFirstAd;

  /// And then only every N runs.
  final int runsBetweenAds;

  /// A hard floor in wall-clock time, because runs can be very short — three
  /// quick failures should not add up to an ad break.
  final int minSecondsBetweenAds;

  int _runsThisSession = 0;
  int _runsSinceAd = 0;
  DateTime? _lastAdAt;

  int get runsThisSession => _runsThisSession;

  void onRunFinished() {
    _runsThisSession++;
    _runsSinceAd++;
  }

  /// Never mid-run, never before the game has proved itself, never twice in
  /// quick succession.
  bool mayShowInterstitial({DateTime? now}) {
    if (_runsThisSession < runsBeforeFirstAd) return false;
    if (_runsSinceAd < runsBetweenAds) return false;
    final last = _lastAdAt;
    if (last != null) {
      final gap = (now ?? DateTime.now()).difference(last).inSeconds;
      if (gap < minSecondsBetweenAds) return false;
    }
    return true;
  }

  void onAdShown({DateTime? now}) {
    _runsSinceAd = 0;
    _lastAdAt = now ?? DateTime.now();
  }

  void reset() {
    _runsThisSession = 0;
    _runsSinceAd = 0;
    _lastAdAt = null;
  }
}

/// AdMob-backed implementation.
///
/// Deliberately left unimplemented in the repo rather than stubbed with test
/// unit ids that could ship: wiring it means adding `google_mobile_ads`,
/// putting the real application id in AndroidManifest.xml, and supplying real
/// ad unit ids from your own AdMob account. See docs/MONETIZATION.md.
///
/// Until then [NoAds] is used, so the game is complete and shippable without
/// any ad network attached.
class AdMobAds implements Ads {
  AdMobAds({required this.androidBannerId, required this.androidInterstitialId, required this.androidRewardedId});

  final String androidBannerId;
  final String androidInterstitialId;
  final String androidRewardedId;

  @override
  Future<void> init() async {
    throw UnimplementedError(
      'Add google_mobile_ads and implement AdMobAds — see docs/MONETIZATION.md',
    );
  }

  @override
  bool get bannerAvailable => false;
  @override
  bool get interstitialReady => false;
  @override
  bool get rewardedReady => false;
  @override
  Future<bool> showInterstitial() async => false;
  @override
  Future<bool> showRewarded() async => false;
  @override
  void dispose() {}
}

/// Chooses the implementation. Kept here so exactly one line decides whether a
/// build serves ads.
Ads createAds({required bool adsRemoved, required bool configured}) {
  if (adsRemoved || !configured || kDebugMode) return const NoAds();
  return const NoAds();
}
