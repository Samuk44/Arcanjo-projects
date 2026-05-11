// lib/features/auth/screens/sonhos/screens/detalhe_sonho_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../home/models/sonho_model.dart';
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
  bool _carregando = false;

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  Future<void> _adotar() async {
    if (await _sonhoService.jaApoiou(widget.sonho.id, _uid)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Você já se comprometeu com este sonho.'),
            backgroundColor: AppColors.pink,
          ),
        );
      }
      return;
    }
    setState(() => _carregando = true);
    try {
      final usuario = await _authService.buscarUsuario(_uid);
      await _sonhoService.apoiarSonho(
        sonho: widget.sonho,
        doadorId: _uid,
        doadorNome: usuario?.nome ?? 'Doador',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Você adotou este sonho!'), backgroundColor: AppColors.green),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        title: const Text('DETALHES DO SONHO'),
      ),
      body: StreamBuilder<List<ApoioModel>>(
        stream: _sonhoService.streamApoiosDeSonho(widget.sonho.id),
        builder: (context, snapshot) {
          final apoios = snapshot.data ?? [];
          ApoioModel? meuApoio;
          for (final a in apoios) {
            if (a.doadorId == _uid) {
              meuApoio = a;
              break;
            }
          }
          final souResponsavel = widget.sonho.responsavelId == _uid;
          final euApoio = meuApoio != null;
          // Privacidade: doador só vê endereço/contato em fases ativas de entrega.
          final podeVerPrivado = souResponsavel ||
              (meuApoio != null &&
                  (meuApoio.status == 'pendente_entrega' ||
                      meuApoio.status == 'entregue_pelo_doador'));

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              // Header do Sonho
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.pink.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.star, color: AppColors.pink, size: 40),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                widget.sonho.nomesCrianca.toUpperCase(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 22),
              ),
              const SizedBox(height: 8),
              Text(
                widget.sonho.categoria,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.pink, fontWeight: FontWeight.w600, fontSize: 14),
              ),
              const SizedBox(height: 32),
              
              _SectionTitle(title: 'DESCRIÇÃO'),
              Text(widget.sonho.descricao, style: const TextStyle(color: AppColors.navyLight, fontSize: 16, height: 1.5)),
              const SizedBox(height: 24),

              _SectionTitle(title: 'LOCALIZAÇÃO'),
              Row(
                children: [
                  const Icon(Icons.location_on, color: AppColors.gray, size: 18),
                  const SizedBox(width: 8),
                  Text(widget.sonho.cidade, style: const TextStyle(color: AppColors.navyLight, fontSize: 15)),
                ],
              ),
              const SizedBox(height: 24),

              if (podeVerPrivado) ...[
                _SectionTitle(title: 'INFORMAÇÕES DE ENTREGA'),
                _InfoTile(icon: Icons.home, label: 'Endereço', value: widget.sonho.endereco),
                _InfoTile(icon: Icons.phone, label: 'Contato', value: widget.sonho.contato),
                const SizedBox(height: 24),
              ],

              _SectionTitle(title: 'APOIADORES (${apoios.length})'),
              if (apoios.isEmpty)
                const Text('Nenhum apoiador ainda. Seja o primeiro!', style: TextStyle(color: AppColors.gray, fontSize: 14))
              else
                ...apoios.map((a) => _ApoiadorItem(apoio: a)),

              const SizedBox(height: 40),
              
              if (!euApoio && !souResponsavel && widget.sonho.status == 'aprovado')
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _carregando ? null : _adotar,
                    child: _carregando 
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('ADOTAR ESTE SONHO'),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(title, style: const TextStyle(color: AppColors.gray, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1.2)),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: AppColors.pink, size: 20),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppColors.gray, fontSize: 11)),
              Text(value, style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w500, fontSize: 14)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ApoiadorItem extends StatelessWidget {
  final ApoioModel apoio;
  const _ApoiadorItem({required this.apoio});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.person, color: AppColors.gray, size: 20),
          const SizedBox(width: 12),
          Text(apoio.doadorNome, style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.w500)),
          const Spacer(),
          _StatusBadge(status: apoio.status),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});
  @override
  Widget build(BuildContext context) {
    Color color = AppColors.gray;
    String text = 'Pendente';
    if (status == 'entregue_pelo_doador') {
      color = AppColors.pink;
      text = 'Enviado';
    } else if (status == 'entregue') {
      color = AppColors.green;
      text = 'Confirmado';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
