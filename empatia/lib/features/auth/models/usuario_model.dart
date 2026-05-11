// lib/features/auth/models/usuario_model.dart

class UsuarioModel {
  final String uid;
  final String nome;
  final String email;
  final String bio;
  final String fotoUrl;
  final String endereco;
  final String telefone;
  final String redeSocial;
  final int sonhosCriados;
  final int apoiosDados;
  final DateTime criadoEm;

  const UsuarioModel({
    required this.uid,
    required this.nome,
    required this.email,
    this.bio = '',
    this.fotoUrl = '',
    this.endereco = '',
    this.telefone = '',
    this.redeSocial = '',
    this.sonhosCriados = 0,
    this.apoiosDados = 0,
    required this.criadoEm,
  });

  factory UsuarioModel.fromMap(String uid, Map<dynamic, dynamic> map) {
    return UsuarioModel(
      uid: uid,
      nome: map['nome']?.toString() ?? '',
      email: map['email']?.toString() ?? '',
      bio: map['bio']?.toString() ?? '',
      fotoUrl: map['fotoUrl']?.toString() ?? '',
      endereco: map['endereco']?.toString() ?? '',
      telefone: map['telefone']?.toString() ?? '',
      redeSocial: map['redeSocial']?.toString() ?? '',
      sonhosCriados: (map['sonhosCriados'] as num?)?.toInt() ?? 0,
      apoiosDados: (map['apoiosDados'] as num?)?.toInt() ?? 0,
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        (map['criadoEm'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'nome': nome,
      'email': email,
      'bio': bio,
      'fotoUrl': fotoUrl,
      'endereco': endereco,
      'telefone': telefone,
      'redeSocial': redeSocial,
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
    String? endereco,
    String? telefone,
    String? redeSocial,
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
      endereco: endereco ?? this.endereco,
      telefone: telefone ?? this.telefone,
      redeSocial: redeSocial ?? this.redeSocial,
      sonhosCriados: sonhosCriados ?? this.sonhosCriados,
      apoiosDados: apoiosDados ?? this.apoiosDados,
      criadoEm: criadoEm ?? this.criadoEm,
    );
  }
}
