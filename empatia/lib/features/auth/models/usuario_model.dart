// lib/features/auth/models/usuario_model.dart

class UsuarioModel {
  final String uid;
  final String nome;
  final String email;
  final String bio;
  final String fotoUrl; // URL do Firebase Storage
  final int sonhosCriados;
  final int apoiosDados;
  final DateTime criadoEm;

  const UsuarioModel({
    required this.uid,
    required this.nome,
    required this.email,
    this.bio = '',
    this.fotoUrl = '',
    this.sonhosCriados = 0,
    this.apoiosDados = 0,
    required this.criadoEm,
  });

  factory UsuarioModel.fromMap(String uid, Map<dynamic, dynamic> map) {
    return UsuarioModel(
      uid: uid,
      nome: map['nome'] as String? ?? '',
      email: map['email'] as String? ?? '',
      bio: map['bio'] as String? ?? '',
      fotoUrl: map['fotoUrl'] as String? ?? '',
      sonhosCriados: (map['sonhosCriados'] as int?) ?? 0,
      apoiosDados: (map['apoiosDados'] as int?) ?? 0,
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        (map['criadoEm'] as int?) ?? 0,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'nome': nome,
      'email': email,
      'bio': bio,
      'fotoUrl': fotoUrl,
      'sonhosCriados': sonhosCriados,
      'apoiosDados': apoiosDados,
      'criadoEm': criadoEm.millisecondsSinceEpoch,
    };
  }

  UsuarioModel copyWith({
    String? uid,
    String? nome,
    String? email,
    String? bio,
    String? fotoUrl,
    int? sonhosCriados,
    int? apoiosDados,
    DateTime? criadoEm,
  }) {
    return UsuarioModel(
      uid: uid ?? this.uid,
      nome: nome ?? this.nome,
      email: email ?? this.email,
      bio: bio ?? this.bio,
      fotoUrl: fotoUrl ?? this.fotoUrl,
      sonhosCriados: sonhosCriados ?? this.sonhosCriados,
      apoiosDados: apoiosDados ?? this.apoiosDados,
      criadoEm: criadoEm ?? this.criadoEm,
    );
  }
}
