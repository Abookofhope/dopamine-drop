import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'engine/feedback.dart';
import 'engine/settings.dart';
import 'engine/store.dart';
import 'money/ads.dart';
import 'money/billing.dart';
import 'theme.dart';
import 'ui/home_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Portrait one-thumb play is the whole ergonomic premise.
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  final store = await Store.open();
  final settings = Settings(store);
  final feedback =
      GameFeedback(sound: settings.sound, haptics: settings.haptics);
  // One listener keeps the audio layer in step with the switches, so nothing
  // else has to remember to push a setting into it.
  settings.addListener(() {
    feedback.sound = settings.sound;
    feedback.haptics = settings.haptics;
  });

  final billing = NoBilling(
    owned: store.adsRemoved ? {Product.removeAds} : null,
  );
  await billing.init();
  // Exactly one line decides whether a build serves ads. `configured` stays
  // false until real AdMob unit ids exist — see docs/MONETIZATION.md.
  final ads = createAds(
    adsRemoved: billing.owns(Product.removeAds),
    configured: false,
  );
  await ads.init();
  // Not awaited: the first frame should never wait on an audio device, and the
  // game is fully playable if this never completes.
  unawaited(feedback.warmUp());
  runApp(DopamineDropApp(
    store: store,
    settings: settings,
    feedback: feedback,
    ads: ads,
    billing: billing,
  ));
}

class DopamineDropApp extends StatefulWidget {
  const DopamineDropApp({
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
  State<DopamineDropApp> createState() => _DopamineDropAppState();
}

class _DopamineDropAppState extends State<DopamineDropApp> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    // Android can kill a backgrounded app without warning. Every write is
    // already durable on its own, so this is a safety net rather than the
    // mechanism — but it is the moment worth being certain about.
    _lifecycle = AppLifecycleListener(onPause: widget.store.flush);
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dopamine Drop',
      debugShowCheckedModeBanner: false,
      theme: DD.theme(),
      // Rebuilt whenever a setting changes, so a switch on the settings screen
      // reaches the home screen and the next run without anyone pushing it.
      home: ListenableBuilder(
        listenable: widget.settings,
        builder: (context, _) => HomeScreen(
          store: widget.store,
          settings: widget.settings,
          feedback: widget.feedback,
          ads: widget.ads,
          billing: widget.billing,
        ),
      ),
    );
  }
}
