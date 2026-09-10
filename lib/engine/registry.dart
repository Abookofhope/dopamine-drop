import '../modes/blink.dart';
import '../modes/color_trap.dart';
import '../modes/count_fast.dart';
import '../modes/echo.dart';
import '../modes/mirror.dart';
import '../modes/odd_one_out.dart';
import '../modes/rewire.dart';
import '../modes/rising_tap.dart';
import '../modes/slide_path.dart';
import '../modes/snap_order.dart';
import '../modes/sum_snap.dart';
import '../modes/word_snap.dart';
import 'mode.dart';
import 'progression.dart';
import 'rng.dart';
import 'run.dart';

/// Every mode the game knows about.
///
/// Adding a puzzle is: write the mode file, add one line here. Nothing in the
/// shell, the HUD, the scoring or the home screen needs to change — which is
/// the whole reason the contract in `mode.dart` exists.
const List<PuzzleMode> kModes = [
  OddOneOut(),
  SnapOrder(),
  ColorTrap(),
  Echo(),
  Rewire(),
  SumSnap(),
  CountFast(),
  Mirror(),
  RisingTap(),
  Blink(),
  SlidePath(),
  WordSnap(),
];

PuzzleMode modeById(String id) => kModes.firstWhere((m) => m.id == id);

/// Display name for any rung of the ladder, real or promised.
String unlockName(Unlock u) => u.plannedName ??
    (u.modeId != null
        ? modeById(u.modeId!).name
        : RunSpec.all[u.runKind]!.label);

/// The modes a player at [playerLevel] is allowed to see.
///
/// Always at least one: the ladder's first rung is level 1, so a fresh install
/// still has something to play.
List<PuzzleMode> unlockedModes(int playerLevel) {
  final unlocked =
      kModes.where((m) => isModeUnlocked(m.id, playerLevel)).toList();
  return unlocked.isEmpty ? [kModes.first] : unlocked;
}

/// Never the same mode twice in a row — back-to-back repeats read as "the game
/// is stuck" and undercut the one thing this game sells.
///
/// Rotates over [pool], which is the unlocked set rather than every mode. Early
/// on that pool can be a single mode, and then repeating it is the only option.
PuzzleMode nextMode(Rng rng, String? previousId, {List<PuzzleMode>? pool}) {
  final modes = pool ?? kModes;
  if (modes.length < 2) return modes.first;
  PuzzleMode candidate;
  var guard = 0;
  do {
    candidate = rng.pick(modes);
  } while (candidate.id == previousId && guard++ < 20);
  return candidate;
}
