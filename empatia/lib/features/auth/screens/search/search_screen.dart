// lib/features/auth/screens/search/search_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../home/models/sonho_model.dart';
import '../../services/sonho_service.dart';
import '../../services/auth_service.dart';
import '../sonhos/screens/detalhe_sonho_screen.dart';
import '../home/widgets/sonho_feed_card.dart';
import '../../widgets/notifications_app_bar_button.dart';
import '../../services/location_service.dart';
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
  bool _gpsCarregando = false;

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

  Future<void> _preencherBuscaPorGps() async {
    setState(() => _gpsCarregando = true);
    final cidade = await LocationService.cidadeDaLocalizacaoAtual();
    if (!mounted) return;
    setState(() => _gpsCarregando = false);
    if (cidade == null || cidade.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Não foi possível obter a cidade (permissão ou GPS).'),
          backgroundColor: AppColors.pink,
        ),
      );
      return;
    }
    setState(() {
      _searchCtrl.text = cidade;
      _query = cidade;
    });
  }

  Future<void> _apoiarRapido(SonhoModel sonho) async {
    if (sonho.responsavelId == _uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Você não pode apoiar o seu próprio sonho.'), backgroundColor: AppColors.pink),
      );
      return;
    }
    if (await _sonhoService.jaApoiou(sonho.id, _uid)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Você já se comprometeu com este sonho.'),
            backgroundColor: AppColors.pink,
          ),
        );
      }
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
        const SnackBar(content: Text('Você se comprometeu com este sonho!'), backgroundColor: AppColors.green),
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
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('PESQUISA'),
        actions: [
          NotificationsAppBarButton(sonhoService: _sonhoService),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.white,
              boxShadow: AppColors.cardShadow,
            ),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _query = v),
                        decoration: const InputDecoration(
                          hintText: 'Buscar por nome, categoria, cidade...',
                          prefixIcon: Icon(Icons.search_outlined, color: AppColors.gray, size: 22),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Material(
                      color: AppColors.pink.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppColors.radiusInput),
                      child: IconButton(
                        tooltip: 'Preencher com minha cidade (GPS)',
                        onPressed: _gpsCarregando ? null : _preencherBuscaPorGps,
                        icon: _gpsCarregando
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.pink),
                              )
                            : const Icon(Icons.my_location, color: AppColors.pink),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text('CATEGORIAS', style: AppColors.labelOverline),
                const SizedBox(height: 8),
                SizedBox(
                  height: 36,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categorias.length,
                    itemBuilder: (_, i) {
                      final cat = _categorias[i];
                      final sel = _filtroCategoria == cat;
                      return GestureDetector(
                        onTap: () => setState(() => _filtroCategoria = cat),
                        child: Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: sel
                                ? AppColors.pink
                                : AppColors.grayLight.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(AppColors.radiusChip),
                            border: Border.all(
                              color: sel
                                  ? AppColors.pink
                                  : AppColors.border.withValues(alpha: 0.6),
                            ),
                          ),
                          child: Center(
                            child: Text(
                              cat.toUpperCase(),
                              style: TextStyle(
                                color: sel ? AppColors.white : AppColors.gray,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<List<SonhoModel>>(
              stream: _sonhoService.streamSonhosAprovados(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.pink));
                }
                final filtrados = _filtrar(snapshot.data ?? []);
                if (filtrados.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        'NENHUM RESULTADO ENCONTRADO.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.gray.withValues(alpha: 0.85),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtrados.length,
                  itemBuilder: (_, i) => SonhoFeedCard(
                    sonho: filtrados[i],
                    onDetalhes: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => DetalheSonhoScreen(sonho: filtrados[i])),
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
