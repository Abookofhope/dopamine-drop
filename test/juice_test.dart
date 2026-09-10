import 'package:dopamine_drop/engine/feedback.dart';
import 'package:dopamine_drop/theme.dart';
import 'package:dopamine_drop/ui/widgets/juice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('audio is optional', () {
    // The game has to be fully playable on a device with no audio, a locked
    // down emulator, or a platform where the plugin is missing. Every one of
    // these is a no-op before warmUp and must never throw.
    test('every sound is safe to fire before the pool exists', () {
      final feedback = GameFeedback();
      expect(() {
        feedback.tap();
        feedback.solved(1);
        feedback.solved(12);
        feedback.missed();
        feedback.runOver();
        feedback.levelUp();
        feedback.tick();
        feedback.go();
      }, returnsNormally);
    });

    test('sound and haptics switch independently', () {
      // Two separate settings, not one mute: a player on a bus wants silence
      // and still wants to feel the answer land.
      final feedback = GameFeedback(sound: false, haptics: true);
      expect(feedback.sound, isFalse);
      expect(feedback.haptics, isTrue);
      expect(() => feedback.solved(5), returnsNormally);

      feedback.sound = true;
      feedback.haptics = false;
      expect(() => feedback.solved(5), returnsNormally);
      expect(() => feedback.missed(), returnsNormally);
      expect(() => feedback.tap(), returnsNormally);
    });

    test('warmUp gives up instead of hanging when there is no platform', () async {
      // The plugin leaves its own futures pending forever when the platform
      // implementation is missing. Without a bound, a warm-up started at launch
      // would stay alive for the life of the process.
      final feedback = GameFeedback();
      final elapsed = Stopwatch()..start();
      await feedback.warmUp().timeout(const Duration(seconds: 15));
      elapsed.stop();

      expect(feedback.ready, isFalse);
      expect(elapsed.elapsed, lessThan(const Duration(seconds: 10)));
      // Still fully usable, just silent.
      expect(() => feedback.solved(3), returnsNormally);
    }, timeout: const Timeout(Duration(seconds: 30)));
  });

  group('juice', () {
    testWidgets('sparks are emitted, then cleaned up on their own', (tester) async {
      final controller = JuiceController();
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: JuiceOverlay(
            controller: controller,
            child: const SizedBox.expand(),
          ),
        ),
      ));

      expect(controller.idle, isTrue);
      controller.burst(const Offset(100, 100), color: DD.cool);
      expect(controller.sparks, isNotEmpty);

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 900));
      await tester.pump(const Duration(milliseconds: 100));
      // A run of two hundred solves must not leave two thousand sparks behind.
      expect(controller.sparks, isEmpty);
      expect(controller.idle, isTrue);
    });

    testWidgets('a shake settles rather than running forever', (tester) async {
      final controller = JuiceController();
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: JuiceOverlay(
            controller: controller,
            child: const SizedBox.expand(),
          ),
        ),
      ));

      controller.shake();
      expect(controller.shaking, isTrue);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump(const Duration(milliseconds: 100));
      expect(controller.shaking, isFalse);
    });

    testWidgets('effects are suppressed when animations are disabled',
        (tester) async {
      final controller = JuiceController();
      await tester.pumpWidget(MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: Scaffold(
            body: JuiceOverlay(
              controller: controller,
              child: const SizedBox.expand(),
            ),
          ),
        ),
      ));

      controller.burst(const Offset(50, 50));
      controller.shake();
      await tester.pump();
      // Nothing is painted, and nothing throws — reduced motion is a real
      // setting for exactly the audience this game is aimed at.
      expect(find.byType(CustomPaint), findsWidgets);
      expect(tester.takeException(), isNull);
      await tester.pump(const Duration(seconds: 1));
      await tester.pump(const Duration(milliseconds: 100));
    });

    testWidgets('the score pop rises and fades within its progress',
        (tester) async {
      for (final progress in [0.0, 0.3, 1.0]) {
        await tester.pumpWidget(MaterialApp(
          home: Scaffold(
            body: Center(child: ScorePop(text: '+240', progress: progress)),
          ),
        ));
        expect(tester.takeException(), isNull);
        expect(find.text('+240'), findsOneWidget);
      }
    });
  });
}
