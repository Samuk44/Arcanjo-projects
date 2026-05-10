// lib/features/auth/screens/main_screen.dart
//
// Shell de navegação principal com 4 abas:
//   0 → Home
//   1 → Pesquisa
//   2 → Sonhos
//   3 → Perfil

import 'package:flutter/material.dart';
import 'home/home_screen.dart';
import 'search/search_screen.dart';
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
      decoration: BoxDecoration(
        color: AppColors.navyLight,
        border: Border(
          top: BorderSide(
            color: Colors.white.withValues(alpha: 0.08),
            width: 1,
          ),
        ),
      ),
      child: NavigationBar(
        backgroundColor: Colors.transparent,
        indicatorColor: AppColors.pink.withValues(alpha: 0.15),
        selectedIndex: _abaAtual,
        onDestinationSelected: (i) => setState(() => _abaAtual = i),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          NavigationDestination(
            icon: Icon(
              Icons.home_outlined,
              color: _abaAtual == 0
                  ? AppColors.pink
                  : Colors.white.withValues(alpha: 0.4),
            ),
            selectedIcon: const Icon(Icons.home, color: AppColors.pink),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(
              Icons.search,
              color: _abaAtual == 1
                  ? AppColors.pink
                  : Colors.white.withValues(alpha: 0.4),
            ),
            selectedIcon: const Icon(Icons.search, color: AppColors.pink),
            label: 'Pesquisa',
          ),
          NavigationDestination(
            icon: Icon(
              Icons.star_border_rounded,
              color: _abaAtual == 2
                  ? AppColors.pink
                  : Colors.white.withValues(alpha: 0.4),
            ),
            selectedIcon: const Icon(Icons.star_rounded, color: AppColors.pink),
            label: 'Sonhos',
          ),
          NavigationDestination(
            icon: Icon(
              Icons.person_outline,
              color: _abaAtual == 3
                  ? AppColors.pink
                  : Colors.white.withValues(alpha: 0.4),
            ),
            selectedIcon: const Icon(Icons.person, color: AppColors.pink),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
