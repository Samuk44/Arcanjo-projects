// lib/features/auth/screens/notifications/notifications_screen.dart
//
// DNA visual: AppBar pink (contraste com Home navy), lista em cards brancos com sombra.

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/notificacao_model.dart';
import '../../services/sonho_service.dart';
import '../../../app_colors.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _sonhoService = SonhoService();
  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  @override
  void initState() {
    super.initState();
    _sonhoService.marcarTodasComoLidas(_uid);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.pink,
        foregroundColor: AppColors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: AppColors.white),
        title: const Text(
          'NOTIFICAÇÕES',
          style: AppColors.appBarTitle,
        ),
      ),
      body: StreamBuilder<List<NotificacaoModel>>(
        stream: _sonhoService.streamNotificacoes(_uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.pink),
            );
          }
          final lista = snapshot.data ?? [];
          if (lista.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.notifications_none_rounded,
                      size: 72,
                      color: AppColors.gray.withValues(alpha: 0.35),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'NENHUMA NOTIFICAÇÃO',
                      style: TextStyle(
                        color: AppColors.navy.withValues(alpha: 0.55),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Quando alguém apoiar ou houver atualizações no seu sonho, aparecerá aqui.',
                      textAlign: TextAlign.center,
                      style: AppColors.bodyMuted.copyWith(fontSize: 13),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            itemCount: lista.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _NotifCard(notif: lista[i]),
          );
        },
      ),
    );
  }
}

class _NotifCard extends StatelessWidget {
  final NotificacaoModel notif;
  const _NotifCard({required this.notif});

  @override
  Widget build(BuildContext context) {
    final unread = !notif.lida;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        boxShadow: AppColors.cardShadow,
        border: Border.all(
          color: unread
              ? AppColors.pink.withValues(alpha: 0.35)
              : AppColors.border.withValues(alpha: 0.35),
          width: unread ? 1.2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _iconColor().withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppColors.radiusInput),
              ),
              child: Icon(_icon(), color: _iconColor(), size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notif.titulo.toUpperCase(),
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    notif.corpo,
                    style: AppColors.bodyMuted.copyWith(
                      color: AppColors.navyLight,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _formatarData(notif.criadoEm),
                    style: TextStyle(
                      color: AppColors.gray.withValues(alpha: 0.9),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _icon() {
    switch (notif.tipo) {
      case 'novo_apoio':
        return Icons.volunteer_activism_outlined;
      case 'entregue_pelo_doador':
        return Icons.local_shipping_outlined;
      case 'entregue_confirmado':
        return Icons.check_circle_outline;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _iconColor() {
    switch (notif.tipo) {
      case 'novo_apoio':
        return AppColors.yellow;
      case 'entregue_pelo_doador':
        return AppColors.pink;
      case 'entregue_confirmado':
        return AppColors.green;
      default:
        return AppColors.navy;
    }
  }

  String _formatarData(DateTime data) {
    final agora = DateTime.now();
    final diff = agora.difference(data);
    if (diff.inMinutes < 60) return 'HÁ ${diff.inMinutes} MIN';
    if (diff.inHours < 24) return 'HÁ ${diff.inHours} H';
    return '${data.day.toString().padLeft(2, '0')}/${data.month.toString().padLeft(2, '0')}';
  }
}
