// lib/features/auth/screens/sonhos/widgets/meu_sonho_card.dart

import 'package:flutter/material.dart';
import '../../home/models/sonho_model.dart';
import '../../../../app_colors.dart';

class MeuSonhoCard extends StatelessWidget {
  final SonhoModel sonho;
  final Function(SonhoModel) onEditar;
  final Function(SonhoModel) onExcluir;

  const MeuSonhoCard({
    super.key,
    required this.sonho,
    required this.onEditar,
    required this.onExcluir,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(
          sonho.nomesCrianca.toUpperCase(),
          style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 14),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(sonho.categoria, style: const TextStyle(color: AppColors.pink, fontSize: 12)),
            const SizedBox(height: 4),
            Text(
              sonho.status == 'concluido' ? 'CONCLUÍDO' : 'EM ABERTO',
              style: TextStyle(
                color: sonho.status == 'concluido' ? AppColors.green : AppColors.yellow,
                fontWeight: FontWeight.bold,
                fontSize: 10,
              ),
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: AppColors.gray, size: 20),
              onPressed: () => onEditar(sonho),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.pink, size: 20),
              onPressed: () => onExcluir(sonho),
            ),
          ],
        ),
      ),
    );
  }
}
