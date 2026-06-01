// ============================================================
//  SGE v2.0 — cadastro_filho.js
//  Cadastro de Filho vinculado ao responsável logado
//  Firebase Auth (UID) + matrícula para dupla verificação
// ============================================================

import { auth, db } from "/assets/js/firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  set,
  get,
  push,
  update,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ── Helpers ──────────────────────────────────────────────────

function toISO(ddmmyyyy) {
  const [d, m, y] = (ddmmyyyy || "").split("/");
  return d && m && y ? `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}` : "";
}

function $(id) { return document.getElementById(id); }

function showError(field, msg) {
  const el = document.querySelector(`[data-field="${field}"]`);
  const input = document.getElementById(field);
  if (el) { el.textContent = msg; el.classList.add("show"); }
  if (input) input.classList.add("error");
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach(el => {
    el.textContent = "";
    el.classList.remove("show");
  });
  document.querySelectorAll("input.error, select.error").forEach(el => {
    el.classList.remove("error");
  });
}

function showFeedback(msg, type = "error") {
  const el = $("feedback");
  el.textContent = msg;
  el.className = `feedback show ${type}`;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (type === "success") return; // não esconde no sucesso (vai redirecionar)
  setTimeout(() => { el.className = "feedback"; }, 6000);
}

function setLoading(on) {
  const btn = $("btn-submit");
  btn.disabled = on;
  btn.innerHTML = on
    ? `<span class="spinner"></span> Salvando...`
    : "Cadastrar Filho";
}

// ── Máscara de data ───────────────────────────────────────────

function applyDateMask(input) {
  input.addEventListener("keydown", (e) => {
    if (!["Tab","Backspace","Delete","ArrowLeft","ArrowRight","Home","End"].includes(e.key) && !/\d/.test(e.key)) {
      e.preventDefault();
    }
  });
  input.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5);
    this.value = v;
  });
  input.addEventListener("blur", function () {
    const v = this.value;
    if (!v) return;
    if (v.length < 10) { this.classList.add("error"); return; }
    const [d, m, y] = v.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    const valid = dt.getDate() === d && dt.getMonth() + 1 === m && dt.getFullYear() === y;
    this.classList.toggle("error", !valid);
  });
}

// ── Validação ─────────────────────────────────────────────────

function validate() {
  clearErrors();
  let ok = true;

  const nome = $("nome-aluno").value.trim();
  const dataNasc = $("data-nascimento").value.trim();
  const matricula = $("matricula").value.trim();
  const turma = $("turma").value;
  const turno = $("turno").value;
  const periodo = $("periodo").value;

  if (!nome || nome.length < 3) {
    showError("nome-aluno", "Nome deve ter pelo menos 3 caracteres.");
    ok = false;
  }

  if (!dataNasc || dataNasc.length < 10) {
    showError("data-nascimento", "Data inválida. Use dd/mm/aaaa.");
    ok = false;
  } else {
    const [d, m, y] = dataNasc.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getDate() !== d || dt.getMonth() + 1 !== m || dt.getFullYear() !== y) {
      showError("data-nascimento", "Data inválida.");
      ok = false;
    }
  }

  if (!matricula) {
    showError("matricula", "Matrícula é obrigatória.");
    ok = false;
  }

  if (!turma) { showError("turma", "Selecione a turma."); ok = false; }
  if (!turno) { showError("turno", "Selecione o turno."); ok = false; }
  if (!periodo) { showError("periodo", "Selecione o período."); ok = false; }

  return ok;
}

// ── Verificação de matrícula duplicada ────────────────────────

async function matriculaJaExiste(matricula) {
  try {
    const q = query(ref(db, "alunos"), orderByChild("matricula"), equalTo(matricula));
    const snap = await get(q);
    return snap.exists();
  } catch (e) {
    console.warn("Erro ao verificar matrícula:", e);
    return false; // não bloqueia em caso de falha de leitura
  }
}

// ── Submit ────────────────────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;

  const nome      = $("nome-aluno").value.trim();
  const dataNasc  = $("data-nascimento").value.trim();
  const matricula = $("matricula").value.trim();
  const turma     = $("turma").value;
  const turno     = $("turno").value;
  const periodo   = $("periodo").value;

  setLoading(true);

  try {
    // Garante que há usuário logado
    const user = auth.currentUser;
    if (!user) {
      showFeedback("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => { window.location.href = "/auth/login.html"; }, 2000);
      return;
    }

    const uid = user.uid;

    // Verifica matrícula duplicada
    const duplicada = await matriculaJaExiste(matricula);
    if (duplicada) {
      showError("matricula", "Esta matrícula já está cadastrada no sistema.");
      setLoading(false);
      return;
    }

    // Cria novo aluno no Realtime Database
    const alunoRef = push(ref(db, "alunos"));
    const alunoId  = alunoRef.key;

    await set(ref(db, `alunos/${alunoId}`), {
      id:              alunoId,
      nome,
      dataNascimento:  toISO(dataNasc),
      matricula,
      turma,
      turno,
      periodo,
      responsavelId:   uid,
      criadoEm:        new Date().toISOString(),
    });

    // Atualiza array de alunos do responsável
    const paiSnap = await get(ref(db, `usuarios/${uid}/alunosIds`));
    const alunosIds = paiSnap.exists() ? [...paiSnap.val(), alunoId] : [alunoId];

    await update(ref(db, `usuarios/${uid}`), { alunosIds });

    // Sucesso
    showFeedback("Filho cadastrado com sucesso! Redirecionando...", "success");
    setTimeout(() => {
      window.location.href = "/pai/pai_index.html";
    }, 1800);

  } catch (error) {
    console.error("Erro ao cadastrar filho:", error);

    let msg = "Erro ao salvar. Tente novamente.";
    if (error.code === "PERMISSION_DENIED" || error.message?.includes("permission")) {
      msg = "Sem permissão para salvar. Verifique se você está logado.";
    } else if (error.code === "auth/network-request-failed" || error.message?.includes("network")) {
      msg = "Erro de conexão. Verifique sua internet.";
    }

    showFeedback(msg, "error");
    setLoading(false);
  }
}

// ── Init ──────────────────────────────────────────────────────

function init() {
  // Máscara de data
  const dateInput = $("data-nascimento");
  if (dateInput) applyDateMask(dateInput);

  // Guarda de autenticação — redireciona se não logado
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/auth/login.html";
    }
  });

  // Submit
  const form = $("form-filho");
  if (form) form.addEventListener("submit", handleSubmit);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ============================================================
//  SGE v2.0 • cadastro_filho.js • 2026
// ============================================================