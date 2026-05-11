import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalPersistenceService {
  static const String _historyKey = 'watch_history';
  static const String _libraryKey = 'my_library';

  Future<void> saveHistory(Map<String, dynamic> item) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_historyKey) ?? [];
    
    // Remove existing entry for same item to avoid duplicates and update position
    final itemId = item['id'];
    history.removeWhere((s) {
      final decoded = jsonDecode(s);
      return decoded['id'] == itemId;
    });

    history.insert(0, jsonEncode({
      ...item,
      'timestamp': DateTime.now().toIso8601String(),
    }));

    // Keep only last 20 items
    if (history.length > 20) {
      history.removeRange(20, history.length);
    }

    await prefs.setStringList(_historyKey, history);
  }

  Future<List<dynamic>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_historyKey) ?? [];
    return history.map((s) => jsonDecode(s)).toList();
  }

  Future<void> toggleLibrary(Map<String, dynamic> item) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> library = prefs.getStringList(_libraryKey) ?? [];
    
    final itemId = item['id'];
    bool exists = false;
    
    library.removeWhere((s) {
      final decoded = jsonDecode(s);
      if (decoded['id'] == itemId) {
        exists = true;
        return true;
      }
      return false;
    });

    if (!exists) {
      library.insert(0, jsonEncode(item));
    }

    await prefs.setStringList(_libraryKey, library);
  }

  Future<List<dynamic>> getLibrary() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> library = prefs.getStringList(_libraryKey) ?? [];
    return library.map((s) => jsonDecode(s)).toList();
  }
}
