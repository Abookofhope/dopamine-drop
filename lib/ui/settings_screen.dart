import 'package:flutter/material.dart';

import '../engine/settings.dart';
import '../engine/store.dart';
import '../theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key, required this.settings, required this.store});

  final Settings settings;
  final Store store;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  Future<void> _confirmReset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: DD.ink2,
        title: Text('Reset progress?', style: DD.body(17, weight: FontWeight.w700)),
        content: Text(
          'Your level, XP and every personal best go back to zero. '
          'Settings are kept. This cannot be undone.',
          style: DD.body(14, color: DD.haze),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            style: TextButton.styleFrom(foregroundColor: DD.haze),
            child: Text('Cancel', style: DD.body(14, color: DD.haze)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: DD.bad),
            child: Text('Reset', style: DD.body(14, color: DD.bad)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await widget.store.resetProgress();
    if (!mounted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      backgroundColor: DD.ink2,
      content: Text('Progress reset.', style: DD.body(13)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.settings;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              children: [
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_rounded, size: 20),
                      color: DD.haze,
                      tooltip: 'Back',
                    ),
                    Text('SETTINGS', style: DD.label(10)),
                  ],
                ),
                const SizedBox(height: 10),

                _Group(label: 'Feedback', children: [
                  _Toggle(
                    title: 'Sound',
                    subtitle: 'Taps, streak chimes and the run-over sting',
                    value: s.sound,
                    onChanged: s.setSound,
                  ),
                  _Toggle(
                    title: 'Vibration',
                    subtitle: 'A short pulse on every answer',
                    value: s.haptics,
                    onChanged: s.setHaptics,
                  ),
                  _Toggle(
                    title: 'Reduce motion',
                    subtitle: 'No particles, no screen shake',
                    value: s.reduceMotion,
                    onChanged: s.setReduceMotion,
                  ),
                ]),

                _Group(label: 'Accessibility', children: [
                  _Toggle(
                    title: 'Colour assist',
                    subtitle:
                        'Adds shapes and brightness so no puzzle depends on '
                        'telling two colours apart',
                    value: s.colorAssist,
                    onChanged: s.setColorAssist,
                    preview: const _ColorAssistPreview(),
                  ),
                ]),

                _Group(label: 'Data', children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Reset progress',
                        style: DD.body(14.5,
                            color: DD.bad, weight: FontWeight.w600)),
                    subtitle: Text(
                      'Level, XP and every best score. Settings are kept.',
                      style: DD.body(11.5, color: DD.haze),
                    ),
                    trailing: const Icon(Icons.delete_outline_rounded,
                        color: DD.bad, size: 20),
                    onTap: _confirmReset,
                  ),
                ]),

                const SizedBox(height: 12),
                Text(
                  'Progress is stored on this device only. There is no account, '
                  'and nothing here is uploaded.',
                  style: DD.body(11, color: DD.haze),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.label, required this.children});
  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 14, bottom: 6),
          child: Row(children: [
            Text(label.toUpperCase(), style: DD.label(9)),
            const SizedBox(width: 9),
            const Expanded(child: Divider(color: DD.edgeSoft)),
          ]),
        ),
        ...children,
      ],
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.preview,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  /// Shown under the row while the setting is on, so the player can see what it
  /// did without leaving the screen and starting a run.
  final Widget? preview;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          value: value,
          onChanged: onChanged,
          activeThumbColor: DD.ink,
          activeTrackColor: DD.cool,
          title: Text(title, style: DD.body(14.5, weight: FontWeight.w600)),
          subtitle: Text(subtitle, style: DD.body(11.5, color: DD.haze)),
        ),
        if (preview != null && value)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: preview,
          ),
      ],
    );
  }
}

class _ColorAssistPreview extends StatelessWidget {
  const _ColorAssistPreview();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(DD.rMd),
        border: Border.all(color: DD.edgeSoft),
      ),
      child: Row(
        children: [
          for (final ink in DD.inks.take(5)) ...[
            SizedBox(
              width: 34,
              height: 34,
              child: ShapeMark(ink: ink, showShape: true),
            ),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Text('Every colour also carries a shape',
                style: DD.body(11, color: DD.haze)),
          ),
        ],
      ),
    );
  }
}
