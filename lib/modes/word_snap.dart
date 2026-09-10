import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// Unscramble the word by tapping letters in order.
///
/// The only mode with a language dependency, which is why it sits last on the
/// ladder: every other mode ships to every locale untouched, and this one needs
/// a curated word list per language before the game can be localised.
class WordSnap extends PuzzleMode {
  const WordSnap();

  @override
  String get id => 'word';
  @override
  String get name => 'Word Snap';
  @override
  String get blurb => 'Unscramble the word, letter by letter';
  @override
  Duration get par => const Duration(milliseconds: 6500);
  @override
  Duration get bonus => const Duration(milliseconds: 2000);

  @override
  Widget build(PuzzleContext ctx) => _WordBoard(ctx: ctx);
}

/// Short, common, unambiguous. Kept deliberately plain: a puzzle that hinges on
/// vocabulary stops being a reaction game and starts being a quiz.
const _words = <int, List<String>>{
  4: ['CALM', 'DRIP', 'GLOW', 'LOOP', 'MIND', 'RUSH', 'SNAP', 'TIDE', 'WAVE', 'ZONE'],
  5: ['BLINK', 'CHASE', 'DRIFT', 'FLASH', 'PULSE', 'QUICK', 'SHIFT', 'SPARK', 'TRACE', 'BURST'],
  6: ['BOUNCE', 'CIRCLE', 'FIDGET', 'MIRROR', 'PUZZLE', 'REWIRE', 'SIGNAL', 'STREAK'],
};

class _WordBoard extends StatefulWidget {
  const _WordBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_WordBoard> createState() => _WordBoardState();
}

class _WordBoardState extends State<_WordBoard> {
  late final String _word;
  late final List<String> _tiles;
  final Set<int> _used = {};
  int _at = 0;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    final length = ctx.level < 5
        ? 4
        : ctx.level < 12
            ? 5
            : 6;
    _word = ctx.rng.pick(_words[length]!);

    // Reshuffle until it is not already spelled out — a free point is not a
    // puzzle, and with four letters it happens more often than you would think.
    var scrambled = ctx.rng.shuffled(_word.split(''));
    for (var i = 0; i < 20 && scrambled.join() == _word; i++) {
      scrambled = ctx.rng.shuffled(_word.split(''));
    }
    _tiles = scrambled;
  }

  void _tap(int index) {
    if (_used.contains(index)) return;
    if (_tiles[index] != _word[_at]) {
      widget.ctx.onMissed();
      return;
    }
    setState(() {
      _used.add(index);
      _at++;
    });
    if (_at >= _word.length) widget.ctx.onSolved();
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Spell the ${_word.length}-letter word',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < _word.length; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                Container(
                  width: 38,
                  height: 46,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: i < _at ? DD.cool : Colors.white.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(DD.rSm),
                    border: Border.all(color: i < _at ? DD.cool : DD.edgeSoft),
                  ),
                  child: Text(
                    i < _at ? _word[i] : '',
                    style: DD.data(19, color: i < _at ? DD.ink : DD.cream),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 26),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              for (var i = 0; i < _tiles.length; i++)
                SizedBox(
                  width: 52,
                  height: 56,
                  child: Opacity(
                    opacity: _used.contains(i) ? 0.25 : 1,
                    child: Cell(
                      radius: DD.rMd,
                      semanticLabel: _tiles[i],
                      color: DD.ink3,
                      border: DD.edge,
                      onTap: _used.contains(i) ? null : () => _tap(i),
                      child: Text(_tiles[i], style: DD.data(21)),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
