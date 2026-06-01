/**
 * @module pages/notas
 * @description Bootstrap da página de lançamento de notas N1/N2/N3.
 *   Responsável apenas pela inicialização, orquestração e event listeners.
 *   Sem regras de negócio — delega tudo para services e ui.
 */
"use strict";

import { state }                                       from "../store/notas.store.js";
import { initAuth }                                    from "../services/auth.service.js";
import { loadVinculos }                                from "../services/professores.service.js";
import { loadAlunos }                                  from "../services/alunos.service.js";
import { loadConfig, loadNotasExistentes,
         salvarTodos, salvarNotaUnica }                from "../services/notas.service.js";
import { showSkeleton, renderTabela }                  from "../ui/tabela-notas.ui.js";
import { updateHeader }                                from "../ui/header.ui.js";
import { el }                                          from "../utils/helpers.js";

let _authUnsub = null;
let _mounted   = false;
const isMounted = () => _mounted;

// ── Handlers de evento ────────────────────────────────────────────────────────

async function onTurmaChange(e) {
  state.turmaId = e.target.value;
  state.notas   = {};
  if (!state.turmaId) { renderTabela(); return; }

  showSkeleton();
  await loadAlunos(state.turmaId, isMounted);
  if (state.bimestre) await loadNotasExistentes(state.turmaId, isMounted);
  renderTabela();
}

async function onBimestreChange(e) {
  state.bimestre = e.target.value;
  if (state.turmaId) await loadNotasExistentes(state.turmaId, isMounted);
  renderTabela();
}

// ── Global para onclick inline no HTML ───────────────────────────────────────
window._salvarNotaUnica = (uid) => salvarNotaUnica(uid);

// ── Inicialização ─────────────────────────────────────────────────────────────

function init() {
  _mounted = true;

  _authUnsub = initAuth(isMounted, async () => {
    updateHeader();
    await loadConfig();
    await loadVinculos(isMounted);
  });

  el("select-turma")  ?.addEventListener("change", onTurmaChange);
  el("select-bimestre")?.addEventListener("change", onBimestreChange);
  el("btn-salvar-notas")?.addEventListener("click", salvarTodos);

  document.querySelectorAll("[data-view]").forEach((link) =>
    link.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }))
  );
}

window.addEventListener(
  "pagehide",
  () => { _mounted = false; if (_authUnsub) { _authUnsub(); _authUnsub = null; } },
  { once: true }
);

document.addEventListener("DOMContentLoaded", init);
