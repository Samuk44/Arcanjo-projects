// lib/features/auth/models/notificacao_model.dart

import '../utils/firebase_parse.dart';

class NotificacaoModel {
  final String id;
  final String usuarioId;
  final String titulo;
  final String corpo;
  final String tipo; // novo_apoio, entregue_pelo_doador, entregue_confirmado
  final String? sonhoId;
  final String? apoioId;
  final bool lida;
  final DateTime criadoEm;

  const NotificacaoModel({
    required this.id,
    required this.usuarioId,
    required this.titulo,
    required this.corpo,
    required this.tipo,
    this.sonhoId,
    this.apoioId,
    this.lida = false,
    required this.criadoEm,
  });

  factory NotificacaoModel.fromMap(String id, Map<dynamic, dynamic> map) {
    return NotificacaoModel(
      id: id,
      usuarioId: map['usuarioId']?.toString() ?? '',
      titulo: map['titulo']?.toString() ?? '',
      corpo: map['corpo']?.toString() ?? '',
      tipo: map['tipo']?.toString() ?? 'geral',
      sonhoId: map['sonhoId']?.toString(),
      apoioId: map['apoioId']?.toString(),
      lida: firebaseBool(map['lida']),
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        (map['criadoEm'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'usuarioId': usuarioId,
      'titulo': titulo,
      'corpo': corpo,
      'tipo': tipo,
      'sonhoId': sonhoId,
      'apoioId': apoioId,
      'lida': lida,
      'criadoEm': criadoEm.millisecondsSinceEpoch,
    };
  }

  NotificacaoModel copyWith({
    String? id,
    String? usuarioId,
    String? titulo,
    String? corpo,
    String? tipo,
    String? sonhoId,
    String? apoioId,
    bool? lida,
    DateTime? criadoEm,
  }) {
    return NotificacaoModel(
      id: id ?? this.id,
      usuarioId: usuarioId ?? this.usuarioId,
      titulo: titulo ?? this.titulo,
      corpo: corpo ?? this.corpo,
      tipo: tipo ?? this.tipo,
      sonhoId: sonhoId ?? this.sonhoId,
      apoioId: apoioId ?? this.apoioId,
      lida: lida ?? this.lida,
      criadoEm: criadoEm ?? this.criadoEm,
    );
  }
}
