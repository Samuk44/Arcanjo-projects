"use strict";

import {
  db,
  initPage,
  loadFilhoSelect,
  showToast,
  fmtDate,
  setAlunoAtivo,
  markEntregaRead,
} from "./app-shared.js";
import {
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _uid = null;
let _unsubEntregas = null;
let _allItems = [];
let _filterStatus = "all";
let _filterAlunoId = null;

function skeleton() {
  const el = document.getElementById("comunicados-list");
  if (el) el.innerHTML = Array(3).fill('<div class="skeleton h-24 rounded-2xl"></div>').join("");
}

function renderList(items) {
  const container = document.getElementById("comunicados-list");
  if (!container) return;

  const filtered = items.filter((it) => {
    if (_filterStatus === "unread" && it.lido) return false;
    if (_filterStatus === "read" && !it.lido) return false;
    if (_filterAlunoId && it.alunoId && it.alunoId !== _filterAlunoId) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="text-center py-10"><p class="text-5xl mb-3">📭</p><p class="text-sm text-muted">${items.length ? "Nenhum comunicado neste filtro." : "Nenhum comunicado recebido."}</p></div>`;
    return;
  }

  container.innerHTML = "";
  filtered.sort((a, b) => (b.criadoEm ?? 0) - (a.criadoEm ?? 0));

  filtered.forEach((item) => {
    const unread = !item.lido;
    const div = document.createElement("div");
    div.className = `comunicado-card rounded-2xl border border-border p-5 transition-fast cursor-pointer ${unread ? "unread" : "read bg-surface"}`;
    div.dataset.id = item.id;

    div.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            ${unread ? '<span class="inline-block w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"></span>' : ""}
            <p class="text-sm font-semibold text-text truncate">${item.titulo ?? item.mensagem ?? "Comunicado"}</p>
          </div>
          ${item.mensagem && item.mensagem !== item.titulo ? `<p class="text-xs text-muted line-clamp-2 mt-1">${item.mensagem}</p>` : ""}
          <p class="text-xs text-muted mt-2">${fmtDate(item.criadoEm)}${item.remetente ? ` · ${item.remetente}` : ""}</p>
        </div>
        <div class="flex flex-col items-end gap-2 flex-shrink-0">
          ${unread ? `<button data-mark="${item.id}" class="text-xs text-blue-400 hover:text-blue-300 transition-fast whitespace-nowrap">Marcar lido</button>` : '<span class="text-xs text-muted">Lido</span>'}
          ${item.linkAcao ? `<a href="${item.linkAcao}" class="text-xs text-primary hover:underline">Ver detalhes</a>` : ""}
        </div>
      </div>`;

    const markBtn = div.querySelector("[data-mark]");
    if (markBtn) {
      markBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await markEntregaRead(_uid, item.id);
      });
    }

    container.appendChild(div);
  });
}

function setupFilters(uid) {
  document.getElementById("filter-status")?.addEventListener("change", (e) => {
    _filterStatus = e.target.value;
    renderList(_allItems);
  });

  document.getElementById("selectFilho")?.addEventListener("change", (e) => {
    _filterAlunoId = e.target.value || null;
    setAlunoAtivo(e.target.value);
    renderList(_allItems);
  });
}

function subscribeEntregas(uid) {
  if (_unsubEntregas) _unsubEntregas();
  _unsubEntregas = onValue(ref(db, `entregas/${uid}`), (snap) => {
    _allItems = [];
    if (snap.exists()) {
      snap.forEach((c) => _allItems.push({ id: c.key, ...c.val() }));
    }
    renderList(_allItems);
  });
}

async function init() {
  skeleton();
  const ctx = await initPage();
  if (!ctx) return;

  _uid = ctx.uid;

  const { alunoAtivo } = await loadFilhoSelect(ctx.uid, ctx.userData);
  _filterAlunoId = alunoAtivo;

  setupFilters(ctx.uid);
  subscribeEntregas(ctx.uid);
}

window.addEventListener("beforeunload", () => { if (_unsubEntregas) _unsubEntregas(); }, { once: true });

init();
