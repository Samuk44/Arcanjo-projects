"use strict";

import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

function formatCurrency(val) {
  if (val == null) return "—";
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function loadBilhetes() {
  const tbody = document.getElementById("bilhetes-tbody");
  const empty = document.getElementById("empty-state");
  const totalEl = document.getElementById("total-pendente");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Carregando...</td></tr>`;

  try {
    const q = query(ref(db, "bilhetes"), orderByChild("responsavelId"), equalTo(state.uid));
    const snap = await get(q);

    if (!snap.exists()) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Nenhum boleto encontrado</td></tr>`;
      empty?.classList.remove("hidden");
      if (totalEl) totalEl.textContent = "R$ 0,00";
      return;
    }

    const bilhetes = [];
    snap.forEach((child) => bilhetes.push({ id: child.key, ...child.val() }));
    bilhetes.sort((a, b) => (b.vencimento ?? 0) - (a.vencimento ?? 0));
    empty?.classList.add("hidden");

    let totalPendente = 0;
    bilhetes.forEach((b) => {
      if ((b.status ?? "pendente") !== "pago") totalPendente += Number(b.valor ?? 0);
    });
    if (totalEl) totalEl.textContent = formatCurrency(totalPendente);

    tbody.innerHTML = bilhetes.map((b) => {
      const status = b.status ?? "pendente";
      const badgeCls = status === "pago" ? "badge-success" : status === "vencido" ? "badge-error" : "badge-warning";
      const label = status === "pago" ? "Pago" : status === "vencido" ? "Vencido" : "Pendente";
      return `<tr style="border-bottom:1px solid rgba(51,65,85,.5)">
        <td class="px-4 py-3 text-sm font-medium text-text">${b.descricao ?? b.referencia ?? "—"}</td>
        <td class="px-4 py-3 text-sm text-muted">${formatDate(b.vencimento)}</td>
        <td class="px-4 py-3 text-sm font-semibold text-text">${formatCurrency(b.valor)}</td>
        <td class="px-4 py-3 text-sm text-center"><span class="px-2 py-1 rounded-lg text-xs font-bold ${badgeCls}">${label}</span></td>
        <td class="px-4 py-3 text-sm text-center">
          ${status !== "pago" && b.linkBoleto
            ? `<a href="${b.linkBoleto}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-primary border border-border hover:bg-white/5 transition-colors">2ª Via</a>`
            : "—"}
        </td>
      </tr>`;
    }).join("");
  } catch {
    toast("Erro ao carregar boletos", "error");
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-sm text-danger">Erro ao carregar dados</td></tr>`;
  }
}

async function init() {
  const responsavel = await authGuard();
  if (!responsavel) return;

  state.uid = responsavel.uid;

  setGreeting(responsavel);
  setupLogout();
  await loadBilhetes();
}

window.addEventListener("beforeunload", () => { if (_authUnsub) _authUnsub(); });
document.addEventListener("DOMContentLoaded", init);
