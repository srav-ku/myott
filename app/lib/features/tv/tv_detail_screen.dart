import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/ott_components.dart';
import '../../providers/media_providers.dart';
import '../../services/stream_service.dart';

class TvDetailScreen extends ConsumerStatefulWidget {
  final String tmdbId;

  const TvDetailScreen({super.key, required this.tmdbId});

  @override
  ConsumerState<TvDetailScreen> createState() => _TvDetailScreenState();
}

class _TvDetailScreenState extends ConsumerState<TvDetailScreen> {
  int selectedSeasonIndex = 0;

  @override
  Widget build(BuildContext context) {
    final tvAsync = ref.watch(tvDetailProvider(widget.tmdbId));

    return Scaffold(
      backgroundColor: Colors.black,
      body: tvAsync.when(
        data: (tv) => _TvDetailBody(
          tv: tv,
          selectedSeasonIndex: selectedSeasonIndex,
          onSeasonChanged: (index) {
            setState(() => selectedSeasonIndex = index);
          },
          ref: ref,
        ),
        loading: () => const Center(child: CircularProgressIndicator(color: Colors.purpleAccent)),
        error: (e, st) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.white))),
      ),
    );
  }
}

class _TvDetailBody extends StatelessWidget {
  final Map<String, dynamic> tv;
  final int selectedSeasonIndex;
  final ValueChanged<int> onSeasonChanged;
  final WidgetRef ref;

  const _TvDetailBody({
    required this.tv,
    required this.selectedSeasonIndex,
    required this.onSeasonChanged,
    required this.ref,
  });

  @override
  Widget build(BuildContext context) {
    final seasons = List<Map<String, dynamic>>.from(tv['seasons'] ?? []);
    final currentSeason = seasons.isNotEmpty ? seasons[selectedSeasonIndex] : null;
    final episodes = currentSeason != null ? List<Map<String, dynamic>>.from(currentSeason['episodes'] ?? []) : [];

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
                if (tv['backdrop_url'] != null)
                  CachedImageWidget(
                    imageUrl: tv['backdrop_url'],
                    fit: BoxFit.cover,
                  ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black],
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
                Text(
                  tv['title'] ?? '',
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (tv['release_year'] != null) ...[
                      Text(tv['release_year'].toString(), style: const TextStyle(color: Colors.grey)),
                      const SizedBox(width: 12),
                    ],
                    Text('${tv['number_of_seasons']} Seasons', style: const TextStyle(color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  tv['overview'] ?? '',
                  style: const TextStyle(color: Colors.white70, fontSize: 16),
                ),
                const SizedBox(height: 32),
                // Season Selector
                if (seasons.isNotEmpty)
                  _SeasonSelector(
                    seasons: seasons,
                    selectedIndex: selectedSeasonIndex,
                    onChanged: onSeasonChanged,
                  ),
                const SizedBox(height: 16),
                // Episodes List
                ...episodes.map((ep) => _EpisodeRow(
                      episode: ep,
                      onPlay: () => _showStreamSelector(context, ep),
                    )).toList(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showStreamSelector(BuildContext context, Map<String, dynamic> episode) {
    final links = List<dynamic>.from(episode['links'] ?? []);
    if (links.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No links available for this episode.')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => StreamSelectorBottomSheet(
        title: 'E${episode['episode_number']}: ${episode['title']}',
        links: links,
        onStreamSelected: (link) => _onStreamSelected(context, episode, link),
      ),
    );
  }

  Future<void> _onStreamSelected(BuildContext context, Map<String, dynamic> episode, Map<String, dynamic> link) async {
    Navigator.pop(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    
    try {
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Resolving stream...'), duration: Duration(seconds: 1)),
      );

      final linkId = link['id'] as int;
      final streamUrl = await ref.read(resolveStreamProvider(linkId).future);
      
      if (streamUrl == null) {
        scaffoldMessenger.showSnackBar(const SnackBar(content: Text('Failed to resolve stream URL.')));
        return;
      }

      // Update History
      final api = ref.read(apiClientProvider);
      await api.post('/api/user/history', data: {'episode_id': episode['id']});
      ref.invalidate(historyProvider);

      await StreamService.launchStream(context, streamUrl);
    } catch (e) {
      scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }
}

class _SeasonSelector extends StatelessWidget {
  final List<Map<String, dynamic>> seasons;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _SeasonSelector({
    required this.seasons,
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white12,
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: selectedIndex,
          dropdownColor: Colors.grey[900],
          items: List.generate(seasons.length, (index) {
            return DropdownMenuItem(
              value: index,
              child: Text(
                'Season ${seasons[index]['season_number']}',
                style: const TextStyle(color: Colors.white),
              ),
            );
          }),
          onChanged: (val) {
            if (val != null) onChanged(val);
          },
        ),
      ),
    );
  }
}

class _EpisodeRow extends StatelessWidget {
  final Map<String, dynamic> episode;
  final VoidCallback onPlay;

  const _EpisodeRow({required this.episode, required this.onPlay});

  @override
  Widget build(BuildContext context) {
    final links = List<dynamic>.from(episode['links'] ?? []);
    final hasLinks = links.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              width: 120,
              height: 68,
              child: CachedImageWidget(
                imageUrl: episode['thumbnail_url'],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'E${episode['episode_number']}: ${episode['title']}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                if (hasLinks)
                  const Text('Available to watch', style: TextStyle(color: Colors.purpleAccent, fontSize: 12))
                else
                  const Text('No links available', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
          if (hasLinks)
            IconButton(
              icon: const Icon(Icons.play_circle_outline, color: Colors.white70),
              onPressed: onPlay,
            ),
        ],
      ),
    );
  }
}
