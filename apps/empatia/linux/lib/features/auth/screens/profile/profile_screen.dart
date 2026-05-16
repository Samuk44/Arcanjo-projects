import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static const _navy = Color(0xFF1A1A2E);
  static const _pink = Color(0xFFE91E63);
  static const _yellow = Color(0xFFFFC107);
  static const _blue = Color(0xFF2196F3);

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: _navy,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'PERFIL',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: Colors.white70),
            tooltip: 'Editar perfil',
            onPressed: () {},
          ),
        ],
      ),
      body: user == null
          ? const _NaoLogado()
          : StreamBuilder<DatabaseEvent>(
              stream: FirebaseDatabase.instance
                  .ref()
                  .child('usuarios')
                  .child(user.uid)
                  .onValue,
              builder: (context, snapshot) {
                Map<String, dynamic> dadosUsuario = {};

                if (snapshot.hasData &&
                    snapshot.data!.snapshot.value != null) {
                  dadosUsuario = Map<String, dynamic>.from(
                      snapshot.data!.snapshot.value as Map);
                }

                final nome = dadosUsuario['nome']?.toString() ??
                    user.displayName ??
                    'Usuário Empatia';

                final email = dadosUsuario['email']?.toString() ?? user.email ?? '';
                final photoUrl = user.photoURL;

                return _buildPerfil(
                  context: context,
                  user: user,
                  nome: nome,
                  email: email,
                  photoUrl: photoUrl,
                  uid: user.uid,
                );
              },
            ),
    );
  }

  Widget _buildPerfil({
    required BuildContext context,
    required User user,
    required String nome,
    required String email,
    String? photoUrl,
    required String uid,
  }) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // ── Header com avatar e info ─────────────────────────────────────
          _ProfileHeader(
            nome: nome,
            email: email,
            photoUrl: photoUrl,
          ),
          const SizedBox(height: 20),
          // ── Estatísticas ─────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _StatsRow(uid: uid),
          ),
          const SizedBox(height: 20),
          // ── Seção: Meus Sonhos ───────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _SectionCard(
              titulo: 'Meus Sonhos Cadastrados',
              icone: Icons.star_outline,
              iconColor: _yellow,
              child: _MeusSonhosList(uid: uid),
            ),
          ),
          const SizedBox(height: 16),
          // ── Seção: Meus Apoios ───────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _SectionCard(
              titulo: 'Sonhos que Apoiei',
              icone: Icons.favorite_outline,
              iconColor: _pink,
              child: _MeusApoiosList(uid: uid),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

// ── Header do perfil ──────────────────────────────────────────────────────────
class _ProfileHeader extends StatelessWidget {
  final String nome;
  final String email;
  final String? photoUrl;

  const _ProfileHeader({
    required this.nome,
    required this.email,
    this.photoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFF1A1A2E),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      child: Column(
        children: [
          // Avatar
          Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE91E63), width: 3),
                ),
                child: CircleAvatar(
                  radius: 52,
                  backgroundColor: const Color(0xFF2D2D44),
                  backgroundImage:
                      photoUrl != null ? NetworkImage(photoUrl!) : null,
                  child: photoUrl == null
                      ? Text(
                          nome.isNotEmpty ? nome[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        )
                      : null,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Color(0xFFE91E63),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.camera_alt, color: Colors.white, size: 14),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Nome
          Text(
            nome,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 4),
          // Email
          Text(
            email,
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 14),
          // Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFE91E63).withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFFE91E63).withOpacity(0.5),
              ),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_awesome, color: Color(0xFFE91E63), size: 14),
                SizedBox(width: 6),
                Text(
                  'Sonhador',
                  style: TextStyle(
                    color: Color(0xFFE91E63),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Linha de estatísticas ─────────────────────────────────────────────────────
class _StatsRow extends StatelessWidget {
  final String uid;
  const _StatsRow({required this.uid});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DatabaseEvent>(
      stream: FirebaseDatabase.instance.ref().child('sonhos').onValue,
      builder: (context, snapshot) {
        int criados = 0;
        int adotados = 0;

        if (snapshot.hasData && snapshot.data!.snapshot.value != null) {
          final raw = Map<dynamic, dynamic>.from(
              snapshot.data!.snapshot.value as Map);
          for (final e in raw.entries) {
            final m = Map<dynamic, dynamic>.from(e.value as Map);
            if (m['responsavelId']?.toString() == uid) criados++;
            if (m['status']?.toString() == 'adotado' &&
                m['responsavelId']?.toString() == uid) adotados++;
          }
        } else {
          // Mock fallback
          criados = 3;
          adotados = 1;
        }

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Row(
            children: [
              _StatItem(
                valor: criados,
                label: 'Sonhos\nCriados',
                color: const Color(0xFFE91E63),
              ),
              _buildDivider(),
              const _StatItem(
                valor: 7,
                label: 'Apoios\nDados',
                color: Color(0xFFFFC107),
              ),
              _buildDivider(),
              _StatItem(
                valor: adotados,
                label: 'Sonhos\nAdotados',
                color: const Color(0xFF4CAF50),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 40,
      width: 1,
      color: Colors.grey.shade200,
    );
  }
}

class _StatItem extends StatelessWidget {
  final int valor;
  final String label;
  final Color color;

  const _StatItem({
    required this.valor,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            '$valor',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Card de seção genérico ────────────────────────────────────────────────────
class _SectionCard extends StatelessWidget {
  final String titulo;
  final IconData icone;
  final Color iconColor;
  final Widget child;

  const _SectionCard({
    required this.titulo,
    required this.icone,
    required this.iconColor,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Icon(icone, color: iconColor, size: 18),
                const SizedBox(width: 8),
                Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          child,
        ],
      ),
    );
  }
}

// ── Lista mock de sonhos do usuário ──────────────────────────────────────────
class _MeusSonhosList extends StatelessWidget {
  final String uid;
  const _MeusSonhosList({required this.uid});

  @override
  Widget build(BuildContext context) {
    final mocks = [
      ('Carlos', 'Um dia de Astronauta', 'aprovado'),
      ('Ana', 'Cesta de Materiais de Arte', 'pendente'),
      ('Maria', 'Uma bicicleta rosa', 'aprovado'),
    ];

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: mocks.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 16),
      itemBuilder: (_, i) {
        final nome = mocks[i].$1;
        final descricao = mocks[i].$2;
        final status = mocks[i].$3;
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: const Color(0xFF1A1A2E).withOpacity(0.1),
            child: Text(
              nome[0],
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ),
          title: Text(
            nome,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          ),
          subtitle: Text(descricao,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          trailing: _StatusBadge(status: status),
        );
      },
    );
  }
}

class _MeusApoiosList extends StatelessWidget {
  final String uid;
  const _MeusApoiosList({required this.uid});

  @override
  Widget build(BuildContext context) {
    final mocks = [
      ('João', 'Kit de Leitura Infantil', Icons.favorite),
      ('Pedro', 'Tênis para correr', Icons.card_giftcard),
    ];

    if (mocks.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          'Você ainda não apoiou nenhum sonho.',
          style: TextStyle(color: Colors.grey, fontSize: 13),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: mocks.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 16),
      itemBuilder: (_, i) {
        final nome = mocks[i].$1;
        final descricao = mocks[i].$2;
        final icone = mocks[i].$3;
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFE91E63).withOpacity(0.1),
            child: Icon(icone, color: const Color(0xFFE91E63), size: 18),
          ),
          title: Text(
            nome,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          ),
          subtitle: Text(descricao,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
        );
      },
    );
  }
}

// ── Badge de status ───────────────────────────────────────────────────────────
class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final isAprovado = status == 'aprovado';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: (isAprovado ? const Color(0xFF4CAF50) : const Color(0xFFFFC107))
            .withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        isAprovado ? 'Ativo' : 'Pendente',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: isAprovado ? const Color(0xFF4CAF50) : const Color(0xFFF57F17),
        ),
      ),
    );
  }
}

// ── Tela para usuário não logado ──────────────────────────────────────────────
class _NaoLogado extends StatelessWidget {
  const _NaoLogado();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.person_off_outlined, size: 72, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'Faça login para ver seu perfil',
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
