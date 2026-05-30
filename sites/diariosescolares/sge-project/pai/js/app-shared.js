"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import notifUI from "../../assets/js/firebase/notificacoes-ui.js";

export { auth, db };

// ── Utilities ─────────────────────────────────────────────────────────────────

export function toIdsArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return Object.entries(v).filter(([, val]) => !!val).map(([k]) => k);
}

export function fmtDate(val) {
  if (!val) return "—";
  try {
    const d = typeof val === "number"
      ? new Date(val)
      : new Date(String(val).includes("T") ? val : val + "T12:00:00");
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("pt-BR");
  } catch { return String(val); }
}

export function fmtMoeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getAlunoAtivo() {
  return localStorage.getItem("alunoAtivoId") || null;
}

export function setAlunoAtivo(id) {
  if (id) localStorage.setItem("alunoAtivoId", id);
}

export function showToast(msg, type = "success", ms = 4000) {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const el = document.createElement("div");
  el.className = `toast px-5 py-3 rounded-2xl text-sm font-medium pointer-events-auto shadow-lg text-white ${
    type === "error" ? "bg-red-600" : type === "warning" ? "bg-yellow-600" : "bg-blue-600"
  }`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.parentNode?.removeChild(el), ms);
}

// ── Auth guard + page bootstrap ───────────────────────────────────────────────

export function initPage() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { location.replace("../auth/login.html"); resolve(null); return; }
      try {
        const snap = await get(ref(db, `usuarios/${user.uid}`));
        if (!snap.exists()) {
          await signOut(auth); location.replace("../auth/login.html"); resolve(null); return;
        }
        const userData = snap.val();
        if (!["responsavel", "pai"].includes(userData.role) || userData.status !== "ativo") {
          await signOut(auth); location.replace("../auth/login.html"); resolve(null); return;
        }
        _updateHeader(userData);
        _setupLogout(user.uid);
        _setupNotifBadge(user.uid);
        resolve({ uid: user.uid, userData });
      } catch {
        location.replace("../auth/login.html");
        resolve(null);
      }
    });
  });
}

function _updateHeader(userData) {
  const g = document.getElementById("userGreeting");
  const av = document.getElementById("userAvatar");
  if (g) g.textContent = userData.nome?.split(" ")[0] ?? "Responsável";
  if (av) av.textContent = (userData.nome?.[0] ?? "R").toUpperCase();
}

function _setupLogout(uid) {
  document.querySelectorAll("#logoutButton, #sidebarLogout").forEach((btn) =>
    btn?.addEventListener("click", async () => {
      try { await signOut(auth); } catch { }
      finally { location.replace("../auth/login.html"); }
    })
  );
}

let _notifUnsub = null;

function _setupNotifBadge(uid) {
  if (_notifUnsub) _notifUnsub();
  const nRef = ref(db, `entregas/${uid}`);
  _notifUnsub = onValue(nRef, (snap) => {
    const lista = [];
    let naoLidas = 0;
    if (snap.exists()) {
      snap.forEach((c) => {
        const v = { id: c.key, ...c.val() };
        lista.push(v);
        if (!v.lido) naoLidas++;
      });
      lista.sort((a, b) => (b.criadoEm ?? 0) - (a.criadoEm ?? 0));
    }
    notifUI.updateBadge(naoLidas);
    notifUI.renderDropdown(lista.slice(0, 5));
  });
  window.addEventListener("beforeunload", () => { if (_notifUnsub) _notifUnsub(); }, { once: true });
}

// ── Aluno selector ────────────────────────────────────────────────────────────

export async function loadFilhoSelect(uid, userData) {
  const select = document.getElementById("selectFilho");
  const vinculados = userData.alunosVinculados ?? userData.filhos ?? {};
  const ids = toIdsArray(vinculados);

  if (!ids.length) {
    if (select) select.innerHTML = '<option value="">Sem alunos vinculados</option>';
    return { alunoIds: [], alunoAtivo: null };
  }

  const promises = ids.map((id) =>
    get(ref(db, `alunos/${id}`))
      .then((s) => (s.exists() ? { id, ...s.val() } : null))
      .catch(() => null)
  );
  const results = (await Promise.all(promises)).filter(Boolean);

  if (select) {
    select.innerHTML = "";
    results.forEach(({ id, nome, turma }) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${nome ?? id}${turma ? ` — ${turma}` : ""}`;
      select.appendChild(opt);
    });
  }

  const saved = getAlunoAtivo();
  const alunoAtivo = (saved && ids.includes(saved)) ? saved : ids[0];
  setAlunoAtivo(alunoAtivo);
  if (select) select.value = alunoAtivo;

  return { alunoIds: ids, alunoAtivo, alunos: results };
}

// ── Notification mark-read (shared) ──────────────────────────────────────────

export async function markEntregaRead(uid, itemId) {
  if (!uid || !itemId) return;
  try {
    await update(ref(db, `entregas/${uid}/${itemId}`), { lido: true });
  } catch { /* permission may not exist yet */ }
}
