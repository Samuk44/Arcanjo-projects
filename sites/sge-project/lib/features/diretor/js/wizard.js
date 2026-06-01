// 📄 diretor/js/wizard.js
// SGE v2.0 | Director Registration Wizard — DOM + Firebase Integration
// Redireciona para ../diretor/index.html após sucesso.
"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS
// ─────────────────────────────────────────────────────────────────────────────

import { auth, db } from "../../../core/assets/js/firebase/config.js";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ✅ IMPORT CORRIGIDO: wizard-flow.js
import {
  createWizardFlow,
  storeCredentials,
  isFlowLocked,
  lockFlow,
  unlockFlow,
  resetFlow,
} from "./wizard-flow.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS (SEM ESPAÇOS!)
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LITERAL = "diretor";
const FIREBASE_TIMEOUT_MS = 10_000;
const REDIRECT_DELAY_MS = 1_500;
const MAX_PAYLOAD_BYTES = 10_000;

const VALID_PLANS = ["basico", "profissional", "enterprise"];
const PERSONAL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "bol.com.br",
  "uol.com.br",
];
const COMMON_PASSWORDS = [
  "senha",
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "admin",
  "diretor",
  "escola",
  "letmein",
  "111111",
];

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZAÇÃO E UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

function sanitize(v) {
  if (typeof v !== "string") return "";
  return v.trim().replace(/[<>&"';]|--|\/\*|\*\/|javascript:|data:/gi, "");
}

function normalizePhone(t) {
  const d = t.replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? `+${d}` : `+55${d}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDADORES
// ─────────────────────────────────────────────────────────────────────────────

function validarCPF(cpf) {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;
  const d = n.split("").map(Number);
  const s1 = d.slice(0, 9).reduce((acc, v, i) => acc + v * (10 - i), 0);
  const r1 = (s1 * 10) % 11;
  const v1 = r1 >= 10 ? 0 : r1;
  if (v1 !== d[9]) return false;
  const s2 = d.slice(0, 10).reduce((acc, v, i) => acc + v * (11 - i), 0);
  const r2 = (s2 * 10) % 11;
  const v2 = r2 >= 10 ? 0 : r2;
  return v2 === d[10];
}

function validarCNPJ(cnpj) {
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(n)) return false;
  const d = n.split("").map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (digits, weights) => {
    const rem = digits.reduce((s, v, i) => s + v * weights[i], 0) % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  return (
    calc(d.slice(0, 12), w1) === d[12] && calc(d.slice(0, 13), w2) === d[13]
  );
}

function validarEmail(email) {
  return (
    typeof email === "string" &&
    email.length >= 6 &&
    email.length <= 254 &&
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
  );
}

function isInstitucional(email) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return !PERSONAL_DOMAINS.includes(domain);
}

function validarTelefone(tel) {
  const d = tel.replace(/\D/g, "");
  const ddd = parseInt(d.slice(0, 2), 10);
  return d.length >= 10 && d.length <= 11 && ddd >= 10 && ddd <= 99;
}

function validarSenha(senha, ctx = {}) {
  if (!senha || senha.length < 12)
    return { ok: false, motivo: "Senha deve ter no mínimo 12 caracteres." };
  if (!/[A-Z]/.test(senha))
    return {
      ok: false,
      motivo: "Senha deve ter ao menos uma letra maiúscula.",
    };
  if (!/[a-z]/.test(senha))
    return {
      ok: false,
      motivo: "Senha deve ter ao menos uma letra minúscula.",
    };
  if (!/[0-9]/.test(senha))
    return { ok: false, motivo: "Senha deve ter ao menos um número." };
  if (!/[^A-Za-z0-9]/.test(senha))
    return {
      ok: false,
      motivo: "Senha deve ter ao menos um símbolo (ex: @, #, !).",
    };

  const lower = senha.toLowerCase();
  for (const fraca of COMMON_PASSWORDS)
    if (lower.includes(fraca))
      return { ok: false, motivo: "Senha contém sequência muito comum." };
  if (ctx.email) {
    const parte = ctx.email.split("@")[0].toLowerCase();
    if (parte.length >= 4 && lower.includes(parte))
      return {
        ok: false,
        motivo: "Senha não pode conter parte do seu e-mail.",
      };
  }
  if (ctx.nome) {
    const primeiroNome = ctx.nome.split(" ")[0].toLowerCase();
    if (primeiroNome.length >= 4 && lower.includes(primeiroNome))
      return { ok: false, motivo: "Senha não pode conter seu nome." };
  }
  return { ok: true, motivo: null };
}

function compararSenhas(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  const ua = new TextEncoder().encode(a);
  const ub = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO POR STEP
// ─────────────────────────────────────────────────────────────────────────────

function validarStep1(d) {
  const erros = [];
  if (!d.nomeEscola || d.nomeEscola.length < 3 || d.nomeEscola.length > 100)
    erros.push("Nome da escola deve ter entre 3 e 100 caracteres.");
  if (!d.cnpj) erros.push("CNPJ é obrigatório.");
  else if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(d.cnpj))
    erros.push("CNPJ deve estar no formato 00.000.000/0000-00.");
  else if (!validarCNPJ(d.cnpj)) erros.push("CNPJ inválido.");
  if (!d.emailEscola) erros.push("E-mail da escola é obrigatório.");
  else if (!validarEmail(d.emailEscola))
    erros.push("E-mail da escola inválido.");
  else if (!isInstitucional(d.emailEscola))
    erros.push("Use um e-mail institucional.");
  return { isValid: erros.length === 0, errors: erros };
}

function validarStep2(d) {
  const erros = [];
  if (!d.nomeCompleto || d.nomeCompleto.trim().length < 5)
    erros.push("Nome completo deve ter no mínimo 5 caracteres.");
  if (!d.cpf) erros.push("CPF é obrigatório.");
  else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(d.cpf))
    erros.push("CPF deve estar no formato 000.000.000-00.");
  else if (!validarCPF(d.cpf)) erros.push("CPF inválido.");
  if (!d.email) erros.push("E-mail é obrigatório.");
  else if (!validarEmail(d.email)) erros.push("E-mail inválido.");
  if (!d.telefone) erros.push("Telefone é obrigatório.");
  else if (!validarTelefone(d.telefone)) erros.push("Telefone inválido.");
  return { isValid: erros.length === 0, errors: erros };
}

function validarStep3(senha, confirmar, plano, ctx = {}) {
  const erros = [];
  if (!senha) {
    erros.push("Senha é obrigatória.");
  } else {
    const { ok, motivo } = validarSenha(senha, ctx);
    if (!ok) erros.push(motivo);
  }
  if (!confirmar) erros.push("Confirmação de senha é obrigatória.");
  else if (senha && !compararSenhas(senha, confirmar))
    erros.push("As senhas não coincidem.");
  if (!plano || !VALID_PLANS.includes(plano))
    erros.push("Selecione um plano válido.");
  return { isValid: erros.length === 0, errors: erros };
}

function validarStep4(aceite) {
  if (aceite !== true)
    return {
      isValid: false,
      errors: ["Aceite os termos de uso para continuar."],
    };
  return { isValid: true, errors: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// COLETA DE DADOS DO DOM (SELETORES CORRIGIDOS)
// ─────────────────────────────────────────────────────────────────────────────

function _ler(selector) {
  const el = document.querySelector(selector);
  if (!el) return "";
  if (el.type === "checkbox") return el.checked ? "true" : "";
  return el.value ?? "";
}

function coletarStep(step) {
  switch (step) {
    case 1:
      return {
        nomeEscola: sanitize(_ler('[name="nomeEscola"], #nomeEscola')),
        cnpj: _ler('[name="cnpj"], #cnpj').trim(),
        emailEscola: sanitize(_ler('[name="emailEscola"], #emailEscola')),
      };
    case 2:
      return {
        nomeCompleto: sanitize(_ler('[name="nomeCompleto"], #nomeCompleto')),
        cpf: _ler('[name="cpf"], #cpf').trim(),
        email: sanitize(_ler('[name="email"], #email')),
        telefone: _ler('[name="telefone"], #telefone').trim(),
      };
    case 3:
      return {
        plano: _ler('[name="plano"]:checked, #plano'),
      };
    case 4:
      return {
        aceiteTermos: _ler('[name="aceiteTermos"], #aceiteTermos') === "true",
      };
    default:
      return {};
  }
}

function coletarDadosFormulario() {
  return {
    nomeEscola: sanitize(_ler('[name="nomeEscola"], #nomeEscola')),
    cnpj: _ler('[name="cnpj"], #cnpj').trim(),
    cpf: _ler('[name="cpf"], #cpf').trim(),
    telefone: _ler('[name="telefone"], #telefone').trim(),
    email: sanitize(_ler('[name="email"], #email')),
    senha: _ler('[name="senha"], #senha'),
    confirmarSenha: _ler('[name="confirmarSenha"], #confirmarSenha'),
  };
}

function validarFormulario(dados) {
  const erros = [];
  if (!dados.nomeEscola || dados.nomeEscola.length < 3 || dados.nomeEscola.length > 100)
    erros.push("Nome da escola deve ter entre 3 e 100 caracteres.");
  if (!dados.cnpj) erros.push("CNPJ é obrigatório.");
  else if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(dados.cnpj))
    erros.push("CNPJ deve estar no formato 00.000.000/0000-00.");
  else if (!validarCNPJ(dados.cnpj)) erros.push("CNPJ inválido.");
  if (!dados.cpf) erros.push("CPF é obrigatório.");
  else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(dados.cpf))
    erros.push("CPF deve estar no formato 000.000.000-00.");
  else if (!validarCPF(dados.cpf)) erros.push("CPF inválido.");
  if (!dados.telefone) erros.push("Telefone é obrigatório.");
  else if (!validarTelefone(dados.telefone)) erros.push("Telefone inválido.");
  if (!dados.email) erros.push("E-mail é obrigatório.");
  else if (!validarEmail(dados.email)) erros.push("E-mail inválido.");
  if (!dados.senha) erros.push("Senha é obrigatória.");
  else {
    const { ok, motivo } = validarSenha(dados.senha, {
      email: dados.email,
    });
    if (!ok) erros.push(motivo);
  }
  if (!dados.confirmarSenha) erros.push("Confirmação de senha é obrigatória.");
  else if (dados.senha && !compararSenhas(dados.senha, dados.confirmarSenha))
    erros.push("As senhas não coincidem.");
  return { isValid: erros.length === 0, errors: erros };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK DE UI
// ─────────────────────────────────────────────────────────────────────────────

export function showFeedback(mensagem, tipo = "info") {
  const container = document.getElementById("toastContainer") ?? document.body;
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.setAttribute("role", tipo === "error" ? "alert" : "status");
  toast.setAttribute("aria-live", tipo === "error" ? "assertive" : "polite");

  const span = document.createElement("span");
  span.textContent = mensagem;
  toast.appendChild(span);

  if (tipo === "error") {
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "✕";
    x.className = "toast-close";
    x.addEventListener("click", () => toast.remove(), { once: true });
    toast.appendChild(x);
  }
  container.appendChild(toast);
  setTimeout(
    () => {
      if (toast.isConnected) toast.remove();
    },
    tipo === "error" ? 8000 : 5000,
  );
}

export function handleError(campo, mensagem) {
  const errEl = document.querySelector(`[data-error="${campo}"]`);
  const input = document.querySelector(`[name="${campo}"], #${campo}`);

  if (errEl) {
    errEl.textContent = mensagem;
    errEl.hidden = false;
    errEl.setAttribute("role", "alert");
  }
  if (input) {
    input.setAttribute("aria-invalid", "true");
    input.classList.add("field--error");
  }
}

function _limparErro(campo) {
  const errEl = document.querySelector(`[data-error="${campo}"]`);
  const input = document.querySelector(`[name="${campo}"], #${campo}`);
  if (errEl) {
    errEl.textContent = "";
    errEl.hidden = true;
    errEl.removeAttribute("role");
  }
  if (input) {
    input.removeAttribute("aria-invalid");
    input.classList.remove("field--error");
  }
}

function _limparTodosErros() {
  document.querySelectorAll("[data-error]").forEach((el) => {
    el.textContent = "";
    el.hidden = true;
    el.removeAttribute("role");
  });
  document.querySelectorAll("[aria-invalid]").forEach((el) => {
    el.removeAttribute("aria-invalid");
    el.classList.remove("field--error");
  });
}

function _mostrarLoading(msg = "Processando...") {
  const ov = document.getElementById("loadingOverlay");
  const txt = document.getElementById("loadingMessage");
  if (ov) ov.hidden = false;
  if (txt) txt.textContent = msg;
}

function _ocultarLoading() {
  const ov = document.getElementById("loadingOverlay");
  if (ov) ov.hidden = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVEGAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function withTimeout(promise, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error(`Timeout em "${label}" (${FIREBASE_TIMEOUT_MS}ms).`);
      e.code = "TIMEOUT";
      reject(e);
    }, FIREBASE_TIMEOUT_MS);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function withRetry(fn, maxTentativas = 2) {
  let ultimo;
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      const isRede = ["auth/network-request-failed", "TIMEOUT"].includes(
        e.code,
      );
      if (!isRede || i === maxTentativas - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw ultimo;
}

function mapearErroFirebase(error) {
  const MAP = {
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "Senha muito fraca.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/operation-not-allowed": "Operação não permitida.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde.",
    "auth/network-request-failed": "Falha de conexão.",
    "database/permission-denied": "Permissão negada.",
    TIMEOUT: "Conexão lenta.",
    PAYLOAD_TOO_LARGE: "Dados muito extensos.",
    ROLE_MISMATCH: "Erro interno.",
  };
  const code = error?.code ?? "";
  return MAP[code] ?? "Erro inesperado.";
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSÃO
// ─────────────────────────────────────────────────────────────────────────────

export async function submitWizard() {
  if (isFlowLocked()) {
    showFeedback("Operação em andamento.", "warning");
    return;
  }

  _limparTodosErros();
  const dados = coletarDadosFormulario();
  const resultado = validarFormulario(dados);
  if (!resultado.isValid) {
    resultado.errors.forEach((err) => showFeedback(err, "error"));
    const campos = [
      "nomeEscola",
      "cnpj",
      "cpf",
      "telefone",
      "email",
      "senha",
      "confirmarSenha",
    ];
    campos.forEach((campo, index) => {
      if (resultado.errors[index]) handleError(campo, resultado.errors[index]);
    });
    return;
  }

  storeCredentials(dados.senha, dados.confirmarSenha);
  const email = sanitize(dados.email);
  const nome = sanitize(dados.nomeEscola);
  const cpf = sanitize(dados.cpf);
  const telefone = normalizePhone(dados.telefone);
  const nomeEscola = sanitize(dados.nomeEscola);
  const cnpj = sanitize(dados.cnpj);
  const plano = "basico";

  lockFlow();
  _mostrarLoading("Criando conta...");
  let userCredential = null;

  try {
    let methods = [];
    try {
      methods = await fetchSignInMethodsForEmail(auth, email);
    } catch {}

    if (methods.length > 0) {
      const e = new Error();
      e.code = "auth/email-already-in-use";
      throw e;
    }

    userCredential = await withTimeout(
      withRetry(() => createUserWithEmailAndPassword(auth, email, dados.senha)),
      "createUser",
    );
    const uid = userCredential.user.uid;

    if (ROLE_LITERAL !== "diretor") {
      const e = new Error();
      e.code = "ROLE_MISMATCH";
      throw e;
    }

    const payload = {
      uid,
      nome,
      email,
      cpf,
      telefone,
      role: ROLE_LITERAL,
      status: "ativo",
      plano,
      instituicao: {
        nome: nomeEscola,
        cnpj,
        emailEscola: email,
        anoLetivoAtivo: new Date().getFullYear(),
      },
      criadoEm: serverTimestamp(),
      ultimoLogin: null,
      preferencias: {
        idioma: "pt-BR",
        tema: "escuro",
        notificacoes: { email: true, push: true },
      },
    };

    if (JSON.stringify(payload).length > MAX_PAYLOAD_BYTES) {
      const e = new Error();
      e.code = "PAYLOAD_TOO_LARGE";
      throw e;
    }

    try {
      await withTimeout(
        withRetry(() => set(ref(db, `usuarios/${uid}`), payload)),
        "dbWrite",
      );
    } catch (dbErr) {
      try {
        await deleteUser(userCredential.user);
      } catch (re) {
        console.error("Rollback falhou:", re);
      }
      throw dbErr;
    }

    try {
      await set(ref(db, `logs/cadastro/${uid}`), {
        uid,
        acao: "cadastro_diretor",
        email,
        escola: nomeEscola,
        plano,
        timestamp: serverTimestamp(),
      });
    } catch (le) {
      console.error("Audit log falhou:", le);
    }

    resetFlow();
    _ocultarLoading();
    unlockFlow();
    showFeedback("Cadastro realizado! Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = "../index.html";
    }, REDIRECT_DELAY_MS);
  } catch (err) {
    console.error("Erro na submissão:", err);
    _ocultarLoading();
    unlockFlow();
    showFeedback(mapearErroFirebase(err), "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MÁSCARAS E UI
// ─────────────────────────────────────────────────────────────────────────────

function _mascaraCPF(v) {
  return v
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function _mascaraCNPJ(v) {
  return v
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function _mascaraTelefone(v) {
  const d = v.replace(/\D/g, "");
  return d.length <= 10
    ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
    : d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function _configurarMascaras() {
  const cpfEl = document.querySelector('[name="cpf"], #cpf');
  const cnpjEl = document.querySelector('[name="cnpj"], #cnpj');
  const tels = document.querySelectorAll(
    '[name="telefone"], #telefone, [name="telefoneEscola"], #telefoneEscola',
  );

  if (cpfEl)
    cpfEl.addEventListener("input", (e) => {
      e.target.value = _mascaraCPF(e.target.value).slice(0, 14);
    });
  if (cnpjEl)
    cnpjEl.addEventListener("input", (e) => {
      e.target.value = _mascaraCNPJ(e.target.value).slice(0, 18);
    });
  tels.forEach((el) =>
    el.addEventListener("input", (e) => {
      e.target.value = _mascaraTelefone(e.target.value).slice(0, 15);
    }),
  );
}

function _configurarMedidorSenha() {
  const senhaInput = document.querySelector('[name="senha"], #senha');
  if (!senhaInput) return;

  senhaInput.addEventListener("input", (e) => {
    const s = e.target.value;
    const bar = document.getElementById("passwordStrengthBar");
    const txt = document.getElementById("passwordStrengthLabel");
    let nivel = 0;

    if (s.length >= 12) nivel++;
    if (/[A-Z]/.test(s)) nivel++;
    if (/[0-9]/.test(s)) nivel++;
    if (/[^A-Za-z0-9]/.test(s)) nivel++;

    const config = {
      0: { pct: "0%", cor: "transparent", texto: "" },
      1: { pct: "25%", cor: "#f43f5e", texto: "Muito fraca" },
      2: { pct: "50%", cor: "#f0a500", texto: "Média" },
      3: { pct: "75%", cor: "#3b82f6", texto: "Boa" },
      4: { pct: "100%", cor: "#22c55e", texto: "Forte" },
    };

    if (bar) {
      bar.style.width = config[nivel].pct;
      bar.style.background = config[nivel].cor;
    }
    if (txt) txt.textContent = config[nivel].texto;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
export function initWizard(formId) {
  const form = document.getElementById(formId);
  if (!form) throw new Error(`[WIZARD] Formulário #${formId} não encontrado.`);

  createWizardFlow();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitWizard();
  });

  _configurarMascaras();
  _configurarMedidorSenha();

  const senhaEl = document.querySelector('[name="senha"], #senha');
  const confirmaEl = document.querySelector(
    '[name="confirmarSenha"], #confirmarSenha',
  );
  const _sync = () =>
    storeCredentials(senhaEl?.value ?? "", confirmaEl?.value ?? "");

  if (senhaEl) senhaEl.addEventListener("input", _sync);
  if (confirmaEl) confirmaEl.addEventListener("input", _sync);
}

export { validarStep1, validarStep2, validarStep3, validarStep4 };
