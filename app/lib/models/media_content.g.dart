// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'media_content.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MediaContent _$MediaContentFromJson(Map<String, dynamic> json) => MediaContent(
      id: json['id'] as int?,
      tmdbId: json['tmdb_id'] as int,
      title: json['title'] as String,
      overview: json['overview'] as String?,
      posterUrl: json['poster_url'] as String?,
      backdropUrl: json['backdrop_url'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      releaseDate: json['release_date'] as String?,
      type: json['type'] as String?,
    );

Map<String, dynamic> _$MediaContentToJson(MediaContent instance) =>
    <String, dynamic>{
      'id': instance.id,
      'tmdb_id': instance.tmdbId,
      'title': instance.title,
      'overview': instance.overview,
      'poster_url': instance.posterUrl,
      'backdrop_url': instance.backdropUrl,
      'rating': instance.rating,
      'release_date': instance.releaseDate,
      'type': instance.type,
    };
