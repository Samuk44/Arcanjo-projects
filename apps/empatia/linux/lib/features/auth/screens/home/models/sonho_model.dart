class SonhoModel {
  final String id;
  final String nomeCrianca; // só primeiro nome
  final String descricao;
  final String categoria;
  final String cidade;
  final String imagemUrl;
  final String? patrocinadorImagem;
  final String? patrocinadorNome;
  final int curtidas;
  final int apoios;
  final bool curtido;
  final bool apoiado;

  // ── Campos novos ──────────────────────────────────────────────────────────
  final String responsavelId; // UID do responsável no Firebase
  final String status; // 'pendente' | 'aprovado' | 'recusado'
  final String? enderecoPrivado; // visível só após adoção — nunca no feed
  final String? contatoPrivado; // telefone do responsável — só após adoção
  final String? fotoUrl; // foto do item desejado, não da criança
  final DateTime? criadoEm;

  const SonhoModel({
    required this.id,
    required this.nomeCrianca,
    required this.descricao,
    required this.categoria,
    required this.cidade,
    required this.imagemUrl,
    required this.responsavelId,
    this.status = 'pendente',
    this.patrocinadorImagem,
    this.patrocinadorNome,
    required this.curtidas,
    required this.apoios,
    this.curtido = false,
    this.apoiado = false,
    this.enderecoPrivado,
    this.contatoPrivado,
    this.fotoUrl,
    this.criadoEm,
  });

  // ── Converte dados do Firebase para SonhoModel ────────────────────────────
  factory SonhoModel.fromMap(String id, Map<dynamic, dynamic> map) {
    return SonhoModel(
      id: id,
      nomeCrianca: map['nomeCrianca']?.toString() ?? '',
      descricao: map['descricao']?.toString() ?? '',
      categoria: map['categoria']?.toString() ?? 'EMPATIA',
      cidade: map['cidade']?.toString() ?? '',
      imagemUrl: map['imagemUrl']?.toString() ?? '',
      responsavelId: map['responsavelId']?.toString() ?? '',
      status: map['status']?.toString() ?? 'pendente',
      patrocinadorNome: map['patrocinadorNome']?.toString(),
      patrocinadorImagem: map['patrocinadorImagem']?.toString(),
      curtidas: (map['curtidas'] as num?)?.toInt() ?? 0,
      apoios: (map['apoios'] as num?)?.toInt() ?? 0,
      enderecoPrivado: map['enderecoPrivado']?.toString(),
      contatoPrivado: map['contatoPrivado']?.toString(),
      fotoUrl: map['fotoUrl']?.toString(),
      criadoEm: map['criadoEm'] != null
          ? DateTime.tryParse(map['criadoEm'].toString())
          : null,
    );
  }

  // ── Converte SonhoModel para Map (pra salvar no Firebase) ─────────────────
  Map<String, dynamic> toMap() {
    return {
      'nomeCrianca': nomeCrianca,
      'descricao': descricao,
      'categoria': categoria,
      'cidade': cidade,
      'imagemUrl': imagemUrl,
      'responsavelId': responsavelId,
      'status': status,
      if (patrocinadorNome != null) 'patrocinadorNome': patrocinadorNome,
      if (patrocinadorImagem != null) 'patrocinadorImagem': patrocinadorImagem,
      'curtidas': curtidas,
      'apoios': apoios,
      if (enderecoPrivado != null) 'enderecoPrivado': enderecoPrivado,
      if (contatoPrivado != null) 'contatoPrivado': contatoPrivado,
      if (fotoUrl != null) 'fotoUrl': fotoUrl,
      'criadoEm':
          criadoEm?.toIso8601String() ?? DateTime.now().toIso8601String(),
    };
  }

  // ── Mock data para testes ─────────────────────────────────────────────────
  static List<SonhoModel> mockData() {
    return [
      SonhoModel(
        id: '1',
        nomeCrianca: 'Carlos',
        descricao: 'Um dia de Astronauta',
        categoria: 'EMPATIA',
        cidade: 'Cruzeiro',
        imagemUrl: 'astronauta',
        responsavelId: 'mock_responsavel_1',
        status: 'aprovado',
        patrocinadorNome: 'Pingo Brinquedos',
        curtidas: 45,
        apoios: 12,
        criadoEm: DateTime.now(),
      ),
      SonhoModel(
        id: '2',
        nomeCrianca: 'Ana',
        descricao: 'Cesta de Materiais de Arte',
        categoria: 'ARTE',
        cidade: 'Cruzeiro',
        imagemUrl: 'arte',
        responsavelId: 'mock_responsavel_2',
        status: 'aprovado',
        curtidas: 45,
        apoios: 12,
        criadoEm: DateTime.now(),
      ),
      SonhoModel(
        id: '3',
        nomeCrianca: 'Maria',
        descricao: 'Uma bicicleta rosa',
        categoria: 'EMPATIA',
        cidade: 'São Paulo',
        imagemUrl: 'bicicleta',
        responsavelId: 'mock_responsavel_3',
        status: 'aprovado',
        patrocinadorNome: 'Loja do Bem',
        curtidas: 32,
        apoios: 8,
        criadoEm: DateTime.now(),
      ),
      SonhoModel(
        id: '4',
        nomeCrianca: 'João',
        descricao: 'Kit de Leitura Infantil',
        categoria: 'EDUCACAO',
        cidade: 'Belo Horizonte',
        imagemUrl: 'leitura',
        responsavelId: 'mock_responsavel_4',
        status: 'aprovado',
        curtidas: 58,
        apoios: 20,
        criadoEm: DateTime.now(),
      ),
    ];
  }
}
