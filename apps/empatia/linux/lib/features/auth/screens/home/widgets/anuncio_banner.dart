import 'package:flutter/material.dart';
import 'dart:math' as math;

class AnuncioBanner extends StatelessWidget {
  const AnuncioBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      height: 90,
      decoration: BoxDecoration(
        color: const Color(0xFFFDD835), // Amarelo mais claro para o fundo geral
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Row(
          children: [
            // Lado esquerdo - azul escuro com ilustração de espaço
            // Lado esquerdo - azul escuro com ilustração de espaço
            Expanded(
              flex: 3,
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFF1A1A2E), // Azul escuro
                ),
                child: CustomPaint(
                  painter: _BannerSpacePainter(), // Novo painter para ilustração de espaço
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'ANUNCIO',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                            color: Colors.white70,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Brinquedos e\nPresentes',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            // Lado direito - card branco com logo Pingo Brinquedos
            Expanded(
              flex: 2,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white, // Fundo branco
                  borderRadius: BorderRadius.circular(12), // Borda arredondada
                ),
                margin: const EdgeInsets.all(8), // Margem para o card branco
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Placeholder para o logo Pingo Brinquedos
                        Image.asset(
                          'assets/images/pingo_brinquedos_logo.png', // Substituir pelo caminho real do logo
                          height: 30,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return const Text(
                              'Pingo\nBrinquedos',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF333333),
                                height: 1.2,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BannerSpacePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Estrelas
    final starPaint = Paint()..color = Colors.white.withOpacity(0.8);
    for (final pos in [
      [0.15, 0.2],
      [0.75, 0.15],
      [0.85, 0.55],
      [0.3, 0.7],
      [0.55, 0.35],
      [0.9, 0.2],
      [0.2, 0.8],
      [0.6, 0.85],
    ]) {
      _drawStar(canvas, Offset(size.width * pos[0], size.height * pos[1]), 3,
          starPaint);
    }

    // Foguete
    final rX = size.width * 0.48;
    final rY = size.height * 0.45;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset(rX, rY), width: 20, height: 40),
          const Radius.circular(10)),
      Paint()..color = Colors.white,
    );
    final nose = Path()
      ..moveTo(rX - 10, rY - 18)
      ..lineTo(rX, rY - 35)
      ..lineTo(rX + 10, rY - 18)
      ..close();
    canvas.drawPath(nose, Paint()..color = const Color(0xFFE53935));
    canvas.drawCircle(
        Offset(rX, rY - 5), 5, Paint()..color = const Color(0xFF42A5F5));
    final flame = Path()
      ..moveTo(rX - 7, rY + 20)
      ..lineTo(rX, rY + 35)
      ..lineTo(rX + 7, rY + 20)
      ..close();
    canvas.drawPath(flame, Paint()..color = const Color(0xFFFF9800));
    final flameIn = Path()
      ..moveTo(rX - 4, rY + 20)
      ..lineTo(rX, rY + 30)
      ..lineTo(rX + 4, rY + 20)
      ..close();
    canvas.drawPath(flameIn, Paint()..color = const Color(0xFFFFC107));

    // Planeta
    canvas.drawCircle(Offset(size.width * 0.78, size.height * 0.3), 18,
        Paint()..color = const Color(0xFFFF9800));
    canvas.drawOval(
      Rect.fromCenter(
          center: Offset(size.width * 0.78, size.height * 0.3),
          width: 50,
          height: 14),
      Paint()
        ..color = const Color(0xFFFFCC80)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
  }

  // Funções auxiliares para desenhar estrelas e planetas
  void _drawStar(Canvas canvas, Offset center, double radius, Paint paint) {
    final path = Path();
    for (int i = 0; i < 5; i++) {
      final angle = (i * 144 - 90) * math.pi / 180;
      final x = center.dx + radius * math.cos(angle);
      final y = center.dy + radius * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
