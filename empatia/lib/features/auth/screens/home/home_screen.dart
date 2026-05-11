// lib/features/auth/screens/home/home_screen.dart

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'models/sonho_model.dart';
import '../../services/sonho_service.dart';
import '../../services/auth_service.dart';
import '../sonhos/screens/detalhe_sonho_screen.dart';
import '../../widgets/notifications_app_bar_button.dart';
import '../../services/location_service.dart';
import 'widgets/sonho_feed_card.dart';
import 'widgets/anuncio_banner.dart';
import '../../../app_colors.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _sonhoService = SonhoService();
  final _authService = AuthService();
  final _searchCtrl = TextEditingController();
  final _buscaGeralCtrl = TextEditingController();
  bool _gpsCarregando = false;

  String _filtroCategoria = 'Todos';
  String _filtroCidade = '';

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

  @override
  void dispose() {
    _searchCtrl.dispose();
    _buscaGeralCtrl.dispose();
    super.dispose();
  }

  Future<void> _preencherCidadePorGps() async {
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
      _filtroCidade = cidade;
    });
  }

  Future<void> _adotarSonho(SonhoModel sonho) async {
    if (sonho.responsavelId == _uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Você não pode adotar o seu próprio sonho.'),
          backgroundColor: AppColors.pink,
        ),
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
        const SnackBar(
          content: Text('Você se comprometeu com este sonho!'),
          backgroundColor: AppColors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Image.asset(
          'assets/logo.png',
          height: 28,
          errorBuilder: (_, __, ___) => const Text(
            'EMPATIA',
            style: AppColors.appBarTitle,
          ),
        ),
        actions: [
          NotificationsAppBarButton(sonhoService: _sonhoService),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Filtros
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
                const Text(
                  'CATEGORIAS',
                  style: AppColors.labelOverline,
                ),
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
                const SizedBox(height: 16),
                TextField(
                  controller: _buscaGeralCtrl,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'Buscar por nome, descrição, categoria...',
                    prefixIcon: Icon(Icons.search_outlined, color: AppColors.gray, size: 22),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: (v) => setState(() => _filtroCidade = v),
                        decoration: const InputDecoration(
                          hintText: 'Cidade (manual ou GPS)',
                          prefixIcon: Icon(Icons.location_on_outlined, color: AppColors.gray, size: 22),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Material(
                      color: AppColors.pink.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppColors.radiusInput),
                      child: IconButton(
                        tooltip: 'Usar minha cidade (GPS)',
                        onPressed: _gpsCarregando ? null : _preencherCidadePorGps,
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
              ],
            ),
          ),
          
          // Feed
          Expanded(
            child: StreamBuilder<List<SonhoModel>>(
              stream: _sonhoService.streamSonhosAprovados(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.pink));
                }
                
                var lista = snapshot.data ?? [];
                
                // Aplicar filtros locais
                if (_filtroCategoria != 'Todos') {
                  lista = lista.where((s) => s.categoria == _filtroCategoria).toList();
                }
                if (_filtroCidade.isNotEmpty) {
                  lista = lista.where((s) => s.cidade.toLowerCase().contains(_filtroCidade.toLowerCase())).toList();
                }
                final q = _buscaGeralCtrl.text.trim().toLowerCase();
                if (q.isNotEmpty) {
                  lista = lista.where((s) {
                    return s.nomesCrianca.toLowerCase().contains(q) ||
                        s.descricao.toLowerCase().contains(q) ||
                        s.categoria.toLowerCase().contains(q) ||
                        s.cidade.toLowerCase().contains(q);
                  }).toList();
                }

                return ListView.builder(
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: lista.length + 1, // +1 para o AnuncioBanner
                  itemBuilder: (_, i) {
                    if (i == 0) return const AnuncioBanner();
                    final sonho = lista[i - 1];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: SonhoFeedCard(
                        sonho: sonho,
                        onDetalhes: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => DetalheSonhoScreen(sonho: sonho)),
                        ),
                        onApoiar: () => _adotarSonho(sonho),
                      ),
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
}
