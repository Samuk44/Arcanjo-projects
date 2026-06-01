/**
 * @module ui/tabela-notas
 * @description Renderização da tabela de notas e sincronização inline de médias/status.
 *   Sem acesso direto ao Firebase — comunica apenas via state.
 */
import { state, JANELA_EDICAO_MS } from "../store/notas.store.js";
import { calcularMedia, calcularStatus } from "../services/notas.service.js";
import { el } from "../utils/helpers.js";
import { validateRange, skeletonHTML, emptyStateHTML } from "../../../../../assets/js/utils.js";

const STATUS_CLASS = {
  Aprovado    : "text-green-600",
  Recuperação : "text-yellow-600",
  Reprovado   : "text-red-600",
};

// ── Público ───────────────────────────────────────────────────────────────────

/** Exibe skeleton enquanto os alunos são carregados do Firebase. */
export function showSkeleton() {
  const tbody = el("tabela-notas");
  if (tbody) tbody.innerHTML = skeletonHTML(6);
}

/**
 * Renderiza (ou limpa) a tabela de notas com base no state atual.
 * Chame após qualquer mudança de turma, bimestre ou notas.
 */
export function renderTabela() {
  const tbody = el("tabela-notas");
  if (!tbody) return;

  if (!state.turmaId || !state.bimestre) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">
      Selecione a turma e o bimestre.</td></tr>`;
    _toggleBtnSalvar(false);
    return;
  }

  if (!state.alunos.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyStateHTML(
      "Nenhum aluno cadastrado",
      "Esta turma ainda não possui alunos vinculados.",
      "ph-users"
    )}</td></tr>`;
    return;
  }

  tbody.innerHTML = state.alunos.map(_buildRow).join("");
  _toggleBtnSalvar(true);
  _attachInputListeners();
}

/**
 * Recalcula média/status de um aluno e atualiza as células sem re-render completo.
 * @param {string} uid
 */
export function syncRow(uid) {
  const entry = state.notas[uid];
  if (!entry) return;

  const n1 = parseFloat(entry.n1);
  const n2 = parseFloat(entry.n2);
  const n3 = parseFloat(entry.n3);

  if ([n1, n2, n3].some(isNaN)) {
    entry.media  = null;
    entry.status = "";
    return;
  }

  entry.media  = parseFloat(calcularMedia(n1, n2, n3).toFixed(1));
  entry.status = calcularStatus(entry.media);

  const row = document.querySelector(`tr[data-uid="${uid}"]`);
  if (!row) return;
  const cells = row.querySelectorAll("td");
  if (cells[4]) cells[4].textContent = entry.media.toFixed(1);
  if (cells[5]) {
    cells[5].className  = `px-3 py-2 text-sm font-medium ${STATUS_CLASS[entry.status] ?? ""}`;
    cells[5].textContent = entry.status;
  }
}

// ── Privado ───────────────────────────────────────────────────────────────────

function _toggleBtnSalvar(visible) {
  const btn = el("btn-salvar-notas");
  if (btn) btn.style.display = visible ? "block" : "none";
}

function _inputCell(uid, nome, campo, value, disabled) {
  return `<td class="px-3 py-2">
    <input type="number" step="0.1" min="0" max="10" inputmode="decimal"
      class="nota-input w-20 border rounded px-2 py-1 text-sm"
      data-uid="${uid}" data-campo="${campo}"
      value="${value}" ${disabled ? "disabled" : ""}
      aria-label="${campo.toUpperCase()} de ${nome}" placeholder="${campo.toUpperCase()}">
    <p class="error-msg text-red-500 text-xs hidden"></p>
  </td>`;
}

function _buildRow(aluno) {
  const entry = state.notas[aluno.uid] ?? { n1: "", n2: "", n3: "", media: null, status: "" };
  const podeEditar =
    entry.notaKey === null ||
    (entry.timestamp && Date.now() - entry.timestamp < JANELA_EDICAO_MS);
  const statusClass = STATUS_CLASS[entry.status] ?? "";

  return `<tr data-uid="${aluno.uid}">
    <td class="px-3 py-2 font-medium">${aluno.nome}</td>
    ${_inputCell(aluno.uid, aluno.nome, "n1", entry.n1, !podeEditar)}
    ${_inputCell(aluno.uid, aluno.nome, "n2", entry.n2, !podeEditar)}
    ${_inputCell(aluno.uid, aluno.nome, "n3", entry.n3, !podeEditar)}
    <td class="px-3 py-2 text-center font-semibold">${entry.media !== null ? entry.media.toFixed(1) : "—"}</td>
    <td class="px-3 py-2 text-sm font-medium ${statusClass}">${entry.status || "—"}</td>
    <td class="px-3 py-2">${
      podeEditar
        ? `<button class="btn-small px-2 py-1 bg-primary text-white text-xs rounded"
             onclick="window._salvarNotaUnica('${aluno.uid}')"
             aria-label="Salvar nota de ${aluno.nome}">💾</button>`
        : `<span class="text-xs text-gray-400">Bloqueado</span>`
    }</td>
  </tr>`;
}

function _attachInputListeners() {
  document.querySelectorAll(".nota-input").forEach((input) => {
    input.addEventListener("change", _onInputChange);
    input.addEventListener("keydown", _onKeyDown);
  });
}

function _onInputChange(e) {
  const { uid, campo } = e.target.dataset;
  const val             = e.target.value;
  const { valid, value, error } = validateRange(val);
  const errEl           = e.target.parentElement.querySelector(".error-msg");

  if (!valid && val !== "") {
    e.target.classList.add("border-red-500");
    if (errEl) { errEl.textContent = error; errEl.classList.remove("hidden"); }
    return;
  }
  e.target.classList.remove("border-red-500");
  if (errEl) errEl.classList.add("hidden");

  if (!state.notas[uid])
    state.notas[uid] = { n1: "", n2: "", n3: "", media: null, status: "", notaKey: null, timestamp: null };

  state.notas[uid][campo] = valid ? value : "";
  syncRow(uid);
}

const _ALLOWED_KEYS = new Set(["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "."]);

function _onKeyDown(e) {
  if (!_ALLOWED_KEYS.has(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
}
