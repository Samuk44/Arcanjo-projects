// lib/features/auth/screens/sonhos/widgets/apoio_card.dart

import 'package:flutter/material.dart';
import '../../../models/apoio_model.dart';
import '../../../services/sonho_service.dart';
import '../../../../app_colors.dart';

class ApoioCard extends StatefulWidget {
  final ApoioModel apoio;
  final VoidCallback onTap;

  const ApoioCard({
    super.key,
    required this.apoio,
    required this.onTap,
  });

  @override
  State<ApoioCard> createState() => _ApoioCardState();
}

class _ApoioCardState extends State<ApoioCard> {
  bool _carregando = false;
  final _sonhoService = SonhoService();

  Future<void> _confirmarEntrega() async {
    setState(() => _carregando = true);
    try {
      await _sonhoService.confirmarEntregaPeloDoador(widget.apoio);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Entrega marcada! Aguarde a confirmação.'), backgroundColor: AppColors.green),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.apoio.sonhoNomesCrianca.toUpperCase(),
                    style: const TextStyle(color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                _buildStatusBadge(),
              ],
            ),
            const SizedBox(height: 4),
            Text(widget.apoio.sonhoCategoria, style: const TextStyle(color: AppColors.gray, fontSize: 12)),
            const SizedBox(height: 12),
            if (widget.apoio.status == 'pendente_entrega')
              SizedBox(
                width: double.infinity,
                height: 36,
                child: ElevatedButton(
                  onPressed: _carregando ? null : _confirmarEntrega,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.pink,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _carregando 
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('MARCAR COMO ENTREGUE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    Color color = AppColors.gray;
    String text = 'PENDENTE';
    if (widget.apoio.status == 'entregue_pelo_doador') {
      color = AppColors.yellow;
      text = 'ENVIADO';
    } else if (widget.apoio.status == 'entregue') {
      color = AppColors.green;
      text = 'CONFIRMADO';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
    );
  }
}
