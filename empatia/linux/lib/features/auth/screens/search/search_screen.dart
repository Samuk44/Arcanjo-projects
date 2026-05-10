import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:empatia/features/auth/screens/home/models/sonho_model.dart';
import 'package:empatia/features/auth/screens/home/widgets/dream_card.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  // ── Constantes de cor ────────────────────────────────────────────────────
  static const _navy = Color(0xFF1A1A2E);
  static const _pink = Color(0xFFE91E63);
  static const _yellow = Color(0xFFFFC107);
  static const _bgColor = Color(0xFFF5F5F5);

  // ── Filtros de categoria ─────────────────────────────────────────────────
  static const _categorias = [
    _CategoriaChip(label: 'Todos',    color: _navy),
    _CategoriaChip(label: 'Arte',     color: Color(0xFF9C27B0)),
    _CategoriaChip(label: 'Educação', color: Color(0xFF2196F3)),
    _CategoriaChip(label: 'Saúde',    color: Color(0xFF4CAF50)),
    _CategoriaChip(label: 'Empatia',  color: _pink),
  ];

  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  String _categoriaFiltro = 'Todos';

  // ── Stream do Firebase Realtime Database ─────────────────────────────────
  final Stream<DatabaseEvent> _stream = FirebaseDatabase.instance
      .ref()
      .child('sonhos')
      .orderByChild('status')
      .equalTo('aprovado')
      .onValue;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  // ── Filtra lista recebida do banco ────────────────────────────────────────
  List<SonhoModel> _filtrar(List<SonhoModel> todos) {
    final q = _query.toLowerCase().trim();
    return todos.where((s) {
      final matchQuery = q.isEmpty ||
          s.nomeCrianca.toLowerCase().contains(q) ||
          s.descricao.toLowerCase().contains(q) ||
          s.cidade.toLowerCase().contains(q);

      final matchCategoria = _categoriaFiltro == 'Todos' ||
          s.categoria.toLowerCase() == _categoriaFiltro.toLowerCase() ||
          (s.categoria.toUpperCase() ==
              _categoriaFiltro.toUpperCase().replaceAll('Ã', 'A').replaceAll('Ç', 'C'));

      return matchQuery && matchCategoria;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      appBar: AppBar(
        backgroundColor: _navy,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'PESQUISA',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ),
      body: Column(
        children: [
          // ── Header de busca ──────────────────────────────────────────────
          _SearchHeader(
            controller: _searchCtrl,
            onChanged: (v) => setState(() => _query = v),
          ),
          // ── Chips de categoria ───────────────────────────────────────────
          _CategoriaBar(
            categorias: _categorias,
            selecionada: _categoriaFiltro,
            onSelect: (c) => setState(() => _categoriaFiltro = c),
          ),
          // ── Resultados ───────────────────────────────────────────────────
          Expanded(
            child: StreamBuilder<DatabaseEvent>(
              stream: _stream,
              builder: (context, snapshot) {
                // Carregando
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(color: _pink),
                  );
                }

                // Erro ou sem dados → usa mock
                List<SonhoModel> todos;
                if (!snapshot.hasData || snapshot.data!.snapshot.value == null) {
                  todos = SonhoModel.mockData();
                } else {
                  final raw = Map<dynamic, dynamic>.from(
                      snapshot.data!.snapshot.value as Map);
                  todos = raw.entries
                      .map((e) => SonhoModel.fromMap(
                          e.key.toString(),
                          Map<dynamic, dynamic>.from(e.value as Map)))
                      .toList();
                }

                final resultado = _filtrar(todos);

                if (resultado.isEmpty) {
                  return _EmptySearch(query: _query);
                }

                return ListView.builder(
                  padding: const EdgeInsets.only(bottom: 16),
                  itemCount: resultado.length,
                  itemBuilder: (context, i) {
                    final sonho = resultado[i];
                    return DreamCard(
                      sonho: sonho,
                      onChat: () => _showSnack(context, 'Chat com ${sonho.nomeCrianca}',
                          const Color(0xFF2196F3)),
                      onAdotar: () => _showSnack(context,
                          'Adotando sonho de ${sonho.nomeCrianca}!', const Color(0xFF4CAF50)),
                      onCurtir: () {},
                      onApoiar: () {},
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showSnack(BuildContext ctx, String msg, Color bg) {
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: bg),
    );
  }
}

// ── Header com campo de busca pill ──────────────────────────────────────────
class _SearchHeader extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _SearchHeader({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF1A1A2E),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          style: const TextStyle(
            fontSize: 15,
            color: Color(0xFF1A1A2E),
          ),
          decoration: const InputDecoration(
            hintText: 'Buscar sonhos, crianças, cidades…',
            hintStyle: TextStyle(color: Colors.grey, fontSize: 14),
            prefixIcon: Icon(Icons.search, color: Color(0xFF1A1A2E), size: 22),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ),
    );
  }
}

// ── Barra horizontal de categorias ──────────────────────────────────────────
class _CategoriaBar extends StatelessWidget {
  final List<_CategoriaChip> categorias;
  final String selecionada;
  final ValueChanged<String> onSelect;

  const _CategoriaBar({
    required this.categorias,
    required this.selecionada,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      color: Colors.white,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: categorias.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final chip = categorias[i];
          final selected = selecionada == chip.label;
          return GestureDetector(
            onTap: () => onSelect(chip.label),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: selected ? chip.color : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: selected ? chip.color : Colors.grey.shade300,
                ),
              ),
              child: Text(
                chip.label,
                style: TextStyle(
                  color: selected ? Colors.white : Colors.grey.shade700,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Estado vazio ─────────────────────────────────────────────────────────────
class _EmptySearch extends StatelessWidget {
  final String query;
  const _EmptySearch({required this.query});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off, size: 72, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              query.isEmpty
                  ? 'Pesquise por sonhos ou crianças'
                  : 'Nenhum resultado para "$query"',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tente outro termo ou categoria',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade400),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Modelo de chip ────────────────────────────────────────────────────────────
class _CategoriaChip {
  final String label;
  final Color color;
  const _CategoriaChip({required this.label, required this.color});
}
