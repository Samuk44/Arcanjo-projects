// lib/features/auth/screens/settings/settings_screen.dart

import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../../app_colors.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('CONFIGURAÇÕES')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildOption(
            icon: Icons.logout,
            title: 'Sair da conta',
            subtitle: 'Encerra sua sessão atual',
            onTap: () async {
              final confirmar = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('SAIR'),
                  content: const Text('Tem certeza que deseja encerrar sua sessão?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCELAR')),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('SAIR', style: TextStyle(color: AppColors.pink)),
                    ),
                  ],
                ),
              );
              if (confirmar == true) {
                await authService.logout();
                if (context.mounted) {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                }
              }
            },
            isDestructive: true,
          ),
          const SizedBox(height: 24),
          const Center(
            child: Text(
              'Versão 2.0.0 (SRE Edition)',
              style: TextStyle(color: AppColors.gray, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    final color = isDestructive ? AppColors.pink : AppColors.navy;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: color),
        title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppColors.gray, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.grayLight),
      ),
    );
  }
}
