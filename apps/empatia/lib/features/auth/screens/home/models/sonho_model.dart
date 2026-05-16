// lib/features/auth/screens/home/models/sonho_model.dart

import '../../../utils/firebase_parse.dart';

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
  final int curtidas;
  final bool curtido;
  final bool apoiado;

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
    this.curtidas = 0,
    this.curtido = false,
    this.apoiado = false,
  });

  String get nomeCrianca => nomesCrianca;
  int get apoios => totalApoios;

  factory SonhoModel.fromMap(String id, Map<dynamic, dynamic> map) {
    return SonhoModel(
      id: id,
      responsavelId: map['responsavelId']?.toString() ?? '',
      responsavelNome: map['responsavelNome']?.toString() ?? '',
      nomesCrianca: map['nomesCrianca']?.toString() ?? '',
      descricao: map['descricao']?.toString() ?? '',
      categoria: map['categoria']?.toString() ?? '',
      cidade: map['cidade']?.toString() ?? '',
      endereco: map['endereco']?.toString() ?? '',
      contato: map['contato']?.toString() ?? '',
      status: map['status']?.toString() ?? 'aprovado',
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        firebaseInt(map['criadoEm']),
      ),
      totalApoios: firebaseInt(map['totalApoios']),
      curtidas: firebaseInt(map['curtidas']),
      curtido: firebaseBool(map['curtido']),
      apoiado: firebaseBool(map['apoiado']),
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
      'curtidas': curtidas,
      'curtido': curtido,
      'apoiado': apoiado,
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
    int? curtidas,
    bool? curtido,
    bool? apoiado,
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
      curtidas: curtidas ?? this.curtidas,
      curtido: curtido ?? this.curtido,
      apoiado: apoiado ?? this.apoiado,
    );
  }
}
