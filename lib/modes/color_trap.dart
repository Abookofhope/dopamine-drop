import 'package:flutter/material.dart';

import '../engine/mode.dart';
import '../theme.dart';
import '../ui/widgets/board.dart';

/// The Stroop task: a colour word printed in a different ink. Tap the ink.
///
/// The interference is the point — reading is automatic and has to be
/// suppressed, which is why this mode feels harder than it looks.
///
/// With colour assist the word carries the ink's shape and every swatch carries
/// its own, so the match can be made on shape alone. The conflict lives in the
/// *word*, not in the colour, so the puzzle is unchanged — a player who cannot
/// see the difference between red and green still has to suppress reading.
class ColorTrap extends PuzzleMode {
  const ColorTrap();

  @override
  String get id => 'stroop';
  @override
  String get name => 'Color Trap';
  @override
  String get blurb => 'Match the ink colour, ignore the word';
  @override
  Duration get par => const Duration(milliseconds: 2400);
  @override
  Duration get bonus => const Duration(milliseconds: 1200);

  @override
  Widget build(PuzzleContext ctx) => _TrapBoard(ctx: ctx);
}

class _TrapBoard extends StatefulWidget {
  const _TrapBoard({required this.ctx});
  final PuzzleContext ctx;

  @override
  State<_TrapBoard> createState() => _TrapBoardState();
}

class _TrapBoardState extends State<_TrapBoard> {
  late final List<PuzzleInk> _options;
  late final PuzzleInk _ink;
  late final PuzzleInk _word;

  @override
  void initState() {
    super.initState();
    final ctx = widget.ctx;
    final count = (3 + ctx.level ~/ 3).clamp(3, 5);
    _options = ctx.rng.shuffled(DD.inks).take(count).toList();
    _ink = ctx.rng.pick(_options);
    final others = _options.where((c) => c.name != _ink.name).toList();
    _word = others.isEmpty ? _ink : ctx.rng.pick(others);
  }

  @override
  Widget build(BuildContext context) {
    return ModeScaffold(
      prompt: 'Tap the colour it is printed in',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Semantics(
            label: 'The word ${_word.name} printed in ${_ink.name}',
            child: ExcludeSemantics(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: FittedBox(
                      child: Text(_word.name,
                          style: DD.display(68, color: _ink.color)),
                    ),
                  ),
                  if (widget.ctx.colorAssist) ...[
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 40,
                      height: 40,
                      child: ShapeMark(ink: _ink, showShape: true, filled: false),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          Wrap(
            // Sized so the maximum five options stay on one row: a set that
            // wraps reads as two groups and slows the answer down for a reason
            // that has nothing to do with the puzzle.
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              for (final option in widget.ctx.rng.shuffled(_options))
                SizedBox(
                  width: 54,
                  height: 54,
                  child: Cell(
                    radius: 16,
                    semanticLabel: option.name.toLowerCase(),
                    color: widget.ctx.colorAssist ? null : option.color,
                    border: Colors.white.withValues(alpha: 0.12),
                    onTap: option.name == _ink.name
                        ? widget.ctx.onSolved
                        : widget.ctx.onMissed,
                    child: widget.ctx.colorAssist
                        ? ShapeMark(ink: option, showShape: true, radius: 16)
                        : const SizedBox.expand(),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
