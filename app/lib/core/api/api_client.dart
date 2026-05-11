import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  final Dio _dio;
  
  ApiClient() : _dio = Dio() {
    _dio.options.baseUrl = dotenv.get('API_BASE_URL', fallback: 'http://localhost:3000');
    _dio.options.connectTimeout = const Duration(seconds: 15);
    _dio.options.receiveTimeout = const Duration(seconds: 15);
    
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (kDebugMode) {
          print('🌐 API Request: ${options.method} ${options.path}');
          print('🌐 Headers: ${options.headers}');
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (kDebugMode) {
          print('✅ API Response: ${response.statusCode} ${response.requestOptions.path}');
        }
        return handler.next(response);
      },
      onError: (DioException e, handler) {
        if (kDebugMode) {
          print('❌ API Error: ${e.response?.statusCode} ${e.requestOptions.path}');
          print('❌ Message: ${e.message}');
        }
        return handler.next(e);
      },
    ));
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  factory ApiException.fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException('Connection timed out');
      case DioExceptionType.badResponse:
        final data = e.response?.data;
        if (data is Map && data.containsKey('message')) {
          return ApiException(data['message'], statusCode: e.response?.statusCode);
        }
        return ApiException('Server error: ${e.response?.statusCode}', statusCode: e.response?.statusCode);
      case DioExceptionType.cancel:
        return ApiException('Request cancelled');
      default:
        return ApiException('Something went wrong');
    }
  }

  @override
  String toString() => message;
}
