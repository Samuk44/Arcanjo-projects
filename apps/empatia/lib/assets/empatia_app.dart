import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  runApp(const EmpatiaApp());
}

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════

abstract class AppColors {
  // Brand
  static const Color primary       = Color(0xFF7B52AB);
  static const Color primaryDark   = Color(0xFF5C3D8F);
  static const Color teal          = Color(0xFF00BFA5);
  static const Color tealDark      = Color(0xFF00897B);
  static const Color cyan          = Color(0xFF00BCD4);
  static const Color purple        = Color(0xFF9C27B0);

  // Semantic
  static const Color heartRed      = Color(0xFFE91E63);
  static const Color commentBlue   = Color(0xFF2196F3);
  static const Color chatGreen     = Color(0xFF4CAF50);
  static const Color pinAmber      = Color(0xFFFF9800);
  static const Color dangerRed     = Color(0xFFE53935);
  static const Color goldYellow    = Color(0xFFFFC107);
  static const Color artOrange     = Color(0xFFFF6B35);
  static const Color linkedInBlue  = Color(0xFF0077B5);
  static const Color facebookBlue  = Color(0xFF1877F2);
  static const Color instaRose     = Color(0xFFE91E63);

  // Neutral
  static const Color scaffold      = Color(0xFFF2F2F7);
  static const Color card          = Color(0xFFFFFFFF);
  static const Color textPrimary   = Color(0xFF1C1C1E);
  static const Color textSecondary = Color(0xFF6C6C70);
  static const Color textHint      = Color(0xFFAEAEB2);
  static const Color divider       = Color(0xFFE5E5EA);
}

abstract class AppSpacing {
  static const double xxs  = 2.0;
  static const double xs   = 4.0;
  static const double sm   = 8.0;
  static const double md   = 12.0;
  static const double lg   = 16.0;
  static const double xl   = 20.0;
  static const double xxl  = 24.0;
  static const double xxxl = 32.0;
}

abstract class AppRadius {
  static const double sm   = 8.0;
  static const double md   = 12.0;
  static const double lg   = 16.0;
  static const double xl   = 20.0;
  static const double pill = 100.0;
}

// ═══════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════

class DreamPost {
  final String authorName;
  final String dreamTitle;
  final String category;
  final int likes;
  final Color accentColor;
  final IconData categoryIcon;

  const DreamPost({
    required this.authorName,
    required this.dreamTitle,
    required this.category,
    required this.likes,
    required this.accentColor,
    required this.categoryIcon,
  });
}

class NotifItem {
  final String body;
  final Color iconBg;
  final IconData icon;
  final bool isAdmin;

  const NotifItem({
    required this.body,
    required this.iconBg,
    required this.icon,
    this.isAdmin = false,
  });
}

// ═══════════════════════════════════════════════════════════════
// STATIC DATA
// ═══════════════════════════════════════════════════════════════

const List<DreamPost> _posts = [
  DreamPost(
    authorName: 'Carlos Nunes',
    dreamTitle: 'Um dia de Astronauta',
    category: 'CIÊNCIA',
    likes: 45,
    accentColor: AppColors.primary,
    categoryIcon: Icons.rocket_launch_rounded,
  ),
  DreamPost(
    authorName: 'Criança K.',
    dreamTitle: 'Gosta de Materiais de Arte',
    category: 'ARTE',
    likes: 45,
    accentColor: AppColors.artOrange,
    categoryIcon: Icons.palette_rounded,
  ),
];

const List<NotifItem> _notifs = [
  NotifItem(
    body: 'Alguém CURTIU o seu sonho!\nMessage seu sonho',
    iconBg: AppColors.heartRed,
    icon: Icons.favorite_rounded,
  ),
  NotifItem(
    body: 'Novo COMENTÁRIO no\nseu post',
    iconBg: AppColors.commentBlue,
    icon: Icons.comment_rounded,
  ),
  NotifItem(
    body: 'Doador Name enviou\nmensagem no CHAT',
    iconBg: AppColors.chatGreen,
    icon: Icons.chat_bubble_rounded,
  ),
  NotifItem(
    body: 'ADMIN (Doador Executivo)\nProjeto criado com sucesso!\nCampanha Sonho de Natal 🎄\nNovos desenhos da galeria!',
    iconBg: AppColors.pinAmber,
    icon: Icons.push_pin_rounded,
    isAdmin: true,
  ),
];

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════

class EmpatiaApp extends StatelessWidget {
  const EmpatiaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Empatia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Roboto',
        scaffoldBackgroundColor: AppColors.scaffold,
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
        useMaterial3: true,
      ),
      home: const _RootNav(),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// ROOT NAVIGATION
// ═══════════════════════════════════════════════════════════════

class _RootNav extends StatefulWidget {
  const _RootNav();

  @override
  State<_RootNav> createState() => _RootNavState();
}

class _RootNavState extends State<_RootNav> {
  int _idx = 0;

  static const List<Widget> _pages = [
    HomeScreen(),
    NotificationsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _pages[_idx],
      bottomNavigationBar: _BottomBar(
        current: _idx,
        onTap: (i) => setState(() => _idx = i),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  final int current;
  final ValueChanged<int> onTap;

  const _BottomBar({required this.current, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _BarItem(icon: Icons.home_rounded,          label: 'Início',        idx: 0, current: current, onTap: onTap),
              _BarItem(icon: Icons.auto_awesome_rounded,  label: 'Sonhos',        idx: 0, current: current, onTap: onTap),
              _BarItem(icon: Icons.notifications_rounded, label: 'Notificações',  idx: 1, current: current, onTap: onTap),
              _BarItem(icon: Icons.person_rounded,        label: 'Perfil',        idx: 2, current: current, onTap: onTap),
            ],
          ),
        ),
      ),
    );
  }
}

class _BarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final int idx;
  final int current;
  final ValueChanged<int> onTap;

  const _BarItem({
    required this.icon,
    required this.label,
    required this.idx,
    required this.current,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bool active = current == idx && label == ['Início', 'Sonhos', 'Notificações', 'Perfil'][idx == 0 ? 0 : idx];
    final bool isActive = (idx == 0 && current == 0 && (label == 'Início')) ||
                          (idx == 1 && current == 1) ||
                          (idx == 2 && current == 2) ||
                          (idx == 0 && current == 0 && label == 'Início');
    final bool sel = (current == idx);
    final Color col = sel ? AppColors.primary : AppColors.textHint;

    return GestureDetector(
      onTap: () => onTap(idx),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: col, size: 24),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: sel ? FontWeight.w700 : FontWeight.w400,
              color: col,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN
// ═══════════════════════════════════════════════════════════════

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.scaffold,
        body: CustomScrollView(
          slivers: [
            _HomeAppBar(),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
            const SliverToBoxAdapter(child: _PingoBanner()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              sliver: SliverList.builder(
                itemCount: _posts.length,
                itemBuilder: (context, i) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: _DreamCard(post: _posts[i]),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
          ],
        ),
      ),
    );
  }
}

class _HomeAppBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return SliverToBoxAdapter(
      child: Container(
        color: AppColors.primary,
        padding: EdgeInsets.fromLTRB(
          AppSpacing.lg, top + AppSpacing.md, AppSpacing.lg, AppSpacing.md,
        ),
        child: const Center(
          child: Text(
            'EMPATIA',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: 3.0,
            ),
          ),
        ),
      ),
    );
  }
}

class _PingoBanner extends StatelessWidget {
  const _PingoBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      height: 88,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF00BCD4), Color(0xFF7B52AB)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.28),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          const SizedBox(width: AppSpacing.md),
          // Mascot circle
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.rocket_launch_rounded,
              color: Colors.white,
              size: 30,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          const Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pingo',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.4,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Seu guia de sonhos!',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.only(right: AppSpacing.md),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: const Text(
              'Ver mais',
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// DREAM CARD
// ─────────────────────────────────────────────

class _DreamCard extends StatelessWidget {
  final DreamPost post;
  const _DreamCard({required this.post});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeader(post: post),
          _CardIllustration(post: post),
          _CardFooter(post: post),
        ],
      ),
    );
  }
}

class _CardHeader extends StatelessWidget {
  final DreamPost post;
  const _CardHeader({required this.post});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.sm,
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: post.accentColor.withValues(alpha: 0.12),
              border: Border.all(color: post.accentColor, width: 2),
            ),
            child: Center(
              child: Text(
                post.authorName[0],
                style: TextStyle(
                  color: post.accentColor,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Name + dream
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sonho de ${post.authorName}:',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    height: 1.2,
                  ),
                ),
                Text(
                  post.dreamTitle,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                    letterSpacing: 0.1,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Chat chip
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.pill),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.2),
              ),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.chat_bubble_outline_rounded, size: 13, color: AppColors.primary),
                SizedBox(width: 3),
                Text(
                  'Chat',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
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

class _CardIllustration extends StatelessWidget {
  final DreamPost post;
  const _CardIllustration({required this.post});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      height: 110,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        gradient: LinearGradient(
          colors: [
            post.accentColor.withValues(alpha: 0.12),
            post.accentColor.withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          // Decorative dots
          Positioned(
            top: 10, right: 16,
            child: Container(
              width: 8, height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: post.accentColor.withValues(alpha: 0.3),
              ),
            ),
          ),
          Positioned(
            bottom: 14, left: 20,
            child: Container(
              width: 5, height: 5,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: post.accentColor.withValues(alpha: 0.25),
              ),
            ),
          ),
          // Category badge
          Positioned(
            top: AppSpacing.sm,
            left: AppSpacing.sm,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xxs + 1,
              ),
              decoration: BoxDecoration(
                color: post.accentColor,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(post.categoryIcon, color: Colors.white, size: 11),
                  const SizedBox(width: 3),
                  Text(
                    post.category,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Central icon
          Center(
            child: Icon(
              post.categoryIcon,
              size: 52,
              color: post.accentColor.withValues(alpha: 0.22),
            ),
          ),
        ],
      ),
    );
  }
}

class _CardFooter extends StatelessWidget {
  final DreamPost post;
  const _CardFooter({required this.post});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.md,
      ),
      child: Row(
        children: [
          const Icon(Icons.favorite_rounded, color: AppColors.heartRed, size: 17),
          const SizedBox(width: AppSpacing.xs),
          Text(
            '${post.likes}',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          const Icon(
            Icons.chat_bubble_outline_rounded,
            color: AppColors.textHint,
            size: 15,
          ),
          const Spacer(),
          // Adopt button
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm - 1,
            ),
            decoration: BoxDecoration(
              color: AppColors.teal,
              borderRadius: BorderRadius.circular(AppRadius.pill),
              boxShadow: [
                BoxShadow(
                  color: AppColors.teal.withValues(alpha: 0.35),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Text(
              'Adotar Este Sonho',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// PROFILE SCREEN
// ═══════════════════════════════════════════════════════════════

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.scaffold,
        body: CustomScrollView(
          slivers: [
            _ProfileSliverHeader(),
            SliverToBoxAdapter(child: _SocialLinks()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
            SliverToBoxAdapter(child: _DreamsRealized()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
            SliverToBoxAdapter(child: _HeroHall()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
            SliverToBoxAdapter(child: _EditProfileBtn()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxxl)),
          ],
        ),
      ),
    );
  }
}

class _ProfileSliverHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return SliverToBoxAdapter(
      child: Container(
        color: AppColors.cyan,
        padding: EdgeInsets.fromLTRB(
          AppSpacing.xl, top + AppSpacing.sm, AppSpacing.xl, AppSpacing.xl,
        ),
        child: Column(
          children: [
            // AppBar row
            const Center(
              child: Text(
                'MEU PERFIL',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2.0,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // Donor badge
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: const Text(
                'Doador',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            // Avatar
            Container(
              width: 82,
              height: 82,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.14),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const ClipOval(
                child: Center(
                  child: Icon(
                    Icons.person_rounded,
                    size: 52,
                    color: AppColors.cyan,
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            const Text(
              'Carlos Eduardo M.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.2,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: 3,
              ),
              decoration: BoxDecoration(
                color: AppColors.teal,
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: const Text(
                '# Mod: 2024ABCDE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            // Stats row
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const _ProfileStat(label: 'Seguidores', value: '124'),
                Container(
                  width: 1,
                  height: 32,
                  margin: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
                  color: Colors.white.withValues(alpha: 0.35),
                ),
                const _ProfileStat(label: 'Seguindo', value: '185'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileStat extends StatelessWidget {
  final String label;
  final String value;
  const _ProfileStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.82),
            fontSize: 11,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }
}

class _SocialLinks extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.md,
        horizontal: AppSpacing.xl,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: const [
          _SocialBtn(icon: Icons.camera_alt_rounded,    color: AppColors.instaRose,    label: 'Instagram'),
          _SocialBtn(icon: Icons.business_center_rounded, color: AppColors.linkedInBlue, label: 'LinkedIn'),
          _SocialBtn(icon: Icons.facebook_rounded,       color: AppColors.facebookBlue, label: 'Facebook'),
          _SocialBtn(icon: Icons.link_rounded,           color: AppColors.textSecondary, label: 'Link'),
        ],
      ),
    );
  }
}

class _SocialBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  const _SocialBtn({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _DreamsRealized extends StatelessWidget {
  static const List<Color> _avatarColors = [
    AppColors.primary,
    AppColors.teal,
    AppColors.artOrange,
    AppColors.heartRed,
    AppColors.goldYellow,
  ];

  static const List<String> _avatarLabels = ['N', 'C', 'A', 'N', 'E'];

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Count
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '15',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 44,
                  fontWeight: FontWeight.w900,
                  height: 1.0,
                ),
              ),
              Text(
                'SONHOS\nREALIZADOS',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                  height: 1.35,
                ),
              ),
            ],
          ),
          const SizedBox(width: AppSpacing.lg),
          // Medal
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppColors.goldYellow.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.emoji_events_rounded,
              color: AppColors.goldYellow,
              size: 28,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          // Avatar strip
          Expanded(
            child: SizedBox(
              height: 46,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _avatarLabels.length,
                itemBuilder: (context, i) => Container(
                  width: 38,
                  height: 38,
                  margin: const EdgeInsets.only(right: AppSpacing.xs),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _avatarColors[i].withValues(alpha: 0.12),
                    border: Border.all(color: _avatarColors[i], width: 1.5),
                  ),
                  child: Center(
                    child: Text(
                      _avatarLabels[i],
                      style: TextStyle(
                        color: _avatarColors[i],
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroHall extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.goldYellow.withValues(alpha: 0.18),
            AppColors.artOrange.withValues(alpha: 0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: AppColors.goldYellow.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.emoji_events_rounded, color: AppColors.goldYellow, size: 30),
          const SizedBox(width: AppSpacing.sm),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sala de Herói Ouro',
                  style: TextStyle(
                    color: AppColors.artOrange,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
                Text(
                  'Seus maiores realizadores',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: AppColors.artOrange,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: const Text(
              'Ver',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EditProfileBtn extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: OutlinedButton(
          onPressed: () {},
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.cyan, width: 2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          child: const Text(
            'EDITAR PERFIL',
            style: TextStyle(
              color: AppColors.cyan,
              fontSize: 14,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS SCREEN
// ═══════════════════════════════════════════════════════════════

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.scaffold,
        body: Column(
          children: [
            _NotifAppBar(),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md, AppSpacing.md, AppSpacing.md, 0,
                ),
                itemCount: _notifs.length,
                itemBuilder: (context, i) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: _NotifCard(item: _notifs[i]),
                ),
              ),
            ),
            _SecurityZone(),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }
}

class _NotifAppBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      color: AppColors.purple,
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg, top + AppSpacing.md, AppSpacing.lg, AppSpacing.md,
      ),
      child: const Center(
        child: Text(
          'NOTIFICAÇÕES',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: 2.0,
          ),
        ),
      ),
    );
  }
}

class _NotifCard extends StatelessWidget {
  final NotifItem item;
  const _NotifCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: item.isAdmin
            ? AppColors.pinAmber.withValues(alpha: 0.06)
            : AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: item.isAdmin
            ? Border.all(color: AppColors.pinAmber.withValues(alpha: 0.25))
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: item.iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(item.icon, color: Colors.white, size: 19),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              item.body,
              style: TextStyle(
                color: item.isAdmin
                    ? AppColors.textPrimary
                    : AppColors.textSecondary,
                fontSize: 12,
                fontWeight: item.isAdmin ? FontWeight.w600 : FontWeight.w400,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SecurityZone extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: AppColors.dangerRed.withValues(alpha: 0.25),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Zone header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.dangerRed.withValues(alpha: 0.06),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppRadius.lg),
              ),
            ),
            child: const Center(
              child: Text(
                'ZONA DE SEGURANÇA',
                style: TextStyle(
                  color: AppColors.dangerRed,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              children: [
                _DangerButton(
                  label: 'BLOQUEAR ESTE SUSPEITO',
                  icon: Icons.block_rounded,
                ),
                const SizedBox(height: AppSpacing.sm),
                _DangerButton(
                  label: 'EXCLUIR PERFIL PERMANENTE',
                  icon: Icons.delete_forever_rounded,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DangerButton extends StatelessWidget {
  final String label;
  final IconData icon;
  const _DangerButton({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.md - 1),
        decoration: BoxDecoration(
          color: AppColors.dangerRed,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          boxShadow: [
            BoxShadow(
              color: AppColors.dangerRed.withValues(alpha: 0.3),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 17),
            const SizedBox(width: AppSpacing.sm),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
