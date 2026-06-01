"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
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

function populateForm(data) {
  const nome = document.getElementById("input-nome");
  const email = document.getElementById("input-email");
  const telefone = document.getElementById("input-telefone");
  const cpf = document.getElementById("input-cpf");
  const role = document.getElementById("display-role");
  const status = document.getElementById("display-status");
  if (nome) nome.value = data.nome ?? "";
  if (email) email.value = data.email ?? "";
  if (telefone) telefone.value = data.telefone ?? "";
  if (cpf) cpf.value = data.cpf ?? "";
  if (role) role.textContent = "Responsável";
  if (status) status.textContent = data.status === "ativo" ? "Ativo" : (data.status ?? "—");
}

function setupProfileForm() {
  const form = document.getElementById("form-perfil");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("input-nome")?.value?.trim();
    const telefone = document.getElementById("input-telefone")?.value?.trim();
    if (!nome) { toast("Nome é obrigatório", "error"); return; }
    try {
      await update(ref(db, `usuarios/${state.uid}`), { nome, telefone: telefone ?? "" });
      toast("Perfil atualizado com sucesso", "success");
    } catch {
      toast("Erro ao salvar perfil", "error");
    }
  });
}

function setupPasswordForm() {
  const form = document.getElementById("form-senha");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const atual = document.getElementById("input-senha-atual")?.value;
    const nova = document.getElementById("input-nova-senha")?.value;
    const conf = document.getElementById("input-confirmar-senha")?.value;
    if (!atual || !nova || !conf) { toast("Preencha todos os campos", "error"); return; }
    if (nova !== conf) { toast("As senhas não coincidem", "error"); return; }
    if (nova.length < 8) { toast("Nova senha deve ter no mínimo 8 caracteres", "error"); return; }
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error("Sessão inválida");
      const cred = EmailAuthProvider.credential(user.email, atual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, nova);
      toast("Senha alterada com sucesso", "success");
      form.reset();
    } catch (err) {
      toast(err.code === "auth/wrong-password" ? "Senha atual incorreta" : "Erro ao alterar senha", "error");
    }
  });
}

async function init() {
  const responsavel = await authGuard();
  if (!responsavel) return;

  state.uid = responsavel.uid;

  setGreeting(responsavel);
  populateForm(responsavel);
  setupLogout();
  setupProfileForm();
  setupPasswordForm();
}

window.addEventListener("beforeunload", () => { if (_authUnsub) _authUnsub(); });
document.addEventListener("DOMContentLoaded", init);
