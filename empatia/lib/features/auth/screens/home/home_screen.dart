// lib/features/auth/screens/home/home_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:empatia/features/auth/screens/home/models/sonho_model.dart';
import '../../services/sonho_service.dart';
import '../../services/auth_service.dart';
import '../sonhos/screens/detalhe_sonho_screen.dart';
import '../notifications/notifications_screen.dart';
import 'widgets/sonho_feed_card.dart';
import '../../../app_colors.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _sonhoService = SonhoService();
  final _authService = AuthService();

  String _filtroCategoria = 'Todos';
  String _filtroCidade = '';
  bool _filtroPorProximidade = false;

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  static const List<String> _categorias = [
    'Todos',
    'Bicicleta',
    'Material escolar',
    'Kit de leitura',
    'Material de arte',
    'Brinquedo',
    'Roupa / Calçado',
    'Instrumento musical',
    'Equipamento esportivo',
    'Outro',
  ];

  List<SonhoModel> _aplicarFiltros(List<SonhoModel> lista) {
    return lista.where((s) {
      final passaCategoria = _filtroCategoria == 'Todos' ||
          s.categoria.toLowerCase() == _filtroCategoria.toLowerCase();
      final passaCidade = _filtroCidade.isEmpty ||
          s.cidade.toLowerCase().contains(_filtroCidade.toLowerCase());
      return passaCategoria && passaCidade;
    }).toList();
  }

  void _abrirDetalhe(SonhoModel sonho) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => DetalheSonhoScreen(sonho: sonho)),
    );
  }

  Future<void> _apoiarRapido(SonhoModel sonho) async {
    // Impede auto-apoio
    if (sonho.responsavelId == _uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Você não pode apoiar o seu próprio sonho.'),
          backgroundColor: AppColors.pink,
        ),
      );
      return;
    }
    final usuario = await _authService.buscarUsuario(_uid);
    await _sonhoService.apoiarSonho(
      sonho: sonho,
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
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildFiltros(),
            Expanded(child: _buildFeed()),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 8),
      child: Row(
        children: [
          // Logo oficial
          Image.asset(
            'assets/logo.png',
            height: 36,
            errorBuilder: (_, __, ___) => const Text(
              'EMPATIA',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 22,
                letterSpacing: 2,
              ),
            ),
          ),
          const Spacer(),
          // Ícone de notificações com badge
          StreamBuilder<List<dynamic>>(
            stream: _sonhoService.streamNotificacoes(_uid),
            builder: (context, snap) {
              final naoLidas =
                  (snap.data ?? []).where((n) => !(n.lida as bool)).length;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      );
                    },
                    icon: const Icon(
                      Icons.favorite_border,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                  if (naoLidas > 0)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: const BoxDecoration(
                          color: AppColors.pink,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            naoLidas > 9 ? '9+' : '$naoLidas',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFiltros() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Chips de categoria
        SizedBox(
          height: 38,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _categorias.length,
            itemBuilder: (_, i) {
              final cat = _categorias[i];
              final selecionado = _filtroCategoria == cat;
              return GestureDetector(
                onTap: () => setState(() => _filtroCategoria = cat),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(right: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: selecionado
                        ? AppColors.pink
                        : Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: selecionado
                          ? AppColors.pink
                          : Colors.white.withValues(alpha: 0.15),
                    ),
                  ),
                  child: Text(
                    cat,
                    style: TextStyle(
                      color: selecionado
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.6),
                      fontWeight:
                          selecionado ? FontWeight.bold : FontWeight.normal,
                      fontSize: 13,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        // Campo de busca por cidade
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  style: const TextStyle(color: Colors.white),
                  onChanged: (v) => setState(() => _filtroCidade = v),
                  decoration: InputDecoration(
                    hintText: 'Filtrar por cidade...',
                    hintStyle: TextStyle(
                      color: Colors.white.withValues(alpha: 0.3),
                      fontSize: 13,
                    ),
                    prefixIcon: Icon(
                      Icons.location_on,
                      color: Colors.white.withValues(alpha: 0.4),
                      size: 18,
                    ),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.07),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
      ],
    );
  }

  Widget _buildFeed() {
    return StreamBuilder<List<SonhoModel>>(
      stream: _sonhoService.streamSonhosAprovados(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.pink),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Text(
              'Erro ao carregar sonhos.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
            ),
          );
        }

        final todos = snapshot.data ?? [];
        final filtrados = _aplicarFiltros(todos);

        if (filtrados.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.search_off,
                  size: 56,
                  color: Colors.white.withValues(alpha: 0.15),
                ),
                const SizedBox(height: 16),
                Text(
                  todos.isEmpty
                      ? 'Nenhum sonho publicado ainda.'
                      : 'Nenhum sonho encontrado com esses filtros.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.4),
                    fontSize: 15,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
          itemCount: filtrados.length,
          itemBuilder: (_, i) => SonhoFeedCard(
            sonho: filtrados[i],
            onDetalhes: () => _abrirDetalhe(filtrados[i]),
            onApoiar: () => _apoiarRapido(filtrados[i]),
          ),
        );
      },
    );
  }
}
