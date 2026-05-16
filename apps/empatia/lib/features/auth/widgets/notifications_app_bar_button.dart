import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/sonho_service.dart';
import '../screens/notifications/notifications_screen.dart';
import '../../app_colors.dart';

/// Ícone de coração + badge (contagem de não lidas), abre a tela de notificações.
class NotificationsAppBarButton extends StatelessWidget {
  final SonhoService sonhoService;
  final Color iconColor;

  const NotificationsAppBarButton({
    super.key,
    required this.sonhoService,
    this.iconColor = AppColors.white,
  });

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return const SizedBox.shrink();

    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: Icon(Icons.favorite_border, color: iconColor),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const NotificationsScreen(),
              ),
            );
          },
        ),
        StreamBuilder<int>(
          stream: sonhoService.streamTotalNotificacoesNaoLidas(uid),
          builder: (context, snapshot) {
            final total = snapshot.data ?? 0;
            if (total == 0) return const SizedBox.shrink();
            return Positioned(
              right: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: const BoxDecoration(
                  color: AppColors.yellow,
                  shape: BoxShape.circle,
                ),
                constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                child: Text(
                  total > 9 ? '9+' : '$total',
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
