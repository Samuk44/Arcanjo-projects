// lib/features/auth/screens/home/widgets/sonho_feed_card.dart

import 'package:flutter/material.dart';
import '../models/sonho_model.dart';
import '../../../../app_colors.dart';

class SonhoFeedCard extends StatelessWidget {
  final SonhoModel sonho;
  final VoidCallback onDetalhes;
  final VoidCallback onApoiar;

  const SonhoFeedCard({
    super.key,
    required this.sonho,
    required this.onDetalhes,
    required this.onApoiar,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppColors.radiusCard),
        boxShadow: AppColors.cardShadow,
        border: Border.all(color: AppColors.border.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: AppColors.paddingCard,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Logo/Ícone "E" do projeto
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.pink.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppColors.radiusInput),
                  ),
                  child: const Center(
                    child: Text(
                      'E',
                      style: TextStyle(
                        color: AppColors.pink,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sonho.nomesCrianca.toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.navy,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        sonho.descricao,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.navyLight,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.pink.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(AppColors.radiusChip),
                              border: Border.all(
                                color: AppColors.pink.withValues(alpha: 0.25),
                              ),
                            ),
                            child: Text(
                              sonho.categoria.toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.pink,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.grayLight.withValues(alpha: 0.9),
                              borderRadius: BorderRadius.circular(AppColors.radiusChip),
                              border: Border.all(
                                color: AppColors.border.withValues(alpha: 0.7),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.location_on_outlined,
                                  size: 12,
                                  color: AppColors.gray.withValues(alpha: 0.9),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  sonho.cidade,
                                  style: const TextStyle(
                                    color: AppColors.gray,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const Divider(height: 1, color: AppColors.grayLight),
          
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                const Icon(Icons.favorite, color: AppColors.pink, size: 18),
                const SizedBox(width: 6),
                Text(
                  '${sonho.totalApoios} apoiadores',
                  style: const TextStyle(
                    color: AppColors.gray,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: onDetalhes,
                  child: const Text(
                    'DETALHES',
                    style: TextStyle(
                      color: AppColors.pink,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Botão Principal ADOTAR ESTE SONHO (Amarelo)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: onApoiar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.yellow,
                  foregroundColor: AppColors.white,
                  elevation: 0,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppColors.radiusInput),
                  ),
                ),
                child: const Text(
                  'ADOTAR ESTE SONHO',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
