import 'package:flutter/material.dart';
import 'package:empatia/features/auth/services/auth_service.dart';
import 'package:empatia/features/auth/screens/login/login.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static const _navy = Color(0xFF1A1A2E);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: _navy,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'CONFIGURAÇÕES',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Seção: Conta ────────────────────────────────────────────────
          _SectionHeader(titulo: 'CONTA'),
          const SizedBox(height: 8),
          _SettingsCard(
            itens: [
              _SettingsItem(
                icon: Icons.edit_outlined,
                iconColor: const Color(0xFF2196F3),
                titulo: 'Editar Perfil',
                subtitulo: 'Nome, foto e dados pessoais',
                onTap: () => _showSnack(context, 'Editar Perfil em breve'),
              ),
              _SettingsItem(
                icon: Icons.lock_outline,
                iconColor: const Color(0xFF9C27B0),
                titulo: 'Alterar Senha',
                subtitulo: 'Segurança da sua conta',
                onTap: () => _showSnack(context, 'Alterar Senha em breve'),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── Seção: Preferências ─────────────────────────────────────────
          _SectionHeader(titulo: 'PREFERÊNCIAS'),
          const SizedBox(height: 8),
          _SettingsCard(
            itens: [
              _SettingsItem(
                icon: Icons.notifications_outlined,
                iconColor: const Color(0xFFFFC107),
                titulo: 'Notificações',
                subtitulo: 'Gerencie seus alertas',
                trailing: Switch(
                  value: true,
                  onChanged: (_) {},
                  activeColor: const Color(0xFFE91E63),
                ),
              ),
              _SettingsItem(
                icon: Icons.privacy_tip_outlined,
                iconColor: const Color(0xFF4CAF50),
                titulo: 'Privacidade',
                subtitulo: 'Controle quem vê seus dados',
                onTap: () => _showSnack(context, 'Privacidade em breve'),
              ),
              _SettingsItem(
                icon: Icons.language_outlined,
                iconColor: const Color(0xFF2196F3),
                titulo: 'Idioma',
                subtitulo: 'Português (BR)',
                onTap: () => _showSnack(context, 'Idioma em breve'),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── Seção: Suporte ──────────────────────────────────────────────
          _SectionHeader(titulo: 'SUPORTE'),
          const SizedBox(height: 8),
          _SettingsCard(
            itens: [
              _SettingsItem(
                icon: Icons.help_outline,
                iconColor: const Color(0xFF1A1A2E),
                titulo: 'Central de Ajuda',
                subtitulo: 'Dúvidas e tutoriais',
                onTap: () => _showSnack(context, 'Ajuda em breve'),
              ),
              _SettingsItem(
                icon: Icons.info_outline,
                iconColor: const Color(0xFF9C27B0),
                titulo: 'Sobre o Empatia',
                subtitulo: 'Versão 1.0.0 • Nossa missão',
                onTap: () => _showAbout(context),
              ),
              _SettingsItem(
                icon: Icons.description_outlined,
                iconColor: Colors.grey,
                titulo: 'Termos e Política',
                subtitulo: 'Termos de uso e privacidade',
                onTap: () => _showSnack(context, 'Termos em breve'),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── Botão de Logout ─────────────────────────────────────────────
          _LogoutButton(
            onConfirm: () => _fazerLogout(context),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Future<void> _fazerLogout(BuildContext context) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Sair da conta?',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: Color(0xFF1A1A2E),
          ),
        ),
        content: const Text(
          'Tem certeza que deseja sair do Empatia?',
          style: TextStyle(color: Colors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Cancelar',
              style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE91E63),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
            ),
            child: const Text('Sair', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmar == true && context.mounted) {
      await AuthService().logout();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (_) => false,
        );
      }
    }
  }

  void _showSnack(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: const Color(0xFF1A1A2E),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _showAbout(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.favorite, color: Color(0xFFE91E63)),
            SizedBox(width: 8),
            Text(
              'Empatia',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ],
        ),
        content: const Text(
          'O Empatia conecta sonhos de crianças a pessoas e empresas que querem fazer a diferença.\n\nVersão 1.0.0',
          style: TextStyle(color: Colors.grey, height: 1.5),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1A1A2E),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
            ),
            child: const Text('Fechar',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

// ── Cabeçalho de seção ────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String titulo;
  const _SectionHeader({required this.titulo});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 4),
      child: Text(
        titulo,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Colors.grey.shade500,
          letterSpacing: 1.0,
        ),
      ),
    );
  }
}

// ── Card agrupa vários itens ──────────────────────────────────────────────────
class _SettingsCard extends StatelessWidget {
  final List<_SettingsItem> itens;
  const _SettingsCard({required this.itens});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: List.generate(itens.length * 2 - 1, (i) {
          if (i.isOdd) {
            return const Divider(height: 1, indent: 56);
          }
          return itens[i ~/ 2];
        }),
      ),
    );
  }
}

// ── Item de configuração ──────────────────────────────────────────────────────
class _SettingsItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String titulo;
  final String subtitulo;
  final VoidCallback? onTap;
  final Widget? trailing;

  const _SettingsItem({
    required this.icon,
    required this.iconColor,
    required this.titulo,
    required this.subtitulo,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
      title: Text(
        titulo,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 14,
          color: Color(0xFF1A1A2E),
        ),
      ),
      subtitle: Text(
        subtitulo,
        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
      ),
      trailing: trailing ??
          (onTap != null
              ? Icon(Icons.chevron_right, color: Colors.grey.shade400)
              : null),
      onTap: onTap,
    );
  }
}

// ── Botão de logout estilizado ────────────────────────────────────────────────
class _LogoutButton extends StatelessWidget {
  final VoidCallback onConfirm;
  const _LogoutButton({required this.onConfirm});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onConfirm,
        icon: const Icon(Icons.logout, color: Color(0xFFE91E63), size: 18),
        label: const Text(
          'Sair da Conta',
          style: TextStyle(
            color: Color(0xFFE91E63),
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
        ),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 14),
          side: const BorderSide(color: Color(0xFFE91E63), width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
      ),
    );
  }
}
