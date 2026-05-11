import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/ott_components.dart';
import '../../providers/media_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(historyProvider);
            ref.invalidate(collectionsProvider);
            ref.invalidate(moviesProvider);
            ref.invalidate(tvProvider);
          },
          child: CustomScrollView(
            slivers: [
              const SliverToBoxAdapter(child: _TopHeader()),
              const SliverToBoxAdapter(child: SizedBox(height: 16)),
              
              // Continue Watching
              SliverToBoxAdapter(child: _buildContinueWatching(ref)),
              
              // Collections
              SliverToBoxAdapter(child: _buildCollections(ref)),
              
              // Movies
              SliverToBoxAdapter(child: _buildMovies(ref)),
              
              // TV Shows
              SliverToBoxAdapter(child: _buildTvShows(ref)),
              
              const SliverToBoxAdapter(child: SizedBox(height: 40)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContinueWatching(WidgetRef ref) {
    final historyAsync = ref.watch(historyProvider);
    return historyAsync.when(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        return ContentHorizontalRow(
          title: 'Continue Watching',
          items: items,
          itemBuilder: (context, item) => ContinueWatchingCard(
            title: item.title,
            imageUrl: item.backdropUrl ?? item.posterUrl,
            subtitle: item.subtitle,
            onTap: () {
              if (item.type == 'movie') {
                context.push('/movie/${item.tmdbId}');
              } else {
                context.push('/tv/${item.tmdbId}');
              }
            },
          ),
        );
      },
      loading: () => const HorizontalLoadingSkeleton(width: 220, height: 124),
      error: (e, st) => const SizedBox.shrink(),
    );
  }

  Widget _buildCollections(WidgetRef ref) {
    final collectionsAsync = ref.watch(collectionsProvider);
    return collectionsAsync.when(
      data: (items) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const HomeSectionHeader(title: 'Collections'),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: Text('No collections created', style: TextStyle(color: Colors.grey)),
              )
            else
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return CollectionCard(
                      title: item.name,
                      itemCount: '${item.itemCount} Items',
                      onTap: () {}, // TODO: Navigate to collection detail
                    );
                  },
                ),
              ),
            const SizedBox(height: 24),
          ],
        );
      },
      loading: () => const HorizontalLoadingSkeleton(width: 160, height: 80),
      error: (e, st) => const SizedBox.shrink(),
    );
  }

  Widget _buildMovies(WidgetRef ref) {
    final moviesAsync = ref.watch(moviesProvider);
    return moviesAsync.when(
      data: (items) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const HomeSectionHeader(title: 'Latest Movies'),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: Text('No movies added yet', style: TextStyle(color: Colors.grey)),
              )
            else
              ContentHorizontalRow(
                title: '', // Header handled above
                items: items,
                itemBuilder: (context, item) => ContentPosterCard(
                  title: item.title,
                  imageUrl: item.posterUrl,
                  onTap: () => context.push('/movie/${item.tmdbId}'),
                ),
              ),
          ],
        );
      },
      loading: () => const HorizontalLoadingSkeleton(width: 120, height: 180),
      error: (e, st) => const SizedBox.shrink(),
    );
  }

  Widget _buildTvShows(WidgetRef ref) {
    final tvAsync = ref.watch(tvProvider);
    return tvAsync.when(
      data: (items) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const HomeSectionHeader(title: 'Latest TV Shows'),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: Text('No TV shows added yet', style: TextStyle(color: Colors.grey)),
              )
            else
              ContentHorizontalRow(
                title: '', // Header handled above
                items: items,
                itemBuilder: (context, item) => ContentPosterCard(
                  title: item.title,
                  imageUrl: item.posterUrl,
                  onTap: () => context.push('/tv/${item.tmdbId}'),
                ),
              ),
          ],
        );
      },
      loading: () => const HorizontalLoadingSkeleton(width: 120, height: 180),
      error: (e, st) => const SizedBox.shrink(),
    );
  }

}

class _TopHeader extends StatelessWidget {
  const _TopHeader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Personal Library',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.search, color: Colors.white),
                onPressed: () {},
              ),
              const SizedBox(width: 8),
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.purpleAccent,
                ),
                child: const Icon(Icons.person, color: Colors.white, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
