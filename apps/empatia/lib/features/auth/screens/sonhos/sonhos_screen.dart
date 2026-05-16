// lib/features/auth/screens/sonhos/sonhos_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../home/models/sonho_model.dart';
import '../../models/apoio_model.dart';
import '../../services/sonho_service.dart';
import 'screens/publicar_sonho_screen.dart';
import 'widgets/meu_sonho_card.dart';
import 'widgets/apoio_card.dart';
import '../../../app_colors.dart';

class SonhosScreen extends StatefulWidget {
  const SonhosScreen({super.key});

  @override
  State<SonhosScreen> createState() => _SonhosScreenState();
}

class _SonhosScreenState extends State<SonhosScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('GERENCIAR SONHOS'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.pink,
          labelColor: AppColors.pink,
          unselectedLabelColor: AppColors.white.withValues(alpha: 0.55),
          tabs: const [
            Tab(text: 'MEUS SONHOS'),
            Tab(text: 'MEUS APOIOS'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTabMeusSonhos(),
          _buildTabMeusApoios(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PublicarSonhoScreen()),
        ),
        backgroundColor: AppColors.pink,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildTabMeusSonhos() {
    return StreamBuilder<List<SonhoModel>>(
      stream: _sonhoService.streamMeusSonhos(_uid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: AppColors.pink));
        }
        final lista = snapshot.data ?? [];
        if (lista.isEmpty) return _buildEmptyState('Você ainda não cadastrou sonhos.');

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: lista.length,
          itemBuilder: (_, i) => MeuSonhoCard(
            sonho: lista[i],
            onEditar: (s) => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => PublicarSonhoScreen(sonho: s)),
            ),
            onExcluir: (s) => _confirmarExclusao(s),
          ),
        );
      },
    );
  }

  Widget _buildTabMeusApoios() {
    return StreamBuilder<List<ApoioModel>>(
      stream: _sonhoService.streamMeusApoios(_uid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: AppColors.pink));
        }
        final lista = snapshot.data ?? [];
        if (lista.isEmpty) return _buildEmptyState('Você ainda não apoiou nenhum sonho.');

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: lista.length,
          itemBuilder: (_, i) => ApoioCard(
            apoio: lista[i],
            onTap: () {
              // Buscar o sonho para abrir detalhes (mock ou query)
              // Para simplificar, passamos um modelo parcial ou buscamos no service
            },
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(String msg) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.star_outline, size: 64, color: AppColors.grayLight),
          const SizedBox(height: 16),
          Text(msg, style: const TextStyle(color: AppColors.gray)),
        ],
      ),
    );
  }

  Future<void> _confirmarExclusao(SonhoModel sonho) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Excluir Sonho'),
        content: const Text('Tem certeza que deseja remover este sonho permanentemente?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCELAR')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('EXCLUIR', style: TextStyle(color: AppColors.pink)),
          ),
        ],
      ),
    );
    if (confirmar == true) {
      await _sonhoService.excluirSonho(sonho.id, _uid);
    }
  }
}
