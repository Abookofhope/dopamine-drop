import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local-only progress. There is no account and no cloud save: nothing here is
/// worth asking someone to sign in for, and a sign-in wall is exactly the kind
/// of friction this game exists to avoid.
class Store {
  Store._(this._prefs, this._data);

  static const _key = 'dd.v1';

  final SharedPreferences _prefs;
  final Map<String, dynamic> _data;

  static Future<Store> open() async {
    final prefs = await SharedPreferences.getInstance();
    Map<String, dynamic> data = {};
    final raw = prefs.getString(_key);
    if (raw != null) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) data = decoded;
      } on FormatException {
        // Corrupt blob: start clean rather than crash on launch.
      }
    }
    return Store._(prefs, data);
  }

  int get bestBlitz => _data['bestBlitz'] as int? ?? 0;
  int get bestStreak => _data['bestStreak'] as int? ?? 0;
  int get runs => _data['runs'] as int? ?? 0;

  /// Lifetime XP. Player level is derived from this, never stored separately —
  /// one source of truth means a tuning change to the curve re-levels everyone
  /// correctly instead of stranding saved levels at the old rate.
  int get xp => _data['xp'] as int? ?? 0;
  /// Legacy key. Kept only so an existing install's mute choice survives the
  /// move to a named `sound` setting; nothing writes it any more.
  bool get _legacyMuted => _data['muted'] as bool? ?? false;

  bool get sound => _data['sound'] as bool? ?? !_legacyMuted;
  bool get haptics => _data['haptics'] as bool? ?? true;
  bool get reduceMotion => _data['reduceMotion'] as bool? ?? false;
  bool get colorAssist => _data['colorAssist'] as bool? ?? false;

  Future<void> setSound(bool v) => _write(() => _data['sound'] = v);
  Future<void> setHaptics(bool v) => _write(() => _data['haptics'] = v);
  Future<void> setReduceMotion(bool v) => _write(() => _data['reduceMotion'] = v);
  Future<void> setColorAssist(bool v) => _write(() => _data['colorAssist'] = v);

  /// Mirrors the store entitlement locally so the first frame after launch is
  /// already ad-free. The store is still the source of truth and re-syncs on
  /// init; this only avoids a banner flashing at a paying player.
  bool get adsRemoved => _data['adsRemoved'] as bool? ?? false;

  Future<void> setAdsRemoved(bool value) =>
      _write(() => _data['adsRemoved'] = value);

  int bestMarathon(String modeId) =>
      (_data['marathon'] as Map?)?[modeId] as int? ?? 0;

  int bestDaily(String dayKey) =>
      (_data['daily'] as Map?)?[dayKey] as int? ?? 0;

  Future<void> countRun() =>
      _write(() => _data['runs'] = runs + 1);

  Future<void> addXp(int amount) =>
      _write(() => _data['xp'] = xp + amount);

  /// Returns true when this beat the stored value, so the caller can show the
  /// personal-best flourish without asking twice.
  Future<bool> recordBlitz(int score) async {
    if (score <= bestBlitz) return false;
    await _write(() => _data['bestBlitz'] = score);
    return true;
  }

  Future<bool> recordMarathon(String modeId, int score) async {
    if (score <= bestMarathon(modeId)) return false;
    await _write(() {
      final m = Map<String, dynamic>.from(_data['marathon'] as Map? ?? {});
      m[modeId] = score;
      _data['marathon'] = m;
    });
    return true;
  }

  Future<bool> recordDaily(String dayKey, int score) async {
    if (score <= bestDaily(dayKey)) return false;
    await _write(() {
      final m = Map<String, dynamic>.from(_data['daily'] as Map? ?? {});
      m[dayKey] = score;
      _data['daily'] = m;
    });
    return true;
  }

  Future<void> recordStreak(int streak) async {
    if (streak <= bestStreak) return;
    await _write(() => _data['bestStreak'] = streak);
  }

  /// Wipes progress and personal bests, keeping preferences.
  ///
  /// Settings are not progress: a player resetting their scores has not asked
  /// to have sound turned back on.
  Future<void> resetProgress() => _write(() {
        for (final key in ['bestBlitz', 'bestStreak', 'runs', 'xp', 'marathon',
            'daily', 'adsRemoved']) {
          _data.remove(key);
        }
      });

  Future<void> _write(void Function() mutate) async {
    mutate();
    await _prefs.setString(_key, jsonEncode(_data));
  }
}
