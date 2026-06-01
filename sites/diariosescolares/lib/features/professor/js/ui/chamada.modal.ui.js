/**
 * @module ui/chamada-modal
 * @description Componentes de UI do módulo de chamada escolar.
 *   Tabela no formato padrão de diário escolar brasileiro:
 *   N° | Nome do Aluno | Matrícula | P | F | J
 *
 *   Nenhum acesso ao Firebase — apenas leitura de state e manipulação de DOM.
 */
"use strict";

import { state } from "../store/chamada.store.js";
import { calcStats, formatDateBR, esc } from "../utils/chamada.utils.js";

const el = (id) => document.getElementById(id);

// ── Tabela de alunos ──────────────────────────────────────────────────────────

/**
 * Renderiza a tabela de chamada no formato padrão de diário escolar brasileiro.
 * Colunas: N° | Aluno | Matrícula | P | F | J
 */
export function renderTable() {
  const tbody = el("chamada-table-body");
  const tableWrapper = el("chamada-table");
  const empty = el("chamada-empty");

  if (!tbody) return;

  const list = state.alunos;

  if (!list.length) {
    if (tableWrapper) tableWrapper.classList.add("hidden");
    if (empty) {
      empty.classList.remove("hidden");
      empty.innerHTML = `
        <i class="ph ph-users-three text-4xl text-secondary/40 mb-3 block"></i>
        <p class="text-secondary font-medium">Nenhum aluno encontrado nesta turma.</p>`;
    }
    return;
  }

  if (tableWrapper) tableWrapper.classList.remove("hidden");
  if (empty) empty.classList.add("hidden");

  // Injeta cabeçalho padrão escolar brasileiro
  const thead = tableWrapper?.querySelector("thead");
  if (thead) {
    thead.innerHTML = `
      <tr class="bg-slate-800/80">
        <th class="px-3 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider w-12 border-r border-border">N°</th>
        <th class="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider border-r border-border">Nome do Aluno</th>
        <th class="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider w-28 border-r border-border">Matrícula</th>
        <th class="px-3 py-3 text-center text-xs font-bold text-success uppercase tracking-wider w-14 border-r border-border/50">P</th>
        <th class="px-3 py-3 text-center text-xs font-bold text-danger uppercase tracking-wider w-14 border-r border-border/50">F</th>
        <th class="px-3 py-3 text-center text-xs font-bold text-warning uppercase tracking-wider w-14">J</th>
      </tr>`;
  }

  tbody.innerHTML = list
    .map((aluno) => {
      const status = state.chamadaAtual[aluno.uid] ?? "";
      const nChamada = aluno.nChamada ?? "—";
      const isEven = (aluno.nChamada ?? 0) % 2 === 0;

      return `
        <tr
          class="border-b border-border last:border-0 transition-colors ${isEven ? "bg-slate-800/20" : ""} hover:bg-accent/5"
          data-uid-row="${esc(aluno.uid)}"
        >
          <!-- N° de chamada -->
          <td class="px-3 py-3 text-center border-r border-border/50">
            <span class="text-sm font-bold text-secondary/70 tabular-nums">${nChamada}</span>
          </td>

          <!-- Nome -->
          <td class="px-4 py-3 border-r border-border/50">
            <span class="font-medium text-sm text-primary">${esc(aluno.nome || "—")}</span>
          </td>

          <!-- Matrícula -->
          <td class="px-4 py-3 border-r border-border/50">
            <span class="text-sm text-secondary font-mono">${esc(aluno.matricula || "—")}</span>
          </td>

          <!-- Botão P -->
          <td class="px-2 py-2.5 text-center border-r border-border/30">
            <button
              data-uid="${esc(aluno.uid)}"
              data-status="P"
              class="${_btnClass("P", status === "P")}"
              title="Presente"
              aria-label="Marcar presente"
            >P</button>
          </td>

          <!-- Botão F -->
          <td class="px-2 py-2.5 text-center border-r border-border/30">
            <button
              data-uid="${esc(aluno.uid)}"
              data-status="F"
              class="${_btnClass("F", status === "F")}"
              title="Falta"
              aria-label="Marcar falta"
            >F</button>
          </td>

          <!-- Botão J -->
          <td class="px-2 py-2.5 text-center">
            <button
              data-uid="${esc(aluno.uid)}"
              data-status="J"
              class="${_btnClass("J", status === "J")}"
              title="Falta Justificada"
              aria-label="Marcar falta justificada"
            >J</button>
          </td>
        </tr>`;
    })
    .join("");
}

/**
 * Atualiza cirurgicamente uma linha da tabela para refletir o status atual.
 * @param {string} uid
 */
export function updateRow(uid) {
  const row = document.querySelector(`[data-uid-row="${uid}"]`);
  if (!row) return;

  const status = state.chamadaAtual[uid] ?? "";
  const btns = row.querySelectorAll("[data-status][data-uid]");

  btns.forEach((btn) => {
    const s = btn.dataset.status;
    btn.className = _btnClass(s, status === s);
  });
}

/**
 * Exibe linhas skeleton enquanto os alunos são carregados do Firebase.
 */
export function showSkeleton() {
  const tbody = el("chamada-table-body");
  const tableWrapper = el("chamada-table");
  const empty = el("chamada-empty");

  if (!tbody) return;
  if (tableWrapper) tableWrapper.classList.remove("hidden");
  if (empty) empty.classList.add("hidden");

  // Atualiza cabeçalho para o padrão escolar mesmo durante o skeleton
  const thead = tableWrapper?.querySelector("thead");
  if (thead) {
    thead.innerHTML = `
      <tr class="bg-slate-800/80">
        <th class="px-3 py-3 text-center text-xs font-bold text-secondary uppercase tracking-wider w-12 border-r border-border">N°</th>
        <th class="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider border-r border-border">Nome do Aluno</th>
        <th class="px-4 py-3 text-left text-xs font-bold text-secondary uppercase tracking-wider w-28 border-r border-border">Matrícula</th>
        <th class="px-3 py-3 text-center text-xs font-bold text-success uppercase tracking-wider w-14 border-r border-border/50">P</th>
        <th class="px-3 py-3 text-center text-xs font-bold text-danger uppercase tracking-wider w-14 border-r border-border/50">F</th>
        <th class="px-3 py-3 text-center text-xs font-bold text-warning uppercase tracking-wider w-14">J</th>
      </tr>`;
  }

  tbody.innerHTML = Array.from(
    { length: 6 },
    (_, i) => `
      <tr class="border-b border-border animate-pulse ${i % 2 === 0 ? "" : "bg-slate-800/20"}">
        <td class="px-3 py-3 border-r border-border/50 text-center">
          <div class="h-4 bg-slate-700 rounded w-5 mx-auto"></div>
        </td>
        <td class="px-4 py-3 border-r border-border/50">
          <div class="h-4 bg-slate-700 rounded w-40"></div>
        </td>
        <td class="px-4 py-3 border-r border-border/50">
          <div class="h-4 bg-slate-700 rounded w-20"></div>
        </td>
        <td class="px-2 py-3 border-r border-border/30 text-center">
          <div class="w-9 h-9 rounded-lg bg-slate-700 mx-auto"></div>
        </td>
        <td class="px-2 py-3 border-r border-border/30 text-center">
          <div class="w-9 h-9 rounded-lg bg-slate-700 mx-auto"></div>
        </td>
        <td class="px-2 py-3 text-center">
          <div class="w-9 h-9 rounded-lg bg-slate-700 mx-auto"></div>
        </td>
      </tr>`,
  ).join("");
}

/**
 * Filtra as linhas da tabela pelo nome do aluno.
 * @param {string} search
 */
export function filterTable(search = "") {
  const termo = String(search).toLowerCase().trim();
  document.querySelectorAll("#chamada-table-body tr").forEach((row) => {
    // Busca no texto da segunda coluna (nome)
    const nomeTd = row.querySelector("td:nth-child(2)");
    const nome = nomeTd
      ? nomeTd.textContent.toLowerCase()
      : row.textContent.toLowerCase();
    row.style.display = nome.includes(termo) ? "" : "none";
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

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
    error: "bg-red-500/10 border-red-500/30 text-red-400",
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
 * @returns {Promise<boolean>} true = confirmou, false = cancelou
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

    _setTxt("mc-turma", state.turmaNome);
    _setTxt("mc-disciplina", state.disciplinaNome);
    _setTxt("mc-data", formatDateBR(state.data));
    _setTxt("mc-total", total);
    _setTxt("mc-presentes", presentes);
    _setTxt("mc-faltas", faltas);
    _setTxt("mc-justificadas", justificadas);

    const aviso = el("mc-aviso-pendentes");
    if (aviso) {
      aviso.classList.toggle("hidden", pendentes === 0);
      if (pendentes > 0)
        aviso.textContent = `⚠️ ${pendentes} aluno(s) sem status definido.`;
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

/**
 * Retorna as classes Tailwind do botão de status P/F/J.
 * @param {"P"|"F"|"J"} s
 * @param {boolean} active
 */
function _btnClass(s, active) {
  const base =
    "w-9 h-9 rounded-lg text-sm font-bold border transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent";

  if (active) {
    if (s === "P")
      return `${base} bg-success text-white border-success shadow-md shadow-success/30 focus:ring-success`;
    if (s === "F")
      return `${base} bg-danger  text-white border-danger  shadow-md shadow-danger/30  focus:ring-danger`;
    return `${base} bg-warning text-white border-warning shadow-md shadow-warning/30 focus:ring-warning`;
  }

  if (s === "P")
    return `${base} border-border text-secondary/60 hover:border-success hover:text-success hover:bg-success/10  focus:ring-success`;
  if (s === "F")
    return `${base} border-border text-secondary/60 hover:border-danger  hover:text-danger  hover:bg-danger/10   focus:ring-danger`;
  return `${base} border-border text-secondary/60 hover:border-warning hover:text-warning hover:bg-warning/10  focus:ring-warning`;
}

function _setTxt(id, val) {
  const node = el(id);
  if (node) node.textContent = String(val ?? "");
}

function _off(node, evt, fn) {
  node?.removeEventListener(evt, fn);
}
