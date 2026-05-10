// lib/features/auth/screens/sonhos/screens/detalhe_sonho_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../home/models/sonho_model.dart';
import '../../../models/apoio_model.dart';
import '../../../services/sonho_service.dart';
import '../../../services/auth_service.dart';
import '../../../../app_colors.dart';

class DetalheSonhoScreen extends StatefulWidget {
  final SonhoModel sonho;

  const DetalheSonhoScreen({super.key, required this.sonho});

  @override
  State<DetalheSonhoScreen> createState() => _DetalheSonhoScreenState();
}

class _DetalheSonhoScreenState extends State<DetalheSonhoScreen> {
  final _sonhoService = SonhoService();
  final _authService = AuthService();

  String get _uid => FirebaseAuth.instance.currentUser!.uid;
  bool get _souResponsavel => widget.sonho.responsavelId == _uid;

  bool _apoiando = false;

  Future<void> _apoiar() async {
    setState(() => _apoiando = true);
    try {
      final usuario = await _authService.buscarUsuario(_uid);
      await _sonhoService.apoiarSonho(
        sonho: widget.sonho,
        doadorId: _uid,
        doadorNome: usuario?.nome ?? 'Doador',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Você se comprometeu com este sonho!'),
            backgroundColor: AppColors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: AppColors.pink),
        );
      }
    } finally {
      if (mounted) setState(() => _apoiando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'DETALHE DO SONHO',
          style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.5),
        ),
      ),
      body: StreamBuilder<List<ApoioModel>>(
        stream: _sonhoService.streamApoiosDeSonho(widget.sonho.id),
        builder: (context, apoiosSnap) {
          final apoios = apoiosSnap.data ?? [];
          final meuApoio = apoios.where((a) => a.doadorId == _uid).firstOrNull;
          final jaApoiei = meuApoio != null;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ── Cabeçalho ──────────────────────────────────
              _CategoriaChip(categoria: widget.sonho.categoria),
              const SizedBox(height: 16),
              Text(
                widget.sonho.nomesCrianca,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.location_on, color: AppColors.pink, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    widget.sonho.cidade,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.person_outline, color: AppColors.pink, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    widget.sonho.responsavelNome,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── Descrição ──────────────────────────────────
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  widget.sonho.descricao,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 15,
                    height: 1.6,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // ── Endereço e contato (para quem já apoiou) ──
              if (jaApoiei || _souResponsavel) ...[
                _InfoPrivadaCard(sonho: widget.sonho),
                const SizedBox(height: 20),
              ],

              // ── Botão de apoio ─────────────────────────────
              if (!_souResponsavel) ...[
                if (!jaApoiei)
                  SizedBox(
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: _apoiando ? null : _apoiar,
                      icon: _apoiando
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.volunteer_activism),
                      label: const Text(
                        'APOIAR ESTE SONHO',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.pink,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  )
                else
                  _StatusApoioCard(apoio: meuApoio!, sonhoService: _sonhoService),
                const SizedBox(height: 24),
              ],

              // ── Lista de apoiadores ────────────────────────
              if (apoios.isNotEmpty) ...[
                Text(
                  'APOIADORES (${apoios.length})',
                  style: TextStyle(
                    color: AppColors.pink,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 12),
                ...apoios.map(
                  (a) => _ApoiadorTile(
                    apoio: a,
                    souResponsavel: _souResponsavel,
                    sonhoService: _sonhoService,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────
// Widgets auxiliares
// ─────────────────────────────────────────────────────────

class _CategoriaChip extends StatelessWidget {
  final String categoria;
  const _CategoriaChip({required this.categoria});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.pink.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.pink.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.category_outlined, color: AppColors.pink, size: 14),
          const SizedBox(width: 6),
          Text(
            categoria,
            style: const TextStyle(
              color: AppColors.pink,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPrivadaCard extends StatelessWidget {
  final SonhoModel sonho;
  const _InfoPrivadaCard({required this.sonho});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.green.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.green.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lock_open, color: AppColors.green, size: 16),
              const SizedBox(width: 6),
              const Text(
                'INFORMAÇÕES DE ENTREGA',
                style: TextStyle(
                  color: AppColors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _InfoRow(icon: Icons.home_outlined, label: 'Endereço', value: sonho.endereco),
          const SizedBox(height: 8),
          _InfoRow(icon: Icons.phone_outlined, label: 'Contato', value: sonho.contato),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.white.withValues(alpha: 0.5), size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '$label: ',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.5),
                    fontSize: 13,
                  ),
                ),
                TextSpan(
                  text: value,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusApoioCard extends StatefulWidget {
  final ApoioModel apoio;
  final SonhoService sonhoService;
  const _StatusApoioCard({required this.apoio, required this.sonhoService});

  @override
  State<_StatusApoioCard> createState() => _StatusApoioCardState();
}

class _StatusApoioCardState extends State<_StatusApoioCard> {
  bool _carregando = false;

  Future<void> _confirmarEntrega() async {
    setState(() => _carregando = true);
    try {
      await widget.sonhoService.confirmarEntregaPeloDoador(widget.apoio);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Entrega confirmada! Aguardando confirmação do responsável.'),
            backgroundColor: AppColors.green,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.apoio.status;
    final cor = status == 'entregue'
        ? AppColors.green
        : status == 'entregue_pelo_doador'
            ? AppColors.yellow
            : AppColors.pink;

    final label = status == 'entregue'
        ? 'Entrega concluída!'
        : status == 'entregue_pelo_doador'
            ? 'Aguardando confirmação do responsável'
            : 'Você se comprometeu com este sonho';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cor.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.volunteer_activism, color: cor, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: cor,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          if (status == 'pendente_entrega') ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _carregando ? null : _confirmarEntrega,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.green,
                  side: const BorderSide(color: AppColors.green),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _carregando
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.green,
                        ),
                      )
                    : const Text('MARCAR COMO ENTREGUE'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ApoiadorTile extends StatefulWidget {
  final ApoioModel apoio;
  final bool souResponsavel;
  final SonhoService sonhoService;

  const _ApoiadorTile({
    required this.apoio,
    required this.souResponsavel,
    required this.sonhoService,
  });

  @override
  State<_ApoiadorTile> createState() => _ApoiadorTileState();
}

class _ApoiadorTileState extends State<_ApoiadorTile> {
  bool _carregando = false;

  Future<void> _confirmarRecebimento() async {
    setState(() => _carregando = true);
    try {
      await widget.sonhoService.confirmarRecebimentoPeloResponsavel(widget.apoio);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recebimento confirmado!'),
            backgroundColor: AppColors.green,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.apoio.status;
    final cor = status == 'entregue'
        ? AppColors.green
        : status == 'entregue_pelo_doador'
            ? AppColors.yellow
            : Colors.white.withValues(alpha: 0.4);

    final statusLabel = status == 'entregue'
        ? 'Concluído'
        : status == 'entregue_pelo_doador'
            ? 'Aguardando sua confirmação'
            : 'Pendente';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.pink.withValues(alpha: 0.2),
                child: Text(
                  widget.apoio.doadorNome.isNotEmpty
                      ? widget.apoio.doadorNome[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    color: AppColors.pink,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.apoio.doadorNome,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      statusLabel,
                      style: TextStyle(color: cor, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: cor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          if (widget.souResponsavel && status == 'entregue_pelo_doador') ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _carregando ? null : _confirmarRecebimento,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.green,
                  side: const BorderSide(color: AppColors.green),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _carregando
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.green,
                        ),
                      )
                    : const Text('CONFIRMAR RECEBIMENTO'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
