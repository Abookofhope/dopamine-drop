import 'package:flutter/material.dart';

import '../../theme.dart';

/// The square play field every grid-based mode draws into.
class PuzzleGrid extends StatelessWidget {
  const PuzzleGrid({super.key, required this.columns, required this.children});

  final int columns;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: GridView.count(
        crossAxisCount: columns,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        physics: const NeverScrollableScrollPhysics(),
        children: children,
      ),
    );
  }
}

/// Wraps a mode's board with its one-line instruction.
///
/// The prompt lives inside the mode's own subtree rather than being pushed up
/// to the shell, which keeps modes from having to reach across widgets to set
/// text mid-build.
class ModeScaffold extends StatelessWidget {
  const ModeScaffold({super.key, required this.prompt, required this.child});

  final String prompt;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Text(
            prompt.toUpperCase(),
            textAlign: TextAlign.center,
            style: DD.label(12),
          ),
        ),
        Flexible(child: Center(child: child)),
      ],
    );
  }
}

/// A tappable cell with the press-scale every board shares.
class Cell extends StatefulWidget {
  const Cell({
    super.key,
    required this.onTap,
    required this.child,
    this.color,
    this.border,
    this.radius = DD.rSm,
    this.semanticLabel,
  });

  final VoidCallback? onTap;
  final Widget child;
  final Color? color;
  final Color? border;
  final double radius;
  final String? semanticLabel;

  @override
  State<Cell> createState() => _CellState();
}

class _CellState extends State<Cell> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.semanticLabel,
      button: true,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _down = true),
        onTapCancel: () => setState(() => _down = false),
        onTapUp: (_) => setState(() => _down = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _down ? 0.94 : 1,
          duration: const Duration(milliseconds: 90),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: widget.color,
              borderRadius: BorderRadius.circular(widget.radius),
              border: Border.all(
                color: widget.border ?? Colors.white.withValues(alpha: 0.06),
              ),
            ),
            child: Center(child: widget.child),
          ),
        ),
      ),
    );
  }
}
