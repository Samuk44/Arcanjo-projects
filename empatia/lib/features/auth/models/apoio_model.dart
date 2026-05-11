// lib/features/auth/models/apoio_model.dart

class ApoioModel {
  final String id;
  final String sonhoId;
  final String sonhoNomesCrianca;
  final String sonhoDescricao;
  final String sonhoCategoria;
  final String sonhoCidade;
  final String doadorId;
  final String doadorNome;
  final String responsavelId;
  final String status; // pendente_entrega, entregue_pelo_doador, entregue
  final DateTime criadoEm;

  const ApoioModel({
    required this.id,
    required this.sonhoId,
    required this.sonhoNomesCrianca,
    required this.sonhoDescricao,
    required this.sonhoCategoria,
    required this.sonhoCidade,
    required this.doadorId,
    required this.doadorNome,
    required this.responsavelId,
    required this.status,
    required this.criadoEm,
  });

  factory ApoioModel.fromMap(String id, Map<dynamic, dynamic> map) {
    return ApoioModel(
      id: id,
      sonhoId: map['sonhoId']?.toString() ?? '',
      sonhoNomesCrianca: map['sonhoNomesCrianca']?.toString() ?? '',
      sonhoDescricao: map['sonhoDescricao']?.toString() ?? '',
      sonhoCategoria: map['sonhoCategoria']?.toString() ?? '',
      sonhoCidade: map['sonhoCidade']?.toString() ?? '',
      doadorId: map['doadorId']?.toString() ?? '',
      doadorNome: map['doadorNome']?.toString() ?? '',
      responsavelId: map['responsavelId']?.toString() ?? '',
      status: map['status']?.toString() ?? 'pendente_entrega',
      criadoEm: DateTime.fromMillisecondsSinceEpoch(
        (map['criadoEm'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'sonhoId': sonhoId,
      'sonhoNomesCrianca': sonhoNomesCrianca,
      'sonhoDescricao': sonhoDescricao,
      'sonhoCategoria': sonhoCategoria,
      'sonhoCidade': sonhoCidade,
      'doadorId': doadorId,
      'doadorNome': doadorNome,
      'responsavelId': responsavelId,
      'status': status,
      'criadoEm': criadoEm.millisecondsSinceEpoch,
    };
  }

  ApoioModel copyWith({
    String? id,
    String? sonhoId,
    String? sonhoNomesCrianca,
    String? sonhoDescricao,
    String? sonhoCategoria,
    String? sonhoCidade,
    String? doadorId,
    String? doadorNome,
    String? responsavelId,
    String? status,
    DateTime? criadoEm,
  }) {
    return ApoioModel(
      id: id ?? this.id,
      sonhoId: sonhoId ?? this.sonhoId,
      sonhoNomesCrianca: sonhoNomesCrianca ?? this.sonhoNomesCrianca,
      sonhoDescricao: sonhoDescricao ?? this.sonhoDescricao,
      sonhoCategoria: sonhoCategoria ?? this.sonhoCategoria,
      sonhoCidade: sonhoCidade ?? this.sonhoCidade,
      doadorId: doadorId ?? this.doadorId,
      doadorNome: doadorNome ?? this.doadorNome,
      responsavelId: responsavelId ?? this.responsavelId,
      status: status ?? this.status,
      criadoEm: criadoEm ?? this.criadoEm,
    );
  }
}
