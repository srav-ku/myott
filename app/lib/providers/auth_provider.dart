import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
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
  final GoogleSignIn _googleSignIn = GoogleSignIn();

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

  Future<void> signInWithGoogle() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled the sign-in
        state = state.copyWith(isLoading: false);
        return;
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      await _auth.signInWithCredential(credential);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await _googleSignIn.signOut();
    await _auth.signOut();
  }
}
