// lib/features/auth/services/auth_service.dart

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import '../models/usuario_model.dart';

class AuthService {
  final _auth = FirebaseAuth.instance;
  final _db = FirebaseDatabase.instance.ref();

  User? get usuarioAtual => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // ─────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────

  Future<UserCredential> login(String email, String senha) async {
    return await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: senha,
    );
  }

  Future<UserCredential> criarConta(String email, String senha) async {
    return await cadastrar(email, senha);
  }

  Future<UserCredential> cadastrar(String email, String senha) async {
    return await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: senha,
    );
  }

  Future<void> logout() async {
    await _auth.signOut();
  }

  // ─────────────────────────────────────────────
  // USUÁRIO
  // ─────────────────────────────────────────────

  Future<void> salvarDadosPessoais({
    required String uid,
    required String nome,
    required String email,
    String endereco = '',
    String telefone = '',
    String redeSocial = '',
  }) async {
    final usuario = UsuarioModel(
      uid: uid,
      nome: nome,
      email: email,
      endereco: endereco,
      telefone: telefone,
      redeSocial: redeSocial,
      criadoEm: DateTime.now(),
    );
    await salvarDadosUsuario(usuario);
  }

  Future<void> salvarDadosUsuario(UsuarioModel usuario) async {
    await _db.child('usuarios/${usuario.uid}').set(usuario.toMap());
  }

  Future<UsuarioModel?> buscarUsuario(String uid) async {
    final snapshot = await _db.child('usuarios/$uid').get();
    if (!snapshot.exists) return null;
    return UsuarioModel.fromMap(uid, Map<dynamic, dynamic>.from(snapshot.value as Map));
  }

  Stream<UsuarioModel?> streamUsuario(String uid) {
    return _db.child('usuarios/$uid').onValue.map((event) {
      if (!event.snapshot.exists) return null;
      return UsuarioModel.fromMap(
        uid,
        Map<dynamic, dynamic>.from(event.snapshot.value as Map),
      );
    });
  }

  Future<void> atualizarPerfil({
    required String uid,
    required String nome,
    required String bio,
    String? fotoUrl,
  }) async {
    final patch = <String, dynamic>{
      'nome': nome,
      'bio': bio,
    };
    if (fotoUrl != null) patch['fotoUrl'] = fotoUrl;
    await _db.child('usuarios/$uid').update(patch);
  }

  /// Salva a string Base64 da foto diretamente no Realtime Database.
  /// Não requer Firebase Storage habilitado.
  Future<void> salvarFotoBase64(String uid, String base64String) async {
    await _db.child('usuarios/$uid').update({'fotoUrl': base64String});
  }
}
