import 'dart:math' as math;

/// Deterministic-when-seeded randomness.
///
/// Daily Drop must generate the identical run on every device, so it seeds from
/// the date through [stableHash] rather than `String.hashCode`, which Dart does
/// not guarantee to be stable across VM versions or platforms.
class Rng {
  Rng.seeded(int seed) : _r = math.Random(seed);
  Rng.system() : _r = math.Random();

  final math.Random _r;

  double nextDouble() => _r.nextDouble();
  int nextInt(int max) => _r.nextInt(max);

  bool nextBool0() => _r.nextBool();

  T pick<T>(List<T> items) => items[_r.nextInt(items.length)];

  /// A shuffled copy — never mutates the caller's list.
  List<T> shuffled<T>(List<T> items) {
    final copy = List<T>.of(items);
    copy.shuffle(_r);
    return copy;
  }

  /// Picks [count] distinct indices below [max].
  List<int> distinct(int count, int max) {
    final pool = List<int>.generate(max, (i) => i)..shuffle(_r);
    return pool.take(count).toList();
  }
}

/// FNV-1a. Stable across platforms and releases, unlike `String.hashCode`.
int stableHash(String s) {
  var h = 0x811C9DC5;
  for (final unit in s.codeUnits) {
    h ^= unit;
    h = (h * 0x01000193) & 0x7FFFFFFF;
  }
  return h;
}

/// The seed shared by every player on a given calendar day.
String todayKey([DateTime? now]) {
  final d = now ?? DateTime.now();
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}
