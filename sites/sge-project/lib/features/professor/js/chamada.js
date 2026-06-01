/**
 * @module pages/chamada
 * @description Bootstrap da página de chamada escolar.
 *   Responsabilidades exclusivas:
 *   - Iniciar autenticação e guardar de role
 *   - Registrar event listeners (selects, botões, busca)
 *   - Orquestrar o fluxo entre services e UI
 *   - Expor funções globais usadas pelo HTML inline (window.setStatus)
 *
 *   NÃO contém regras de negócio — delega a chamada.service.js.
 *   NÃO renderiza HTML diretamente — delega a chamada-table.ui.js e chamada-header.ui.js.
 */
"use strict";

import { auth, db } from "../../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

import { state, PATH, resetChamada } from "../store/chamada.store.js";
import {
  loadVinculos,
  selecionarTurma,
  selecionarDisciplina,
  selecionarData,
  marcarStatus,
  marcarTodos,
  finalizarChamada,
  checkChamadaExistente,
} from "../services/chamada.service.js";
import { renderTable, updateRow, showSkeleton, filterTable } from "../ui/chamada-table.ui.js";
import { renderHeader, renderUserHeader }                      from "../ui/chamada-header.ui.js";
import {
  showToast,
  abrirModalConfirmacao,
  abrirModalSucesso,
} from "../ui/chamada-modal.ui.js";
import { todayISO } from "../utils/chamada-utils.js";

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let _authUnsub = null;
let _mounted   = false;
const isMounted = () => _mounted;

// ── Helpers DOM ───────────────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

// ── Populadores de select ─────────────────────────────────────────────────────

function _populateSelectTurma() {
  const select = el("select-turma");
  if (!select) return;
  select.innerHTML =
    '<option value="">Selecione a turma</option>' +
    state.vinculos
      .map((v) => `<option value="${v.turmaId}">${v.turmaNome}</option>`)
      .join("");
}

function _populateSelectDisciplina(turmaId) {
  const select = el("select-disciplina");
  if (!select) return;

  const vinculo = state.vinculos.find((v) => v.turmaId === turmaId);
  if (!vinculo || !vinculo.disciplinas.length) {
    select.innerHTML = '<option value="">Sem disciplinas</option>';
    select.disabled  = true;
    return;
  }

  select.disabled  = false;
  select.innerHTML =
    '<option value="">Selecione a disciplina</option>' +
    vinculo.disciplinas
      .map((d) => `<option value="${d.id}">${d.nome}</option>`)
      .join("");
}

// ── Handlers de evento ────────────────────────────────────────────────────────

async function onTurmaChange(e) {
  const turmaId = e.target.value;

  // Reseta disciplina
  const discSelect = el("select-disciplina");
  if (discSelect) {
    discSelect.value   = "";
    discSelect.disabled = true;
  }
  _hideSections();

  if (!turmaId) {
    resetChamada();
    renderHeader();
    return;
  }

  showSkeleton();
  await selecionarTurma(turmaId, isMounted);
  _populateSelectDisciplina(turmaId);
  renderTable();
  renderHeader();
}

function onDisciplinaChange(e) {
  const opt = e.target.options[e.target.selectedIndex];
  selecionarDisciplina(e.target.value, opt?.text ?? "");
  renderHeader();
  _checkAndBadge();
}

async function onDataChange(e) {
  await selecionarData(e.target.value, isMounted);
  renderHeader();
  _checkAndBadge();
}

async function _checkAndBadge() {
  if (state.turmaId && state.disciplinaId && state.data) {
    await checkChamadaExistente(isMounted);
    renderHeader();

    // Se chamada existente, re-renderiza a tabela com statuses pré-populados
    if (state.chamadaExiste) {
      renderTable();
      showToast("Chamada existente carregada para edição.", "info");
    }
  }
}

function onSearchInput(e) {
  filterTable(e.target.value);
}

async function onFinalizarClick() {
  // Abre modal de confirmação
  const confirmado = await abrirModalConfirmacao();
  if (!confirmado) return;

  const btnFinalizar = el("btn-finalizar");
  if (btnFinalizar) {
    btnFinalizar.disabled  = true;
    btnFinalizar.innerHTML = `<i class="ph ph-spinner animate-spin mr-2"></i>Salvando...`;
  }

  // Atualiza observações do state antes de salvar
  state.observacoes = el("chamada-obs")?.value ?? "";

  const result = await finalizarChamada();

  if (btnFinalizar) {
    btnFinalizar.disabled  = false;
    btnFinalizar.innerHTML = `<i class="ph ph-check-circle mr-2"></i>Finalizar Chamada`;
  }

  if (!result.ok) {
    showToast(result.error ?? "Erro ao salvar chamada.", "error");
    return;
  }

  // Modal de sucesso → pergunta se quer nova chamada
  const acao = await abrirModalSucesso();
  if (acao === "nova") {
    _resetParaNovaChamada();
  } else {
    showToast("Chamada registrada com sucesso!", "success");
  }
}

function onMarcarTodosP() {
  if (!state.alunos.length) return;
  marcarTodos("P");
  // Atualiza todas as linhas individualmente (cirúrgico)
  for (const aluno of state.alunos) updateRow(aluno.uid);
  renderHeader();
}

// ── Função global para cliques inline nos botões P/F/J ────────────────────────
// Exposição via window permite usar delegation sem sobrescrever o onclick do HTML.
// O HTML usa data-uid + data-status; o evento é capturado por delegation no tbody.

function _attachTableDelegation() {
  const tbody = el("chamada-table-body");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-status][data-uid]");
    if (!btn) return;

    const uid    = btn.dataset.uid;
    const status = btn.dataset.status;
    if (!uid || !status) return;

    if (window.navigator.vibrate) window.navigator.vibrate(10);

    marcarStatus(uid, status);
    updateRow(uid);   // apenas a linha clicada
    renderHeader();   // apenas os contadores
  });
}

// ── Reset para nova chamada ───────────────────────────────────────────────────

function _resetParaNovaChamada() {
  resetChamada();
  state.turmaId   = "";
  state.turmaNome = "";

  // Reseta selects e input de data
  const sel = el("select-turma");
  if (sel) sel.value = "";
  const disc = el("select-disciplina");
  if (disc) { disc.value = ""; disc.disabled = true; }
  const data = el("input-data");
  if (data) data.value = todayISO();
  const obs = el("chamada-obs");
  if (obs) obs.value = "";
  const search = el("search-alunos");
  if (search) search.value = "";

  _hideSections();
  renderHeader();
  showToast("Pronto para nova chamada!", "success");
}

function _hideSections() {
  el("section-stats")?.classList.add("hidden");
  el("section-footer")?.classList.add("hidden");
  el("chamada-table")?.classList.add("hidden");
  el("chamada-empty")?.classList.remove("hidden");
}

// ── Autenticação ──────────────────────────────────────────────────────────────

function _initAuth() {
  _authUnsub = onAuthStateChanged(auth, async (user) => {
    if (!isMounted()) return;

    if (!user) {
      window.location.replace("/auth/login.html");
      return;
    }

    try {
      const snap = await get(ref(db, PATH.usuarios(user.uid)));
      if (!isMounted()) return;

      if (!snap.exists() || snap.val().role !== "professor") {
        window.location.replace("/auth/login.html");
        return;
      }

      const data = snap.val();
      state.professor.uid        = user.uid;
      state.professor.nome       = data.nome       ?? "Professor";
      state.professor.disciplina = data.disciplina ?? "";

      // Botão logout
      el("btn-logout")?.addEventListener(
        "click",
        async () => {
          try { await signOut(auth); } catch {}
          window.location.replace("/auth/login.html");
        },
        { once: true },
      );

      // Notificações badge (opcional — sem quebrar se não houver)
      _checkNotificacoes(user.uid).catch(() => {});

      renderUserHeader();
      await loadVinculos(isMounted);
      _populateSelectTurma();

      // Define data padrão como hoje
      const inputData = el("input-data");
      if (inputData && !inputData.value) inputData.value = todayISO();

    } catch (err) {
      console.error("chamada.js init:", err?.code ?? err?.message);
    }
  });
}

async function _checkNotificacoes(uid) {
  const { ref: fRef, get: fGet, query: fQuery, orderByChild, equalTo } =
    await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js");
  const snap = await fGet(fRef(db, `notificacoes/${uid}`));
  if (!snap.exists()) return; 
  let nao_lidas = 0;
  snap.forEach((c) => { if (c.val()?.lida === false) nao_lidas++; });
  const badge = el("badge-notifications");
  if (badge) badge.classList.toggle("hidden", nao_lidas === 0);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  _mounted = true;

  // Event listeners
  el("select-turma")      ?.addEventListener("change", onTurmaChange);
  el("select-disciplina") ?.addEventListener("change", onDisciplinaChange);
  el("input-data")        ?.addEventListener("change", onDataChange);
  el("btn-finalizar")     ?.addEventListener("click",  onFinalizarClick);
  el("btn-marcar-todos-p")?.addEventListener("click",  onMarcarTodosP);
  el("search-alunos")     ?.addEventListener("input",  onSearchInput);

  // Delegation para os botões P/F/J da tabela
  _attachTableDelegation();

  // Auth
  _initAuth();
}

window.addEventListener(
  "pagehide",
  () => {
    _mounted = false;
    if (_authUnsub) { _authUnsub(); _authUnsub = null; }
  },
  { once: true },
);

document.addEventListener("DOMContentLoaded", init);