import 'package:empatia/features/auth/services/auth_service.dart';
import 'package:flutter/material.dart';

class RegisterDadosScreen extends StatefulWidget {
  const RegisterDadosScreen({super.key});

  @override
  State<RegisterDadosScreen> createState() => _RegisterDadosScreenState();
}

class _RegisterDadosScreenState extends State<RegisterDadosScreen> {
  final nomeController = TextEditingController();
  final enderecoController = TextEditingController();
  final telefoneController = TextEditingController();
  final redeSocialController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;

  @override
  void dispose() {
    nomeController.dispose();
    enderecoController.dispose();
    telefoneController.dispose();
    redeSocialController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (nomeController.text.isEmpty ||
        enderecoController.text.isEmpty ||
        telefoneController.text.isEmpty) {
      _mostrarErro('Preencha os campos obrigatórios.');
      return;
    }

    setState(() => _isLoading = true);

    final erro = await _authService.salvarDadosPessoais(
      nome: nomeController.text.trim(),
      endereco: enderecoController.text.trim(),
      telefone: telefoneController.text.trim(),
      redeSocial: redeSocialController.text.trim(),
    );

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (erro != null) {
      _mostrarErro(erro);
      return;
    }

    // O StreamBuilder em MyApp já detecta que o usuário está logado
    // e exibe a HomeScreen — remove toda a pilha de navegação.
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _mostrarErro(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(mensagem), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Header amarelo
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
                color: const Color(0xFFFFC107),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: CustomPaint(
                              painter: _LogoPainter(),
                              child: const Center(
                                child: Text(
                                  'E',
                                  style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF1A1A2E),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'EMPATIA',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF1A1A2E),
                                letterSpacing: 1,
                              ),
                            ),
                            Text(
                              'Sonhos de Criança',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF1A1A2E),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'CADASTRO DE\nRESPONSÁVEL',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1A1A2E),
                        height: 1.2,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),

              // Formulário
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                child: Column(
                  children: [
                    _buildField(
                      label: 'NOME COMPLETO\nDO RESPONSÁVEL',
                      hint: '',
                      controller: nomeController,
                      borderColor: const Color(0xFF4CAF50),
                      iconBg: const Color(0xFF4CAF50),
                      iconWidget: _buildNomeIcon(),
                    ),
                    const SizedBox(height: 14),
                    _buildField(
                      label: 'ENDEREÇO',
                      hint: 'RUA, BAIRRO, CIDADE/ESTADO',
                      controller: enderecoController,
                      borderColor: const Color(0xFFFF9800),
                      iconBg: const Color(0xFFFF9800),
                      iconWidget: _buildEnderecoIcon(),
                    ),
                    const SizedBox(height: 14),
                    _buildField(
                      label: 'TELEFONE COM DDD',
                      hint: '',
                      controller: telefoneController,
                      borderColor: const Color(0xFF2196F3),
                      iconBg: const Color(0xFF2196F3),
                      iconWidget: _buildTelefoneIcon(),
                      type: TextInputType.phone,
                    ),
                    const SizedBox(height: 14),
                    _buildField(
                      label: 'REDE SOCIAL',
                      hint: "@seuperfil ou https://...",
                      controller: redeSocialController,
                      borderColor: const Color(0xFF9C27B0),
                      iconBg: const Color(0xFF9C27B0),
                      iconWidget: _buildRedeSocialIcon(),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'A EMPATIA se compromete com a segurança\ne privacidade de todos os seus dados.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 12, color: Color(0xFF666666), height: 1.5),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _salvar,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1A1A2E),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white)
                            : const Text(
                                'CRIAR CONTA\nDE RESPONSÁVEL',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                  height: 1.3,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Já tem cadastro? ',
                          style:
                              TextStyle(fontSize: 14, color: Color(0xFF666666)),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: const Text(
                            'Entrar',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A2E),
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNomeIcon() {
    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(56, 56),
            painter: _SquigglePainter(
                color: Colors.white.withOpacity(0.9)),
          ),
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: const Color(0xFFFFC107),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: Colors.white, width: 1.5),
            ),
            child: const Center(
              child: Text('☺', style: TextStyle(fontSize: 18)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEnderecoIcon() {
    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            top: 5,
            left: 5,
            child: Container(
              width: 15,
              height: 15,
              decoration: const BoxDecoration(
                color: Color(0xFFE91E63),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: 4,
            right: 7,
            child: Container(
              width: 13,
              height: 13,
              decoration: const BoxDecoration(
                color: Color(0xFF2196F3),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: 6,
            left: 8,
            child: Container(
              width: 13,
              height: 13,
              decoration: BoxDecoration(
                color: const Color(0xFFFFC107),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          Positioned(
            bottom: 5,
            right: 6,
            child: Container(
              width: 13,
              height: 13,
              decoration: const BoxDecoration(
                color: Color(0xFF4CAF50),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Container(
            width: 12,
            height: 12,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTelefoneIcon() {
    return SizedBox(
      width: 56,
      height: 56,
      child: Center(
        child: Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: const Color(0xFFFFC107),
            borderRadius: BorderRadius.circular(17),
            border: Border.all(color: Colors.white, width: 1.5),
          ),
          child: const Center(
            child: Text('☺', style: TextStyle(fontSize: 20)),
          ),
        ),
      ),
    );
  }

  Widget _buildRedeSocialIcon() {
    return SizedBox(
      width: 56,
      height: 56,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(56, 56),
            painter: _WavePainter(
                color: const Color(0xFFE91E63).withOpacity(0.85)),
          ),
          const Icon(Icons.link, color: Colors.white, size: 26),
        ],
      ),
    );
  }

  Widget _buildField({
    required String label,
    required String hint,
    required TextEditingController controller,
    required Color borderColor,
    required Color iconBg,
    required Widget iconWidget,
    TextInputType type = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: borderColor, width: 2.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(9),
                bottomLeft: Radius.circular(9),
              ),
            ),
            child: iconWidget,
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: borderColor,
                      letterSpacing: 0.5,
                      height: 1.4,
                    ),
                  ),
                  TextField(
                    controller: controller,
                    keyboardType: type,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF1A1A2E),
                    ),
                    decoration: InputDecoration(
                      hintText: hint,
                      hintStyle: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFFAAAAAA),
                      ),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 4),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Painters ──────────────────────────────────────────────────────────────────

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bands = [
      const Color(0xFF00897B),
      const Color(0xFFFFC107),
      const Color(0xFFE91E63),
    ];
    final bandHeight = size.height / bands.length;
    for (int i = 0; i < bands.length; i++) {
      canvas.drawRect(
        Rect.fromLTWH(0, i * bandHeight, size.width, bandHeight),
        Paint()..color = bands[i].withOpacity(0.55),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SquigglePainter extends CustomPainter {
  final Color color;
  _SquigglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    for (int i = 0; i < 3; i++) {
      final y = size.height * (0.25 + i * 0.25);
      final path = Path();
      path.moveTo(6, y);
      for (double x = 6; x < size.width - 6; x += 10) {
        path.quadraticBezierTo(
          x + 5,
          y + (i % 2 == 0 ? -6 : 6),
          x + 10,
          y,
        );
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _WavePainter extends CustomPainter {
  final Color color;
  _WavePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    for (int i = 0; i < 4; i++) {
      final y = size.height * (0.2 + i * 0.2);
      final path = Path();
      path.moveTo(4, y);
      for (double x = 4; x < size.width - 4; x += 14) {
        path.quadraticBezierTo(
          x + 7,
          y + (i % 2 == 0 ? -7 : 7),
          x + 14,
          y,
        );
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
