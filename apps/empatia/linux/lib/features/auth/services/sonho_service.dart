import 'package:empatia/features/auth/screens/home/models/sonho_model.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

class SonhoService {
  final DatabaseReference _db = FirebaseDatabase.instance.ref();
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // ── Criar sonho (responsável cadastra) ───────────────────────────────────
  Future<String?> criarSonho({
    required String nomeCrianca,
    required String descricao,
    required String categoria,
    required String cidade,
    required String enderecoPrivado,
    required String contatoPrivado,
    String? fotoUrl,
    String? patrocinadorNome,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return 'Usuário não autenticado.';

      final novoSonho = SonhoModel(
        id: '',
        nomeCrianca: nomeCrianca,
        descricao: descricao,
        categoria: categoria,
        cidade: cidade,
        imagemUrl: fotoUrl ?? '',
        responsavelId: user.uid,
        status: 'pendente',
        curtidas: 0,
        apoios: 0,
        enderecoPrivado: enderecoPrivado,
        contatoPrivado: contatoPrivado,
        fotoUrl: fotoUrl,
        patrocinadorNome: patrocinadorNome,
        criadoEm: DateTime.now(),
      );

      // Cria uma nova entrada no banco e gera ID automático
      await _db.child('sonhos').push().set(novoSonho.toMap());

      return null; // null = sucesso
    } catch (e) {
      return 'Erro ao cadastrar sonho. Tente novamente.';
    }
  }

  // ── Buscar sonhos aprovados (feed da home) ────────────────────────────────
  Future<List<SonhoModel>> buscarSonhosAprovados() async {
    try {
      final snapshot = await _db
          .child('sonhos')
          .orderByChild('status')
          .equalTo('aprovado')
          .get();

      if (!snapshot.exists) return [];

      final sonhos = <SonhoModel>[];
      final data = Map<dynamic, dynamic>.from(snapshot.value as Map);

      data.forEach((key, value) {
        final map = Map<dynamic, dynamic>.from(value as Map);
        sonhos.add(SonhoModel.fromMap(key.toString(), map));
      });

      // Ordena por data de criação — mais recentes primeiro
      sonhos.sort((a, b) {
        if (a.criadoEm == null || b.criadoEm == null) return 0;
        return b.criadoEm!.compareTo(a.criadoEm!);
      });

      return sonhos;
    } catch (e) {
      return [];
    }
  }

  // ── Curtir sonho ──────────────────────────────────────────────────────────
  Future<void> curtirSonho(String sonhoId, bool jaCurtiu) async {
    try {
      final ref = _db.child('sonhos').child(sonhoId).child('curtidas');
      final snapshot = await ref.get();
      final atual = (snapshot.value as num?)?.toInt() ?? 0;
      await ref.set(jaCurtiu ? atual - 1 : atual + 1);
    } catch (e) {
      // silencia erro de curtida
    }
  }

  // ── Adotar sonho ──────────────────────────────────────────────────────────
  // Retorna os dados privados do sonho (endereço e contato)
  Future<Map<String, String>?> adotarSonho(String sonhoId) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return null;

      // Busca os dados privados do sonho
      final snapshot = await _db.child('sonhos').child(sonhoId).get();
      if (!snapshot.exists) return null;

      final data = Map<dynamic, dynamic>.from(snapshot.value as Map);

      // Registra a adoção
      await _db
          .child('adocoes')
          .child(sonhoId)
          .child(user.uid)
          .set({
        'doadorId': user.uid,
        'adotadoEm': DateTime.now().toIso8601String(),
        'status': 'pendente_entrega',
      });

      // Incrementa apoios
      final apoiosRef = _db.child('sonhos').child(sonhoId).child('apoios');
      final apoiosSnapshot = await apoiosRef.get();
      final apoiosAtual = (apoiosSnapshot.value as num?)?.toInt() ?? 0;
      await apoiosRef.set(apoiosAtual + 1);

      // Retorna endereço e contato para o doador
      return {
        'endereco': data['enderecoPrivado']?.toString() ?? '',
        'contato': data['contatoPrivado']?.toString() ?? '',
      };
    } catch (e) {
      return null;
    }
  }
}