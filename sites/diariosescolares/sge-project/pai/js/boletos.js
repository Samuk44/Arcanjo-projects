"use strict";

import {
  db,
  initPage,
  loadFilhoSelect,
  showToast,
  fmtDate,
  fmtMoeda,
  setAlunoAtivo,
} from "./app-shared.js";
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _unsubBoletos = null;
let _allBoletos = [];
let _filterStatus = "all";

function skeleton() {
  const t = document.getElementById("boletos-table");
  if (t) t.innerHTML = '<tr><td colspan="5" class="px-4 py-5 text-sm text-muted">Carregando boletos...</td></tr>';
  ["total-pendente", "proximo-vencimento", "total-pago"].forEach((id) => {
    const el = document.getElementById(id); if (el) el.textContent = "Carregando...";
  });
}

function statusInfo(s) {
  if (s === "pago") return { label: "Pago", cls: "badge-pago" };
  if (s === "vencido") return { label: "Vencido", cls: "badge-vencido" };
  return { label: "Pendente", cls: "badge-pendente" };
}

function isVencido(b) {
  if (b.status === "pago") return false;
  if (!b.vencimento) return false;
  return new Date(b.vencimento + "T23:59:59") < new Date();
}

function renderSummary(boletos) {
  const allPend = boletos.filter((b) => ["pendente", "pending"].includes(b.status) || isVencido(b));
  allPend.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
  const totalPend = allPend.reduce((s, b) => s + Number(b.valor || 0), 0);
  const totalPago = boletos.filter((b) => b.status === "pago").reduce((s, b) => s + Number(b.valor || 0), 0);

  const tp = document.getElementById("total-pendente");
  const pv = document.getElementById("proximo-vencimento");
  const tpg = document.getElementById("total-pago");
  if (tp) tp.textContent = allPend.length ? fmtMoeda(totalPend) : "R$ 0,00";
  if (pv) pv.textContent = allPend[0]?.vencimento ? fmtDate(allPend[0].vencimento) : "—";
  if (tpg) tpg.textContent = fmtMoeda(totalPago);
}

function renderTable(boletos) {
  const tbody = document.getElementById("boletos-table");
  if (!tbody) return;

  const filtered = boletos.filter((b) => {
    if (_filterStatus === "all") return true;
    if (_filterStatus === "vencido") return isVencido(b);
    return b.status === _filterStatus;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Nenhum boleto${_filterStatus !== "all" ? " neste filtro" : ""} encontrado.</td></tr>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.vencimento) - new Date(a.vencimento));
  tbody.innerHTML = "";

  filtered.forEach((boleto) => {
    const status = isVencido(boleto) ? "vencido" : (boleto.status ?? "pendente");
    const s = statusInfo(status);
    const acao = boleto.linkPagamento
      ? `<a href="${boleto.linkPagamento}" target="_blank" rel="noopener" class="text-xs text-primary hover:underline">Pagar</a>`
      : boleto.codigoBarras
      ? `<button onclick="navigator.clipboard?.writeText?.('${boleto.codigoBarras}');this.textContent='Copiado!';setTimeout(()=>this.textContent='Cód.',2000)" class="text-xs text-primary hover:underline">Cód.</button>`
      : '<span class="text-xs text-muted">—</span>';

    const tr = document.createElement("tr");
    tr.className = "bg-surface hover:bg-blue-600/10 transition-fast";
    tr.innerHTML = `
      <td class="px-4 py-4 text-sm text-text font-medium">${boleto.descricao ?? boleto.referencia ?? "Mensalidade"}</td>
      <td class="px-4 py-4 text-sm text-muted">${fmtDate(boleto.vencimento)}</td>
      <td class="px-4 py-4 text-sm text-text">${fmtMoeda(boleto.valor)}</td>
      <td class="px-4 py-4"><span class="px-2.5 py-1 rounded-lg text-xs font-bold ${s.cls}">${s.label}</span></td>
      <td class="px-4 py-4">${acao}</td>`;
    tbody.appendChild(tr);
  });
}

function subscribe(alunoId) {
  if (_unsubBoletos) _unsubBoletos();
  const q = query(ref(db, "boletos"), orderByChild("alunoId"), equalTo(alunoId));
  _unsubBoletos = onValue(q, (snap) => {
    _allBoletos = [];
    if (snap.exists()) snap.forEach((c) => _allBoletos.push({ id: c.key, ...c.val() }));
    renderSummary(_allBoletos);
    renderTable(_allBoletos);
  }, () => {
    const t = document.getElementById("boletos-table");
    if (t) t.innerHTML = '<tr><td colspan="5" class="px-4 py-5 text-sm text-muted">Sem dados financeiros disponíveis.</td></tr>';
    ["total-pendente","proximo-vencimento","total-pago"].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = "—"; });
  });
}

async function init() {
  skeleton();
  const ctx = await initPage();
  if (!ctx) return;

  const { alunoAtivo } = await loadFilhoSelect(ctx.uid, ctx.userData);
  if (!alunoAtivo) {
    const t = document.getElementById("boletos-table");
    if (t) t.innerHTML = '<tr><td colspan="5" class="px-4 py-5 text-sm text-muted">Nenhum aluno vinculado.</td></tr>';
    return;
  }

  subscribe(alunoAtivo);

  document.getElementById("filter-status")?.addEventListener("change", (e) => {
    _filterStatus = e.target.value;
    renderTable(_allBoletos);
  });
}

window.addEventListener("beforeunload", () => { if (_unsubBoletos) _unsubBoletos(); }, { once: true });

init();
