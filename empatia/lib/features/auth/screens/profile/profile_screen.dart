// lib/features/auth/screens/profile/profile_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/usuario_model.dart';
import '../../services/auth_service.dart';
import '../settings/settings_screen.dart';
import 'editar_perfil_screen.dart';
import '../../../app_colors.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return Scaffold(
      backgroundColor: AppColors.navy,
      body: StreamBuilder<UsuarioModel?>(
        stream: authService.streamUsuario(_uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.pink),
            );
          }

          final usuario = snapshot.data;
          if (usuario == null) {
            return const Center(
              child: Text(
                'Usuário não encontrado.',
                style: TextStyle(color: Colors.white),
              ),
            );
          }

          return SafeArea(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _buildHeader(context, usuario)),
                SliverToBoxAdapter(child: _buildEstatisticas(usuario)),
                SliverToBoxAdapter(child: _buildBio(usuario)),
                SliverToBoxAdapter(child: _buildBotaoEditar(context, usuario)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context, UsuarioModel usuario) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 40,
            backgroundColor: AppColors.pink.withValues(alpha: 0.2),
            backgroundImage: usuario.fotoUrl.isNotEmpty
                ? NetworkImage(usuario.fotoUrl)
                : null,
            child: usuario.fotoUrl.isEmpty
                ? Text(
                    usuario.nome.isNotEmpty
                        ? usuario.nome[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      color: AppColors.pink,
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  usuario.nome,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  usuario.email,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.4),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          // Menu ⋮
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert,
              color: Colors.white.withValues(alpha: 0.7),
            ),
            color: AppColors.navyLight,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            onSelected: (value) {
              if (value == 'configuracoes') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'configuracoes',
                child: Row(
                  children: [
                    const Icon(Icons.settings_outlined, color: Colors.white, size: 18),
                    const SizedBox(width: 10),
                    const Text(
                      'Configurações',
                      style: TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEstatisticas(UsuarioModel usuario) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      child: Row(
        children: [
          Expanded(
            child: _StatCard(
              valor: usuario.sonhosCriados,
              label: 'Sonhos\npublicados',
              icone: Icons.star_outline,
              cor: AppColors.yellow,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _StatCard(
              valor: usuario.apoiosDados,
              label: 'Apoios\ndados',
              icone: Icons.volunteer_activism,
              cor: AppColors.pink,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBio(UsuarioModel usuario) {
    if (usuario.bio.isEmpty) return const SizedBox(height: 24);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          usuario.bio,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 14,
            height: 1.6,
          ),
        ),
      ),
    );
  }

  Widget _buildBotaoEditar(BuildContext context, UsuarioModel usuario) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: OutlinedButton.icon(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => EditarPerfilScreen(usuario: usuario),
              ),
            );
          },
          icon: const Icon(Icons.edit_outlined, size: 18),
          label: const Text(
            'EDITAR PERFIL',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.white,
            side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final int valor;
  final String label;
  final IconData icone;
  final Color cor;

  const _StatCard({
    required this.valor,
    required this.label,
    required this.icone,
    required this.cor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cor.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icone, color: cor, size: 28),
          const SizedBox(height: 8),
          Text(
            '$valor',
            style: TextStyle(
              color: cor,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.5),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
