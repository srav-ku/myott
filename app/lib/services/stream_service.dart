import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/material.dart';

class StreamService {
  static Future<void> launchStream(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not launch player. Ensure VLC or MX Player is installed.')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error launching player: $e')),
        );
      }
    }
  }
}
