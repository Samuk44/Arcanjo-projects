// lib/features/app_colors.dart
//
// Paleta e tokens visuais do Empatia (DNA de referência: navy / pink / fundo claro).

import 'package:flutter/material.dart';

class AppColors {
  // Fundos
  static const Color white = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF5F5F5);

  // Primárias e Destaques
  static const Color pink = Color(0xFFE91E63);    // Primária: ícones ativos, badges, botões secundários
  static const Color yellow = Color(0xFFFFC107);  // CTA Principal: Botão "ADOTAR ESTE SONHO"
  static const Color green = Color(0xFF4CAF50);   // Status de entrega confirmada

  // Tipografia e Contrastes
  static const Color navy = Color(0xFF1A1A2E);       // Texto principal, títulos, header
  static const Color navyLight = Color(0xFF16213E);  // Texto secundário
  static const Color gray = Color(0xFF9E9E9E);       // Placeholders, subtextos
  static const Color grayLight = Color(0xFFEEEEEE);  // Bordas sutis, chips, divisores

  // Auxiliares
  static const Color border = Color(0xFFE0E0E0);
  static const Color error = Color(0xFFFF5252);

  // ─── Layout (clonagem estética) ─────────────────────────────────────────
  static const double radiusCard = 14;
  static const double radiusInput = 12;
  static const double radiusChip = 20;
  static const EdgeInsets paddingScreen =
      EdgeInsets.symmetric(horizontal: 16, vertical: 16);
  static const EdgeInsets paddingCard = EdgeInsets.all(16);

  /// Sombra suave padrão dos cards (offset 0,2 · blur 4 · alpha 5%).
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          offset: const Offset(0, 2),
          blurRadius: 4,
          spreadRadius: 0,
        ),
      ];

  /// Título de AppBar: maiúsculas, bold, espaçamento de letras.
  static const TextStyle appBarTitle = TextStyle(
    color: white,
    fontWeight: FontWeight.bold,
    fontSize: 16,
    letterSpacing: 1.5,
  );

  static const TextStyle labelOverline = TextStyle(
    color: gray,
    fontWeight: FontWeight.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  );

  static const TextStyle bodyStrong = TextStyle(
    color: navy,
    fontWeight: FontWeight.w600,
    fontSize: 14,
    height: 1.35,
  );

  static const TextStyle bodyMuted = TextStyle(
    color: gray,
    fontSize: 13,
    height: 1.35,
  );
}
