// lib/features/auth/screens/sonhos/screens/publicar_sonho_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../home/models/sonho_model.dart';
import '../../../services/sonho_service.dart';
import '../../../services/auth_service.dart';
import '../../../../app_colors.dart';

class PublicarSonhoScreen extends StatefulWidget {
  final SonhoModel? sonho;
  const PublicarSonhoScreen({super.key, this.sonho});

  @override
  State<PublicarSonhoScreen> createState() => _PublicarSonhoScreenState();
}

class _PublicarSonhoScreenState extends State<PublicarSonhoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _sonhoService = SonhoService();
  final _authService = AuthService();
  
  late TextEditingController _nomeCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _catCtrl;
  late TextEditingController _cidadeCtrl;
  late TextEditingController _endCtrl;
  late TextEditingController _contatoCtrl;

  bool _carregando = false;

  @override
  void initState() {
    super.initState();
    _nomeCtrl = TextEditingController(text: widget.sonho?.nomesCrianca);
    _descCtrl = TextEditingController(text: widget.sonho?.descricao);
    _catCtrl = TextEditingController(text: widget.sonho?.categoria);
    _cidadeCtrl = TextEditingController(text: widget.sonho?.cidade);
    _endCtrl = TextEditingController(text: widget.sonho?.endereco);
    _contatoCtrl = TextEditingController(text: widget.sonho?.contato);
  }

  @override
  void dispose() {
    _nomeCtrl.dispose(); _descCtrl.dispose(); _catCtrl.dispose();
    _cidadeCtrl.dispose(); _endCtrl.dispose(); _contatoCtrl.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _carregando = true);

    try {
      final uid = FirebaseAuth.instance.currentUser!.uid;
      final usuario = await _authService.buscarUsuario(uid);

      final sonho = SonhoModel(
        id: widget.sonho?.id ?? '',
        responsavelId: uid,
        responsavelNome: usuario?.nome ?? 'Responsável',
        nomesCrianca: _nomeCtrl.text,
        descricao: _descCtrl.text,
        categoria: _catCtrl.text,
        cidade: _cidadeCtrl.text,
        endereco: _endCtrl.text,
        contato: _contatoCtrl.text,
        status: widget.sonho?.status ?? 'aprovado',
        criadoEm: widget.sonho?.criadoEm ?? DateTime.now(),
        totalApoios: widget.sonho?.totalApoios ?? 0,
      );

      if (widget.sonho == null) {
        await _sonhoService.criarSonho(sonho);
      } else {
        await _sonhoService.editarSonho(sonho);
      }

      if (mounted) Navigator.pop(context);
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.sonho == null ? 'PUBLICAR SONHO' : 'EDITAR SONHO'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildField('NOME DA CRIANÇA', _nomeCtrl, 'Ex: João e Maria'),
              _buildField('CATEGORIA', _catCtrl, 'Ex: Material Escolar'),
              _buildField('DESCRIÇÃO', _descCtrl, 'Conte um pouco sobre o sonho...', maxLines: 4),
              _buildField('CIDADE', _cidadeCtrl, 'Ex: São Paulo - SP'),
              
              const SizedBox(height: 16),
              const Text('DADOS PRIVADOS (Apenas para apoiadores)', 
                style: TextStyle(color: AppColors.pink, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1)),
              const SizedBox(height: 16),
              
              _buildField('ENDEREÇO COMPLETO', _endCtrl, 'Rua, número, bairro...'),
              _buildField('CONTATO / WHATSAPP', _contatoCtrl, '(00) 00000-0000'),

              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _carregando ? null : _salvar,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.yellow),
                  child: _carregando 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('SALVAR SONHO', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
              fillColor: AppColors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.grayLight)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.grayLight)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.pink)),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Campo obrigatório' : null,
          ),
        ],
      ),
    );
  }
}
