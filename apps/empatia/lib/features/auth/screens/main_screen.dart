// lib/features/auth/screens/main_screen.dart
//
// Navegação principal: Home, Pesquisa, Publicar, Sonhos, Perfil.
// Notificações: apenas via ícone de coração no AppBar das telas relevantes.

import 'package:flutter/material.dart';
import 'home/home_screen.dart';
import 'search/search_screen.dart';
import 'publicar/publicar_tab_screen.dart';
import 'sonhos/sonhos_screen.dart';
import 'profile/profile_screen.dart';
import '../../app_colors.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _abaAtual = 0;

  static const List<Widget> _telas = [
    HomeScreen(),
    SearchScreen(),
    PublicarTabScreen(),
    SonhosScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _abaAtual,
        children: _telas,
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(
          top: BorderSide(
            color: AppColors.grayLight,
            width: 1,
          ),
        ),
      ),
      child: NavigationBar(
        elevation: 0,
        backgroundColor: AppColors.white,
        selectedIndex: _abaAtual,
        onDestinationSelected: (i) => setState(() => _abaAtual = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'INÍCIO',
          ),
          NavigationDestination(
            icon: Icon(Icons.search),
            selectedIcon: Icon(Icons.search),
            label: 'PESQUISA',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'PUBLICAR',
          ),
          NavigationDestination(
            icon: Icon(Icons.volunteer_activism_outlined),
            selectedIcon: Icon(Icons.volunteer_activism),
            label: 'SONHOS',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'PERFIL',
          ),
        ],
      ),
    );
  }
}
