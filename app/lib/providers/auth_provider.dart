import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final authProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.isLoading = false, this.error});

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  @override
  AuthState build() {
    _init();
    return AuthState(isLoading: true);
  }

  void _init() {
    _auth.authStateChanges().listen((user) async {
      if (user != null) {
        final idToken = await user.getIdToken();
        final prefs = await SharedPreferences.getInstance();
        if (idToken != null) {
          await prefs.setString('auth_token', idToken);
        }
      } else {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('auth_token');
      }
      state = state.copyWith(user: user, isLoading: false);
    });
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true);
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await _auth.signOut();
  }
}
