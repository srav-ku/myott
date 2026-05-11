class MediaItem {
  final String id;
  final String tmdbId;
  final String title;
  final String? posterUrl;
  final String? backdropUrl;
  final String type; // 'movie' or 'tv'
  final String? subtitle;
  final String? releaseYear;
  final String? runtime;
  final List<String> genres;
  final String? overview;

  MediaItem({
    required this.id,
    required this.tmdbId,
    required this.title,
    this.posterUrl,
    this.backdropUrl,
    required this.type,
    this.subtitle,
    this.releaseYear,
    this.runtime,
    this.genres = const [],
    this.overview,
  });

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      id: json['id']?.toString() ?? '',
      tmdbId: (json['tmdb_id'] ?? json['tv_tmdb_id'] ?? json['id'] ?? '').toString(),
      title: json['title'] ?? json['name'] ?? json['tv_title'] ?? 'Unknown',
      posterUrl: json['poster_url'] ?? (json['poster_path'] != null ? 'https://image.tmdb.org/t/p/w500${json['poster_path']}' : null),
      backdropUrl: json['backdrop_url'] ?? (json['backdrop_path'] != null ? 'https://image.tmdb.org/t/p/w780${json['backdrop_path']}' : null),
      type: json['type'] ?? 'movie',
      subtitle: json['subtitle'],
      releaseYear: (json['release_date'] ?? json['first_air_date'] ?? '')?.toString().split('-').first,
      runtime: json['runtime']?.toString(),
      genres: json['genres'] != null ? List<String>.from(json['genres']) : [],
      overview: json['overview'],
    );
  }
}

class CollectionItem {
  final String id;
  final String name;
  final int itemCount;

  CollectionItem({
    required this.id,
    required this.name,
    required this.itemCount,
  });

  factory CollectionItem.fromJson(Map<String, dynamic> json) {
    return CollectionItem(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Unknown',
      itemCount: json['item_count'] ?? 0,
    );
  }
}
