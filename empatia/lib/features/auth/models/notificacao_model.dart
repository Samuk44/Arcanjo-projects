// lib/features/auth/models/notificacao_model.dart

class NotificacaoModel {
  final String id;
  final String usuarioId;
  final String titulo;
  final String corpo;
  final String tipo; // 'novo_apoio' | 'entregue_pelo_doador' | 'entregue_confirmado'
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
      usuarioId: map['usuarioId'] as String? ?? '',
      titulo: map['titulo'] as String? ?? '',
      corpo: map['corpo'] as String? ?? '',
      tipo: map['tipo'] as String? ?? '',
      sonhoId: map['sonhoId'] as String?,
      apoioId: map['apoioId'] as String?,
      lida: (map['lida'] as bool?) ?? false,
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        (map['criadoEm'] as int?) ?? 0,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'usuarioId': usuarioId,
      'titulo': titulo,
      'corpo': corpo,
      'tipo': tipo,
      if (sonhoId != null) 'sonhoId': sonhoId,
      if (apoioId != null) 'apoioId': apoioId,
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
