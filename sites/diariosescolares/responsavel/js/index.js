"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const state = { uid: null, responsavel: null, filhos: [], filhoSelecionado: null };
let _authUnsub = null;

const $ = (id) => document.getElementById(id);

function redirect() {
  location.replace("../auth/login.html");
}

function toast(msg, type = "info") {
  const c = $("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast px-5 py-3 rounded-2xl text-sm font-medium pointer-events-auto shadow-lg text-white ${
    type === "error" ? "bg-red-500" : type === "success" ? "bg-emerald-500" : "bg-blue-500"
  }`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function setGreeting(data) {
  const el = $("topbar-greeting");
  if (el) el.textContent = `Olá, ${data.nome?.split(" ")[0] ?? "Responsável"}`;
  const av = $("topbar-avatar");
  if (av) av.textContent = (data.nome?.charAt(0) ?? "R").toUpperCase();
}

function setupLogout() {
  const btn = $("btn-logout");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try { await signOut(auth); } finally { redirect(); }
  }, { once: true });
}

function authGuard() {
  return new Promise((resolve) => {
    _authUnsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { redirect(); resolve(null); return; }
      try {
        const snap = await get(ref(db, `usuarios/${user.uid}`));
        if (!snap.exists()) { redirect(); resolve(null); return; }
        const data = snap.val();
        if (data.role !== "responsavel" || data.status !== "ativo") {
          await signOut(auth);
          redirect();
          resolve(null);
          return;
        }
        resolve({ uid: user.uid, ...data });
      } catch {
        redirect();
        resolve(null);
      }
    });
  });
}

async function populateFilhoSelect() {
  const sel = $("select-filho");
  if (!sel) return;

  if (!state.filhos.length) {
    $("empty-state")?.classList.remove("hidden");
    $("kpis-container")?.replaceChildren();
    $("acoes-container")?.replaceChildren();
    $("feed-container")?.replaceChildren();
    return;
  }

  sel.innerHTML = "";
  for (const id of state.filhos) {
    try {
      const snap = await get(ref(db, `alunos/${id}`));
      if (!snap.exists()) continue;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = snap.val().nome ?? id;
      sel.appendChild(opt);
    } catch { /* skip */ }
  }

  if (!sel.options.length) {
    $("empty-state")?.classList.remove("hidden");
    return;
  }

  state.filhoSelecionado = sel.options[0].value;
  await loadFilhoData();

  sel.addEventListener("change", async (e) => {
    state.filhoSelecionado = e.target.value;
    if (state.filhoSelecionado) await loadFilhoData();
  });
}

async function loadFilhoData() {
  if (!state.filhoSelecionado) return;
  try {
    const snap = await get(ref(db, `alunos/${state.filhoSelecionado}`));
    if (!snap.exists()) { toast("Aluno não encontrado", "error"); return; }
    const aluno = snap.val();
    renderKPIs(aluno);
    renderAcoes();
    renderFeed(aluno);
  } catch {
    toast("Erro ao carregar dados do aluno", "error");
  }
}

function renderKPIs(aluno) {
  const c = $("kpis-container");
  if (!c) return;
  const freq = aluno.frequencia ?? 0;
  const media = aluno.mediaGeral ?? 0;
  const comuns = aluno.comunicadosNaoLidos ?? 0;
  const kpis = [
    { label: "Frequência", valor: `${freq}%`, badge: freq >= 80 ? "badge-success" : freq >= 70 ? "badge-warning" : "badge-error", icon: "📊" },
    { label: "Média Geral", valor: Number(media).toFixed(1), badge: media >= 7 ? "badge-success" : media >= 5 ? "badge-warning" : "badge-error", icon: "📈" },
    { label: "Turma", valor: aluno.turma ?? "—", badge: "badge-info", icon: "👥" },
    { label: "Comunicados", valor: String(comuns), badge: comuns > 0 ? "badge-warning" : "badge-info", icon: "💌" },
  ];
  c.innerHTML = kpis.map((k) => `
    <div class="bg-card rounded-2xl border border-border p-5 hover:border-blue-500 transition-colors" style="border-color:rgba(51,65,85,1)">
      <div class="flex items-start justify-between mb-3">
        <span class="text-2xl">${k.icon}</span>
        <span class="px-2 py-1 rounded-lg text-xs font-bold ${k.badge}">${k.label}</span>
      </div>
      <p class="text-3xl font-bold text-text">${k.valor}</p>
    </div>`).join("");
}

function renderAcoes() {
  const c = $("acoes-container");
  if (!c) return;
  const acoes = [
    { label: "Ver Boletim", icon: "📋", href: "boletim.html" },
    { label: "Horário", icon: "🕒", href: "horario.html" },
    { label: "Comunicados", icon: "💬", href: "comunicados.html" },
    { label: "Financeiro", icon: "🧾", href: "financeiro.html" },
  ];
  c.innerHTML = acoes.map((a) => `
    <a href="${a.href}" class="bg-card rounded-2xl border border-border p-5 transition-colors text-center block" style="border-color:rgba(51,65,85,1)">
      <div class="text-3xl mb-2">${a.icon}</div>
      <p class="text-sm font-medium text-text">${a.label}</p>
    </a>`).join("");
}

function renderFeed(aluno) {
  const c = $("feed-container");
  if (!c) return;
  const items = [];

  (aluno.ultimasNotas ?? []).slice(0, 2).forEach((n) =>
    items.push({ icon: "📝", titulo: `Nova nota em ${n.materia ?? ""}`, desc: `Nota: ${n.valor ?? "—"}`, badge: "badge-info", tipo: "Nota" }),
  );
  (aluno.faltasRecentes ?? []).slice(0, 1).forEach((f) =>
    items.push({ icon: "❌", titulo: `Falta em ${f.materia ?? ""}`, desc: `Data: ${f.data ?? "—"}`, badge: "badge-warning", tipo: "Falta" }),
  );
  if ((aluno.comunicadosNaoLidos ?? 0) > 0)
    items.push({ icon: "📢", titulo: "Novos comunicados", desc: `${aluno.comunicadosNaoLidos} não lidos`, badge: "badge-warning", tipo: "Comunicado" });
  (aluno.proximasAvaliacoes ?? []).slice(0, 1).forEach((a) =>
    items.push({ icon: "📅", titulo: `Próxima avaliação: ${a.materia ?? ""}`, desc: `Data: ${a.data ?? "—"}`, badge: "badge-info", tipo: "Avaliação" }),
  );

  if (!items.length) {
    c.innerHTML = '<div class="p-8 text-center text-sm text-muted">Nenhuma atualização recente</div>';
    return;
  }

  c.innerHTML = items.map((i) => `
    <div class="flex items-start gap-4 p-4 border-b border-border last:border-0" style="border-color:rgba(51,65,85,.5)">
      <div class="text-2xl">${i.icon}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-text">${i.titulo}</p>
        <p class="text-xs text-muted mt-1">${i.desc}</p>
      </div>
      <span class="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${i.badge}">${i.tipo}</span>
    </div>`).join("");
}

async function init() {
  const responsavel = await authGuard();
  if (!responsavel) return;

  state.uid = responsavel.uid;
  state.responsavel = responsavel;
  state.filhos = Array.isArray(responsavel.filhos) ? responsavel.filhos : [];

  setGreeting(responsavel);
  setupLogout();
  await populateFilhoSelect();
}

window.addEventListener("beforeunload", () => { if (_authUnsub) _authUnsub(); });
document.addEventListener("DOMContentLoaded", init);
