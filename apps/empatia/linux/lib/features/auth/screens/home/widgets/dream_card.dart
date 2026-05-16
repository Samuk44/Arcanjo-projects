import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:empatia/features/auth/screens/home/models/sonho_model.dart';

class DreamCard extends StatelessWidget {
  final SonhoModel sonho;
  final VoidCallback? onChat;
  final VoidCallback? onAdotar;
  final VoidCallback? onCurtir;
  final VoidCallback? onApoiar;

  const DreamCard({
    super.key,
    required this.sonho,
    this.onChat,
    this.onAdotar,
    this.onCurtir,
    this.onApoiar,
  });

  Color _categoriaColor() {
    return const Color(0xFF1A1A2E); // Azul escuro para o badge da categoria
  }

  Widget _buildCategoriaBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _categoriaColor(),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        sonho.categoria,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }



  Widget _buildIllustration() {
    switch (sonho.categoria) {
      case 'ARTE':
        return _buildArtIllustration();
      case 'EDUCACAO':
        return _buildEducacaoIllustration();
      default:
        return _buildSpaceIllustration();
    }
  }

  Widget _buildSpaceIllustration() {
    return Container(
      height: 150,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFE8EAF6), Color(0xFFC5CAE9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(topRight: Radius.circular(14)),
      ),
      child: CustomPaint(
        painter: _SpacePainter(),
        child: Stack(
          children: [

          ],
        ),
      ),
    );
  }

  Widget _buildArtIllustration() {
    return Container(
      height: 150,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFC8E6C9), Color(0xFFA5D6A7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(topRight: Radius.circular(14)),
      ),
      child: CustomPaint(
        painter: _ArtPainter(),
        child: Stack(
          children: [

          ],
        ),
      ),
    );
  }

  Widget _buildEducacaoIllustration() {
    return Container(
      height: 150,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFFFF9C4), Color(0xFFFFF176)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(topRight: Radius.circular(14)),
      ),
      child: CustomPaint(
        painter: _EducacaoPainter(),
        child: Stack(
          children: [

          ],
        ),
      ),
    );
  }





  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
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
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    _buildIllustration(),
                    Positioned(
                      top: 8,
                      left: 8,
                      child: SizedBox(
                        width: 36,
                        height: 36,
                        child: CustomPaint(painter: _LogoEPainter()),
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF333333),
                            height: 1.3,
                          ),
                          children: [
                            TextSpan(
                              text: 'Sonho de ${sonho.nomeCrianca}:\n',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700),
                            ),
                            TextSpan(
                              text: sonho.descricao,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w400),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1A2E),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Cidade: ${sonho.cidade}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: onCurtir,
                        child: Row(
                          children: [
                            Icon(
                              sonho.curtido
                                  ? Icons.favorite
                                  : Icons.favorite_border,
                              size: 20,
                              color: const Color(0xFFE53935),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              '${sonho.curtidas}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFE53935),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: onApoiar,
                        child: Row(
                          children: [
                            Icon(
                              sonho.apoiado
                                  ? Icons.thumb_up
                                  : Icons.thumb_up_outlined,
                              size: 18,
                              color: const Color(0xFF1E88E5),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              '${sonho.apoios}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E88E5),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Positioned(
              top: 150 - 30, // Ajuste para posicionar o chat acima do botão adotar
              right: 12,
              child: GestureDetector(
                onTap: onChat,
                child: Row(
                  children: [
                    const Text(
                      'Chat',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF333333),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        color: Color(0xFF2196F3),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.send, size: 16, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              bottom: 10,
              right: 12,
              child: GestureDetector(
                onTap: onAdotar,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFC107),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Adotar Este Sonho',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF333333),
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

class _SpacePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final starPaint = Paint()..color = const Color(0xFFFFC107);
    for (final pos in [
      [0.15, 0.2],
      [0.75, 0.15],
      [0.85, 0.55],
      [0.3, 0.7],
      [0.55, 0.35],
    ]) {
      _drawStar(canvas, Offset(size.width * pos[0], size.height * pos[1]), 5,
          starPaint);
    }

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

    final aX = size.width * 0.22;
    final aY = size.height * 0.6;
    canvas.drawCircle(Offset(aX, aY - 10), 12, Paint()..color = Colors.white);
    canvas.drawCircle(
        Offset(aX, aY - 10),
        12,
        Paint()
          ..color = const Color(0xFF90A4AE)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2);
    canvas.drawCircle(
        Offset(aX, aY - 10), 7, Paint()..color = const Color(0xFF42A5F5));
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          Rect.fromCenter(center: Offset(aX, aY + 8), width: 18, height: 16),
          const Radius.circular(4)),
      Paint()..color = Colors.white,
    );
  }

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

class _ArtPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawCircle(Offset(size.width * 0.15, size.height * 0.25), 14,
        Paint()..color = const Color(0xFFFF9800).withOpacity(0.5));
    canvas.drawCircle(Offset(size.width * 0.7, size.height * 0.7), 12,
        Paint()..color = const Color(0xFF2196F3).withOpacity(0.4));
    canvas.drawCircle(Offset(size.width * 0.8, size.height * 0.3), 10,
        Paint()..color = const Color(0xFFE91E63).withOpacity(0.4));
    canvas.drawCircle(Offset(size.width * 0.35, size.height * 0.75), 8,
        Paint()..color = const Color(0xFF9C27B0).withOpacity(0.4));

    final pX = size.width * 0.5;
    final pY = size.height * 0.48;
    canvas.drawOval(
        Rect.fromCenter(center: Offset(pX, pY), width: 70, height: 55),
        Paint()..color = const Color(0xFF8D6E63));
    for (final c in [
      [const Color(0xFFE53935), -18.0, -8.0],
      [const Color(0xFF1E88E5), 8.0, -12.0],
      [const Color(0xFFFFC107), 20.0, 2.0],
      [const Color(0xFF4CAF50), -8.0, 10.0],
      [Colors.white, 5.0, 8.0],
    ]) {
      canvas.drawCircle(Offset(pX + (c[1] as double), pY + (c[2] as double)), 6,
          Paint()..color = c[0] as Color);
    }

    canvas.drawLine(
        Offset(size.width * 0.72, size.height * 0.2),
        Offset(size.width * 0.82, size.height * 0.55),
        Paint()
          ..color = const Color(0xFF795548)
          ..strokeWidth = 4
          ..strokeCap = StrokeCap.round);
    canvas.drawCircle(Offset(size.width * 0.72, size.height * 0.2), 5,
        Paint()..color = const Color(0xFFE53935));

    canvas.drawLine(
        Offset(size.width * 0.2, size.height * 0.35),
        Offset(size.width * 0.15, size.height * 0.65),
        Paint()
          ..color = const Color(0xFFFFC107)
          ..strokeWidth = 4
          ..strokeCap = StrokeCap.round);
    canvas.drawCircle(Offset(size.width * 0.15, size.height * 0.65), 3,
        Paint()..color = const Color(0xFF333333));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _EducacaoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          Rect.fromCenter(
              center: Offset(size.width * 0.45, size.height * 0.5),
              width: 60,
              height: 45),
          const Radius.circular(4)),
      Paint()..color = const Color(0xFF1565C0),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          Rect.fromCenter(
              center: Offset(size.width * 0.45, size.height * 0.5),
              width: 55,
              height: 40),
          const Radius.circular(3)),
      Paint()..color = Colors.white,
    );
    final lp = Paint()
      ..color = const Color(0xFFBBDEFB)
      ..strokeWidth = 2;
    for (int i = 0; i < 4; i++) {
      final y = size.height * 0.42 + i * 7;
      canvas.drawLine(
          Offset(size.width * 0.32, y), Offset(size.width * 0.55, y), lp);
    }

    canvas.drawRRect(
      RRect.fromRectAndRadius(
          Rect.fromCenter(
              center: Offset(size.width * 0.73, size.height * 0.55),
              width: 35,
              height: 28),
          const Radius.circular(3)),
      Paint()..color = const Color(0xFF4CAF50),
    );

    final hat = Path()
      ..moveTo(size.width * 0.3, size.height * 0.22)
      ..lineTo(size.width * 0.5, size.height * 0.12)
      ..lineTo(size.width * 0.7, size.height * 0.22)
      ..lineTo(size.width * 0.5, size.height * 0.3)
      ..close();
    canvas.drawPath(hat, Paint()..color = const Color(0xFF333333));
    canvas.drawLine(
        Offset(size.width * 0.5, size.height * 0.12),
        Offset(size.width * 0.5, size.height * 0.05),
        Paint()
          ..color = const Color(0xFFFFC107)
          ..strokeWidth = 2);
    canvas.drawCircle(Offset(size.width * 0.5, size.height * 0.05), 4,
        Paint()..color = const Color(0xFFFFC107));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Logo "E" colorido (fallback quando imagem nao esta disponivel)
class _LogoEPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double u = size.width / 5;

    // Barra vertical esquerda - teal
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          Rect.fromLTWH(0, 0, u * 1.2, u * 1.8), const Radius.circular(2)),
      Paint()..color = const Color(0xFF00897B),
    );
    // Barra vertical esquerda - vermelho
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(0, u * 1.8, u * 1.2, u * 1.4),
          const Radius.circular(2)),
      Paint()..color = const Color(0xFFE53935),
    );
    // Barra vertical esquerda - amarelo
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(0, u * 3.2, u * 1.2, u * 1.8),
          const Radius.circular(2)),
      Paint()..color = const Color(0xFFFFC107),
    );

    // Barra horizontal topo - teal
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(u * 1.2, 0, u * 3.8, u * 1.2),
          const Radius.circular(2)),
      Paint()..color = const Color(0xFF00897B),
    );

    // Barra horizontal meio - laranja
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(u * 1.2, u * 2.0, u * 2.8, u * 1.0),
          const Radius.circular(2)),
      Paint()..color = const Color(0xFFFF9800),
    );

    // Barra horizontal inferior - azul
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(u * 1.2, u * 3.8, u * 3.8, u * 1.2),
          const Radius.circular(2)),
      Paint()..color = const Color(0xFF1565C0),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
