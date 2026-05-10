// lib/features/auth/screens/sonhos/sonhos_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../home/models/sonho_model.dart';
import '../../models/apoio_model.dart';
import '../../services/sonho_service.dart';
import '../sonhos/screens/publicar_sonho_screen.dart';
import '../sonhos/screens/detalhe_sonho_screen.dart';
import '../sonhos/widgets/meu_sonho_card.dart';
import '../sonhos/widgets/apoio_card.dart';
import '../../../app_colors.dart';

class SonhosScreen extends StatefulWidget {
  const SonhosScreen({super.key});

  @override
  State<SonhosScreen> createState() => _SonhosScreenState();
}

class _SonhosScreenState extends State<SonhosScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _sonhoService = SonhoService();

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _abrirPublicar({SonhoModel? sonho}) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PublicarSonhoScreen(sonho: sonho),
      ),
    );
  }

  Future<void> _confirmarExclusao(SonhoModel sonho) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.navyLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Excluir sonho',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Tem certeza que deseja excluir o sonho de ${sonho.nomesCrianca}? Esta ação não pode ser desfeita.',
          style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'CANCELAR',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'EXCLUIR',
              style: TextStyle(
                color: AppColors.pink,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmar == true && mounted) {
      await _sonhoService.excluirSonho(sonho.id, _uid);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sonho excluído.'),
            backgroundColor: AppColors.pink,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'SONHOS',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () => _abrirPublicar(),
            icon: const Icon(Icons.add_circle_outline, color: AppColors.pink),
            tooltip: 'Publicar sonho',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.pink,
          labelColor: AppColors.pink,
          unselectedLabelColor: Colors.white.withValues(alpha: 0.4),
          labelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
            fontSize: 13,
          ),
          tabs: const [
            Tab(text: 'MEUS SONHOS'),
            Tab(text: 'APOIOS'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _MeusSonhosTab(
            uid: _uid,
            sonhoService: _sonhoService,
            onEditar: (s) => _abrirPublicar(sonho: s),
            onExcluir: _confirmarExclusao,
            onPublicar: () => _abrirPublicar(),
          ),
          _ApoiosTab(
            uid: _uid,
            sonhoService: _sonhoService,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────
// Tab A — Meus Sonhos
// ─────────────────────────────────────────────────────────

class _MeusSonhosTab extends StatelessWidget {
  final String uid;
  final SonhoService sonhoService;
  final void Function(SonhoModel) onEditar;
  final void Function(SonhoModel) onExcluir;
  final VoidCallback onPublicar;

  const _MeusSonhosTab({
    required this.uid,
    required this.sonhoService,
    required this.onEditar,
    required this.onExcluir,
    required this.onPublicar,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<SonhoModel>>(
      stream: sonhoService.streamMeusSonhos(uid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.pink),
          );
        }

        final sonhos = snapshot.data ?? [];

        if (sonhos.isEmpty) {
          return _EstadoVazioSonhos(onPublicar: onPublicar);
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: sonhos.length,
          itemBuilder: (_, i) => MeuSonhoCard(
            sonho: sonhos[i],
            onEditar: () => onEditar(sonhos[i]),
            onExcluir: () => onExcluir(sonhos[i]),
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────
// Tab B — Apoios
// ─────────────────────────────────────────────────────────

class _ApoiosTab extends StatelessWidget {
  final String uid;
  final SonhoService sonhoService;

  const _ApoiosTab({required this.uid, required this.sonhoService});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ApoioModel>>(
      stream: sonhoService.streamMeusApoios(uid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.pink),
          );
        }

        final apoios = snapshot.data ?? [];

        if (apoios.isEmpty) {
          return _EstadoVazioApoios();
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: apoios.length,
          itemBuilder: (_, i) => ApoioCard(
            apoio: apoios[i],
            sonhoService: sonhoService,
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────────────────
// Estados vazios
// ─────────────────────────────────────────────────────────

class _EstadoVazioSonhos extends StatelessWidget {
  final VoidCallback onPublicar;
  const _EstadoVazioSonhos({required this.onPublicar});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.star_border_rounded,
              size: 72,
              color: Colors.white.withValues(alpha: 0.15),
            ),
            const SizedBox(height: 20),
            const Text(
              'Nenhum sonho publicado ainda',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'Publique o sonho de uma criança e conecte-se com doadores que podem realizá-lo.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: onPublicar,
              icon: const Icon(Icons.add),
              label: const Text(
                'PUBLICAR PRIMEIRO SONHO',
                style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.pink,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                elevation: 0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EstadoVazioApoios extends StatelessWidget {
  const _EstadoVazioApoios();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.volunteer_activism,
              size: 72,
              color: Colors.white.withValues(alpha: 0.15),
            ),
            const SizedBox(height: 20),
            const Text(
              'Você ainda não apoiou nenhum sonho',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'Explore o feed e encontre um sonho que você possa ajudar a realizar. Não é obrigatório — mas faz toda a diferença.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
