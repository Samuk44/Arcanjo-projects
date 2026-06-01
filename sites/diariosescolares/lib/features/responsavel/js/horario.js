"use strict";

import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
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
      const aluno = snap.val();
      const opt = document.createElement("option");
      opt.value = id;
      opt.dataset.turma = aluno.turma ?? "";
      opt.textContent = aluno.nome ?? id;
      sel.appendChild(opt);
    } catch { /* skip */ }
  }
  if (sel.options.length) {
    state.filhoSelecionado = sel.options[0].value;
    await loadHorario(sel.options[0].dataset.turma ?? "");
    sel.addEventListener("change", async (e) => {
      const opt = e.target.options[e.target.selectedIndex];
      state.filhoSelecionado = e.target.value;
      await loadHorario(opt.dataset.turma ?? "");
    });
  } else {
    document.getElementById("empty-state")?.classList.remove("hidden");
  }
}

async function loadHorario(turmaId) {
  const container = document.getElementById("horario-container");
  const empty = document.getElementById("empty-state");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-sm text-muted">Carregando...</div>`;

  if (!turmaId) {
    container.innerHTML = `<div class="p-8 text-center text-sm text-muted">Turma não definida para este aluno</div>`;
    return;
  }

  try {
    const q = query(ref(db, "horarios"), orderByChild("turmaId"), equalTo(turmaId));
    const snap = await get(q);

    if (!snap.exists()) {
      container.innerHTML = `<div class="p-8 text-center text-sm text-muted">Nenhum horário registrado para esta turma</div>`;
      empty?.classList.remove("hidden");
      return;
    }

    const horarios = [];
    snap.forEach((child) => horarios.push(child.val()));
    empty?.classList.add("hidden");

    const byDia = {};
    DIAS.forEach((d) => { byDia[d] = []; });
    horarios.forEach((h) => {
      const dia = h.dia ?? "";
      if (byDia[dia]) byDia[dia].push(h);
    });

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="min-w-full text-left border-collapse">
          <thead>
            <tr style="border-bottom:1px solid rgba(51,65,85,1)">
              <th class="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Horário</th>
              ${DIAS.map((d) => `<th class="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">${d}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${buildRows(byDia)}
          </tbody>
        </table>
      </div>`;
  } catch {
    toast("Erro ao carregar horário", "error");
    container.innerHTML = `<div class="p-8 text-center text-sm text-danger">Erro ao carregar horário</div>`;
  }
}

function buildRows(byDia) {
  const horarios = new Set();
  Object.values(byDia).forEach((aulas) => aulas.forEach((a) => { if (a.horario) horarios.add(a.horario); }));
  const sorted = [...horarios].sort();
  if (!sorted.length)
    return `<tr><td colspan="6" class="px-4 py-8 text-center text-sm text-muted">Sem aulas registradas</td></tr>`;

  return sorted.map((h) => `
    <tr style="border-bottom:1px solid rgba(51,65,85,.5)">
      <td class="px-4 py-3 text-sm font-semibold text-muted">${h}</td>
      ${DIAS.map((d) => {
        const aula = byDia[d].find((a) => a.horario === h);
        return `<td class="px-4 py-3 text-sm text-text">${aula?.disciplina ?? aula?.materia ?? "—"}</td>`;
      }).join("")}
    </tr>`).join("");
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
