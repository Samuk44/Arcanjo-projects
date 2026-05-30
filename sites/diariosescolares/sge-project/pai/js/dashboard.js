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
  get,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import notifUI from "../../assets/js/firebase/notificacoes-ui.js";

let _uid = null;
let _unsubNotif = null;

// ── Skeletons ─────────────────────────────────────────────────────────────────

function showSkeletons() {
  const k = document.getElementById("kpi-container");
  if (k) k.innerHTML = Array(4).fill('<div class="skeleton h-28 rounded-2xl"></div>').join("");
  const r = document.getElementById("recent-list");
  if (r) r.innerHTML = '<tr><td colspan="4" class="px-4 py-5 text-sm text-muted">Carregando...</td></tr>';
}

// ── Data loaders ──────────────────────────────────────────────────────────────

function getBimestre() {
  const m = new Date().getMonth() + 1;
  return m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4;
}

async function loadNotas(alunoId) {
  try {
    const q = query(ref(db, "notas"), orderByChild("alunoId"), equalTo(alunoId));
    const snap = await get(q);
    if (!snap.exists()) return { media: null, bimestre: getBimestre(), status: "sem dados" };
    const b = getBimestre();
    const vals = [];
    snap.forEach((c) => {
      const v = c.val();
      if (!v.bimestre || Number(v.bimestre) === b)
        vals.push(Number(v.valor ?? v.nota ?? 0));
    });
    if (!vals.length) return { media: null, bimestre: b, status: "sem dados" };
    const media = vals.reduce((a, x) => a + x, 0) / vals.length;
    return { media: media.toFixed(1), bimestre: b, status: media >= 6 ? "aprovado" : "recuperação" };
  } catch { return { media: null, bimestre: getBimestre(), status: "erro" }; }
}

async function loadFrequencia(alunoId) {
  try {
    const q = query(ref(db, "frequencia"), orderByChild("alunoId"), equalTo(alunoId));
    const snap = await get(q);
    if (!snap.exists()) return { total: 0, faltas: 0, pct: 0 };
    let total = 0, faltas = 0;
    snap.forEach((c) => { total++; if (!c.val().presente) faltas++; });
    return { total, faltas, pct: total > 0 ? +((faltas / total) * 100).toFixed(1) : 0 };
  } catch { return { total: 0, faltas: 0, pct: 0 }; }
}

async function loadBoletos(alunoId) {
  try {
    const q = query(ref(db, "boletos"), orderByChild("alunoId"), equalTo(alunoId));
    const snap = await get(q);
    if (!snap.exists()) return { count: 0, valor: 0, venc: null };
    const pend = [];
    snap.forEach((c) => {
      const v = c.val();
      if (["pendente", "pending", "vencido"].includes(v.status)) pend.push(v);
    });
    pend.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    return {
      count: pend.length,
      valor: pend.reduce((s, b) => s + Number(b.valor || 0), 0),
      venc: pend[0]?.vencimento ?? null,
    };
  } catch { return { count: 0, valor: 0, venc: null }; }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderKPIs(notas, freq, boletos, naoLidas) {
  const kpi = document.getElementById("kpi-container");
  if (!kpi) return;
  kpi.innerHTML = "";

  const cards = [
    {
      id: "card-notas",
      icon: "📈",
      label: "Notas",
      sub: `${notas.bimestre}º Bimestre`,
      valor: notas.media ?? "—",
      badgeCls: notas.status === "aprovado" ? "badge-success" : notas.status === "recuperação" ? "badge-warning" : "badge-info",
      badgeText: notas.status,
      alert: notas.media !== null && Number(notas.media) < 6,
      alertText: "text-yellow-400",
    },
    {
      id: "card-frequencia",
      icon: "📅",
      label: "Faltas",
      sub: `${freq.faltas} / ${freq.total} aulas`,
      valor: `${freq.pct}%`,
      badgeCls: freq.pct > 25 ? "badge-error" : "badge-success",
      badgeText: freq.pct > 25 ? "⚠ alerta" : "regular",
      alert: freq.pct > 25,
      alertText: "text-red-400",
    },
    {
      id: "card-comunicados",
      icon: "💬",
      label: "Comunicados",
      sub: "não lidos",
      valor: String(naoLidas),
      badgeCls: naoLidas > 0 ? "badge-warning" : "badge-info",
      badgeText: naoLidas > 0 ? "novos" : "em dia",
      alert: false,
      alertText: "text-text",
    },
    {
      id: "card-boletos",
      icon: "🧾",
      label: "Boletos",
      sub: boletos.venc ? `vence ${fmtDate(boletos.venc)}` : "sem pendências",
      valor: boletos.count > 0 ? fmtMoeda(boletos.valor) : "—",
      badgeCls: boletos.count > 0 ? "badge-warning" : "badge-success",
      badgeText: boletos.count > 0 ? `${boletos.count} pend.` : "em dia",
      alert: false,
      alertText: "text-text",
    },
  ];

  for (const c of cards) {
    const div = document.createElement("div");
    div.id = c.id;
    div.className = `bg-surface rounded-2xl border ${c.alert ? "border-yellow-500/50" : "border-border"} shadow-card p-5 hover:shadow-lg transition-all`;
    div.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <span class="text-2xl">${c.icon}</span>
        <span class="px-2 py-1 rounded-lg text-xs font-bold ${c.badgeCls}">${c.badgeText}</span>
      </div>
      <p class="text-3xl font-bold ${c.alert ? c.alertText : "text-text"}">${c.valor}</p>
      <p class="text-xs text-muted mt-1.5">${c.label} · ${c.sub}</p>`;
    kpi.appendChild(div);
  }
}

function renderQuickActions() {
  const qa = document.getElementById("quick-actions");
  if (!qa) return;
  qa.className = "grid grid-cols-2 md:grid-cols-4 gap-4";
  qa.innerHTML = "";
  [
    { label: "Boletim", icon: "📋", href: "boletim.html" },
    { label: "Horário", icon: "🕒", href: "horario.html" },
    { label: "Comunicados", icon: "💬", href: "comunicados.html" },
    { label: "2ª Via Boleto", icon: "🧾", href: "financeiro.html" },
  ].forEach((a) => {
    const el = document.createElement("a");
    el.href = a.href;
    el.className = "bg-surface rounded-2xl border border-border shadow-card p-5 hover:shadow-lg hover:border-blue-300/30 transition-all text-center flex flex-col items-center gap-2";
    el.innerHTML = `<span class="text-3xl">${a.icon}</span><p class="text-sm font-medium text-text">${a.label}</p>`;
    qa.appendChild(el);
  });
}

async function renderFeed(alunoId) {
  const tbody = document.getElementById("recent-list");
  if (!tbody) return;
  const items = [];

  try {
    const [sN, sF] = await Promise.all([
      get(query(ref(db, "notas"), orderByChild("alunoId"), equalTo(alunoId))),
      get(query(ref(db, "frequencia"), orderByChild("alunoId"), equalTo(alunoId))),
    ]);

    if (sN.exists()) {
      const arr = [];
      sN.forEach((c) => arr.push(c.val()));
      arr.sort((a, b) => (b.criadoEm ?? 0) - (a.criadoEm ?? 0));
      arr.slice(0, 3).forEach((n) => {
        const v = Number(n.valor ?? n.nota ?? 0);
        items.push({ titulo: `Nota em ${n.materia ?? "disciplina"}`, tipo: "Nota", data: fmtDate(n.data ?? n.criadoEm), status: v >= 6 ? "Aprovado" : "Atenção", badge: v >= 6 ? "badge-success" : "badge-warning" });
      });
    }

    if (sF.exists()) {
      const faltas = [];
      sF.forEach((c) => { const v = c.val(); if (!v.presente) faltas.push(v); });
      faltas.sort((a, b) => String(b.data ?? "") > String(a.data ?? "") ? 1 : -1);
      faltas.slice(0, 2).forEach((f) =>
        items.push({ titulo: `Falta${f.materia ? ` em ${f.materia}` : ""}`, tipo: "Frequência", data: fmtDate(f.data), status: "Falta", badge: "badge-error" })
      );
    }
  } catch { /* render what we have */ }

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-5 text-sm text-muted">Nenhuma atualização recente.</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  items.forEach((i) => {
    const tr = document.createElement("tr");
    tr.className = "bg-surface hover:bg-blue-600/10 transition-fast";
    tr.innerHTML = `<td class="px-4 py-4 text-sm text-text font-medium">${i.titulo}</td><td class="px-4 py-4 text-sm text-muted">${i.tipo}</td><td class="px-4 py-4 text-sm text-muted">${i.data}</td><td class="px-4 py-4"><span class="px-2.5 py-1 rounded-lg text-xs font-bold ${i.badge}">${i.status}</span></td>`;
    tbody.appendChild(tr);
  });
}

// ── Notifications live patch ──────────────────────────────────────────────────

function setupLocalNotifBadge(uid) {
  if (_unsubNotif) _unsubNotif();
  _unsubNotif = onValue(ref(db, `entregas/${uid}`), (snap) => {
    const lista = [];
    let naoLidas = 0;
    if (snap.exists()) {
      snap.forEach((c) => { const v = { id: c.key, ...c.val() }; lista.push(v); if (!v.lido) naoLidas++; });
      lista.sort((a, b) => (b.criadoEm ?? 0) - (a.criadoEm ?? 0));
    }
    notifUI.updateBadge(naoLidas);
    notifUI.renderDropdown(lista.slice(0, 5));
    const card = document.getElementById("card-comunicados");
    if (card) {
      const vEl = card.querySelector("p.text-3xl");
      const bEl = card.querySelector("span.text-xs.font-bold");
      if (vEl) vEl.textContent = String(naoLidas);
      if (bEl) { bEl.className = `px-2 py-1 rounded-lg text-xs font-bold ${naoLidas > 0 ? "badge-warning" : "badge-info"}`; bEl.textContent = naoLidas > 0 ? "novos" : "em dia"; }
    }
  });
}

// ── Main load ─────────────────────────────────────────────────────────────────

async function loadAll(alunoId, uid) {
  showSkeletons();
  const [notas, freq, boletos] = await Promise.all([
    loadNotas(alunoId),
    loadFrequencia(alunoId),
    loadBoletos(alunoId),
  ]);
  renderKPIs(notas, freq, boletos, 0);
  setupLocalNotifBadge(uid);
  await renderFeed(alunoId);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const ctx = await initPage();
  if (!ctx) return;

  _uid = ctx.uid;
  renderQuickActions();

  const { alunoAtivo } = await loadFilhoSelect(ctx.uid, ctx.userData);
  if (!alunoAtivo) {
    document.getElementById("empty-state")?.classList.remove("hidden");
    document.getElementById("kpi-container").innerHTML = "";
    document.getElementById("quick-actions").innerHTML = "";
    document.getElementById("recent-list").innerHTML = "";
    return;
  }

  await loadAll(alunoAtivo, ctx.uid);

  document.getElementById("selectFilho")?.addEventListener("change", async (e) => {
    setAlunoAtivo(e.target.value);
    await loadAll(e.target.value, ctx.uid);
  });
}

window.addEventListener("beforeunload", () => { if (_unsubNotif) _unsubNotif(); }, { once: true });

init();
