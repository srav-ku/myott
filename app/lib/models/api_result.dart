class ApiResult<T> {
  final bool ok;
  final T? data;
  final String? error;
  final int? status;

  ApiResult({
    required this.ok,
    this.data,
    this.error,
    this.status,
  });

  factory ApiResult.success(T data) => ApiResult(ok: true, data: data);
  factory ApiResult.failure(String error, [int? status]) => 
      ApiResult(ok: false, error: error, status: status);
}
