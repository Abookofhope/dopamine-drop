import 'package:dopamine_drop/money/ads.dart';
import 'package:dopamine_drop/money/billing.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('interstitial pacing', () {
    // These rules exist because the failure mode is a one-star review, not lost
    // revenue. They are pinned so nobody loosens them by accident while chasing
    // a number.
    final start = DateTime(2026, 9, 10, 12);

    test('a first session is never interrupted before the game earns it', () {
      final pacing = AdPacing();
      for (var i = 0; i < 3; i++) {
        expect(pacing.mayShowInterstitial(now: start), isFalse,
            reason: 'ad offered after ${pacing.runsThisSession} runs');
        pacing.onRunFinished();
      }
      expect(pacing.mayShowInterstitial(now: start), isTrue);
    });

    test('showing one resets the run counter', () {
      final pacing = AdPacing();
      for (var i = 0; i < 3; i++) {
        pacing.onRunFinished();
      }
      expect(pacing.mayShowInterstitial(now: start), isTrue);
      pacing.onAdShown(now: start);
      expect(pacing.mayShowInterstitial(now: start.add(const Duration(minutes: 9))),
          isFalse);
    });

    test('three quick failures do not add up to an ad break', () {
      final pacing = AdPacing();
      for (var i = 0; i < 3; i++) {
        pacing.onRunFinished();
      }
      pacing.onAdShown(now: start);
      // Runs satisfied, but only twenty seconds of wall clock have passed.
      for (var i = 0; i < 3; i++) {
        pacing.onRunFinished();
      }
      expect(
          pacing.mayShowInterstitial(now: start.add(const Duration(seconds: 20))),
          isFalse);
      expect(
          pacing.mayShowInterstitial(now: start.add(const Duration(seconds: 121))),
          isTrue);
    });

    test('both gates must open, not either', () {
      final pacing = AdPacing();
      for (var i = 0; i < 3; i++) {
        pacing.onRunFinished();
      }
      pacing.onAdShown(now: start);
      // Plenty of time, but only one run since the last ad.
      pacing.onRunFinished();
      expect(pacing.mayShowInterstitial(now: start.add(const Duration(hours: 1))),
          isFalse);
    });

    test('reset returns a fresh session to its grace period', () {
      final pacing = AdPacing();
      for (var i = 0; i < 6; i++) {
        pacing.onRunFinished();
      }
      expect(pacing.mayShowInterstitial(now: start), isTrue);
      pacing.reset();
      expect(pacing.mayShowInterstitial(now: start), isFalse);
    });
  });

  group('no-ads build', () {
    test('serves nothing and claims nothing', () async {
      const ads = NoAds();
      await ads.init();
      expect(ads.bannerAvailable, isFalse);
      expect(ads.interstitialReady, isFalse);
      expect(ads.rewardedReady, isFalse);
      // Crucially false, not true: a caller must never grant a reward for an
      // ad that did not play.
      expect(await ads.showRewarded(), isFalse);
      expect(await ads.showInterstitial(), isFalse);
      ads.dispose();
    });

    test('a paying player gets NoAds regardless of configuration', () {
      expect(createAds(adsRemoved: true, configured: true), isA<NoAds>());
      expect(createAds(adsRemoved: false, configured: false), isA<NoAds>());
    });
  });

  group('billing', () {
    test('a fresh install owns nothing', () {
      final billing = NoBilling();
      expect(billing.owns(Product.removeAds), isFalse);
      billing.dispose();
    });

    test('a purchase is reported once, on the stream and in owns()', () async {
      final billing = NoBilling();
      final seen = <Product>[];
      final sub = billing.purchases.listen(seen.add);

      expect(await billing.buy(Product.removeAds), isTrue);
      await Future<void>.delayed(Duration.zero);

      expect(billing.owns(Product.removeAds), isTrue);
      expect(seen, [Product.removeAds]);
      await sub.cancel();
      billing.dispose();
    });

    test('an entitlement restored from the store is honoured at construction',
        () {
      final billing = NoBilling(owned: {Product.removeAds});
      expect(billing.owns(Product.removeAds), isTrue);
      billing.dispose();
    });

    test('there is exactly one product, and it is not a subscription', () {
      // A subscription on a game like this creates support load, refund
      // handling and churn management — the opposite of passive income.
      expect(Product.values, [Product.removeAds]);
      expect(removeAdsProductId, 'dd_remove_ads');
    });
  });
}
