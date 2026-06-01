/**
 * @module ui/chamada-modal
 * @description Controle de modais do módulo de chamada.
 *   - Modal de confirmação antes de salvar (mostra resumo)
 *   - Modal de sucesso após salvar (mostra estatísticas finais + ação de nova chamada)
 *   - Toast de erro / aviso
 *
 *   Nenhum acesso ao Firebase — apenas leitura de state e manipulação de DOM.
 */
"use strict";

import { state } from "../store/chamada.store.js";
import { calcStats, formatDateBR, esc } from "../utils/chamada-utils.js";

const el = (id) => document.getElementById(id);

// ── Utilitário de toast ───────────────────────────────────────────────────────

/**
 * Exibe um toast no canto inferior direito.
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} [type="success"]
 * @param {number} [durationMs=4500]
 */
export function showToast(message, type = "success", durationMs = 4500) {
  const container = el("toast-container");
  if (!container) return;

  const icons = {
    success: "ph-check-circle",
    error: "ph-x-circle",
    warning: "ph-warning",
    info: "ph-info",
  };
  const colors = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error: "bg-red-500/10  border-red-500/30  text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border
    ${colors[type] ?? colors.info} shadow-lg backdrop-blur-sm
    animate-slide-up transition-all duration-300 max-w-sm`;
  toast.role = "alert";
  toast.innerHTML = `
    <i class="ph ${icons[type] ?? "ph-info"} text-xl flex-shrink-0"></i>
    <p class="text-sm font-medium leading-snug">${esc(message)}</p>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 350);
  }, durationMs);
}

// ── Modal de confirmação ──────────────────────────────────────────────────────

/**
 * Abre o modal de confirmação com resumo da chamada.
 * Retorna uma Promise que resolve true (confirmou) ou false (cancelou).
 * @returns {Promise<boolean>}
 */
export function abrirModalConfirmacao() {
  return new Promise((resolve) => {
    const modal = el("modal-confirmacao");
    const overlay = el("modal-confirmacao-overlay");
    if (!modal) {
      resolve(true);
      return;
    }

    const total = state.alunos.length;
    const { presentes, faltas, justificadas, pendentes } = calcStats(
      state.chamadaAtual,
      total,
    );

    // Preenche o resumo
    _setTxt("mc-turma", state.turmaNome);
    _setTxt("mc-disciplina", state.disciplinaNome);
    _setTxt("mc-data", formatDateBR(state.data));
    _setTxt("mc-total", total);
    _setTxt("mc-presentes", presentes);
    _setTxt("mc-faltas", faltas);
    _setTxt("mc-justificadas", justificadas);

    // Aviso de pendentes (não deveria aparecer se a validação passou, mas por segurança)
    const aviso = el("mc-aviso-pendentes");
    if (aviso) {
      aviso.classList.toggle("hidden", pendentes === 0);
      if (pendentes > 0)
        aviso.textContent = `⚠️ ${pendentes} aluno(s) sem status.`;
    }

    modal.classList.remove("hidden");
    requestAnimationFrame(() =>
      modal
        .querySelector(".modal-panel")
        ?.classList.remove("scale-95", "opacity-0"),
    );

    const fechar = (result) => {
      modal
        .querySelector(".modal-panel")
        ?.classList.add("scale-95", "opacity-0");
      setTimeout(() => modal.classList.add("hidden"), 200);
      _off(btnConfirmar, "click", onConfirm);
      _off(btnCancelar, "click", onCancel);
      overlay?.removeEventListener("click", onCancel);
      resolve(result);
    };

    const onConfirm = () => fechar(true);
    const onCancel = () => fechar(false);

    const btnConfirmar = el("mc-btn-confirmar");
    const btnCancelar = el("mc-btn-cancelar");

    btnConfirmar?.addEventListener("click", onConfirm, { once: true });
    btnCancelar?.addEventListener("click", onCancel, { once: true });
    overlay?.addEventListener("click", onCancel, { once: true });
  });
}

// ── Modal de sucesso ──────────────────────────────────────────────────────────

/**
 * Abre o modal de sucesso após salvar a chamada.
 * Retorna uma Promise que resolve com "nova" (nova chamada) ou "fechar".
 * @returns {Promise<"nova"|"fechar">}
 */
export function abrirModalSucesso() {
  return new Promise((resolve) => {
    const modal = el("modal-sucesso");
    if (!modal) {
      resolve("fechar");
      return;
    }

    const total = state.alunos.length;
    const { presentes, faltas, justificadas } = calcStats(
      state.chamadaAtual,
      total,
    );
    const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;

    _setTxt("ms-turma", state.turmaNome);
    _setTxt("ms-data", formatDateBR(state.data));
    _setTxt("ms-presentes", presentes);
    _setTxt("ms-faltas", faltas);
    _setTxt("ms-justificadas", justificadas);
    _setTxt("ms-pct", `${pct}% de presença`);

    modal.classList.remove("hidden");
    requestAnimationFrame(() =>
      modal
        .querySelector(".modal-panel")
        ?.classList.remove("scale-95", "opacity-0"),
    );

    const fechar = (action) => {
      modal
        .querySelector(".modal-panel")
        ?.classList.add("scale-95", "opacity-0");
      setTimeout(() => modal.classList.add("hidden"), 200);
      _off(btnNova, "click", onNova);
      _off(btnFechar, "click", onFechar);
      resolve(action);
    };

    const onNova = () => fechar("nova");
    const onFechar = () => fechar("fechar");

    const btnNova = el("ms-btn-nova");
    const btnFechar = el("ms-btn-fechar");

    btnNova?.addEventListener("click", onNova, { once: true });
    btnFechar?.addEventListener("click", onFechar, { once: true });
  });
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _setTxt(id, val) {
  const node = el(id);
  if (node) node.textContent = String(val ?? "");
}

function _off(node, evt, fn) {
  node?.removeEventListener(evt, fn);
}
