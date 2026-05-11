import 'package:json_annotation/json_annotation.dart';

part 'media_content.g.dart';

@JsonSerializable()
class MediaContent {
  final int? id;
  @JsonKey(name: 'tmdb_id')
  final int tmdbId;
  final String title;
  final String? overview;
  @JsonKey(name: 'poster_url')
  final String? posterUrl;
  @JsonKey(name: 'backdrop_url')
  final String? backdropUrl;
  final double? rating;
  @JsonKey(name: 'release_date')
  final String? releaseDate;
  @JsonKey(name: 'type')
  final String? type; // 'movie' or 'tv'

  MediaContent({
    this.id,
    required this.tmdbId,
    required this.title,
    this.overview,
    this.posterUrl,
    this.backdropUrl,
    this.rating,
    this.releaseDate,
    this.type,
  });

  factory MediaContent.fromJson(Map<String, dynamic> json) => _$MediaContentFromJson(json);
  Map<String, dynamic> toJson() => _$MediaContentToJson(this);
}
