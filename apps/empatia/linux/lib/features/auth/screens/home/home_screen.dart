import 'package:flutter/material.dart';
import 'package:empatia/features/auth/screens/home/models/sonho_model.dart';
import 'package:empatia/features/auth/screens/home/widgets/dream_card.dart';
import 'package:empatia/features/auth/screens/home/widgets/anuncio_banner.dart';

// ── Novas telas integradas ───────────────────────────────────────────────────
import 'package:empatia/features/auth/screens/search/search_screen.dart';
import 'package:empatia/features/auth/screens/notifications/notifications_screen.dart';
import 'package:empatia/features/auth/screens/profile/profile_screen.dart';
import 'package:empatia/features/auth/screens/settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // ── Constantes de cor ────────────────────────────────────────────────────
  static const _navy   = Color(0xFF1A1A2E);
  static const _pink   = Color(0xFFE91E63);
  static const _yellow = Color(0xFFFFC107);
  static const _green  = Color(0xFF4CAF50);
  static const _blue   = Color(0xFF2196F3);

  int _currentIndex = 0;
  late List<SonhoModel> _sonhos;

  // ── Títulos da AppBar por aba ─────────────────────────────────────────────
  static const _titles = [
    'EMPATIA',
    'PESQUISA',
    'NOTIFICAÇÕES',
    'PERFIL',
    'CONFIGURAÇÕES',
  ];

  // ── Abas que renderizam suas próprias AppBar/Scaffold ─────────────────────
  // Para essas abas, ocultamos a AppBar do HomeScreen
  static const _abasComAppBarPropria = {1, 2, 3, 4};

  @override
  void initState() {
    super.initState();
    _sonhos = SonhoModel.mockData();
  }

  @override
  Widget build(BuildContext context) {
    final usaAppBarPropria = _abasComAppBarPropria.contains(_currentIndex);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: usaAppBarPropria
          ? null
          : AppBar(
              backgroundColor: _navy,
              elevation: 0,
              centerTitle: true,
              title: Text(
                _titles[_currentIndex],
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              actions: [
                if (_currentIndex == 0)
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline,
                        color: Colors.white70),
                    tooltip: 'Publicar sonho',
                    onPressed: () {},
                  ),
              ],
            ),
      // ── IndexedStack mantém o estado de cada aba ─────────────────────────
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildFeed(),                       // 0 – Home
          const SearchScreen(),               // 1 – Pesquisa
          const NotificationsScreen(),        // 2 – Notificações
          const ProfileScreen(),              // 3 – Perfil
          const SettingsScreen(),             // 4 – Configurações
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  // ── Feed da Home ──────────────────────────────────────────────────────────
  Widget _buildFeed() {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: AnuncioBanner()),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                return DreamCard(
                  sonho: _sonhos[index],
                  onChat: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Chat com ${_sonhos[index].nomeCrianca}'),
                        backgroundColor: _blue,
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  },
                  onAdotar: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Adotando sonho de ${_sonhos[index].nomeCrianca}!',
                        ),
                        backgroundColor: _green,
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    );
                  },
                  onCurtir: () {
                    setState(() {
                      final s = _sonhos[index];
                      _sonhos[index] = SonhoModel(
                        id: s.id,
                        nomeCrianca: s.nomeCrianca,
                        descricao: s.descricao,
                        categoria: s.categoria,
                        cidade: s.cidade,
                        imagemUrl: s.imagemUrl,
                        responsavelId: s.responsavelId,
                        status: s.status,
                        patrocinadorImagem: s.patrocinadorImagem,
                        patrocinadorNome: s.patrocinadorNome,
                        curtidas: s.curtido ? s.curtidas - 1 : s.curtidas + 1,
                        apoios: s.apoios,
                        curtido: !s.curtido,
                        apoiado: s.apoiado,
                        criadoEm: s.criadoEm,
                      );
                    });
                  },
                  onApoiar: () {
                    setState(() {
                      final s = _sonhos[index];
                      _sonhos[index] = SonhoModel(
                        id: s.id,
                        nomeCrianca: s.nomeCrianca,
                        descricao: s.descricao,
                        categoria: s.categoria,
                        cidade: s.cidade,
                        imagemUrl: s.imagemUrl,
                        responsavelId: s.responsavelId,
                        status: s.status,
                        patrocinadorImagem: s.patrocinadorImagem,
                        patrocinadorNome: s.patrocinadorNome,
                        curtidas: s.curtidas,
                        apoios: s.apoiado ? s.apoios - 1 : s.apoios + 1,
                        curtido: s.curtido,
                        apoiado: !s.apoiado,
                        criadoEm: s.criadoEm,
                      );
                    });
                  },
                );
              },
              childCount: _sonhos.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
        ],
      ),
    );
  }

  // ── Bottom Navigation Bar ─────────────────────────────────────────────────
  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(icon: Icons.home_rounded,        label: 'HOME',          index: 0),
              _buildNavItem(icon: Icons.search_rounded,       label: 'PESQUISA',      index: 1),
              _buildNavItem(icon: Icons.notifications_rounded,label: 'NOTIFICAÇÕES',  index: 2),
              _buildNavItem(icon: Icons.person_rounded,       label: 'PERFIL',        index: 3),
              _buildNavItem(icon: Icons.settings_rounded,     label: 'CONFIG.',       index: 4),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final selected = _currentIndex == index;
    final color = selected ? _pink : _navy;

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: selected
            ? BoxDecoration(
                color: _pink.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
              )
            : null,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 8,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
