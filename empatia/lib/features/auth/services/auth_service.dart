// lib/features/auth/services/auth_service.dart

import 'dart:io';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../models/usuario_model.dart';

class AuthService {
  final _auth = FirebaseAuth.instance;
  final _db = FirebaseDatabase.instance.ref();
  final _storage = FirebaseStorage.instance;

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
  }) async {
    await _db.child('usuarios/$uid').update({
      'nome': nome,
      'bio': bio,
    });
  }

  /// Faz upload da foto de perfil para o Firebase Storage e salva a URL no banco.
  Future<String> uploadFotoPerfil(String uid, File foto) async {
    final ref = _storage.ref().child('fotos_perfil/$uid.jpg');
    await ref.putFile(foto);
    final url = await ref.getDownloadURL();
    await _db.child('usuarios/$uid').update({'fotoUrl': url});
    return url;
  }
}
