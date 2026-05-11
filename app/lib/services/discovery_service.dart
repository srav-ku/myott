import 'package:dio/dio.dart';
import '../models/api_result.dart';
import '../models/media_content.dart';

class DiscoveryService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://api.themoviedb.org/3',
    queryParameters: {
      'api_key': '5701acdc0ce0fd37222a3c46fa2ac9aa',
    },
  ));

  Future<ApiResult<List<MediaContent>>> getMovies({
    String category = 'trending',
    int page = 1,
  }) async {
    try {
      final path = category == 'trending' ? '/trending/movie/week' : '/movie/$category';
      final response = await _dio.get(path, queryParameters: {'page': page});
      
      final List results = response.data['results'] ?? [];
      final list = results.map((m) => _mapTmdbToMedia(m, 'movie')).toList();
      return ApiResult.success(list);
    } catch (e) {
      return ApiResult.failure(e.toString());
    }
  }

  Future<ApiResult<List<MediaContent>>> getTvShows({
    String category = 'trending',
    int page = 1,
  }) async {
    try {
      final path = category == 'trending' ? '/trending/tv/week' : '/tv/$category';
      final response = await _dio.get(path, queryParameters: {'page': page});
      
      final List results = response.data['results'] ?? [];
      final list = results.map((m) => _mapTmdbToMedia(m, 'tv')).toList();
      return ApiResult.success(list);
    } catch (e) {
      return ApiResult.failure(e.toString());
    }
  }

  Future<ApiResult<List<MediaContent>>> search(String query) async {
    try {
      final response = await _dio.get('/search/multi', queryParameters: {'query': query});
      final List results = response.data['results'] ?? [];
      final list = results
          .where((m) => m['media_type'] == 'movie' || m['media_type'] == 'tv')
          .map((m) => _mapTmdbToMedia(m, m['media_type']))
          .toList();
      return ApiResult.success(list);
    } catch (e) {
      return ApiResult.failure(e.toString());
    }
  }

  Future<ApiResult<Map<String, dynamic>>> getMovieDetails(int tmdbId) async {
    try {
      final response = await _dio.get('/movie/$tmdbId');
      return ApiResult.success(response.data);
    } catch (e) {
      return ApiResult.failure(e.toString());
    }
  }

  Future<ApiResult<Map<String, dynamic>>> getTvDetails(int tmdbId) async {
    try {
      final response = await _dio.get('/tv/$tmdbId');
      return ApiResult.success(response.data);
    } catch (e) {
      return ApiResult.failure(e.toString());
    }
  }

  Future<ApiResult<List<dynamic>>> getSeasonEpisodes(int tvId, int seasonNumber) async {
    try {
      final response = await _dio.get('/tv/$tvId/season/$seasonNumber');
      return ApiResult.success(response.data['episodes'] ?? []);
    } catch (e) {
      return ApiResult.failure(e.toString());
    }
  }

  MediaContent _mapTmdbToMedia(Map<String, dynamic> m, String type) {
    return MediaContent(
      id: m['id'], // In standalone, we use TMDB ID as the primary ID
      tmdbId: m['id'],
      title: m['title'] ?? m['name'] ?? 'Untitled',
      overview: m['overview'],
      posterUrl: m['poster_path'] != null ? 'https://image.tmdb.org/t/p/w500${m['poster_path']}' : null,
      backdropUrl: m['backdrop_path'] != null ? 'https://image.tmdb.org/t/p/w780${m['backdrop_path']}' : null,
      rating: (m['vote_average'] as num?)?.toDouble(),
      releaseDate: m['release_date'] ?? m['first_air_date'],
      type: type,
    );
  }
}
