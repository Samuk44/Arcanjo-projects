"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const state = { uid: null, filhos: [], filhoSelecionado: null };
let _authUnsub = null;

function redirect() {
  location.replace("../auth/login.html");
}

function toast(msg, type = "info") {
  const c = document.getElementById("toast-container");
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
  const el = document.getElementById("topbar-greeting");
  if (el) el.textContent = `Olá, ${data.nome?.split(" ")[0] ?? "Responsável"}`;
  const av = document.getElementById("topbar-avatar");
  if (av) av.textContent = (data.nome?.charAt(0) ?? "R").toUpperCase();
}

function setupLogout() {
  const btn = document.getElementById("btn-logout");
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

async function populateFilhoSelect(filhos) {
  const sel = document.getElementById("select-filho");
  if (!sel) return;
  sel.innerHTML = "";
  for (const id of filhos) {
    try {
      const snap = await get(ref(db, `alunos/${id}`));
      if (!snap.exists()) continue;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = snap.val().nome ?? id;
      sel.appendChild(opt);
    } catch { /* skip */ }
  }
  if (sel.options.length) {
    state.filhoSelecionado = sel.options[0].value;
    await loadBoletim(state.filhoSelecionado);
    sel.addEventListener("change", async (e) => {
      state.filhoSelecionado = e.target.value;
      if (state.filhoSelecionado) await loadBoletim(state.filhoSelecionado);
    });
  } else {
    document.getElementById("empty-state")?.classList.remove("hidden");
  }
}

async function loadBoletim(alunoId) {
  const tbody = document.getElementById("boletim-tbody");
  const empty = document.getElementById("empty-state");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-muted">Carregando...</td></tr>`;

  try {
    const q = query(ref(db, "notas"), orderByChild("alunoId"), equalTo(alunoId));
    const snap = await get(q);

    if (!snap.exists()) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-muted">Nenhuma nota registrada</td></tr>`;
      empty?.classList.remove("hidden");
      return;
    }

    const notas = [];
    snap.forEach((child) => notas.push({ id: child.key, ...child.val() }));
    empty?.classList.add("hidden");

    tbody.innerHTML = notas.map((n) => {
      const media = n.media ?? ((Number(n.n1 ?? 0) + Number(n.n2 ?? 0) + Number(n.n3 ?? 0) + Number(n.n4 ?? 0)) / 4);
      const situacao = media >= 7 ? "Aprovado" : media >= 5 ? "Recuperação" : "Reprovado";
      const badgeCls = media >= 7 ? "badge-success" : media >= 5 ? "badge-warning" : "badge-error";
      return `<tr style="border-bottom:1px solid rgba(51,65,85,.5)">
        <td class="px-4 py-3 text-sm font-medium text-text">${n.disciplina ?? n.materia ?? "—"}</td>
        <td class="px-4 py-3 text-sm text-center text-muted">${n.n1 ?? "—"}</td>
        <td class="px-4 py-3 text-sm text-center text-muted">${n.n2 ?? "—"}</td>
        <td class="px-4 py-3 text-sm text-center text-muted">${n.n3 ?? "—"}</td>
        <td class="px-4 py-3 text-sm text-center font-semibold text-text">${media.toFixed(1)}</td>
        <td class="px-4 py-3 text-sm text-center"><span class="px-2 py-1 rounded-lg text-xs font-bold ${badgeCls}">${situacao}</span></td>
      </tr>`;
    }).join("");
  } catch {
    toast("Erro ao carregar boletim", "error");
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-danger">Erro ao carregar dados</td></tr>`;
  }
}

async function init() {
  const responsavel = await authGuard();
  if (!responsavel) return;

  state.uid = responsavel.uid;
  state.filhos = Array.isArray(responsavel.filhos) ? responsavel.filhos : [];

  setGreeting(responsavel);
  setupLogout();
  await populateFilhoSelect(state.filhos);
}

window.addEventListener("beforeunload", () => { if (_authUnsub) _authUnsub(); });
document.addEventListener("DOMContentLoaded", init);
