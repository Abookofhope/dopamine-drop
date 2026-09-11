# Monetization — the rules, and what wiring it up would take

Nothing in this repo talks to an ad network or a store, and the live web app
has no monetization at all. This file is the **design decisions**, kept so they
are not re-argued from scratch, plus what implementing them would actually
involve.

An earlier Flutter build of the game had these encoded as two interfaces (`Ads`
and `Billing`) with a `NoAds` default, so a build was complete and shippable
with no network attached. That build is gone — see the note at the end — but
the shape was right and is worth repeating in whatever ships.

## What goes where

| Placement | Where | Rule |
|---|---|---|
| **Rewarded** — "+15 seconds" | End of a timed run, before the score | The earner. Opt-in, at a natural stop, buying something the player actively wants. One per run. |
| **Interstitial** | After the game-over sheet closes | Never mid-run. Never before run 3 of a session, never more often than every 3 runs, never within 120s of the last one. |
| **Banner** | Home screen only | Never during a run — it competes with the board for the one thing the game asks for. |
| **Remove Ads** IAP | Quiet row under the mode list | One product, one-time, no subscription. Rewarded stays available after purchase. |

Those pacing numbers are conservative on purpose. The failure mode of a badly
placed interstitial is a one-star review and an uninstall, not lost revenue.
Loosen them deliberately, or not at all — and pin them in a test so loosening
has to be a decision rather than a drift.

Two behaviours worth not breaking:

- **A dismissed or failed rewarded ad grants nothing.** The "show" call returns
  false and the caller must not pay out on good faith.
- **Quitting is never interrupted.** A player choosing to stop is not a
  conversion opportunity — the quit path skips the continue offer entirely.

## If the game goes native, for ads

1. Create the app and three ad units in AdMob (banner, interstitial,
   rewarded). Note the application id and the three unit ids.
2. The application id goes in the Android manifest:

   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"/>
   ```

   The app crashes on launch if this is missing. That is AdMob's own check, not
   a bug in the game.
3. Implement the real ad provider behind the interface, and leave it **throwing
   rather than stubbed with Google's test unit ids**: a test id that reaches
   production serves real impressions against a policy violation.
4. Keep the ids out of source control — this repo is public. Read them from
   build-time defines and **fail closed** (no ads) when they are absent.

## If the game goes native, for the purchase

1. In Play Console → Monetize → In-app products, create a **one-time** product,
   e.g. `dd_remove_ads`.
2. Three things that are easy to get wrong and will fail review or lose money:
   - **Acknowledge every purchase within three days** or Play refunds it
     automatically.
   - **Handle restore** — Play expects a visible restore path.
   - **Deliver on the purchase stream, not on the buy() return.** A purchase
     can complete after the app was killed.
3. Mirror the entitlement locally so a paying player never sees a banner flash
   on launch, with the store staying the source of truth and re-syncing on init.

## What this is worth

Blended ARPDAU for a casual puzzle game with no user-acquisition spend runs
roughly **$0.01–0.05**. ~1,000 daily actives is somewhere around
**$300–900/month**, and the hard part is emphatically the 1,000 DAU. Instrument
D1 retention before you instrument revenue — see `DESIGN.md` §6.

---

**On the code this used to reference.** An earlier Flutter implementation of
the game lived in `lib/`, with these interfaces in `lib/money/`. It was frozen
several versions behind the shipping web app and has been removed; the
decisions above outlived it, the code did not. Nothing here describes anything
that currently exists in the repo.
