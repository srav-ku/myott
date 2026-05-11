import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/ott_components.dart';
import '../../providers/media_providers.dart';
import '../../services/stream_service.dart';

class MovieDetailScreen extends ConsumerWidget {
  final String tmdbId;

  const MovieDetailScreen({super.key, required this.tmdbId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final movieAsync = ref.watch(movieDetailProvider(tmdbId));

    return Scaffold(
      backgroundColor: Colors.black,
      body: movieAsync.when(
        data: (movie) => _MovieDetailBody(movie: movie, ref: ref),
        loading: () => const Center(child: CircularProgressIndicator(color: Colors.purpleAccent)),
        error: (e, st) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.white))),
      ),
    );
  }
}

class _MovieDetailBody extends StatelessWidget {
  final Map<String, dynamic> movie;
  final WidgetRef ref;

  const _MovieDetailBody({required this.movie, required this.ref});

  @override
  Widget build(BuildContext context) {
    final genres = List<String>.from(movie['genres'] ?? []);
    final backdropUrl = movie['backdrop_url'];
    final posterUrl = movie['poster_url'];

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 250,
          pinned: true,
          backgroundColor: Colors.black,
          leading: IconButton(
            icon: const CircleAvatar(
              backgroundColor: Colors.black54,
              child: Icon(Icons.arrow_back, color: Colors.white),
            ),
            onPressed: () => context.pop(),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                if (backdropUrl != null)
                  CachedImageWidget(
                    imageUrl: backdropUrl,
                    fit: BoxFit.cover,
                  ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black,
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (posterUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 120,
                          height: 180,
                          child: CachedImageWidget(imageUrl: posterUrl),
                        ),
                      ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            movie['title'] ?? '',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              if (movie['release_year'] != null) ...[
                                Text(
                                  movie['release_year'].toString(),
                                  style: const TextStyle(color: Colors.grey),
                                ),
                                const SizedBox(width: 12),
                              ],
                              if (movie['runtime'] != null) ...[
                                Text(
                                  '${movie['runtime']} min',
                                  style: const TextStyle(color: Colors.grey),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: genres
                                .take(3)
                                .map((g) => Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        g,
                                        style: const TextStyle(
                                            color: Colors.grey, fontSize: 12),
                                      ),
                                    ))
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Text(
                  'Overview',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  movie['overview'] ?? 'No overview available.',
                  style: const TextStyle(color: Colors.white70, fontSize: 16),
                ),
                const SizedBox(height: 32),
                _buildActionButtons(context, ref),
                const SizedBox(height: 32),
                const Text(
                  'Available Qualities',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                _buildStreamOptions(context, ref, movie['links'] ?? []),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context, WidgetRef ref) {
    // Use movieWatchedProvider with simple string param to avoid rebuild loops
    final isWatchedAsync = ref.watch(movieWatchedProvider(movie['id'].toString()));
    final isWatched = isWatchedAsync.value ?? false;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _ActionButton(
          icon: Icons.play_arrow,
          label: 'Play',
          onTap: () => _showStreamSelector(context, ref),
          primary: true,
        ),
        _ActionButton(
          icon: isWatched ? Icons.check_circle : Icons.check_circle_outline,
          label: 'Watched',
          onTap: () => _toggleWatched(context, ref, isWatched),
          primary: isWatched,
        ),
        _ActionButton(
          icon: Icons.add,
          label: 'List',
          onTap: () {},
        ),
      ],
    );
  }

  Future<void> _toggleWatched(BuildContext context, WidgetRef ref, bool current) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.post('/api/user/watched', data: {'movie_id': movie['id']});
      // Invalidate the specific provider instance
      ref.invalidate(movieWatchedProvider(movie['id'].toString()));
      ref.invalidate(historyProvider); // Refresh history after change
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _showStreamSelector(BuildContext context, WidgetRef ref) {
    final links = List<dynamic>.from(movie['links'] ?? []);
    if (links.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No links available for this movie.')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => StreamSelectorBottomSheet(
        title: movie['title'] ?? 'Select Stream',
        links: links,
        onStreamSelected: (link) => _onStreamSelected(context, ref, link),
      ),
    );
  }

  Future<void> _onStreamSelected(BuildContext context, WidgetRef ref, Map<String, dynamic> link) async {
    Navigator.pop(context); // Close bottom sheet
    
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    
    try {
      // 1. Show loading
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Resolving stream...'), duration: Duration(seconds: 1)),
      );

      // 2. Resolve final URL
      final linkId = link['id'] as int;
      final streamUrl = await ref.read(resolveStreamProvider(linkId).future);
      
      if (streamUrl == null) {
        scaffoldMessenger.showSnackBar(const SnackBar(content: Text('Failed to resolve stream URL.')));
        return;
      }

      // 3. Update History
      final api = ref.read(apiClientProvider);
      await api.post('/api/user/history', data: {'movie_id': movie['id']});
      ref.invalidate(historyProvider); // Refresh home screen history

      // 4. Launch Player
      await StreamService.launchStream(context, streamUrl);

    } catch (e) {
      scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Widget _buildStreamOptions(BuildContext context, WidgetRef ref, List links) {
    if (links.isEmpty) {
      return const Text(
        'No streaming links available in database.',
        style: TextStyle(color: Colors.grey),
      );
    }

    return Column(
      children: links.map((l) {
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const Icon(Icons.slow_motion_video, color: Colors.purpleAccent),
          title: Text(
            '${l['quality']} (${l['type']})',
            style: const TextStyle(color: Colors.white),
          ),
          subtitle: Text(
            (l['languages'] as List).join(', '),
            style: const TextStyle(color: Colors.grey),
          ),
          trailing: const Icon(Icons.play_circle_fill, color: Colors.purpleAccent),
          onTap: () => _onStreamSelected(context, ref, Map<String, dynamic>.from(l)),
        );
      }).toList(),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool primary;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Icon(
            icon,
            color: primary ? Colors.purpleAccent : Colors.white,
            size: 32,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: primary ? Colors.purpleAccent : Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
