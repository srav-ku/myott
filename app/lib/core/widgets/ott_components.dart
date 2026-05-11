import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class CachedImageWidget extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const CachedImageWidget({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final br = borderRadius ?? BorderRadius.circular(0);
    if (imageUrl == null || imageUrl!.isEmpty) {
      return Container(
        width: width,
        height: height,
        decoration: BoxDecoration(color: Colors.grey[900], borderRadius: br),
        child: const Icon(Icons.movie, color: Colors.white24),
      );
    }
    return ClipRRect(
      borderRadius: br,
      child: CachedNetworkImage(
        imageUrl: imageUrl!,
        width: width,
        height: height,
        fit: fit,
        placeholder: (context, url) => Container(
          width: width,
          height: height,
          color: Colors.grey[900],
        ),
        errorWidget: (context, url, error) => Container(
          width: width,
          height: height,
          color: Colors.grey[900],
          child: const Icon(Icons.broken_image, color: Colors.white24),
        ),
      ),
    );
  }
}

class HomeSectionHeader extends StatelessWidget {
  final String title;

  const HomeSectionHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }
}

class ContentPosterCard extends StatelessWidget {
  final String? imageUrl;
  final String title;
  final VoidCallback onTap;

  const ContentPosterCard({
    super.key,
    required this.imageUrl,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        margin: const EdgeInsets.only(right: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CachedImageWidget(
              imageUrl: imageUrl,
              width: 120,
              height: 180,
              borderRadius: BorderRadius.circular(8),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}

class ContinueWatchingCard extends StatelessWidget {
  final String? imageUrl;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const ContinueWatchingCard({
    super.key,
    required this.imageUrl,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 220,
        margin: const EdgeInsets.only(right: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                CachedImageWidget(
                  imageUrl: imageUrl,
                  width: 220,
                  height: 124,
                  borderRadius: BorderRadius.circular(8),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.play_arrow, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ]
          ],
        ),
      ),
    );
  }
}

class CollectionCard extends StatelessWidget {
  final String title;
  final String itemCount;
  final VoidCallback onTap;

  const CollectionCard({
    super.key,
    required this.title,
    required this.itemCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 12.0),
        decoration: BoxDecoration(
          color: Colors.grey[900],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[800]!),
        ),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              itemCount,
              style: const TextStyle(fontSize: 12, color: Colors.purpleAccent),
            ),
          ],
        ),
      ),
    );
  }
}

class HorizontalLoadingSkeleton extends StatelessWidget {
  final double width;
  final double height;
  final int count;

  const HorizontalLoadingSkeleton({
    super.key,
    required this.width,
    required this.height,
    this.count = 5,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height + 30, // extra for text space
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        itemCount: count,
        itemBuilder: (context, index) {
          return Container(
            width: width,
            margin: const EdgeInsets.only(right: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: width,
                  height: height,
                  decoration: BoxDecoration(
                    color: Colors.grey[900],
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: width * 0.7,
                  height: 12,
                  color: Colors.grey[900],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class ContentHorizontalRow extends StatelessWidget {
  final String title;
  final List<dynamic> items;
  final Widget Function(BuildContext, dynamic) itemBuilder;

  const ContentHorizontalRow({
    super.key,
    required this.title,
    required this.items,
    required this.itemBuilder,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        HomeSectionHeader(title: title),
        SizedBox(
          height: 220, // Approx height for posters + text
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            itemCount: items.length,
            itemBuilder: (context, index) {
              return itemBuilder(context, items[index]);
            },
          ),
        ),
      ],
    );
  }
}

class StreamSelectorBottomSheet extends StatelessWidget {
  final String title;
  final List<dynamic> links;
  final Function(Map<String, dynamic> link) onStreamSelected;

  const StreamSelectorBottomSheet({
    super.key,
    required this.title,
    required this.links,
    required this.onStreamSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Color(0xFF1A1A1A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 8),
          const Text(
            'Select streaming quality',
            style: TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 24),
          ...links.map((link) => _StreamLinkTile(
                link: link,
                onTap: () => onStreamSelected(Map<String, dynamic>.from(link)),
              )),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _StreamLinkTile extends StatelessWidget {
  final dynamic link;
  final VoidCallback onTap;

  const _StreamLinkTile({required this.link, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final quality = link['quality'] ?? 'Unknown';
    final type = link['type'] ?? 'direct';
    final languages = List<String>.from(link['languages'] ?? []);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white10),
            borderRadius: BorderRadius.circular(12),
            color: Colors.white.withOpacity(0.05),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.purpleAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  quality,
                  style: const TextStyle(color: Colors.purpleAccent, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${type.toString().toUpperCase()} Stream',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      languages.join(', '),
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.play_circle_filled, color: Colors.purpleAccent),
            ],
          ),
        ),
      ),
    );
  }
}
