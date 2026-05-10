// lib/features/auth/screens/sonhos/widgets/apoio_card.dart

import 'package:flutter/material.dart';
import '../../../models/apoio_model.dart';
import '../../../services/sonho_service.dart';
import '../../../../app_colors.dart';

class ApoioCard extends StatefulWidget {
  final ApoioModel apoio;
  final SonhoService sonhoService;

  const ApoioCard({
    super.key,
    required this.apoio,
    required this.sonhoService,
  });

  @override
  State<ApoioCard> createState() => _ApoioCardState();
}

class _ApoioCardState extends State<ApoioCard> {
  bool _carregando = false;

  Future<void> _confirmarEntrega() async {
    setState(() => _carregando = true);
    try {
      await widget.sonhoService.confirmarEntregaPeloDoador(widget.apoio);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Entrega confirmada! Aguardando o responsável.'),
            backgroundColor: AppColors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: AppColors.pink),
        );
      }
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.apoio.status;

    final Color corStatus;
    final String labelStatus;
    final IconData iconStatus;

    switch (status) {
      case 'entregue':
        corStatus = AppColors.green;
        labelStatus = 'Entrega concluída';
        iconStatus = Icons.check_circle_outline;
        break;
      case 'entregue_pelo_doador':
        corStatus = AppColors.yellow;
        labelStatus = 'Aguardando confirmação do responsável';
        iconStatus = Icons.hourglass_top;
        break;
      default:
        corStatus = AppColors.pink;
        labelStatus = 'Pendente de entrega';
        iconStatus = Icons.local_shipping_outlined;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: corStatus.withValues(alpha: 0.25)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cabeçalho
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.apoio.sonhoNomesCrianca,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                Icon(iconStatus, color: corStatus, size: 20),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              widget.apoio.sonhoDescricao,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.category_outlined, color: AppColors.pink, size: 14),
                const SizedBox(width: 4),
                Text(
                  widget.apoio.sonhoCategoria,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.5),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(width: 12),
                Icon(Icons.location_on, color: AppColors.pink, size: 14),
                const SizedBox(width: 4),
                Text(
                  widget.apoio.sonhoCidade,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.5),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: corStatus.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                labelStatus,
                style: TextStyle(
                  color: corStatus,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            // Botão de confirmar entrega (apenas quando pendente)
            if (status == 'pendente_entrega') ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _carregando ? null : _confirmarEntrega,
                  icon: _carregando
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.green,
                          ),
                        )
                      : const Icon(Icons.check, size: 16),
                  label: const Text('MARCAR COMO ENTREGUE'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.green,
                    side: const BorderSide(color: AppColors.green),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
