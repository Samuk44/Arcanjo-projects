"use strict";

import {
  db,
  initPage,
  loadFilhoSelect,
  showToast,
  setAlunoAtivo,
} from "./app-shared.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

function getBimestre() {
  const m = new Date().getMonth() + 1;
  return m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
}

function calcStatus(media) {
  if (media === null) return { label: "Sem dados", cls: "badge-info" };
  if (media >= 7) return { label: "Aprovado", cls: "badge-aprovado" };
  if (media >= 5) return { label: "Recuperação", cls: "badge-recuperacao" };
  return { label: "Reprovado", cls: "badge-reprovado" };
}

function fmtNota(v) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(1);
}

function skeleton() {
  const t = document.getElementById("grades-table");
  if (t) t.innerHTML = '<tr><td colspan="6" class="px-4 py-5 text-sm text-muted">Carregando notas...</td></tr>';
  const k = document.getElementById("summary-kpis");
  if (k) k.innerHTML = Array(4).fill('<div class="skeleton h-20 rounded-2xl"></div>').join("");
}

async function loadBoletim(alunoId) {
  skeleton();
  const lbl = document.getElementById("periodo-label");
  const b = getBimestre();
  if (lbl) lbl.textContent = `${new Date().getFullYear()} — ${b}º Bimestre`;

  try {
    const q = query(ref(db, "notas"), orderByChild("alunoId"), equalTo(alunoId));
    const snap = await get(q);

    if (!snap.exists()) {
      renderEmpty();
      return;
    }

    const byDisciplina = {};
    snap.forEach((c) => {
      const v = c.val();
      const disc = v.materia ?? v.disciplina ?? "Sem disciplina";
      if (!byDisciplina[disc]) byDisciplina[disc] = {};
      const bim = String(v.bimestre ?? "1");
      if (!byDisciplina[disc][bim]) byDisciplina[disc][bim] = [];
      byDisciplina[disc][bim].push(Number(v.valor ?? v.nota ?? 0));
    });

    const rows = Object.entries(byDisciplina).map(([disc, bims]) => {
      const avg = (arr) => arr?.length ? arr.reduce((a, x) => a + x, 0) / arr.length : null;
      const n1 = avg(bims["1"]);
      const n2 = avg(bims["2"]);
      const n3 = avg(bims["3"]);
      const vals = [n1, n2, n3].filter((v) => v !== null);
      const media = vals.length ? vals.reduce((a, x) => a + x, 0) / vals.length : null;
      return { disc, n1, n2, n3, media };
    });

    renderTable(rows);
    renderKPIs(rows);
  } catch (e) {
    const t = document.getElementById("grades-table");
    if (t) t.innerHTML = '<tr><td colspan="6" class="px-4 py-5 text-sm text-muted">Erro ao carregar notas.</td></tr>';
  }
}

function renderEmpty() {
  const t = document.getElementById("grades-table");
  if (t) t.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-muted">Nenhuma nota registrada.</td></tr>';
  const k = document.getElementById("summary-kpis");
  if (k) k.innerHTML = '<div class="col-span-4 text-sm text-muted text-center py-4">Sem dados disponíveis</div>';
}

function renderTable(rows) {
  const tbody = document.getElementById("grades-table");
  if (!tbody) return;
  if (!rows.length) { renderEmpty(); return; }
  tbody.innerHTML = "";
  rows.forEach(({ disc, n1, n2, n3, media }) => {
    const s = calcStatus(media);
    const tr = document.createElement("tr");
    tr.className = "bg-surface hover:bg-blue-600/10 transition-fast";
    tr.innerHTML = `
      <td class="px-4 py-4 text-sm font-medium text-text">${disc}</td>
      <td class="px-4 py-4 text-sm text-muted">${fmtNota(n1)}</td>
      <td class="px-4 py-4 text-sm text-muted">${fmtNota(n2)}</td>
      <td class="px-4 py-4 text-sm text-muted">${fmtNota(n3)}</td>
      <td class="px-4 py-4 text-sm font-semibold ${media !== null && media < 7 ? "text-yellow-400" : "text-text"}">${fmtNota(media)}</td>
      <td class="px-4 py-4"><span class="px-2.5 py-1 rounded-lg text-xs font-bold ${s.cls}">${s.label}</span></td>`;
    tbody.appendChild(tr);
  });
}

function renderKPIs(rows) {
  const container = document.getElementById("summary-kpis");
  if (!container) return;

  const medias = rows.map((r) => r.media).filter((v) => v !== null);
  const mediaGeral = medias.length ? medias.reduce((a, x) => a + x, 0) / medias.length : null;
  const aprovadas = rows.filter((r) => r.media !== null && r.media >= 7).length;
  const recuperacao = rows.filter((r) => r.media !== null && r.media >= 5 && r.media < 7).length;
  const reprovadas = rows.filter((r) => r.media !== null && r.media < 5).length;

  const kpis = [
    { label: "Média Geral", valor: mediaGeral !== null ? mediaGeral.toFixed(1) : "—", cls: mediaGeral !== null && mediaGeral < 6 ? "text-yellow-400" : "text-text" },
    { label: "Aprovado", valor: String(aprovadas), cls: "text-green-400" },
    { label: "Recuperação", valor: String(recuperacao), cls: "text-yellow-400" },
    { label: "Atenção", valor: String(reprovadas), cls: "text-red-400" },
  ];

  container.innerHTML = "";
  kpis.forEach(({ label, valor, cls }) => {
    const div = document.createElement("div");
    div.className = "bg-[#0f172a] rounded-2xl border border-border p-4 text-center";
    div.innerHTML = `<p class="text-xs text-muted uppercase tracking-wider mb-1">${label}</p><p class="text-2xl font-bold ${cls}">${valor}</p>`;
    container.appendChild(div);
  });
}

async function init() {
  const ctx = await initPage();
  if (!ctx) return;

  const { alunoAtivo } = await loadFilhoSelect(ctx.uid, ctx.userData);
  if (!alunoAtivo) { renderEmpty(); return; }

  await loadBoletim(alunoAtivo);

  document.getElementById("selectFilho")?.addEventListener("change", async (e) => {
    setAlunoAtivo(e.target.value);
    await loadBoletim(e.target.value);
  });
}

init();
