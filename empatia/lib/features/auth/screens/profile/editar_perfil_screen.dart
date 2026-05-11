// lib/features/auth/screens/profile/editar_perfil_screen.dart

import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/usuario_model.dart';
import '../../services/auth_service.dart';
import '../../../app_colors.dart';

class EditarPerfilScreen extends StatefulWidget {
  final UsuarioModel? usuario;
  const EditarPerfilScreen({super.key, this.usuario});

  @override
  State<EditarPerfilScreen> createState() => _EditarPerfilScreenState();
}

class _EditarPerfilScreenState extends State<EditarPerfilScreen> {
  final _formKey = GlobalKey<FormState>();
  final _authService = AuthService();
  
  late TextEditingController _nomeCtrl;
  late TextEditingController _bioCtrl;
  String _fotoBase64 = '';
  bool _carregando = false;

  @override
  void initState() {
    super.initState();
    _nomeCtrl = TextEditingController(text: widget.usuario?.nome);
    _bioCtrl = TextEditingController(text: widget.usuario?.bio);
    _fotoBase64 = widget.usuario?.fotoUrl ?? '';
  }

  @override
  void dispose() {
    _nomeCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  Future<void> _escolherFoto() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 400,
      maxHeight: 400,
      imageQuality: 40,
    );
    if (image != null) {
      final bytes = await File(image.path).readAsBytes();
      setState(() => _fotoBase64 = base64Encode(bytes));
    }
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _carregando = true);
    try {
      await _authService.atualizarPerfil(
        uid: widget.usuario!.uid,
        nome: _nomeCtrl.text,
        bio: _bioCtrl.text,
        fotoUrl: _fotoBase64,
      );
      if (mounted) Navigator.pop(context, true);
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(title: const Text('EDITAR PERFIL')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              GestureDetector(
                onTap: _escolherFoto,
                child: CircleAvatar(
                  radius: 50,
                  backgroundColor: AppColors.background,
                  backgroundImage: _getAvatarProvider(_fotoBase64),
                  child: _fotoBase64.isEmpty ? const Icon(Icons.camera_alt, size: 30, color: AppColors.gray) : null,
                ),
              ),
              const SizedBox(height: 32),
              _buildField('NOME', _nomeCtrl, 'Seu nome completo'),
              _buildField('BIO', _bioCtrl, 'Conte um pouco sobre você...', maxLines: 3),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _carregando ? null : _salvar,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.pink),
                  child: _carregando 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('SALVAR ALTERAÇÕES', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  ImageProvider? _getAvatarProvider(String fotoUrl) {
    if (fotoUrl.isEmpty) return null;
    final base64Content = fotoUrl.contains(',') ? fotoUrl.split(',').last : fotoUrl;
    try {
      return MemoryImage(base64.decode(base64Content));
    } catch (e) {
      return null;
    }
  }

  Widget _buildField(String label, TextEditingController ctrl, String hint, {int maxLines = 1}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1)),
          const SizedBox(height: 8),
          TextFormField(
            controller: ctrl,
            maxLines: maxLines,
            style: const TextStyle(color: AppColors.navy),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: AppColors.gray, fontSize: 14),
              filled: true,
              fillColor: AppColors.background,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Campo obrigatório' : null,
          ),
        ],
      ),
    );
  }
}
