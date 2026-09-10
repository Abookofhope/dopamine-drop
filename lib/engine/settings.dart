import 'package:flutter/foundation.dart';

import 'store.dart';

/// Player preferences, all persisted, all applied live.
///
/// A [ChangeNotifier] rather than values threaded through constructors: a
/// setting changed on the settings screen has to take effect on the home screen
/// behind it and in the next run, without either of them being rebuilt by hand.
class Settings extends ChangeNotifier {
  Settings(this._store)
      : _sound = _store.sound,
        _haptics = _store.haptics,
        _reduceMotion = _store.reduceMotion,
        _colorAssist = _store.colorAssist;

  final Store _store;

  bool _sound;
  bool _haptics;
  bool _reduceMotion;
  bool _colorAssist;

  bool get sound => _sound;
  bool get haptics => _haptics;

  /// Suppresses particles, shake and the score pop.
  ///
  /// This is an override on top of the platform's own reduced-motion setting,
  /// never a way to turn that off: the system asking for less motion always
  /// wins. See `JuiceOverlay`.
  bool get reduceMotion => _reduceMotion;

  /// Adds a second, non-colour channel wherever a puzzle would otherwise ask
  /// the player to tell two hues apart.
  ///
  /// Roughly one in twelve men has some colour vision deficiency, so this is a
  /// correctness setting, not a preference. See `DESIGN.md` §10.
  bool get colorAssist => _colorAssist;

  Future<void> setSound(bool value) async {
    if (_sound == value) return;
    _sound = value;
    notifyListeners();
    await _store.setSound(value);
  }

  Future<void> setHaptics(bool value) async {
    if (_haptics == value) return;
    _haptics = value;
    notifyListeners();
    await _store.setHaptics(value);
  }

  Future<void> setReduceMotion(bool value) async {
    if (_reduceMotion == value) return;
    _reduceMotion = value;
    notifyListeners();
    await _store.setReduceMotion(value);
  }

  Future<void> setColorAssist(bool value) async {
    if (_colorAssist == value) return;
    _colorAssist = value;
    notifyListeners();
    await _store.setColorAssist(value);
  }
}
