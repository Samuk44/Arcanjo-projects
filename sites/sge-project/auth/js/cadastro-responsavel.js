"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  set,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = "success", ms = 5000) {
  const c = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ── Field helpers ──────────────────────────────────────────────────────────────
function fieldErr(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("visible", !!msg);
  const input = document.getElementById(id);
  if (input) input.classList.toggle("border-danger", !!msg);
}

function clearErrors() {
  ["email", "senha", "cpf", "matricula"].forEach((id) => fieldErr(id, ""));
}

// ── CPF validation (mathematical) ────────────────────────────────────────────
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(on) {
  const btn = document.getElementById("btn-cadastrar");
  const txt = document.getElementById("btn-text");
  const spin = document.getElementById("btn-spinner");
  btn.disabled = on;
  txt.textContent = on ? "Aguarde..." : "Criar Conta";
  spin.classList.toggle("hidden", !on);
}

// ── Firebase error map ────────────────────────────────────────────────────────
function firebaseMsg(code) {
  const map = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "Senha muito fraca. Use ao menos 8 caracteres.",
    "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
  };
  return map[code] || "Erro inesperado. Tente novamente.";
}

// ── Registration handler ──────────────────────────────────────────────────────
async function handleCadastro() {
  clearErrors();

  const email     = document.getElementById("email").value.trim();
  const senha     = document.getElementById("senha").value;
  const cpfRaw    = document.getElementById("cpf").value.trim();
  const matricula = document.getElementById("matricula").value.trim();

  let valid = true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErr("email", "E-mail inválido.");
    valid = false;
  }

  if (senha.length < 8) {
    fieldErr("senha", "A senha deve ter pelo menos 8 caracteres.");
    valid = false;
  }

  if (!validarCPF(cpfRaw)) {
    fieldErr("cpf", "CPF inválido.");
    valid = false;
  }

  if (!matricula) {
    fieldErr("matricula", "Informe a matrícula do aluno.");
    valid = false;
  }

  if (!valid) return;

  setLoading(true);

  let userCredential = null;

  try {
    // 1. Create auth user first (required for authenticated DB lookup)
    userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    const uid  = user.uid;

    // 2. Verify student matricula in DB (authenticated request)
    const alunoKey  = `matricula_${matricula}`;
    const alunoSnap = await get(ref(db, `alunos/${alunoKey}`));

    if (!alunoSnap.exists()) {
      await deleteUser(user);
      fieldErr("matricula", "Matrícula não encontrada. Verifique o número ou contate a escola.");
      setLoading(false);
      return;
    }

    const alunoData = alunoSnap.val();

    // Block if aluno already has a linked responsável
    if (alunoData.responsavelId) {
      await deleteUser(user);
      fieldErr("matricula", "Este aluno já possui um responsável vinculado. Contate a escola.");
      setLoading(false);
      return;
    }

    // 3. Persist user record
    await set(ref(db, `usuarios/${uid}`), {
      uid,
      email,
      cpf: cpfRaw.replace(/\D/g, ""),
      role: "responsavel",
      status: "ativo",
      emailVerified: false,
      alunosVinculados: { [alunoKey]: true },
      criadoEm: new Date().toISOString(),
    });

    // 4. Send email verification
    await sendEmailVerification(user);

    toast("Conta criada! Verifique seu e-mail para ativar o acesso.", "success", 6000);

    setTimeout(() => {
      window.location.href = "../auth/login.html";
    }, 2500);

  } catch (err) {
    console.error("Erro no cadastro:", err);

    if (userCredential?.user) {
      try { await deleteUser(userCredential.user); } catch { /* ignore */ }
    }

    const msg = err.code ? firebaseMsg(err.code) : (err.message || "Erro inesperado.");
    toast(msg, "error");
    setLoading(false);
  }
}

document
  .getElementById("btn-cadastrar")
  ?.addEventListener("click", handleCadastro);
