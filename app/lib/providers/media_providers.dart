import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api/api_client.dart';
import '../models/media_item.dart';

final apiClientProvider = Provider((ref) => ApiClient());

final moviesProvider = FutureProvider<List<MediaItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/movies', queryParameters: {'source': 'local', 'limit': 20});
  final responseData = response.data;
  
  List results = [];
  if (responseData is List) {
    results = responseData;
  } else if (responseData is Map) {
    final nestedData = responseData['data'];
    if (nestedData is Map && nestedData['results'] is List) {
      results = nestedData['results'];
    } else if (responseData['results'] is List) {
      results = responseData['results'];
    }
  }
  
  return results.map((e) => MediaItem.fromJson(e)).toList();
});

final tvProvider = FutureProvider<List<MediaItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/tv', queryParameters: {'source': 'local', 'limit': 20});
  final responseData = response.data;
  
  List results = [];
  if (responseData is List) {
    results = responseData;
  } else if (responseData is Map) {
    final nestedData = responseData['data'];
    if (nestedData is Map && nestedData['results'] is List) {
      results = nestedData['results'];
    } else if (responseData['results'] is List) {
      results = responseData['results'];
    }
  }
  
  return results.map((e) => MediaItem.fromJson(e)).toList();
});

final collectionsProvider = FutureProvider<List<CollectionItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get('/api/collections');
    final responseData = response.data;
    
    List results = [];
    if (responseData is Map) {
      final nestedData = responseData['data'];
      if (nestedData is Map && nestedData['collections'] is List) {
        results = nestedData['collections'];
      } else if (responseData['collections'] is List) {
        results = responseData['collections'];
      }
    }
    
    return results.map((e) => CollectionItem.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

final historyProvider = FutureProvider<List<MediaItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final response = await api.get('/api/user/history');
    final responseData = response.data;
    
    List results = [];
    if (responseData is Map) {
      final nestedData = responseData['data'];
      if (nestedData is Map && nestedData['results'] is List) {
        results = nestedData['results'];
      } else if (responseData['results'] is List) {
        results = responseData['results'];
      }
    } else if (responseData is List) {
      results = responseData;
    }
    
    return results.map((e) => MediaItem.fromJson(e)).toList();
  } catch (e) {
    return [];
  }
});

final movieDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, tmdbId) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/movies/$tmdbId');
  return response.data['data'];
});

final tvDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, tmdbId) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/tv/$tmdbId');
  return response.data['data'];
});

final resolveStreamProvider = FutureProvider.family<String?, int>((ref, linkId) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/stream/$linkId');
  return response.data['url'];
});

// Updated watched providers to avoid map literals causing new provider instances each rebuild
// Provide a simple String param (mediaId) for movie and tv watched state

// Returns true if the user has marked the given movie as watched
final movieWatchedProvider = FutureProvider.family<bool, String>((ref, movieId) async {
  // Log when provider is initialized
  print('[movieWatchedProvider] init for movieId=$movieId');
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/user/watched', queryParameters: {'movie_id': movieId});
  return response.data['watched'] ?? false;
});

// Returns true if the user has marked the given TV show as watched
final tvWatchedProvider = FutureProvider.family<bool, String>((ref, tvId) async {
  print('[tvWatchedProvider] init for tvId=$tvId');
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/user/watched', queryParameters: {'tv_id': tvId});
  return response.data['watched'] ?? false;
});

// General watched list (once) – not used currently but useful
final watchedListProvider = FutureProvider<List<dynamic>>((ref) async {
  print('[watchedListProvider] fetching watched list');
  final api = ref.watch(apiClientProvider);
  final response = await api.get('/api/user/watched');
  if (response.data is List) return response.data;
  if (response.data is Map && response.data['watched'] is List) return response.data['watched'];
  return [];
});

