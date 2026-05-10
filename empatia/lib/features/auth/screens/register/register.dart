import '../login/login.dart';
import 'register_dados.dart';
import '../../services/auth_service.dart';
import 'package:flutter/material.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final emailController = TextEditingController();
  final senhaController = TextEditingController();
  final confirmarSenhaController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;

  @override
  void dispose() {
    emailController.dispose();
    senhaController.dispose();
    confirmarSenhaController.dispose();
    super.dispose();
  }

  Future<void> _proximaEtapa() async {
    if (emailController.text.isEmpty ||
        senhaController.text.isEmpty ||
        confirmarSenhaController.text.isEmpty) {
      _mostrarErro('Preencha todos os campos.');
      return;
    }

    if (senhaController.text != confirmarSenhaController.text) {
      _mostrarErro('As senhas não coincidem.');
      return;
    }

    if (senhaController.text.length < 6) {
      _mostrarErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setState(() => _isLoading = true);

    final erro = await _authService.criarConta(
      email: emailController.text.trim(),
      senha: senhaController.text.trim(),
    );

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (erro != null) {
      _mostrarErro(erro);
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const RegisterDadosScreen()),
    );
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
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 28, horizontal: 24),
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
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Center(
                              child:
                                  Text('🤝', style: TextStyle(fontSize: 24))),
                        ),
                        const SizedBox(width: 12),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('EMPATIA',
                                style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF1A1A2E),
                                    letterSpacing: 1)),
                            Text('Sonhos de Criança',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF1A1A2E),
                                    fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'ETAPA 1 DE 2\nCRIE SEU ACESSO',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF1A1A2E),
                          height: 1.2,
                          letterSpacing: 0.5),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _buildField(
                        label: 'EMAIL',
                        hint: 'seu@email.com',
                        controller: emailController,
                        icon: '✉',
                        borderColor: const Color(0xFF4CAF50),
                        iconBg: const Color(0xFF4CAF50),
                        type: TextInputType.emailAddress),
                    const SizedBox(height: 16),
                    _buildField(
                        label: 'SENHA',
                        hint: 'Mínimo 6 caracteres',
                        controller: senhaController,
                        icon: '🔒',
                        borderColor: const Color(0xFF2196F3),
                        iconBg: const Color(0xFF2196F3),
                        obscure: true),
                    const SizedBox(height: 16),
                    _buildField(
                        label: 'CONFIRMAR SENHA',
                        hint: 'Repita a senha',
                        controller: confirmarSenhaController,
                        icon: '🔒',
                        borderColor: const Color(0xFF9C27B0),
                        iconBg: const Color(0xFF9C27B0),
                        obscure: true),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _proximaEtapa,
                        style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1A1A2E),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12))),
                        child: _isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white)
                            : const Text('PRÓXIMA ETAPA →',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('Já tem cadastro? ',
                            style: TextStyle(
                                fontSize: 14, color: Color(0xFF666666))),
                        GestureDetector(
                          onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const LoginScreen())),
                          child: const Text('Entrar',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF1A1A2E),
                                  decoration: TextDecoration.underline)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(
      {required String label,
      required String hint,
      required TextEditingController controller,
      required String icon,
      required Color borderColor,
      required Color iconBg,
      TextInputType type = TextInputType.text,
      bool obscure = false}) {
    return Container(
      decoration: BoxDecoration(
          border: Border.all(color: borderColor, width: 2.5),
          borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Container(
            width: 56,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
                color: iconBg,
                borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(9),
                    bottomLeft: Radius.circular(9))),
            child:
                Center(child: Text(icon, style: const TextStyle(fontSize: 24))),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: borderColor,
                          letterSpacing: 0.5,
                          height: 1.4)),
                  TextField(
                    controller: controller,
                    keyboardType: type,
                    obscureText: obscure,
                    style:
                        const TextStyle(fontSize: 14, color: Color(0xFF1A1A2E)),
                    decoration: InputDecoration(
                        hintText: hint,
                        hintStyle: const TextStyle(
                            fontSize: 11, color: Color(0xFFAAAAAA)),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 4)),
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
