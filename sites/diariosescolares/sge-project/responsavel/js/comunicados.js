"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const state = { uid: null };
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

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : Date.parse(ts));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function loadAvisos() {
  const container = document.getElementById("avisos-container");
  const empty = document.getElementById("empty-state");
  if (!container) return;

  container.innerHTML = `<div class="p-8 text-center text-sm text-muted">Carregando...</div>`;

  try {
    const snap = await get(ref(db, "avisos"));

    if (!snap.exists()) {
      container.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }

    const avisos = [];
    snap.forEach((child) => avisos.push({ id: child.key, ...child.val() }));
    avisos.sort((a, b) => (b.criadoEm ?? 0) - (a.criadoEm ?? 0));
    empty?.classList.add("hidden");

    container.innerHTML = avisos.map((a) => {
      const lido = (a.lidoPor ?? {})[state.uid] === true;
      return `
        <div class="p-5 border-b border-border last:border-0" style="border-color:rgba(51,65,85,.5)" data-aviso-id="${a.id}">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                ${!lido ? '<span class="w-2 h-2 rounded-full bg-primary shrink-0 inline-block"></span>' : ""}
                <p class="text-sm font-semibold text-text truncate">${a.titulo ?? "Sem título"}</p>
              </div>
              <p class="text-xs text-muted mt-1 line-clamp-2">${a.conteudo ?? a.mensagem ?? ""}</p>
              <p class="text-xs text-muted mt-2">${formatDate(a.criadoEm ?? a.data)}</p>
            </div>
            ${
              !lido
                ? `<button class="btn-marcar-lido shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary border border-border hover:bg-white/5 transition-colors" data-id="${a.id}">Marcar lido</button>`
                : `<span class="px-2 py-1 rounded-lg text-xs font-medium badge-success shrink-0">Lido</span>`
            }
          </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".btn-marcar-lido").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!id || !state.uid) return;
        try {
          await update(ref(db, `avisos/${id}/lidoPor`), { [state.uid]: true });
          await loadAvisos();
        } catch {
          toast("Erro ao marcar como lido", "error");
        }
      });
    });
  } catch {
    toast("Erro ao carregar comunicados", "error");
    container.innerHTML = `<div class="p-8 text-center text-sm text-danger">Erro ao carregar comunicados</div>`;
  }
}

async function init() {
  const responsavel = await authGuard();
  if (!responsavel) return;

  state.uid = responsavel.uid;

  setGreeting(responsavel);
  setupLogout();
  await loadAvisos();
}

window.addEventListener("beforeunload", () => { if (_authUnsub) _authUnsub(); });
document.addEventListener("DOMContentLoaded", init);
