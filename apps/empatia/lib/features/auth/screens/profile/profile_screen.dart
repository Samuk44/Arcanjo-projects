// lib/features/auth/screens/profile/profile_screen.dart
//
// DNA visual: fundo cinza claro, cartões brancos com sombra suave, AppBar navy (tema global).

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/usuario_model.dart';
import '../../services/auth_service.dart';
import 'editar_perfil_screen.dart';
import '../settings/settings_screen.dart';
import '../../../app_colors.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('PERFIL'),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            tooltip: 'Mais opções',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const SettingsScreen(),
              ),
            ),
          ),
        ],
      ),
      body: StreamBuilder<UsuarioModel?>(
        stream: authService.streamUsuario(_uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.pink),
            );
          }
          final user = snapshot.data;
          if (user == null) {
            return const Center(
              child: Text(
                'Usuário não encontrado',
                style: AppColors.bodyMuted,
              ),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
            child: Column(
              children: [
                _ProfileHeaderCard(user: user),
                const SizedBox(height: 16),
                _StatsRow(user: user),
                const SizedBox(height: 20),
                _ActionTile(
                  icon: Icons.person_outline,
                  title: 'EDITAR PERFIL',
                  subtitle: 'Nome, bio e foto',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => EditarPerfilScreen(usuario: user),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                _ActionTile(
                  icon: Icons.settings_outlined,
                  title: 'CONFIGURAÇÕES',
                  subtitle: 'Preferências do app',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const SettingsScreen(),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProfileHeaderCard extends StatelessWidget {
  final UsuarioModel user;
  const _ProfileHeaderCard({required this.user});

  ImageProvider? _avatar(String fotoUrl) {
    if (fotoUrl.isEmpty) return null;
    if (fotoUrl.startsWith('data:image') || !fotoUrl.startsWith('http')) {
      final base64Content =
          fotoUrl.contains(',') ? fotoUrl.split(',').last : fotoUrl;
      try {
        return MemoryImage(base64.decode(base64Content));
      } catch (_) {
        return null;
      }
    }
    return NetworkImage(fotoUrl);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        boxShadow: AppColors.cardShadow,
        border: Border.all(color: AppColors.border.withValues(alpha: 0.35)),
      ),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              CircleAvatar(
                radius: 52,
                backgroundColor: AppColors.pink.withValues(alpha: 0.1),
                backgroundImage: _avatar(user.fotoUrl),
                child: user.fotoUrl.isEmpty
                    ? const Icon(Icons.person, size: 52, color: AppColors.gray)
                    : null,
              ),
              Positioned(
                right: -4,
                bottom: -4,
                child: Material(
                  color: AppColors.pink,
                  shape: const CircleBorder(),
                  elevation: 2,
                  shadowColor: Colors.black.withValues(alpha: 0.12),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => EditarPerfilScreen(usuario: user),
                      ),
                    ),
                    child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.edit, color: AppColors.white, size: 18),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            user.nome.toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.bold,
              fontSize: 18,
              letterSpacing: 0.8,
            ),
          ),
          if (user.bio.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              user.bio,
              textAlign: TextAlign.center,
              style: AppColors.bodyMuted.copyWith(fontSize: 14),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final UsuarioModel user;
  const _StatsRow({required this.user});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        boxShadow: AppColors.cardShadow,
        border: Border.all(color: AppColors.border.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _StatItem(
              label: 'SONHOS CRIADOS',
              value: user.sonhosCriados,
              icon: Icons.volunteer_activism_outlined,
            ),
          ),
          Container(
            width: 1,
            height: 48,
            color: AppColors.grayLight,
          ),
          Expanded(
            child: _StatItem(
              label: 'APOIOS DADOS',
              value: user.apoiosDados,
              icon: Icons.favorite_border,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;

  const _StatItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppColors.pink.withValues(alpha: 0.85), size: 22),
        const SizedBox(height: 8),
        Text(
          '$value',
          style: const TextStyle(
            color: AppColors.navy,
            fontWeight: FontWeight.bold,
            fontSize: 26,
            height: 1,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          textAlign: TextAlign.center,
          style: AppColors.labelOverline.copyWith(fontSize: 9, letterSpacing: 1.1),
        ),
      ],
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(AppColors.radiusCard),
      elevation: 0,
      shadowColor: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppColors.radiusCard),
            boxShadow: AppColors.cardShadow,
            border: Border.all(color: AppColors.border.withValues(alpha: 0.35)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.pink.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppColors.radiusInput),
                  ),
                  child: Icon(icon, color: AppColors.pink, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: AppColors.navy,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 0.9,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(subtitle, style: AppColors.bodyMuted.copyWith(fontSize: 12)),
                    ],
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  color: AppColors.gray.withValues(alpha: 0.7),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
