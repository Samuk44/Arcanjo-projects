// lib/features/auth/screens/home/widgets/sonho_feed_card.dart

import 'package:flutter/material.dart';
import '../models/sonho_model.dart';
import '../../../../app_colors.dart';

class SonhoFeedCard extends StatelessWidget {
  final SonhoModel sonho;
  final VoidCallback onApoiar;
  final VoidCallback onDetalhes;

  const SonhoFeedCard({
    super.key,
    required this.sonho,
    required this.onApoiar,
    required this.onDetalhes,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onDetalhes,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Categoria + cidade
              Row(
                children: [
                  _Chip(label: sonho.categoria, color: AppColors.pink),
                  const SizedBox(width: 8),
                  _Chip(label: sonho.cidade, color: AppColors.navyCard),
                  const Spacer(),
                  Text(
                    _formatarData(sonho.criadoEm),
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.35),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Nome da criança
              Text(
                sonho.nomesCrianca,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 6),
              // Descrição
              Text(
                sonho.descricao,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.65),
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 14),
              // Rodapé
              Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    color: Colors.white.withValues(alpha: 0.4),
                    size: 14,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    sonho.responsavelNome,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.4),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Icon(Icons.volunteer_activism, color: AppColors.yellow, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    '${sonho.totalApoios}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.4),
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  // Botão Apoiar
                  GestureDetector(
                    onTap: onApoiar,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.pink,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'APOIAR',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatarData(DateTime data) {
    final agora = DateTime.now();
    final diff = agora.difference(data);
    if (diff.inDays == 0) return 'Hoje';
    if (diff.inDays == 1) return 'Ontem';
    if (diff.inDays < 7) return '${diff.inDays}d atrás';
    return '${data.day}/${data.month}';
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color color;
  const _Chip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color == AppColors.pink ? AppColors.pink : Colors.white.withValues(alpha: 0.6),
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
