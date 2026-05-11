import 'package:dio/dio.dart';
import '../models/api_result.dart';

class ApiService {
  final Dio _dio;
  
  // Using localhost by default, with auto-fallback to 127.0.0.1 if blocked
  static const String defaultBaseUrl = 'http://localhost:3000';

  ApiService({String? baseUrl}) : _dio = Dio(BaseOptions(
    baseUrl: baseUrl ?? defaultBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        print('🌐 API Request: ${options.method} ${options.uri}');
        return handler.next(options);
      },
      onResponse: (response, handler) {
        print('✅ API Response: ${response.statusCode} from ${response.requestOptions.path}');
        return handler.next(response);
      },
      onError: (error, handler) {
        print('❌ API Error: ${error.message} at ${error.requestOptions.path}');
        return handler.next(error);
      },
    ));
  }

  void setToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearToken() {
    _dio.options.headers.remove('Authorization');
  }

  Future<ApiResult<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      // If localhost fails, try 127.0.0.1 automatically
      if (_dio.options.baseUrl.contains('localhost')) {
        print('🔄 Localhost failed, retrying with 127.0.0.1...');
        _dio.options.baseUrl = 'http://127.0.0.1:3000';
        return get(path, queryParameters: queryParameters, fromJson: fromJson);
      }
      return _handleError<T>(e);
    }
  }

  Future<ApiResult<T>> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      return _handleResponse<T>(response, fromJson);
    } on DioException catch (e) {
      if (_dio.options.baseUrl.contains('localhost')) {
        print('🔄 Localhost failed, retrying with 127.0.0.1...');
        _dio.options.baseUrl = 'http://127.0.0.1:3000';
        return post(path, data: data, fromJson: fromJson);
      }
      return _handleError<T>(e);
    }
  }

  ApiResult<T> _handleResponse<T>(Response response, T Function(dynamic)? fromJson) {
    final body = response.data;
    
    // Standard envelope: { ok: true, data: ... }
    if (body is Map<String, dynamic> && body['ok'] == true) {
      final data = body['data'] ?? body;
      return ApiResult.success(fromJson != null ? fromJson(data) : data as T);
    }
    
    // Fallback if no envelope but status is success
    if (response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300) {
      return ApiResult.success(fromJson != null ? fromJson(body) : body as T);
    }

    return ApiResult.failure(body['error'] ?? 'Unknown Error', response.statusCode);
  }

  ApiResult<T> _handleError<T>(DioException e) {
    String message = 'Network Error';
    if (e.response?.data is Map && e.response?.data['error'] != null) {
      message = e.response?.data['error'];
    } else if (e.message != null) {
      message = e.message!;
    }
    return ApiResult.failure(message, e.response?.statusCode);
  }
}
