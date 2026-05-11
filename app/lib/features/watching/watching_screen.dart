import 'package:flutter/material.dart';

class WatchingScreen extends StatelessWidget {
  const WatchingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Continue Watching')),
      body: const Center(child: Text('Watching Screen Foundation')),
    );
  }
}
