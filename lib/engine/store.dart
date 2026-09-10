import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local-only progress. There is no account and no cloud save: nothing here is
/// worth asking someone to sign in for, and a sign-in wall is exactly the kind
/// of friction this game exists to avoid.
class Store {
  Store._(this._prefs, this._data);

  static const _key = 'dd.v1';

  /// Set aside, not overwritten, when the saved blob will not parse. It is the
  /// only copy of that player's progress; throwing it away to get a clean boot
  /// makes a recoverable problem permanent.
  static const _quarantineKey = 'dd.v1.unreadable';

  /// Bumped whenever the shape of the saved data changes. [_migrate] must gain
  /// a matching step, and `test/store_test.dart` must gain a case proving an
  /// old save still opens with its progress intact.
  static const schemaVersion = 2;

  final SharedPreferences _prefs;
  final Map<String, dynamic> _data;

  static Future<Store> open() async {
    final prefs = await SharedPreferences.getInstance();
    Map<String, dynamic> data = {};
    final raw = prefs.getString(_key);
    if (raw != null) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          data = decoded;
        } else {
          await prefs.setString(_quarantineKey, raw);
        }
      } on FormatException {
        await prefs.setString(_quarantineKey, raw);
      }
    }
    return Store._(prefs, _migrate(data));
  }

  /// Brings a save written by any earlier build up to [schemaVersion].
  ///
  /// Two rules hold this together across updates:
  ///
  /// * **Unknown keys are never dropped.** The whole map is rewritten on every
  ///   save, so a key this build does not understand survives — which is what
  ///   lets someone move back to an older build without losing what the newer
  ///   one stored.
  /// * **A newer schema is left alone.** If a save says 3 and this build knows
  ///   2, it was written by a build that came after this one; downgrading it
  ///   would destroy real data. Read what is recognised, leave the rest.
  static Map<String, dynamic> _migrate(Map<String, dynamic> data) {
    if (data.isEmpty) return {'schema': schemaVersion};

    // A save with no marker predates versioning: that is schema 1.
    var from = data['schema'] as int? ?? 1;

    if (from < 2) {
      // Schema 1 had one `muted` flag. Schema 2 splits it, because silence and
      // stillness are different requests.
      final muted = data.remove('muted') as bool? ?? false;
      data['sound'] ??= !muted;
      data['haptics'] ??= true;
      from = 2;
    }

    if (from > schemaVersion) return data;
    data['schema'] = schemaVersion;
    return data;
  }

  int get bestBlitz => _data['bestBlitz'] as int? ?? 0;
  int get bestStreak => _data['bestStreak'] as int? ?? 0;
  int get runs => _data['runs'] as int? ?? 0;

  /// Lifetime XP. Player level is derived from this, never stored separately —
  /// one source of truth means a tuning change to the curve re-levels everyone
  /// correctly instead of stranding saved levels at the old rate.
  int get xp => _data['xp'] as int? ?? 0;
  bool get sound => _data['sound'] as bool? ?? true;
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

  /// Rewrites the blob now.
  ///
  /// Every mutating call already persists, so this exists for the one moment
  /// worth being certain about: the app leaving the foreground.
  Future<void> flush() => _write(() {});

  /// Everything the store holds, for tests and for a future export.
  Map<String, dynamic> debugSnapshot() => Map<String, dynamic>.of(_data);

  Future<void> _write(void Function() mutate) async {
    mutate();
    await _prefs.setString(_key, jsonEncode(_data));
  }
}
