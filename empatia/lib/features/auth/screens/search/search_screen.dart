// lib/features/auth/screens/search/search_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../home/models/sonho_model.dart';
import '../../services/sonho_service.dart';
import '../../services/auth_service.dart';
import '../sonhos/screens/detalhe_sonho_screen.dart';
import '../../screens/home/widgets/sonho_feed_card.dart';
import '../../../app_colors.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _sonhoService = SonhoService();
  final _authService = AuthService();
  final _searchCtrl = TextEditingController();

  String _query = '';
  String _filtroCategoria = 'Todos';

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  static const List<String> _categorias = [
    'Todos',
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

  List<SonhoModel> _filtrar(List<SonhoModel> lista) {
    return lista.where((s) {
      final passaCategoria = _filtroCategoria == 'Todos' ||
          s.categoria.toLowerCase() == _filtroCategoria.toLowerCase();
      final passaQuery = _query.isEmpty ||
          s.nomesCrianca.toLowerCase().contains(_query.toLowerCase()) ||
          s.descricao.toLowerCase().contains(_query.toLowerCase()) ||
          s.categoria.toLowerCase().contains(_query.toLowerCase()) ||
          s.cidade.toLowerCase().contains(_query.toLowerCase());
      return passaCategoria && passaQuery;
    }).toList();
  }

  Future<void> _apoiarRapido(SonhoModel sonho) async {
    if (sonho.responsavelId == _uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Você não pode apoiar o seu próprio sonho.'),
          backgroundColor: AppColors.pink,
        ),
      );
      return;
    }
    final usuario = await _authService.buscarUsuario(_uid);
    await _sonhoService.apoiarSonho(
      sonho: sonho,
      doadorId: _uid,
      doadorNome: usuario?.nome ?? 'Doador',
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Você se comprometeu com este sonho!'),
          backgroundColor: AppColors.green,
        ),
      );
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'PESQUISA',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            letterSpacing: 2,
          ),
        ),
      ),
      body: Column(
        children: [
          // Campo de busca
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(color: Colors.white),
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'Buscar por nome, categoria, cidade...',
                hintStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.3),
                  fontSize: 14,
                ),
                prefixIcon: Icon(
                  Icons.search,
                  color: Colors.white.withValues(alpha: 0.4),
                ),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: Icon(
                          Icons.clear,
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _query = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.07),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.pink, width: 1.5),
                ),
              ),
            ),
          ),
          // Chips de categoria
          SizedBox(
            height: 36,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categorias.length,
              itemBuilder: (_, i) {
                final cat = _categorias[i];
                final sel = _filtroCategoria == cat;
                return GestureDetector(
                  onTap: () => setState(() => _filtroCategoria = cat),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                    decoration: BoxDecoration(
                      color: sel
                          ? AppColors.pink
                          : Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      cat,
                      style: TextStyle(
                        color: sel
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.6),
                        fontWeight: sel ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          // Resultados
          Expanded(
            child: StreamBuilder<List<SonhoModel>>(
              stream: _sonhoService.streamSonhosAprovados(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.pink),
                  );
                }

                final todos = snapshot.data ?? [];
                final filtrados = _filtrar(todos);

                if (filtrados.isEmpty) {
                  return Center(
                    child: Text(
                      _query.isEmpty && _filtroCategoria == 'Todos'
                          ? 'Nenhum sonho disponível.'
                          : 'Nenhum resultado encontrado.',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 15,
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: filtrados.length,
                  itemBuilder: (_, i) => SonhoFeedCard(
                    sonho: filtrados[i],
                    onDetalhes: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => DetalheSonhoScreen(sonho: filtrados[i]),
                      ),
                    ),
                    onApoiar: () => _apoiarRapido(filtrados[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
