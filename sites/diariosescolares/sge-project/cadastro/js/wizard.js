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

const ROLE_LABELS = { professor: "Professor", responsavel: "Responsável", diretor: "Diretor" };
const ROLE_STATUS = { professor: "pendente", responsavel: "ativo", diretor: "pendente" };
const REDIRECTS = {
  professor: "../auth/login.html",
  responsavel: "../pai/pai_index.html",
  diretor: "../auth/login.html",
};

let _role = null;

// ── CPF ───────────────────────────────────────────────────────────────────────
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i);
  let r = (s * 10) % 11; if (r >= 10) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i);
  r = (s * 10) % 11; if (r >= 10) r = 0;
  return r === parseInt(cpf[10]);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = "ok", ms = 5000) {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ── Field errors ──────────────────────────────────────────────────────────────
function setErr(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
  document.getElementById(id)?.classList.toggle("invalid", !!msg);
}

function clearErrs() {
  ["nome","email","cpf","senha","matricula","role"].forEach((id) => setErr(id, ""));
}

// ── Loading ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  const btn = document.getElementById("btn-submit");
  const lbl = document.getElementById("btn-label");
  const spn = document.getElementById("btn-spin");
  if (!btn) return;
  btn.disabled = on;
  if (lbl) lbl.textContent = on ? "Aguarde..." : "Criar Conta";
  spn?.classList.toggle("hidden", !on);
}

// ── Firebase error ────────────────────────────────────────────────────────────
function fbMsg(code) {
  return (
    { "auth/email-already-in-use": "Este e-mail já está cadastrado.", "auth/invalid-email": "E-mail inválido.", "auth/weak-password": "Senha muito fraca (mín. 8 car.).", "auth/network-request-failed": "Sem conexão. Tente novamente.", "auth/too-many-requests": "Muitas tentativas. Aguarde." }[code] ?? "Erro inesperado. Tente novamente."
  );
}

// ── Step navigation ───────────────────────────────────────────────────────────
function goToStep(id) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
}

function setupRoleCards() {
  document.querySelectorAll(".role-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".role-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      _role = card.dataset.role;
      setErr("role", "");
    });
  });

  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (!_role) { setErr("role", "Selecione um perfil para continuar."); return; }
    const badge = document.getElementById("role-badge");
    if (badge) badge.textContent = ROLE_LABELS[_role] ?? _role;
    const subtitle = document.getElementById("step-subtitle");
    if (subtitle) subtitle.textContent = "Preencha seus dados para criar a conta";
    const wrapMat = document.getElementById("wrap-matricula");
    if (wrapMat) wrapMat.classList.toggle("hidden", _role !== "responsavel");
    goToStep("step-form");
  });

  document.getElementById("btn-back")?.addEventListener("click", () => {
    clearErrs();
    const subtitle = document.getElementById("step-subtitle");
    if (subtitle) subtitle.textContent = "Escolha seu perfil de acesso";
    goToStep("step-role");
  });
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  clearErrs();

  const nome = document.getElementById("nome")?.value.trim() ?? "";
  const email = document.getElementById("email")?.value.trim() ?? "";
  const cpfRaw = document.getElementById("cpf")?.value ?? "";
  const telefone = document.getElementById("telefone")?.value.trim() ?? "";
  const senha = document.getElementById("senha")?.value ?? "";
  const matricula = document.getElementById("matricula")?.value.trim() ?? "";

  let valid = true;

  if (nome.length < 3) { setErr("nome", "Nome deve ter ao menos 3 caracteres."); valid = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("email", "E-mail inválido."); valid = false; }
  if (!validarCPF(cpfRaw)) { setErr("cpf", "CPF inválido."); valid = false; }
  if (senha.length < 8) { setErr("senha", "Senha deve ter ao menos 8 caracteres."); valid = false; }
  if (_role === "responsavel" && !matricula) { setErr("matricula", "Informe a matrícula do aluno."); valid = false; }

  if (!valid) return;

  setLoading(true);

  let userCredential = null;

  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;
    const uid = user.uid;

    if (_role === "responsavel") {
      const alunoKey = `matricula_${matricula}`;
      const alunoSnap = await get(ref(db, `alunos/${alunoKey}`));
      if (!alunoSnap.exists()) {
        await deleteUser(user);
        setErr("matricula", "Matrícula não encontrada. Verifique ou contate a escola.");
        setLoading(false);
        return;
      }
      if (alunoSnap.val()?.responsavelId) {
        await deleteUser(user);
        setErr("matricula", "Este aluno já possui responsável vinculado. Contate a escola.");
        setLoading(false);
        return;
      }

      await set(ref(db, `usuarios/${uid}`), {
        uid,
        nome,
        email,
        cpf: cpfRaw.replace(/\D/g, ""),
        telefone: telefone.replace(/\D/g, ""),
        role: "responsavel",
        status: "ativo",
        alunosVinculados: { [alunoKey]: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await sendEmailVerification(user);
      toast("Conta criada! Verifique seu e-mail.", "ok", 6000);
      setTimeout(() => { window.location.href = REDIRECTS.responsavel; }, 2000);
      return;
    }

    await set(ref(db, `usuarios/${uid}`), {
      uid,
      nome,
      email,
      cpf: cpfRaw.replace(/\D/g, ""),
      telefone: telefone.replace(/\D/g, ""),
      role: _role,
      status: ROLE_STATUS[_role],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (_role === "professor" || _role === "diretor") {
      await set(ref(db, `cadastrosPendentes/${uid}`), {
        uid, nome, email, cpf: cpfRaw.replace(/\D/g, ""), telefone: telefone.replace(/\D/g, ""),
        role: _role, status: "pendente", createdAt: new Date().toISOString(),
      });
    }

    await sendEmailVerification(user);

    const msg = _role === "professor"
      ? "Cadastro enviado! Aguarde aprovação da escola."
      : "Acesso solicitado! O administrador entrará em contato.";
    toast(msg, "ok", 7000);
    setTimeout(() => { window.location.href = REDIRECTS[_role]; }, 2500);

  } catch (err) {
    if (userCredential?.user) {
      try { await deleteUser(userCredential.user); } catch { }
    }
    toast(err.code ? fbMsg(err.code) : (err.message ?? "Erro inesperado."), "err");
    setLoading(false);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
setupRoleCards();
document.getElementById("btn-submit")?.addEventListener("click", handleSubmit);
