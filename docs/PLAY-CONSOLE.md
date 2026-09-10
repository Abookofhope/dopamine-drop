# Play Console — release checklist

Everything here is a Google-side decision made in a form field, not in code.
Most are expensive or impossible to reverse after launch.

> **Verify each of these in the Play Console before relying on it.** Google
> revises publishing requirements regularly, and the specifics below are a
> prompt to go and check, not a current source of truth.

---

## The two that will surprise you

### 1. New personal accounts must run a 14-day closed test

A developer account registered as **personal** after 13 November 2023 cannot
publish straight to production. It must first run a closed test with roughly
**12 testers opted in continuously for 14 days**, then apply for production
access. (It started at 20 testers and was reduced.) **Organization** accounts —
which require a D-U-N-S number — are exempt.

This is a two-week hard gate between "the app is finished" and "the app is
earning", and it needs twelve real humans with Google accounts who stay opted in
the whole time. **That is a recruiting problem, not an engineering one, so start
it now rather than when the build is done.** Discovering it at the end costs at
least two weeks of dead time.

Registration is a one-time **$25** fee.

### 2. Do not market this as an ADHD app

Describing the game as *for ADHD* — or as improving focus, treating symptoms, or
helping a diagnosed condition — moves the listing into Google Play's
health-and-medical-claims territory, where the claim can be asked to be
substantiated or simply rejected.

The identical game described as **fidget / quick-session / short-attention-span**
carries none of that exposure. Use behavioural language in the store listing and
clinical language in community marketing, where people self-identify with it.

---

## Content rating: answer for 13+ deliberately

The IARC questionnaire is where a bright, simple puzzle game gets classified as
child-directed or mixed-audience. That pulls the app into the **Families
policy**: certified ad SDKs only, no interest-based advertising, and
substantially lower eCPM.

Target **13+**. It is a choice, not a default, and it is worth roughly two
thirds of the ad revenue.

The game contains no violence, no user-generated content, no chat, no location,
no purchases of randomised items. The questionnaire should be short.

---

## Data safety form

Declare honestly. What the game actually does today:

| Data | Collected? | Notes |
|---|---|---|
| Name, email, account | No | There is no account and no sign-in |
| Device / advertising ID | **Yes, once AdMob is added** | Purpose: advertising. Not linked to identity. |
| Purchase history | **Yes, once IAP is added** | Purpose: app functionality |
| Game progress (XP, best scores) | No | Stored on-device only, never transmitted |
| Crash logs / diagnostics | Only if you add analytics | Declare it if you do |

Say **no** to data collection only while `configured: false` and no analytics SDK
is attached. The moment AdMob ships, the advertising-ID declaration is required —
an inaccurate data safety form is a suspension risk, not a warning.

Provide a privacy policy URL. It is mandatory once you collect anything, and
Play checks that the link resolves.

---

## Store listing

**App name** (30 char limit): `Dopamine Drop: Brain Snacks` — 27 characters.

**Short description** (80 char limit):

> Quick puzzle games that switch every round. 60-second runs for restless brains.

**Full description** — lead with the mechanic, not the audience. Keywords worth
carrying: *quick puzzle, brain games, fidget, time killer, short games, offline
puzzle, reaction, satisfying, brain training*.

**Assets required:**

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, 32-bit, no alpha |
| Feature graphic | 1024×500 PNG/JPG |
| Phone screenshots | 2–8, min 320px on the short side |
| 7" and 10" tablet screenshots | Only if you declare tablet support |

Screenshots sell this game better than words do: it photographs well because
every mode is visually distinct. Show four different modes, not four levels of
one.

---

## Build and release

```bash
flutter build appbundle --release
```

**Signing.** Generate an upload key and put it in `android/key.properties`,
which `.gitignore` already excludes:

```properties
storePassword=...
keyPassword=...
keyAlias=upload
storeFile=/absolute/path/to/upload-keystore.jks
```

Never commit the keystore or `key.properties`. Losing the upload key is
recoverable through Play App Signing; losing it *without* Play App Signing
enabled is not — enable it.

**Target API level.** Play enforces a rolling window, roughly one year behind the
current Android release. That means a recompile-and-ship roughly annually. It is
the real maintenance tax on passive income: the revenue is passive, the
compliance is not.

**Package name** is permanent. Set `applicationId` in
`android/app/build.gradle` before the first upload — `com.yourname.dopaminedrop`
or similar. It can never be changed for this listing.

---

## Order of operations

1. Register the developer account — **$25**, and start the clock.
2. Set `applicationId`, generate the upload key, enable Play App Signing.
3. Create the listing. Content rating **13+**. Data safety. Privacy policy URL.
4. Upload an internal-testing build. Check it installs and runs on a real phone.
5. **Recruit 12 testers and start the closed test.** Everything else can happen
   during these 14 days.
6. Wire AdMob and IAP, update the data safety form, upload a new build.
7. Apply for production access once the closed test completes.
8. Soft launch. Watch D1 retention and per-mode quit rate before touching
   revenue — see `DESIGN.md` §6.

---

## Before you submit

- [ ] Runs on a physical mid-range Android phone, not just an emulator
- [ ] Back button behaves everywhere; no dead ends
- [ ] Reduced-motion setting respected (the game honours it — verify on device)
- [ ] Audio respects the ringer/silent switch
- [ ] No placeholder or AdMob **test** ad unit ids anywhere in the build
- [ ] `key.properties` and the keystore are untracked
- [ ] Privacy policy URL resolves
- [ ] Data safety form matches what the build actually does
- [ ] Store listing makes no health claim
