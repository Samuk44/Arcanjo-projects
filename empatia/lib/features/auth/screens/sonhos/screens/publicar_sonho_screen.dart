// lib/features/auth/screens/sonhos/screens/publicar_sonho_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../home/models/sonho_model.dart';
import '../../../services/sonho_service.dart';
import '../../../services/auth_service.dart';
import '../../../../app_colors.dart';

class PublicarSonhoScreen extends StatefulWidget {
  /// Se [sonho] for fornecido, a tela funciona em modo de edição.
  final SonhoModel? sonho;

  const PublicarSonhoScreen({super.key, this.sonho});

  @override
  State<PublicarSonhoScreen> createState() => _PublicarSonhoScreenState();
}

class _PublicarSonhoScreenState extends State<PublicarSonhoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _sonhoService = SonhoService();
  final _authService = AuthService();

  late final TextEditingController _nomeCtrl;
  late final TextEditingController _descricaoCtrl;
  late final TextEditingController _categoriaCtrl;
  late final TextEditingController _cidadeCtrl;
  late final TextEditingController _enderecoCtrl;
  late final TextEditingController _contatoCtrl;

  bool _carregando = false;

  bool get _modoEdicao => widget.sonho != null;

  static const List<String> _sugestoesCategorias = [
    'Bicicleta',
    'Material escolar',
    'Kit de leitura',
    'Material de arte',
    'Brinquedo',
    'Roupa / Calçado',
    'Instrumento musical',
    'Equipamento esportivo',
    'Outro',
  ];

  @override
  void initState() {
    super.initState();
    final s = widget.sonho;
    _nomeCtrl = TextEditingController(text: s?.nomesCrianca ?? '');
    _descricaoCtrl = TextEditingController(text: s?.descricao ?? '');
    _categoriaCtrl = TextEditingController(text: s?.categoria ?? '');
    _cidadeCtrl = TextEditingController(text: s?.cidade ?? '');
    _enderecoCtrl = TextEditingController(text: s?.endereco ?? '');
    _contatoCtrl = TextEditingController(text: s?.contato ?? '');
  }

  @override
  void dispose() {
    _nomeCtrl.dispose();
    _descricaoCtrl.dispose();
    _categoriaCtrl.dispose();
    _cidadeCtrl.dispose();
    _enderecoCtrl.dispose();
    _contatoCtrl.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _carregando = true);

    try {
      final uid = FirebaseAuth.instance.currentUser!.uid;
      final usuario = await _authService.buscarUsuario(uid);
      final nomeResponsavel = usuario?.nome ?? '';

      if (_modoEdicao) {
        final atualizado = widget.sonho!.copyWith(
          nomesCrianca: _nomeCtrl.text.trim(),
          descricao: _descricaoCtrl.text.trim(),
          categoria: _categoriaCtrl.text.trim(),
          cidade: _cidadeCtrl.text.trim(),
          endereco: _enderecoCtrl.text.trim(),
          contato: _contatoCtrl.text.trim(),
        );
        await _sonhoService.editarSonho(atualizado);
      } else {
        final novo = SonhoModel(
          id: '',
          responsavelId: uid,
          responsavelNome: nomeResponsavel,
          nomesCrianca: _nomeCtrl.text.trim(),
          descricao: _descricaoCtrl.text.trim(),
          categoria: _categoriaCtrl.text.trim(),
          cidade: _cidadeCtrl.text.trim(),
          endereco: _enderecoCtrl.text.trim(),
          contato: _contatoCtrl.text.trim(),
          status: 'aprovado',
          criadoEm: DateTime.now(),
        );
        await _sonhoService.criarSonho(novo);
      }

      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao salvar: $e'),
            backgroundColor: AppColors.pink,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          _modoEdicao ? 'EDITAR SONHO' : 'PUBLICAR SONHO',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            letterSpacing: 1.5,
          ),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildSectionLabel('SOBRE A CRIANÇA'),
            const SizedBox(height: 12),
            _buildField(
              controller: _nomeCtrl,
              label: 'Nome(s) da criança',
              hint: 'Ex.: Ana e Pedro',
              icon: Icons.child_care,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Informe o nome da criança'
                  : null,
            ),
            const SizedBox(height: 16),
            _buildField(
              controller: _descricaoCtrl,
              label: 'Descrição do sonho',
              hint: 'Descreva o item desejado e por que ele é especial',
              icon: Icons.favorite_outline,
              maxLines: 4,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Descreva o sonho'
                  : null,
            ),
            const SizedBox(height: 16),
            _buildCategoriaField(),
            const SizedBox(height: 28),
            _buildSectionLabel('LOCALIZAÇÃO'),
            const SizedBox(height: 12),
            _buildField(
              controller: _cidadeCtrl,
              label: 'Cidade',
              hint: 'Ex.: São Paulo - SP',
              icon: Icons.location_city,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Informe a cidade'
                  : null,
            ),
            const SizedBox(height: 28),
            _buildSectionLabel('INFORMAÇÕES PRIVADAS'),
            const SizedBox(height: 4),
            Text(
              'Visíveis apenas para doadores que se comprometerem com este sonho.',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.5),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 12),
            _buildField(
              controller: _enderecoCtrl,
              label: 'Endereço para entrega',
              hint: 'Rua, número, bairro',
              icon: Icons.home_outlined,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Informe o endereço'
                  : null,
            ),
            const SizedBox(height: 16),
            _buildField(
              controller: _contatoCtrl,
              label: 'Contato (WhatsApp ou telefone)',
              hint: '(11) 99999-9999',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
              validator: (v) => (v == null || v.trim().isEmpty)
                  ? 'Informe um contato'
                  : null,
            ),
            const SizedBox(height: 36),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _carregando ? null : _salvar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.pink,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: _carregando
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        _modoEdicao ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR SONHO',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                          fontSize: 15,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: TextStyle(
        color: AppColors.pink,
        fontWeight: FontWeight.bold,
        fontSize: 12,
        letterSpacing: 1.5,
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      validator: validator,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, color: AppColors.pink, size: 20),
        labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.07),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppColors.pink, width: 1.5),
        ),
        errorStyle: const TextStyle(color: Color(0xFFFF6B6B)),
      ),
    );
  }

  Widget _buildCategoriaField() {
    return Autocomplete<String>(
      initialValue: TextEditingValue(text: _categoriaCtrl.text),
      optionsBuilder: (value) {
        if (value.text.isEmpty) return _sugestoesCategorias;
        return _sugestoesCategorias.where(
          (c) => c.toLowerCase().contains(value.text.toLowerCase()),
        );
      },
      onSelected: (value) => _categoriaCtrl.text = value,
      fieldViewBuilder: (ctx, ctrl, focusNode, onSubmit) {
        // Sincroniza com o controller externo
        ctrl.text = _categoriaCtrl.text;
        ctrl.addListener(() => _categoriaCtrl.text = ctrl.text);
        return TextFormField(
          controller: ctrl,
          focusNode: focusNode,
          style: const TextStyle(color: Colors.white),
          validator: (v) => (v == null || v.trim().isEmpty)
              ? 'Informe a categoria'
              : null,
          decoration: InputDecoration(
            labelText: 'Categoria',
            hintText: 'Ex.: Bicicleta',
            prefixIcon: Icon(Icons.category_outlined, color: AppColors.pink, size: 20),
            labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.07),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: AppColors.pink, width: 1.5),
            ),
            errorStyle: const TextStyle(color: Color(0xFFFF6B6B)),
          ),
        );
      },
      optionsViewBuilder: (ctx, onSelected, options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            color: const Color(0xFF16213E),
            borderRadius: BorderRadius.circular(12),
            elevation: 8,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 200),
              child: ListView.builder(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: options.length,
                itemBuilder: (_, i) {
                  final opt = options.elementAt(i);
                  return ListTile(
                    dense: true,
                    title: Text(opt, style: const TextStyle(color: Colors.white)),
                    onTap: () => onSelected(opt),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
