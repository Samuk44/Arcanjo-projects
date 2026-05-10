// lib/features/auth/services/sonho_service.dart

import 'package:firebase_database/firebase_database.dart';
import '../screens/home/models/sonho_model.dart';
import '../models/apoio_model.dart';
import '../models/notificacao_model.dart';

class SonhoService {
  final _db = FirebaseDatabase.instance.ref();

  // ─────────────────────────────────────────────
  // SONHOS
  // ─────────────────────────────────────────────

  /// Cria um novo sonho e incrementa o contador do responsável.
  Future<void> criarSonho(SonhoModel sonho) async {
    final ref = _db.child('sonhos').push();
    await ref.set(sonho.copyWith(id: ref.key!).toMap());
    await _db
        .child('usuarios/${sonho.responsavelId}/sonhosCriados')
        .set(ServerValue.increment(1));
  }

  /// Edita os campos de um sonho existente.
  Future<void> editarSonho(SonhoModel sonho) async {
    await _db.child('sonhos/${sonho.id}').update({
      'nomesCrianca': sonho.nomesCrianca,
      'descricao': sonho.descricao,
      'categoria': sonho.categoria,
      'cidade': sonho.cidade,
      'endereco': sonho.endereco,
      'contato': sonho.contato,
    });
  }

  /// Remove permanentemente o sonho do banco (hard delete conforme decisão do usuário).
  Future<void> excluirSonho(String sonhoId, String responsavelId) async {
    await _db.child('sonhos/$sonhoId').remove();
    await _db
        .child('usuarios/$responsavelId/sonhosCriados')
        .set(ServerValue.increment(-1));
  }

  /// Stream de todos os sonhos aprovados (feed público).
  Stream<List<SonhoModel>> streamSonhosAprovados() {
    return _db
        .child('sonhos')
        .orderByChild('status')
        .equalTo('aprovado')
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<String, dynamic>.from(data as Map);
      return map.entries
          .map((e) => SonhoModel.fromMap(e.key, Map<dynamic, dynamic>.from(e.value as Map)))
          .toList()
        ..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  /// Stream dos sonhos criados pelo usuário logado.
  Stream<List<SonhoModel>> streamMeusSonhos(String uid) {
    return _db
        .child('sonhos')
        .orderByChild('responsavelId')
        .equalTo(uid)
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<String, dynamic>.from(data as Map);
      return map.entries
          .map((e) => SonhoModel.fromMap(e.key, Map<dynamic, dynamic>.from(e.value as Map)))
          .toList()
        ..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  // ─────────────────────────────────────────────
  // APOIOS
  // ─────────────────────────────────────────────

  /// Registra um apoio a um sonho.
  /// Cria o nó em /apoios e gera notificação para o responsável.
  Future<void> apoiarSonho({
    required SonhoModel sonho,
    required String doadorId,
    required String doadorNome,
  }) async {
    // Impede auto-apoio
    if (sonho.responsavelId == doadorId) return;

    final apoioRef = _db.child('apoios').push();
    final apoio = ApoioModel(
      id: apoioRef.key!,
      sonhoId: sonho.id,
      sonhoNomesCrianca: sonho.nomesCrianca,
      sonhoDescricao: sonho.descricao,
      sonhoCategoria: sonho.categoria,
      sonhoCidade: sonho.cidade,
      doadorId: doadorId,
      doadorNome: doadorNome,
      responsavelId: sonho.responsavelId,
      status: 'pendente_entrega',
      criadoEm: DateTime.now(),
    );

    await apoioRef.set(apoio.toMap());

    // Incrementa contador do doador
    await _db
        .child('usuarios/$doadorId/apoiosDados')
        .set(ServerValue.increment(1));

    // Incrementa total de apoios do sonho
    await _db
        .child('sonhos/${sonho.id}/totalApoios')
        .set(ServerValue.increment(1));

    // Notifica o responsável
    await _criarNotificacao(
      usuarioId: sonho.responsavelId,
      titulo: 'Novo apoiador!',
      corpo: '$doadorNome quer entregar o sonho de ${sonho.nomesCrianca}.',
      tipo: 'novo_apoio',
      sonhoId: sonho.id,
      apoioId: apoioRef.key,
    );
  }

  /// Doador confirma que entregou o item.
  Future<void> confirmarEntregaPeloDoador(ApoioModel apoio) async {
    await _db.child('apoios/${apoio.id}').update({
      'status': 'entregue_pelo_doador',
    });

    // Notifica o responsável para confirmar recebimento
    await _criarNotificacao(
      usuarioId: apoio.responsavelId,
      titulo: 'Item entregue!',
      corpo: '${apoio.doadorNome} marcou o sonho de ${apoio.sonhoNomesCrianca} como entregue. Confirme o recebimento.',
      tipo: 'entregue_pelo_doador',
      sonhoId: apoio.sonhoId,
      apoioId: apoio.id,
    );
  }

  /// Responsável confirma que recebeu o item.
  /// Se todos os apoios do sonho estiverem concluídos, marca o sonho como concluído.
  Future<void> confirmarRecebimentoPeloResponsavel(ApoioModel apoio) async {
    await _db.child('apoios/${apoio.id}').update({
      'status': 'entregue',
    });

    // Notifica o doador
    await _criarNotificacao(
      usuarioId: apoio.doadorId,
      titulo: 'Recebimento confirmado!',
      corpo: 'O responsável confirmou que recebeu o sonho de ${apoio.sonhoNomesCrianca}. Obrigado pela sua generosidade!',
      tipo: 'entregue_confirmado',
      sonhoId: apoio.sonhoId,
      apoioId: apoio.id,
    );

    // Verifica se todos os apoios do sonho foram concluídos
    // (sonho sai do feed apenas quando todos confirmaram)
    final snapshot = await _db
        .child('apoios')
        .orderByChild('sonhoId')
        .equalTo(apoio.sonhoId)
        .get();

    if (snapshot.exists) {
      final map = Map<String, dynamic>.from(snapshot.value as Map);
      final todos = map.values
          .map((v) => ApoioModel.fromMap('', Map<dynamic, dynamic>.from(v as Map)))
          .toList();

      // Considera o apoio atual como já atualizado
      final todosConcluidos = todos.every(
        (a) => a.id == apoio.id ? true : a.status == 'entregue',
      );

      if (todosConcluidos) {
        await _db.child('sonhos/${apoio.sonhoId}').update({'status': 'concluido'});
      }
    }
  }

  /// Stream dos apoios feitos pelo usuário logado (Tab B — Apoios).
  Stream<List<ApoioModel>> streamMeusApoios(String uid) {
    return _db
        .child('apoios')
        .orderByChild('doadorId')
        .equalTo(uid)
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<String, dynamic>.from(data as Map);
      return map.entries
          .map((e) => ApoioModel.fromMap(e.key, Map<dynamic, dynamic>.from(e.value as Map)))
          .toList()
        ..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  /// Stream dos apoios recebidos em um sonho específico (para o responsável confirmar).
  Stream<List<ApoioModel>> streamApoiosDeSonho(String sonhoId) {
    return _db
        .child('apoios')
        .orderByChild('sonhoId')
        .equalTo(sonhoId)
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<String, dynamic>.from(data as Map);
      return map.entries
          .map((e) => ApoioModel.fromMap(e.key, Map<dynamic, dynamic>.from(e.value as Map)))
          .toList()
        ..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  /// Verifica se o usuário já apoiou um sonho específico.
  Future<bool> jaApoiou(String sonhoId, String uid) async {
    final snapshot = await _db
        .child('apoios')
        .orderByChild('sonhoId')
        .equalTo(sonhoId)
        .get();

    if (!snapshot.exists) return false;
    final map = Map<String, dynamic>.from(snapshot.value as Map);
    return map.values.any((v) {
      final m = Map<dynamic, dynamic>.from(v as Map);
      return m['doadorId'] == uid;
    });
  }

  // ─────────────────────────────────────────────
  // NOTIFICAÇÕES
  // ─────────────────────────────────────────────

  Future<void> _criarNotificacao({
    required String usuarioId,
    required String titulo,
    required String corpo,
    required String tipo,
    String? sonhoId,
    String? apoioId,
  }) async {
    final ref = _db.child('notificacoes').push();
    final notif = NotificacaoModel(
      id: ref.key!,
      usuarioId: usuarioId,
      titulo: titulo,
      corpo: corpo,
      tipo: tipo,
      sonhoId: sonhoId,
      apoioId: apoioId,
      lida: false,
      criadoEm: DateTime.now(),
    );
    await ref.set(notif.toMap());
  }

  Stream<List<NotificacaoModel>> streamNotificacoes(String uid) {
    return _db
        .child('notificacoes')
        .orderByChild('usuarioId')
        .equalTo(uid)
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<String, dynamic>.from(data as Map);
      return map.entries
          .map((e) => NotificacaoModel.fromMap(e.key, Map<dynamic, dynamic>.from(e.value as Map)))
          .toList()
        ..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  Future<int> contarNaoLidas(String uid) async {
    final snapshot = await _db
        .child('notificacoes')
        .orderByChild('usuarioId')
        .equalTo(uid)
        .get();
    if (!snapshot.exists) return 0;
    final map = Map<String, dynamic>.from(snapshot.value as Map);
    return map.values.where((v) {
      final m = Map<dynamic, dynamic>.from(v as Map);
      return m['lida'] == false;
    }).length;
  }

  Future<void> marcarTodasComoLidas(String uid) async {
    final snapshot = await _db
        .child('notificacoes')
        .orderByChild('usuarioId')
        .equalTo(uid)
        .get();
    if (!snapshot.exists) return;
    final map = Map<String, dynamic>.from(snapshot.value as Map);
    final updates = <String, dynamic>{};
    for (final key in map.keys) {
      updates['notificacoes/$key/lida'] = true;
    }
    await _db.update(updates);
  }
}
