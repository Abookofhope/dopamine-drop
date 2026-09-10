import 'dart:convert';

import 'package:dopamine_drop/engine/progression.dart';
import 'package:dopamine_drop/engine/store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The save file is the only thing in this game a player would be upset to
/// lose, and the only thing an update can silently destroy. Every case here is
/// a way that has actually happened to somebody's game.
void main() {
  Future<Store> openWith(Map<String, dynamic> saved) {
    SharedPreferences.setMockInitialValues({'dd.v1': jsonEncode(saved)});
    return Store.open();
  }

  group('surviving an update', () {
    test('a save from before versioning keeps its progress', () async {
      // Schema 1: no marker, and a single `muted` flag.
      final store = await openWith({
        'bestBlitz': 4200,
        'bestStreak': 17,
        'runs': 63,
        'xp': 9000,
        'muted': true,
        'marathon': {'odd': 800},
      });

      expect(store.bestBlitz, 4200);
      expect(store.bestStreak, 17);
      expect(store.runs, 63);
      expect(store.xp, 9000);
      expect(store.bestMarathon('odd'), 800);
      // muted:true has to arrive as sound:false, not as sound reset to on.
      expect(store.sound, isFalse);
      expect(store.haptics, isTrue);
    });

    test('a level earned on an old build is still the same level', () async {
      final store = await openWith({'xp': 53460});
      expect(Progression.levelForXp(store.xp), 100);
    });

    test('keys this build does not understand are preserved', () async {
      // Someone runs a newer build, then goes back. Whatever the newer build
      // stored must still be there when they move forward again.
      final store = await openWith({
        'xp': 500,
        'somethingFromTheFuture': {'a': 1},
      });
      await store.addXp(10);

      final reopened = await Store.open();
      expect(reopened.xp, 510);
      expect(reopened.debugSnapshot()['somethingFromTheFuture'], {'a': 1});
    });

    test('a save from a newer build is read, not downgraded', () async {
      final store = await openWith({'schema': 99, 'xp': 777, 'bestBlitz': 12});
      expect(store.xp, 777);
      expect(store.bestBlitz, 12);
      // Stamping it back down to this build's number would tell the next
      // migration to re-run steps that have already been applied.
      expect(store.debugSnapshot()['schema'], 99);
    });

    test('a fresh install is stamped with the current schema', () async {
      SharedPreferences.setMockInitialValues({});
      final store = await Store.open();
      expect(store.debugSnapshot()['schema'], Store.schemaVersion);
      expect(store.xp, 0);
    });

    test('migration runs once, not on every open', () async {
      await openWith({'xp': 100, 'muted': true});
      final again = await Store.open();
      expect(again.sound, isFalse);
      expect(again.debugSnapshot().containsKey('muted'), isFalse);
      expect(again.debugSnapshot()['schema'], Store.schemaVersion);
    });
  });

  group('surviving a bad save', () {
    test('unreadable data is quarantined, never overwritten', () async {
      SharedPreferences.setMockInitialValues({'dd.v1': '{not json at all'});
      final store = await Store.open();
      expect(store.xp, 0);

      // It is the only copy of that player's progress. Throwing it away to get
      // a clean boot turns a recoverable problem into a permanent one.
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('dd.v1.unreadable'), '{not json at all');
    });

    test('a JSON value that is not an object is quarantined too', () async {
      SharedPreferences.setMockInitialValues({'dd.v1': '[1,2,3]'});
      final store = await Store.open();
      expect(store.xp, 0);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('dd.v1.unreadable'), '[1,2,3]');
    });
  });

  group('autosave', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('every write is durable immediately, with no flush needed', () async {
      final store = await Store.open();
      await store.addXp(240);
      await store.recordBlitz(1500);

      // A different Store instance is what a relaunched app sees.
      final relaunched = await Store.open();
      expect(relaunched.xp, 240);
      expect(relaunched.bestBlitz, 1500);
    });

    test('xp accumulates across many small banks, as a run does', () async {
      final store = await Store.open();
      for (var i = 0; i < 15; i++) {
        await store.addXp(10);
      }
      expect(store.xp, 150);
      expect((await Store.open()).xp, 150);
    });

    test('flush is safe to call at any time and loses nothing', () async {
      final store = await Store.open();
      await store.addXp(60);
      await store.flush();
      await store.flush();
      expect((await Store.open()).xp, 60);
    });

    test('a personal best only moves upward', () async {
      final store = await Store.open();
      expect(await store.recordBlitz(900), isTrue);
      expect(await store.recordBlitz(400), isFalse);
      expect(store.bestBlitz, 900);
    });
  });
}
