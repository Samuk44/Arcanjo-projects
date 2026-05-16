import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static const _navy = Color(0xFF1A1A2E);
  static const _pink = Color(0xFFE91E63);

  // ── Notificações mock para visualização imediata ──────────────────────────
  static const _mocks = [
    _NotifData(
      tipo: _NotifTipo.apoio,
      titulo: 'Novo apoio recebido!',
      corpo: 'Alguém apoiou o sonho de Carlos com um ❤️.',
      tempo: 'Agora mesmo',
    ),
    _NotifData(
      tipo: _NotifTipo.adocao,
      titulo: 'Sonho adotado!',
      corpo: 'O sonho de Ana foi adotado por um doador. 🎉',
      tempo: 'há 5 minutos',
    ),
    _NotifData(
      tipo: _NotifTipo.mensagem,
      titulo: 'Mensagem de patrocinador',
      corpo: 'Pingo Brinquedos entrou em contato sobre o sonho de Maria.',
      tempo: 'há 20 minutos',
    ),
    _NotifData(
      tipo: _NotifTipo.apoio,
      titulo: 'Curtida no sonho!',
      corpo: 'O sonho de João recebeu 5 novas curtidas.',
      tempo: 'há 1 hora',
    ),
    _NotifData(
      tipo: _NotifTipo.adocao,
      titulo: 'Entrega confirmada!',
      corpo: 'A bicicleta rosa da Maria foi entregue com sucesso. 🚲',
      tempo: 'há 2 horas',
    ),
    _NotifData(
      tipo: _NotifTipo.mensagem,
      titulo: 'Novo seguidor',
      corpo: 'Um doador começou a acompanhar seus sonhos.',
      tempo: 'Ontem',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: _navy,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'NOTIFICAÇÕES',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all, color: Colors.white70, size: 20),
            tooltip: 'Marcar todas como lidas',
            onPressed: () {},
          ),
        ],
      ),
      body: uid == null
          ? _buildLista(context, _mocks)
          : StreamBuilder<DatabaseEvent>(
              stream: FirebaseDatabase.instance
                  .ref()
                  .child('notificacoes')
                  .child(uid)
                  .orderByChild('criadoEm')
                  .onValue,
              builder: (context, snapshot) {
                // Se há dados do Firebase, usa-os; caso contrário exibe mocks
                final List<_NotifData> itens;

                if (snapshot.hasData &&
                    snapshot.data!.snapshot.value != null) {
                  final raw = Map<dynamic, dynamic>.from(
                      snapshot.data!.snapshot.value as Map);
                  itens = raw.entries.map((e) {
                    final m = Map<dynamic, dynamic>.from(e.value as Map);
                    return _NotifData(
                      tipo: _tipoFromString(m['tipo']?.toString() ?? ''),
                      titulo: m['titulo']?.toString() ?? 'Notificação',
                      corpo: m['corpo']?.toString() ?? '',
                      tempo: _formatarTempo(m['criadoEm']?.toString()),
                      lida: m['lida'] == true,
                    );
                  }).toList().reversed.toList();
                } else {
                  itens = _mocks;
                }

                if (itens.isEmpty) {
                  return _buildVazio();
                }

                return _buildLista(context, itens);
              },
            ),
    );
  }

  Widget _buildLista(BuildContext context, List<_NotifData> itens) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      itemCount: itens.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, i) => _NotifCard(data: itens[i]),
    );
  }

  Widget _buildVazio() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.notifications_none, size: 72, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'Nenhuma notificação ainda',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Você será avisado quando houver novidades.',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade400),
          ),
        ],
      ),
    );
  }

  static _NotifTipo _tipoFromString(String s) {
    switch (s) {
      case 'adocao':
        return _NotifTipo.adocao;
      case 'mensagem':
        return _NotifTipo.mensagem;
      default:
        return _NotifTipo.apoio;
    }
  }

  static String _formatarTempo(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Agora mesmo';
    if (diff.inHours < 1) return 'há ${diff.inMinutes} min';
    if (diff.inDays < 1) return 'há ${diff.inHours}h';
    return 'há ${diff.inDays}d';
  }
}

// ── Card de notificação ───────────────────────────────────────────────────────
class _NotifCard extends StatelessWidget {
  final _NotifData data;
  const _NotifCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: data.lida ? Colors.white : const Color(0xFFFFF8FC),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
        border: data.lida
            ? null
            : Border.all(
                color: const Color(0xFFE91E63).withOpacity(0.2),
                width: 1,
              ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Ícone circular colorido ─────────────────────────────────
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: data.tipo.cor.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(data.tipo.icone, color: data.tipo.cor, size: 22),
            ),
            const SizedBox(width: 12),
            // ── Conteúdo ────────────────────────────────────────────────
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          data.titulo,
                          style: TextStyle(
                            fontWeight: data.lida
                                ? FontWeight.w600
                                : FontWeight.w800,
                            fontSize: 14,
                            color: const Color(0xFF1A1A2E),
                          ),
                        ),
                      ),
                      if (!data.lida)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFFE91E63),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    data.corpo,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    data.tempo,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade400,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Enums e modelos internos ──────────────────────────────────────────────────
enum _NotifTipo { apoio, adocao, mensagem }

extension _NotifTipoExt on _NotifTipo {
  Color get cor {
    switch (this) {
      case _NotifTipo.apoio:
        return const Color(0xFFE91E63);
      case _NotifTipo.adocao:
        return const Color(0xFF4CAF50);
      case _NotifTipo.mensagem:
        return const Color(0xFF2196F3);
    }
  }

  IconData get icone {
    switch (this) {
      case _NotifTipo.apoio:
        return Icons.favorite;
      case _NotifTipo.adocao:
        return Icons.card_giftcard;
      case _NotifTipo.mensagem:
        return Icons.chat_bubble;
    }
  }
}

class _NotifData {
  final _NotifTipo tipo;
  final String titulo;
  final String corpo;
  final String tempo;
  final bool lida;

  const _NotifData({
    required this.tipo,
    required this.titulo,
    required this.corpo,
    required this.tempo,
    this.lida = false,
  });
}
