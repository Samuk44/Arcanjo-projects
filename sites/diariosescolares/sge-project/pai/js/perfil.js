"use strict";

import {
  auth,
  db,
  initPage,
  showToast,
  toIdsArray,
} from "./app-shared.js";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _uid = null;

function setBtn(id, loading, label) {
  const btn = document.getElementById(id) ?? document.querySelector(`#${id.replace("-", "-form")} button[type=submit]`);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Aguarde..." : label;
}

function fill(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? "";
}

async function loadPerfil(uid) {
  try {
    const snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) return;
    const d = snap.val();
    fill("nome", d.nome);
    fill("email", d.email);
    fill("telefone", d.telefone);

    const greeting = document.getElementById("userGreeting");
    if (greeting) greeting.textContent = d.nome?.split(" ")[0] ?? "Responsável";

    await loadAlunos(d);
  } catch { /* silently */ }
}

async function loadAlunos(userData) {
  const container = document.getElementById("alunos-vinculados");
  if (!container) return;

  const ids = toIdsArray(userData.alunosVinculados ?? userData.filhos ?? {});
  if (!ids.length) {
    container.innerHTML = '<p class="text-sm text-muted">Nenhum aluno vinculado.</p>';
    return;
  }

  container.innerHTML = '<div class="skeleton h-16 rounded-xl"></div>';

  const results = await Promise.all(
    ids.map((id) => get(ref(db, `alunos/${id}`)).then((s) => s.exists() ? { id, ...s.val() } : null).catch(() => null))
  );

  const valid = results.filter(Boolean);
  if (!valid.length) { container.innerHTML = '<p class="text-sm text-muted">Dados dos alunos não encontrados.</p>'; return; }

  container.innerHTML = "";
  valid.forEach(({ id, nome, turma, turno }) => {
    const div = document.createElement("div");
    div.className = "flex items-center gap-4 bg-[#0f172a] rounded-xl border border-border px-4 py-3";
    div.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">${(nome?.[0] ?? "A").toUpperCase()}</div>
      <div>
        <p class="text-sm font-medium text-text">${nome ?? id}</p>
        <p class="text-xs text-muted">${[turma, turno].filter(Boolean).join(" · ") || "Sem turma"}</p>
      </div>`;
    container.appendChild(div);
  });
}

function setupProfileForm(uid) {
  const form = document.getElementById("profile-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome")?.value.trim();
    const telefone = document.getElementById("telefone")?.value.trim();
    if (!nome) { showToast("Nome é obrigatório.", "error"); return; }

    setBtn("profile-form", true, "Salvar Alterações");
    try {
      await update(ref(db, `usuarios/${uid}`), { nome, telefone: telefone || "" });
      const g = document.getElementById("userGreeting");
      if (g) g.textContent = nome.split(" ")[0];
      showToast("Perfil atualizado com sucesso.");
    } catch {
      showToast("Erro ao salvar perfil.", "error");
    } finally {
      setBtn("profile-form", false, "Salvar Alterações");
    }
  });
}

function setupPasswordForm() {
  const form = document.getElementById("password-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const atual = document.getElementById("senha-atual")?.value;
    const nova = document.getElementById("nova-senha")?.value;
    const conf = document.getElementById("confirmar-senha")?.value;

    if (!atual || !nova || !conf) { showToast("Preencha todos os campos.", "error"); return; }
    if (nova !== conf) { showToast("As senhas não coincidem.", "error"); return; }
    if (nova.length < 8) { showToast("A nova senha deve ter ao menos 8 caracteres.", "error"); return; }

    setBtn("password-form", true, "Atualizar Senha");
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, atual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, nova);
      form.reset();
      showToast("Senha atualizada com sucesso.");
    } catch (err) {
      const msgs = {
        "auth/wrong-password": "Senha atual incorreta.",
        "auth/weak-password": "Nova senha muito fraca.",
        "auth/requires-recent-login": "Sessão expirada. Faça logout e entre novamente.",
      };
      showToast(msgs[err.code] ?? "Erro ao atualizar senha.", "error");
    } finally {
      setBtn("password-form", false, "Atualizar Senha");
    }
  });
}

async function init() {
  const ctx = await initPage();
  if (!ctx) return;
  _uid = ctx.uid;

  await loadPerfil(ctx.uid);
  setupProfileForm(ctx.uid);
  setupPasswordForm();
}

init();
