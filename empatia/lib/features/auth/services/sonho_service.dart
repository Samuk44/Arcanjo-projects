// lib/features/auth/services/sonho_service.dart

import 'package:firebase_database/firebase_database.dart';
import '../screens/home/models/sonho_model.dart';
import '../models/apoio_model.dart';
import '../models/notificacao_model.dart';
import '../utils/firebase_parse.dart';

class SonhoService {
  final _db = FirebaseDatabase.instance.ref();

  // ─────────────────────────────────────────────
  // SONHOS
  // ─────────────────────────────────────────────

  Future<void> criarSonho(SonhoModel sonho) async {
    final ref = _db.child('sonhos').push();
    await ref.set(sonho.copyWith(id: ref.key!).toMap());
    
    // REGRA SÊNIOR: Incremento atômico no servidor
    await _db.child('usuarios/${sonho.responsavelId}/sonhosCriados')
        .set(ServerValue.increment(1));
  }

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

  Future<void> excluirSonho(String sonhoId, String responsavelId) async {
    await _db.child('sonhos/$sonhoId').remove();
    
    // REGRA SÊNIOR: Decremento atômico no servidor
    await _db.child('usuarios/$responsavelId/sonhosCriados')
        .set(ServerValue.increment(-1));
  }

  Stream<List<SonhoModel>> streamSonhosAprovados() {
    return _db.child('sonhos')
        .orderByChild('status')
        .equalTo('aprovado')
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<dynamic, dynamic>.from(data as Map);
      return map.entries.map((e) {
        return SonhoModel.fromMap(e.key.toString(), Map<dynamic, dynamic>.from(e.value as Map));
      }).toList()..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  Stream<List<SonhoModel>> streamMeusSonhos(String uid) {
    return _db.child('sonhos')
        .orderByChild('responsavelId')
        .equalTo(uid)
        .onValue
        .map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<dynamic, dynamic>.from(data as Map);
      return map.entries.map((e) {
        return SonhoModel.fromMap(e.key.toString(), Map<dynamic, dynamic>.from(e.value as Map));
      }).toList()..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  // ─────────────────────────────────────────────
  // APOIOS
  // ─────────────────────────────────────────────

  Future<void> apoiarSonho({
    required SonhoModel sonho,
    required String doadorId,
    required String doadorNome,
  }) async {
    if (sonho.responsavelId == doadorId) return;
    if (await jaApoiou(sonho.id, doadorId)) return;

    final ref = _db.child('apoios').push();
    final apoio = ApoioModel(
      id: ref.key!,
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

    await ref.set(apoio.toMap());
    
    // REGRA SÊNIOR: Incrementos atômicos
    await _db.child('sonhos/${sonho.id}/totalApoios').set(ServerValue.increment(1));
    await _db.child('usuarios/$doadorId/apoiosDados').set(ServerValue.increment(1));

    await _criarNotificacao(
      usuarioId: sonho.responsavelId,
      titulo: 'Novo apoiador!',
      corpo: '$doadorNome quer entregar o sonho de ${sonho.nomesCrianca}.',
      tipo: 'novo_apoio',
      sonhoId: sonho.id,
      apoioId: ref.key,
    );
  }

  Future<void> confirmarEntregaPeloDoador(ApoioModel apoio) async {
    await _db.child('apoios/${apoio.id}').update({'status': 'entregue_pelo_doador'});
    await _criarNotificacao(
      usuarioId: apoio.responsavelId,
      titulo: 'Item entregue!',
      corpo: '${apoio.doadorNome} marcou o sonho de ${apoio.sonhoNomesCrianca} como entregue. Confirme o recebimento.',
      tipo: 'entregue_pelo_doador',
      sonhoId: apoio.sonhoId,
      apoioId: apoio.id,
    );
  }

  Future<void> confirmarRecebimentoPeloResponsavel(ApoioModel apoio) async {
    await _db.child('apoios/${apoio.id}').update({'status': 'entregue'});
    await _criarNotificacao(
      usuarioId: apoio.doadorId,
      titulo: 'Recebimento confirmado!',
      corpo: 'O responsável confirmou que recebeu o sonho de ${apoio.sonhoNomesCrianca}. Obrigado pela sua generosidade!',
      tipo: 'entregue_confirmado',
      sonhoId: apoio.sonhoId,
      apoioId: apoio.id,
    );

    // Verificação de conclusão do sonho
    final snapshot = await _db.child('apoios').orderByChild('sonhoId').equalTo(apoio.sonhoId).get();
    if (snapshot.exists) {
      final map = Map<dynamic, dynamic>.from(snapshot.value as Map);
      var todosEntregues = true;
      for (final v in map.values) {
        if (v is! Map) continue;
        final m = Map<dynamic, dynamic>.from(v);
        final st = firebaseString(m['status']);
        if (st != 'entregue') {
          todosEntregues = false;
          break;
        }
      }
      if (todosEntregues) {
        await _db.child('sonhos/${apoio.sonhoId}').update({'status': 'concluido'});
      }
    }
  }

  Stream<List<ApoioModel>> streamMeusApoios(String uid) {
    return _db.child('apoios').orderByChild('doadorId').equalTo(uid).onValue.map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<dynamic, dynamic>.from(data as Map);
      return map.entries.map((e) {
        return ApoioModel.fromMap(e.key.toString(), Map<dynamic, dynamic>.from(e.value as Map));
      }).toList()..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  Stream<List<ApoioModel>> streamApoiosDeSonho(String sonhoId) {
    return _db.child('apoios').orderByChild('sonhoId').equalTo(sonhoId).onValue.map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<dynamic, dynamic>.from(data as Map);
      return map.entries.map((e) {
        return ApoioModel.fromMap(e.key.toString(), Map<dynamic, dynamic>.from(e.value as Map));
      }).toList()..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  /// Evita apoio duplicado do mesmo doador no mesmo sonho.
  Future<bool> jaApoiou(String sonhoId, String uid) async {
    final snapshot = await _db.child('apoios').orderByChild('sonhoId').equalTo(sonhoId).get();
    if (!snapshot.exists) return false;
    final map = Map<dynamic, dynamic>.from(snapshot.value as Map);
    for (final v in map.values) {
      if (v is! Map) continue;
      final m = Map<dynamic, dynamic>.from(v);
      if (firebaseString(m['doadorId']) == uid) return true;
    }
    return false;
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
    return _db.child('notificacoes').orderByChild('usuarioId').equalTo(uid).onValue.map((event) {
      final data = event.snapshot.value;
      if (data == null) return [];
      final map = Map<dynamic, dynamic>.from(data as Map);
      return map.entries.map((e) {
        return NotificacaoModel.fromMap(e.key.toString(), Map<dynamic, dynamic>.from(e.value as Map));
      }).toList()..sort((a, b) => b.criadoEm.compareTo(a.criadoEm));
    });
  }

  Stream<int> streamTotalNotificacoesNaoLidas(String uid) {
    return streamNotificacoes(uid).map((lista) => lista.where((n) => !n.lida).length);
  }

  Future<void> marcarTodasComoLidas(String uid) async {
    final snapshot = await _db.child('notificacoes').orderByChild('usuarioId').equalTo(uid).get();
    if (!snapshot.exists) return;
    final map = Map<dynamic, dynamic>.from(snapshot.value as Map);
    final updates = <String, dynamic>{};
    for (final key in map.keys) {
      final raw = map[key];
      if (raw is! Map) continue;
      final child = Map<dynamic, dynamic>.from(raw);
      if (!firebaseBool(child['lida'])) {
        updates['notificacoes/$key/lida'] = true;
      }
    }
    if (updates.isNotEmpty) await _db.update(updates);
  }
}
