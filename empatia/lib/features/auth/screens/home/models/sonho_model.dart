// lib/features/auth/screens/home/models/sonho_model.dart

class SonhoModel {
  final String id;
  final String responsavelId;
  final String responsavelNome;
  final String nomesCrianca;
  final String descricao;
  final String categoria;
  final String cidade;
  final String endereco; // privado — visível apenas para apoiadores confirmados
  final String contato;  // privado — visível apenas para apoiadores confirmados
  final String status;   // 'aprovado' | 'concluido'
  final DateTime criadoEm;
  final int totalApoios;

  const SonhoModel({
    required this.id,
    required this.responsavelId,
    required this.responsavelNome,
    required this.nomesCrianca,
    required this.descricao,
    required this.categoria,
    required this.cidade,
    required this.endereco,
    required this.contato,
    required this.status,
    required this.criadoEm,
    this.totalApoios = 0,
  });

  factory SonhoModel.fromMap(String id, Map<dynamic, dynamic> map) {
    return SonhoModel(
      id: id,
      responsavelId: map['responsavelId'] as String? ?? '',
      responsavelNome: map['responsavelNome'] as String? ?? '',
      nomesCrianca: map['nomesCrianca'] as String? ?? '',
      descricao: map['descricao'] as String? ?? '',
      categoria: map['categoria'] as String? ?? '',
      cidade: map['cidade'] as String? ?? '',
      endereco: map['endereco'] as String? ?? '',
      contato: map['contato'] as String? ?? '',
      status: map['status'] as String? ?? 'aprovado',
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        (map['criadoEm'] as int?) ?? 0,
      ),
      totalApoios: (map['totalApoios'] as int?) ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'responsavelId': responsavelId,
      'responsavelNome': responsavelNome,
      'nomesCrianca': nomesCrianca,
      'descricao': descricao,
      'categoria': categoria,
      'cidade': cidade,
      'endereco': endereco,
      'contato': contato,
      'status': status,
      'criadoEm': criadoEm.millisecondsSinceEpoch,
      'totalApoios': totalApoios,
    };
  }

  SonhoModel copyWith({
    String? id,
    String? responsavelId,
    String? responsavelNome,
    String? nomesCrianca,
    String? descricao,
    String? categoria,
    String? cidade,
    String? endereco,
    String? contato,
    String? status,
    DateTime? criadoEm,
    int? totalApoios,
  }) {
    return SonhoModel(
      id: id ?? this.id,
      responsavelId: responsavelId ?? this.responsavelId,
      responsavelNome: responsavelNome ?? this.responsavelNome,
      nomesCrianca: nomesCrianca ?? this.nomesCrianca,
      descricao: descricao ?? this.descricao,
      categoria: categoria ?? this.categoria,
      cidade: cidade ?? this.cidade,
      endereco: endereco ?? this.endereco,
      contato: contato ?? this.contato,
      status: status ?? this.status,
      criadoEm: criadoEm ?? this.criadoEm,
      totalApoios: totalApoios ?? this.totalApoios,
    );
  }
}
