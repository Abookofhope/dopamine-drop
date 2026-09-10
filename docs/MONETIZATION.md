# Monetization — wiring it up

Nothing in this repo talks to an ad network or a store. `lib/money/` defines the
two interfaces the game codes against, and `createAds()` in `lib/money/ads.dart`
is the single line that decides whether a build serves ads. Until real ad unit
ids exist it returns `NoAds`, so the game is complete and shippable today with
no network attached.

## What goes where

| Placement | Where | Rule |
|---|---|---|
| **Rewarded** — "+15 seconds" | End of a timed run, before the score | The earner. Opt-in, at a natural stop, buying something the player actively wants. One per run. |
| **Interstitial** | After the game-over sheet closes | Never mid-run. Never before run 3 of a session, never more often than every 3 runs, never within 120s of the last one. |
| **Banner** | Home screen only | Never during a run — it competes with the board for the one thing the game asks for. |
| **Remove Ads** IAP | Quiet row under the mode list | One product, one-time, no subscription. Rewarded stays available after purchase. |

The pacing numbers live in `AdPacing` and are pinned by tests in
`test/money_test.dart`. They are conservative on purpose: the failure mode of a
badly placed interstitial is a one-star review and an uninstall, not lost
revenue. Loosen them deliberately, with the tests updated, or not at all.

Two behaviours worth not breaking:

- **A dismissed or failed rewarded ad grants nothing.** `showRewarded()` returns
  false and the caller must not pay out on good faith.
- **Quitting is never interrupted.** `_quit()` calls `_finishNow()` directly and
  skips the continue offer. A player choosing to stop is not a conversion
  opportunity.

## Adding AdMob

1. `flutter pub add google_mobile_ads`
2. Create the app and three ad units in your AdMob account (banner,
   interstitial, rewarded). Note the application id and the three unit ids.
3. Put the application id in `android/app/src/main/AndroidManifest.xml`:

   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"/>
   ```

   The app crashes on launch if this is missing — that is AdMob's own check, not
   a bug in the game.
4. Implement `AdMobAds` against the `Ads` interface. It is deliberately left
   throwing rather than stubbed with Google's test unit ids: a test id that
   reaches production serves real impressions against a policy violation.
5. Flip `configured: true` in `lib/main.dart`.

Keep the ids out of source control if the repo is ever made public — read them
from `--dart-define` and fail closed (`configured: false`) when absent.

## Adding the purchase

1. `flutter pub add in_app_purchase`
2. In Play Console → Monetize → In-app products, create a **one-time** product
   with id `dd_remove_ads` (the constant in `lib/money/billing.dart`).
3. Implement `Billing` against `in_app_purchase`. Three things that are easy to
   get wrong and will fail review or lose money:
   - **Acknowledge every purchase within three days** or Play refunds it
     automatically.
   - **Handle `restore()`** — Play expects a visible restore path. The UI row
     already exists.
   - **Deliver on `purchaseStream`, not on the `buy()` return.** A purchase can
     complete after the app was killed.
4. `Store.setAdsRemoved()` mirrors the entitlement locally so a paying player
   never sees a banner flash on launch. The store stays the source of truth and
   re-syncs on init.

## What this is worth

Blended ARPDAU for a casual puzzle game with no user-acquisition spend runs
roughly **$0.01–0.05**. ~1,000 daily actives is somewhere around
**$300–900/month**, and the hard part is emphatically the 1,000 DAU. Instrument
D1 retention before you instrument revenue — see `DESIGN.md` §6.
