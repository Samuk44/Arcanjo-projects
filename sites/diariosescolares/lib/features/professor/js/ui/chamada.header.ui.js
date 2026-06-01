/**
 * @module ui/chamada-header
 * @description Renderização e atualização dos indicadores estatísticos em tempo real.
 *   Sem acesso direto ao Firebase — lê apenas state.
 *   Cada chamada a renderHeader() atualiza somente os textos/classes, sem recriar o DOM.
 */
"use strict";

import { state } from "../store/chamada.store.js";
import { calcStats, formatDateBR, weekdayBR } from "../utils/chamada.utils.js";

// ── Atalho interno ─────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Atualiza os indicadores de topo e a barra de progresso.
 * Deve ser chamado sempre que state.chamadaAtual mudar.
 */
export function renderHeader() {
  const total = state.alunos.length;
  const { presentes, faltas, justificadas, pendentes, pct } = calcStats(
    state.chamadaAtual,
    total,
  );

  // Título
  const tituloEl = el("stat-turma-nome");
  if (tituloEl) tituloEl.textContent = state.turmaNome || "—";

  // Data + dia da semana
  const dataEl = el("stat-data");
  if (dataEl && state.data) {
    const br = formatDateBR(state.data);
    const dia = weekdayBR(state.data);
    dataEl.textContent = dia
      ? `${br} · ${dia.charAt(0).toUpperCase()}${dia.slice(1)}`
      : br;
  } else if (dataEl) {
    dataEl.textContent = "—";
  }

  // Disciplina
  const discEl = el("stat-disciplina");
  if (discEl) discEl.textContent = state.disciplinaNome || "—";

  // Contadores
  _setStat("stat-total", total);
  _setStat("stat-presentes", presentes);
  _setStat("stat-faltas", faltas);
  _setStat("stat-justificadas", justificadas);
  _setStat("stat-pendentes", pendentes);

  // Progresso
  const bar = el("progress-bar");
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.setAttribute("aria-valuenow", pct);
    bar.setAttribute("aria-valuetext", `${pct}% da chamada preenchida`);
  }
  const pctEl = el("progress-pct");
  if (pctEl) pctEl.textContent = `${pct}%`;

  // Botão Finalizar — habilitado apenas quando todos têm status
  const btn = el("btn-finalizar");
  if (btn) {
    const completa = total > 0 && pendentes === 0;
    btn.disabled = !completa;
    btn.classList.toggle("opacity-50", !completa);
    btn.classList.toggle("cursor-not-allowed", !completa);
  }

  // Aviso de chamada já existente
  const badge = el("chamada-existente-badge");
  if (badge) {
    badge.classList.toggle("hidden", !state.chamadaExiste);
  }
}

/**
 * Atualiza nome/disciplina/iniciais no cabeçalho da página.
 */
export function renderUserHeader() {
  const nome = state.professor.nome ?? "Professor";
  const disc = state.professor.disciplina ?? "Professor";
  const initials =
    nome
      .split(" ")
      .map((n) => n[0] ?? "")
      .join("")
      .substring(0, 2)
      .toUpperCase() || "P";

  const n = el("user-name");
  const d = el("user-discipline");
  const i = el("user-initials");

  if (n) n.textContent = nome;
  if (d) d.textContent = disc;
  if (i) i.textContent = initials;
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function _setStat(id, value) {
  const node = el(id);
  if (node) node.textContent = String(value);
}
