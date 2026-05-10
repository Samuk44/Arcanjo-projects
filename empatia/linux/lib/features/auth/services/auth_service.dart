import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final DatabaseReference _db = FirebaseDatabase.instance.ref();

  // ── Cadastro etapa 1 — cria conta com email e senha ──────────────────────
  Future<String?> criarConta({
    required String email,
    required String senha,
  }) async {
    try {
      await _auth.createUserWithEmailAndPassword(
        email: email,
        password: senha,
      );
      return null; // null = sucesso
    } on FirebaseAuthException catch (e) {
      switch (e.code) {
        case 'email-already-in-use':
          return 'Este email já está cadastrado.';
        case 'weak-password':
          return 'A senha deve ter pelo menos 6 caracteres.';
        case 'invalid-email':
          return 'Email inválido.';
        default:
          return 'Erro ao criar conta. Tente novamente.';
      }
    }
  }

  // ── Cadastro etapa 2 — salva dados pessoais no banco ─────────────────────
  Future<String?> salvarDadosPessoais({
    required String nome,
    required String endereco,
    required String telefone,
    required String redeSocial,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return 'Usuário não autenticado.';

      await _db.child('usuarios').child(user.uid).set({
        'nome': nome,
        'endereco': endereco,
        'telefone': telefone,
        'redeSocial': redeSocial,
        'email': user.email,
        'criadoEm': DateTime.now().toIso8601String(),
      });

      return null; // null = sucesso
    } catch (e) {
      return 'Erro ao salvar dados. Tente novamente.';
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  Future<String?> login({
    required String email,
    required String senha,
  }) async {
    try {
      await _auth.signInWithEmailAndPassword(
        email: email,
        password: senha,
      );
      return null; // null = sucesso
    } on FirebaseAuthException catch (e) {
      switch (e.code) {
        case 'user-not-found':
          return 'Usuário não encontrado.';
        case 'wrong-password':
          return 'Senha incorreta.';
        case 'invalid-email':
          return 'Email inválido.';
        case 'user-disabled':
          return 'Usuário desativado.';
        default:
          return 'Erro ao fazer login. Tente novamente.';
      }
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  Future<void> logout() async {
    await _auth.signOut();
  }
}