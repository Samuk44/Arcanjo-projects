// ===== wizard-pai.js =====
// Diários Escolares • Responsável Registration Wizard • State Machine & Firebase Integration
// ES6 Modules • Async/Await • sessionStorage State Management

function toISO(ddmmyyyy) {
  const [d, m, y] = (ddmmyyyy || "").split("/");
  return (d && m && y) ? `${y}-${m}-${d}` : (ddmmyyyy || "");
}

function applyDateMaskToCard(el) {
  const input = el.querySelector ? el.querySelector(".data-nascimento-aluno") : el;
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (["Tab","Backspace","Delete","ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
    if (!/\d/.test(e.key)) e.preventDefault();
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
    if (v.length < 10) { this.setCustomValidity("Use dd/mm/aaaa"); this.reportValidity(); return; }
    const [d, m, y] = v.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getDate() !== d || dt.getMonth() + 1 !== m || dt.getFullYear() !== y) {
      this.setCustomValidity("Data inválida"); this.reportValidity();
    } else { this.setCustomValidity(""); }
  });
}

import { auth, db } from "../../../assets/js/firebase/config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  deleteUser,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  ref,
  set,
  update,
  get,
  query,
  orderByChild,
  equalTo,
  push,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// ===== STATE MANAGEMENT =====
const SESSION_KEY = "SGE_PAI_WIZARD_STATE";
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
let currentStep = 1;

const getState = () => {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return null;

    const state = JSON.parse(data);
    const now = Date.now();

    if (state.createdAt && now - state.createdAt > SESSION_TTL) {
      clearState();
      return null;
    }

    return state;
  } catch (error) {
    console.error("Erro ao ler estado:", error);
    return null;
  }
};

const setState = (state) => {
  try {
    const stateToSave = {
      ...state,
      createdAt: state.createdAt || Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Erro ao salvar estado:", error);
  }
};

const clearState = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Erro ao limpar estado:", error);
  }
};

const initializeState = () => {
  let state = getState();
  if (!state) {
    state = {
      currentStep: 1,
      createdAt: Date.now(),
      step1: {
        nomeResponsavel: "",
        cpf: "",
        parentesco: "",
        telefone: "",
        email: "",
        dataNascimento: "",
        validated: false,
      },
      step2: {
        alunos: [],
        validated: false,
      },
      step3: {
        email: "",
        senha: "",
        confirmarSenha: "",
        notificacoes: {
          faltas: true,
          notas: true,
          comunicados: false,
          eventos: false,
          bilhetes: false,
          resumo: false,
        },
        foraHorario: false,
        horarioInicio: "22:00",
        horarioFim: "07:00",
        validated: false,
      },
      step4: {
        aceiteTermos: false,
        aceiteLGPD: false,
        validated: false,
      },
    };
    setState(state);
  }
  return state;
};

// ===== VALIDATION FUNCTIONS =====

const validateCPF = (cpf) => {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  let remainder;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cleaned[10]);
};

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 11;
};

const validatePasswordStrength = (password) => {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return (
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial
  );
};

const calculatePasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  if (strength <= 1) return "weak";
  if (strength <= 2) return "medium";
  return "strong";
};

// ===== STEP VALIDATION =====

const validateStep1 = () => {
  const state = getState();
  clearErrors();

  const nomeResponsavel =
    document.getElementById("nome-responsavel")?.value.trim() || "";
  const cpf = document.getElementById("cpf-responsavel")?.value.trim() || "";
  const parentesco = document.getElementById("parentesco")?.value || "";
  const telefone =
    document.getElementById("telefone-responsavel")?.value.trim() || "";
  const email =
    document.getElementById("email-responsavel")?.value.trim() || "";

  let isValid = true;

  if (!nomeResponsavel || nomeResponsavel.length < 5) {
    showError("nome-responsavel", "Nome deve ter pelo menos 5 caracteres.");
    isValid = false;
  }

  if (!cpf) {
    showError("cpf-responsavel", "CPF é obrigatório.");
    isValid = false;
  } else if (!validateCPF(cpf)) {
    showError("cpf-responsavel", "CPF inválido.");
    isValid = false;
  }

  if (!parentesco) {
    showError("parentesco", "Selecione o grau de parentesco.");
    isValid = false;
  }

  if (!telefone) {
    showError("telefone-responsavel", "Telefone é obrigatório.");
    isValid = false;
  } else if (!validatePhone(telefone)) {
    showError("telefone-responsavel", "Telefone inválido.");
    isValid = false;
  }

  if (!email) {
    showError("email-responsavel", "Email é obrigatório.");
    isValid = false;
  } else if (!validateEmail(email)) {
    showError("email-responsavel", "Email inválido.");
    isValid = false;
  }

  if (isValid) {
    state.step1 = {
      nomeResponsavel,
      cpf: cpf.replace(/\D/g, ""),
      parentesco,
      telefone: telefone.replace(/\D/g, ""),
      email,
      dataNascimento:
        document.getElementById("data-nascimento-responsavel")?.value || "",
      validated: true,
    };
    setState(state);
  }

  return isValid;
};

const validateStep2 = () => {
  const state = getState();
  clearErrors();

  const alunosCards = document.querySelectorAll(".aluno-card");
  const alunos = [];
  let isValid = true;

  alunosCards.forEach((card, index) => {
    const nomeAluno = card.querySelector(".nome-aluno")?.value.trim() || "";
    const dataNascimento =
      card.querySelector(".data-nascimento-aluno")?.value || "";
    const turma = card.querySelector(".turma-aluno")?.value || "";
    const turno = card.querySelector(".turno-aluno")?.value || "";
    const periodo = card.querySelector(".periodo-aluno")?.value || "";

    if (!nomeAluno || nomeAluno.length < 3) {
      showError(
        `aluno-${index}`,
        "Nome do aluno deve ter pelo menos 3 caracteres.",
      );
      isValid = false;
    }

    if (!dataNascimento) {
      showError(`aluno-${index}`, "Data de nascimento é obrigatória.");
      isValid = false;
    }

    if (!turma) {
      showError(`aluno-${index}`, "Turma é obrigatória.");
      isValid = false;
    }

    if (!turno) {
      showError(`aluno-${index}`, "Turno é obrigatório.");
      isValid = false;
    }

    if (!periodo) {
      showError(`aluno-${index}`, "Período é obrigatório.");
      isValid = false;
    }

    if (nomeAluno && dataNascimento && turma && turno && periodo) {
      alunos.push({
        nome: nomeAluno,
        dataNascimento,
        turma,
        turno,
        periodo,
      });
    }
  });

  if (alunos.length === 0) {
    showFeedback("Adicione pelo menos um aluno.", "error");
    return false;
  }

  if (isValid) {
    state.step2 = {
      alunos,
      validated: true,
    };
    setState(state);
  }

  return isValid;
};

const validateStep3 = () => {
  const state = getState();
  clearErrors();

  const email = document.getElementById("email-acesso")?.value || "";
  const senha = document.getElementById("senha-responsavel")?.value || "";
  const confirmarSenha =
    document.getElementById("confirmar-senha-responsavel")?.value || "";

  let isValid = true;

  if (!senha) {
    showError("senha-responsavel", "Senha é obrigatória.");
    isValid = false;
  } else if (!validatePasswordStrength(senha)) {
    showError(
      "senha-responsavel",
      "Senha fraca. Use 8+ caracteres, maiúsculas, números e símbolos.",
    );
    isValid = false;
  }

  if (!confirmarSenha) {
    showError(
      "confirmar-senha-responsavel",
      "Confirmação de senha é obrigatória.",
    );
    isValid = false;
  } else if (senha !== confirmarSenha) {
    showError("confirmar-senha-responsavel", "As senhas não coincidem.");
    isValid = false;
  }

  if (isValid) {
    state.step3 = {
      email,
      senha,
      confirmarSenha,
      notificacoes: {
        faltas: document.getElementById("notif-faltas")?.checked || false,
        notas: document.getElementById("notif-notas")?.checked || false,
        comunicados:
          document.getElementById("notif-comunicados")?.checked || false,
        eventos: document.getElementById("notif-eventos")?.checked || false,
        bilhetes: document.getElementById("notif-bilhetes")?.checked || false,
        resumo: document.getElementById("notif-resumo")?.checked || false,
      },
      foraHorario:
        document.getElementById("notif-fora-horario")?.checked || false,
      horarioInicio:
        document.getElementById("horario-inicio")?.value || "22:00",
      horarioFim: document.getElementById("horario-fim")?.value || "07:00",
      validated: true,
    };
    setState(state);
  }

  return isValid;
};

const validateStep4 = () => {
  clearErrors();

  const aceiteTermos =
    document.getElementById("aceite-termos")?.checked || false;
  const aceiteLGPD = document.getElementById("aceite-lgpd")?.checked || false;

  if (!aceiteTermos || !aceiteLGPD) {
    showError("aceite-legal", "Você deve aceitar os termos e a LGPD.");
    return false;
  }

  const state = getState();
  state.step4 = {
    aceiteTermos,
    aceiteLGPD,
    validated: true,
  };
  setState(state);

  return true;
};

// ===== UI HELPERS =====

const showError = (fieldId, message) => {
  const errorEl = document.querySelector(`[data-field="${fieldId}"]`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add("show");
  }
};

const clearErrors = () => {
  document.querySelectorAll(".error-message").forEach((el) => {
    el.classList.remove("show");
    el.textContent = "";
  });
};

const showFeedback = (message, type = "error") => {
  const feedbackEl = document.getElementById("feedback");
  if (feedbackEl) {
    feedbackEl.textContent = message;
    feedbackEl.className = `p-4 rounded-lg border ${type === "success" ? "bg-green-900/20 border-green-700 text-green-400" : "bg-red-900/20 border-red-700 text-red-400"}`;
    feedbackEl.classList.remove("hidden");

    setTimeout(() => {
      feedbackEl.classList.add("hidden");
    }, 5000);
  }
};

const updateProgress = (step) => {
  const percentages = { 1: 25, 2: 50, 3: 75, 4: 100 };
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");
  const currentStepEl = document.getElementById("current-step");

  if (progressBar) progressBar.style.width = `${percentages[step]}%`;
  if (progressPercent) progressPercent.textContent = `${percentages[step]}%`;
  if (currentStepEl) currentStepEl.textContent = step;
};

const formatCPF = (cpf) => {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return phone;
};

// ===== STEP NAVIGATION =====

const nextStep = () => {
  let isValid = false;

  switch (currentStep) {
    case 1:
      isValid = validateStep1();
      break;
    case 2:
      isValid = validateStep2();
      break;
    case 3:
      isValid = validateStep3();
      break;
    default:
      isValid = false;
  }

  if (!isValid) {
    showFeedback("Por favor, preencha todos os campos corretamente.", "error");
    return;
  }

  if (currentStep < 4) {
    currentStep++;
    showStep(currentStep);
    updateProgress(currentStep);
  }
};

const prevStep = () => {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
    updateProgress(currentStep);
  }
};

const showStep = (step) => {
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.remove("active");
  });

  const stepEl = document.querySelector(`[data-step="${step}"]`);
  if (stepEl) {
    stepEl.classList.add("active");
  }

  restoreFormData(step);
  window.scrollTo(0, 0);
};

const editStep = (step) => {
  currentStep = step;
  showStep(step);
  updateProgress(step);
};

const cancelWizard = () => {
  if (confirm("Tem certeza que deseja cancelar o cadastro?")) {
    clearState();
    window.location.href = "/";
  }
};

// ===== ALUNO MANAGEMENT =====

const addAluno = () => {
  const container = document.getElementById("alunos-container");
  const alunoCount = container.querySelectorAll(".aluno-card").length;

  if (alunoCount >= 3) {
    showFeedback("Máximo de 3 filhos permitidos.", "error");
    return;
  }

  const newCard = document.createElement("div");
  newCard.className =
    "aluno-card bg-surface border border-border rounded-lg p-4 space-y-4";
  newCard.innerHTML = `
    <div class="flex justify-between items-center">
      <h3 class="font-semibold text-text">Aluno ${alunoCount + 1}</h3>
      <button type="button" onclick="removeAluno(${alunoCount})" class="text-muted hover:text-primary transition">✕</button>
    </div>

    <div>
      <label class="block text-sm font-semibold text-muted uppercase tracking-wider mb-2">Nome Completo do Aluno</label>
      <input type="text" class="nome-aluno w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" placeholder="Ex: Maria Silva" minlength="3" required>
      <div class="error-message"></div>
    </div>

    <div>
      <label class="block text-sm font-semibold text-muted uppercase tracking-wider mb-2">Data de Nascimento</label>
      <input type="text" class="data-nascimento-aluno w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" placeholder="dd/mm/aaaa" maxlength="10" inputmode="numeric" autocomplete="off" required>
      <div class="error-message"></div>
    </div>

    <div>
      <label class="block text-sm font-semibold text-muted uppercase tracking-wider mb-2">Turma</label>
      <select class="turma-aluno w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" required>
        <option value="">Selecione...</option>
        <optgroup label="Ensino Fundamental I">
          <option value="1A">1º Ano A</option>
          <option value="1B">1º Ano B</option>
          <option value="1C">1º Ano C</option>
          <option value="1D">1º Ano D</option>
          <option value="1E">1º Ano E</option>
          <option value="1F">1º Ano F</option>
          <option value="2A">2º Ano A</option>
          <option value="2B">2º Ano B</option>
          <option value="2C">2º Ano C</option>
          <option value="2D">2º Ano D</option>
          <option value="2E">2º Ano E</option>
          <option value="2F">2º Ano F</option>
          <option value="3A">3º Ano A</option>
          <option value="3B">3º Ano B</option>
          <option value="3C">3º Ano C</option>
          <option value="3D">3º Ano D</option>
          <option value="3E">3º Ano E</option>
          <option value="3F">3º Ano F</option>
          <option value="4A">4º Ano A</option>
          <option value="4B">4º Ano B</option>
          <option value="4C">4º Ano C</option>
          <option value="4D">4º Ano D</option>
          <option value="4E">4º Ano E</option>
          <option value="4F">4º Ano F</option>
          <option value="5A">5º Ano A</option>
          <option value="5B">5º Ano B</option>
          <option value="5C">5º Ano C</option>
          <option value="5D">5º Ano D</option>
          <option value="5E">5º Ano E</option>
          <option value="5F">5º Ano F</option>
        </optgroup>
        <optgroup label="Ensino Fundamental II">
          <option value="6A">6º Ano A</option>
          <option value="6B">6º Ano B</option>
          <option value="6C">6º Ano C</option>
          <option value="6D">6º Ano D</option>
          <option value="6E">6º Ano E</option>
          <option value="6F">6º Ano F</option>
          <option value="7A">7º Ano A</option>
          <option value="7B">7º Ano B</option>
          <option value="7C">7º Ano C</option>
          <option value="7D">7º Ano D</option>
          <option value="7E">7º Ano E</option>
          <option value="7F">7º Ano F</option>
          <option value="8A">8º Ano A</option>
          <option value="8B">8º Ano B</option>
          <option value="8C">8º Ano C</option>
          <option value="8D">8º Ano D</option>
          <option value="8E">8º Ano E</option>
          <option value="8F">8º Ano F</option>
          <option value="9A">9º Ano A</option>
          <option value="9B">9º Ano B</option>
          <option value="9C">9º Ano C</option>
          <option value="9D">9º Ano D</option>
          <option value="9E">9º Ano E</option>
          <option value="9F">9º Ano F</option>
        </optgroup>
        <optgroup label="Ensino Médio">
          <option value="1MA">1º Médio A</option>
          <option value="1MB">1º Médio B</option>
          <option value="1MC">1º Médio C</option>
          <option value="1MD">1º Médio D</option>
          <option value="1ME">1º Médio E</option>
          <option value="1MF">1º Médio F</option>
          <option value="2MA">2º Médio A</option>
          <option value="2MB">2º Médio B</option>
          <option value="2MC">2º Médio C</option>
          <option value="2MD">2º Médio D</option>
          <option value="2ME">2º Médio E</option>
          <option value="2MF">2º Médio F</option>
          <option value="3MA">3º Médio A</option>
          <option value="3MB">3º Médio B</option>
          <option value="3MC">3º Médio C</option>
          <option value="3MD">3º Médio D</option>
          <option value="3ME">3º Médio E</option>
          <option value="3MF">3º Médio F</option>
        </optgroup>
        <optgroup label="Ensino Médio Técnico">
          <option value="1TA-ADM">1º Ano A - Administração</option>
          <option value="1TA-DS">1º Ano A - Desenvolvimento de Sistemas</option>
          <option value="1TA-LOG">1º Ano A - Logística</option>
          <option value="1TA-ST">1º Ano A - Segurança do Trabalho</option>
          <option value="2TA-ADM">2º Ano A - Administração</option>
          <option value="2TA-DS">2º Ano A - Desenvolvimento de Sistemas</option>
          <option value="2TA-LOG">2º Ano A - Logística</option>
          <option value="2TA-ST">2º Ano A - Segurança do Trabalho</option>
          <option value="3TA-ADM">3º Ano A - Administração</option>
          <option value="3TA-DS">3º Ano A - Desenvolvimento de Sistemas</option>
          <option value="3TA-LOG">3º Ano A - Logística</option>
          <option value="3TA-ST">3º Ano A - Segurança do Trabalho</option>
        </optgroup>
      </select>
      <div class="error-message"></div>
    </div>

    <div>
      <label class="block text-sm font-semibold text-muted uppercase tracking-wider mb-2">Turno</label>
      <select class="turno-aluno w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" required>
        <option value="">Selecione...</option>
        <option value="manha">Manhã (07:00-12:00)</option>
        <option value="tarde">Tarde (13:00-17:30)</option>
        <option value="noite">Noite (19:00-22:00)</option>
      </select>
      <div class="error-message"></div>
    </div>

    <div>
      <label class="block text-sm font-semibold text-muted uppercase tracking-wider mb-2">Período de Início</label>
      <select class="periodo-aluno w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" required>
        <option value="">Selecione...</option>
        <option value="1bi">1º Bimestre</option>
        <option value="2bi">2º Bimestre</option>
        <option value="3bi">3º Bimestre</option>
        <option value="4bi">4º Bimestre</option>
      </select>
      <div class="error-message"></div>
    </div>
  `;

  container.appendChild(newCard);
  applyDateMaskToCard(newCard);
  updateRemoveButtons();
};

const removeAluno = (index) => {
  const container = document.getElementById("alunos-container");
  const cards = container.querySelectorAll(".aluno-card");

  if (cards.length > 1) {
    cards[index].remove();
    updateRemoveButtons();
  } else {
    showFeedback("Você deve ter pelo menos um aluno.", "error");
  }
};

const updateRemoveButtons = () => {
  const container = document.getElementById("alunos-container");
  const cards = container.querySelectorAll(".aluno-card");
  const btnAddAluno = document.getElementById("btn-add-aluno");

  cards.forEach((card, index) => {
    const removeBtn = card.querySelector("button[onclick*='removeAluno']");
    if (removeBtn) {
      removeBtn.style.display = cards.length > 1 ? "block" : "none";
    }
  });

  if (cards.length >= 3) {
    btnAddAluno.style.display = "none";
  } else {
    btnAddAluno.style.display = "block";
  }
};

// ===== FORM DATA RESTORATION =====

const restoreFormData = (step) => {
  const state = getState();

  switch (step) {
    case 1:
      if (state.step1.nomeResponsavel) {
        document.getElementById("nome-responsavel").value =
          state.step1.nomeResponsavel;
      }
      if (state.step1.cpf) {
        document.getElementById("cpf-responsavel").value = formatCPF(
          state.step1.cpf,
        );
      }
      if (state.step1.parentesco) {
        document.getElementById("parentesco").value = state.step1.parentesco;
      }
      if (state.step1.telefone) {
        document.getElementById("telefone-responsavel").value = formatPhone(
          state.step1.telefone,
        );
      }
      if (state.step1.email) {
        document.getElementById("email-responsavel").value = state.step1.email;
      }
      if (state.step1.dataNascimento) {
        document.getElementById("data-nascimento-responsavel").value =
          state.step1.dataNascimento;
      }
      break;

    case 2:
      const container = document.getElementById("alunos-container");
      const existingCards = container.querySelectorAll(".aluno-card");
      existingCards.forEach((card, index) => {
        if (index > 0) card.remove();
      });

      if (state.step2.alunos.length > 0) {
        state.step2.alunos.forEach((aluno, index) => {
          if (index > 0) addAluno();

          const card = container.querySelectorAll(".aluno-card")[index];
          card.querySelector(".nome-aluno").value = aluno.nome;
          card.querySelector(".data-nascimento-aluno").value =
            aluno.dataNascimento;
          card.querySelector(".turma-aluno").value = aluno.turma;
          card.querySelector(".turno-aluno").value = aluno.turno;
          card.querySelector(".periodo-aluno").value = aluno.periodo;
        });
      }
      updateRemoveButtons();
      break;

    case 3:
      document.getElementById("email-acesso").value = state.step1.email;
      if (state.step3.notificacoes.faltas) {
        document.getElementById("notif-faltas").checked = true;
      }
      if (state.step3.notificacoes.notas) {
        document.getElementById("notif-notas").checked = true;
      }
      if (state.step3.notificacoes.comunicados) {
        document.getElementById("notif-comunicados").checked = true;
      }
      if (state.step3.notificacoes.eventos) {
        document.getElementById("notif-eventos").checked = true;
      }
      if (state.step3.notificacoes.bilhetes) {
        document.getElementById("notif-bilhetes").checked = true;
      }
      if (state.step3.notificacoes.resumo) {
        document.getElementById("notif-resumo").checked = true;
      }
      if (state.step3.foraHorario) {
        document.getElementById("notif-fora-horario").checked = true;
        document.getElementById("horario-container").style.display = "block";
      }
      document.getElementById("horario-inicio").value =
        state.step3.horarioInicio;
      document.getElementById("horario-fim").value = state.step3.horarioFim;
      break;

    case 4:
      renderSummary(state);
      break;
  }
};

const renderSummary = (state) => {
  const summaryResponsavel = document.getElementById("summary-responsavel");
  summaryResponsavel.innerHTML = `
    <div><strong>Nome:</strong> ${state.step1.nomeResponsavel}</div>
    <div><strong>CPF:</strong> ${formatCPF(state.step1.cpf)}</div>
    <div><strong>Telefone:</strong> ${formatPhone(state.step1.telefone)}</div>
    <div><strong>Email:</strong> ${state.step1.email}</div>
  `;

  const summaryAlunos = document.getElementById("summary-alunos");
  const alunosHtml = state.step2.alunos
    .map((aluno) => {
      return `<div>${aluno.nome} - ${aluno.turma} - ${aluno.turno}</div>`;
    })
    .join("");
  summaryAlunos.innerHTML = alunosHtml;

  const summaryConfig = document.getElementById("summary-config");
  const notificacoesAtivas = Object.entries(state.step3.notificacoes)
    .filter(([_, value]) => value)
    .map(([key, _]) => {
      const labels = {
        faltas: "Faltas e Presenças",
        notas: "Notas e Desempenho",
        comunicados: "Comunicados e Avisos",
        eventos: "Eventos Escolares",
        bilhetes: "Bilhetes e Circulares",
        resumo: "Resumo Semanal",
      };
      return labels[key] || key;
    })
    .join(", ");

  summaryConfig.innerHTML = `
    <div><strong>Email de Login:</strong> ${state.step3.email}</div>
    <div><strong>Senha:</strong> ••••••••</div>
    <div><strong>Notificações Ativas:</strong> ${notificacoesAtivas || "Nenhuma"}</div>
  `;
};

// ===== FIREBASE SUBMISSION =====

const retryWithExponentialBackoff = async (fn, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

const mapFirebaseError = (error) => {
  const errorCode = error.code || "";
  const errorMap = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado no sistema.",
    "auth/weak-password": "A senha é muito fraca.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/operation-not-allowed": "Operação não permitida. Contate o suporte.",
    "database/permission-denied": "Erro de permissão ao salvar dados.",
    "network-error": "Erro de conexão. Verifique sua internet.",
  };
  return errorMap[errorCode] || "Erro desconhecido. Tente novamente.";
};
const submitWizard = async () => {
  const state = getState();

  if (!validateStep4()) {
    showFeedback("Por favor, aceite os termos.", "error");
    return;
  }

  const submitBtn = document.querySelector("button[onclick='submitWizard()']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Processando...";

  try {
    // ✅ VERIFICAÇÃO PRÉVIA: Verifica se auth está inicializado
    if (!auth) {
      throw new Error("Firebase Auth não inicializado. Verifique config.js");
    }

    // ✅ VERIFICAÇÃO: Email válido
    if (!state.step1.email || !state.step1.email.includes("@")) {
      throw new Error("Email inválido");
    }

    // ✅ VERIFICAÇÃO: Senha válida
    if (!state.step3.senha || state.step3.senha.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    // Tenta criar usuário com timeout
    const userCredential = await Promise.race([
      retryWithExponentialBackoff(() =>
        createUserWithEmailAndPassword(
          auth,
          state.step1.email,
          state.step3.senha,
        ),
      ),
      // Timeout de 10 segundos
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Tempo de conexão esgotado")), 10000),
      ),
    ]);

    const user = userCredential.user;
    const uid = user.uid;

    try {
      await updateProfile(user, {
        displayName: state.step1.nomeResponsavel,
      });
    } catch (profileError) {
      console.error("Erro ao atualizar perfil:", profileError);
    }

    try {
      // Salva dados do responsável
      await retryWithExponentialBackoff(() =>
        set(ref(db, `usuarios/${uid}`), {
          uid,
          nome: state.step1.nomeResponsavel,
          email: state.step1.email,
          cpf: state.step1.cpf,
          telefone: state.step1.telefone,
          parentesco: state.step1.parentesco,
          dataNascimento: toISO(state.step1.dataNascimento),
          role: "pai",
          status: "ativo",
          notificacoes: state.step3.notificacoes,
          foraHorario: state.step3.foraHorario,
          horarioInicio: state.step3.horarioInicio,
          horarioFim: state.step3.horarioFim,
          alunosIds: [],
          criadoEm: new Date().toISOString(),
        }),
      );

      // Cria e vincula alunos
      const alunosIds = [];
      const alunosPromises = [];

      for (const alunoData of state.step2.alunos) {
        const alunoRef = push(ref(db, "alunos"));
        const alunoId = alunoRef.key;

        // Prepara a promessa de salvar o aluno
        const alunoPromise = set(ref(db, `alunos/${alunoId}`), {
          nome: alunoData.nome,
          dataNascimento: toISO(alunoData.dataNascimento),
          turma: alunoData.turma,
          turno: alunoData.turno,
          periodo: alunoData.periodo,
          responsavelId: uid, // ← VÍNCULO CRÍTICO
          criadoEm: new Date().toISOString(),
        });

        alunosPromises.push(alunoPromise);
        alunosIds.push(alunoId);
      }

      // Aguarda todos os alunos serem salvos
      await Promise.all(alunosPromises);

      // Atualiza o pai COM OS IDs DOS ALUNOS
      await update(ref(db, `usuarios/${uid}`), {
        alunosIds: alunosIds, // ← AGORA VAI FUNCIONAR
        role: "pai",
        status: "ativo",
      });
      await update(ref(db, `usuarios/${uid}`), {
        alunosIds: alunosIds,
      });
    } catch (paiError) {
      console.error("Erro ao salvar dados:", paiError);
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error("Erro ao deletar usuário:", deleteError);
      }
      throw new Error("Erro ao salvar dados. Tente novamente.");
    }

    // ✅ Sucesso - Login automático
    clearState();
    showFeedback("Cadastro realizado! Redirecionando...", "success");

    // Faz login automático com as credenciais recém-criadas
    try {
      await signInWithEmailAndPassword(
        auth,
        state.step1.email,
        state.step3.senha,
      );

      // Aguarda 1 segundo e redireciona para o painel do pai
      setTimeout(() => {
        window.location.href = "/pai/pai_index.html";
      }, 1000);
    } catch (loginError) {
      console.error("Erro no login automático:", loginError);
      // Se falhar o login automático, manda para o login manual
      setTimeout(() => {
        window.location.href = "/auth/login.html";
      }, 2000);
    }
  } catch (error) {
    console.error("Erro no cadastro:", error);
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar Conta";

    // ✅ TRATAMENTO ESPECÍFICO DE ERROS
    let errorMessage = "Erro ao criar conta. Tente novamente.";

    if (error.code === "auth/network-request-failed") {
      errorMessage =
        "Erro de conexão. Verifique sua internet e tente novamente.";
    } else if (error.code === "auth/email-already-in-use") {
      errorMessage = "Este e-mail já está cadastrado.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Senha muito fraca. Use pelo menos 6 caracteres.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "E-mail inválido.";
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("Tempo")
    ) {
      errorMessage = "Servidor demorou para responder. Tente novamente.";
    }

    showFeedback(errorMessage, "error");
  }
};
// ===== MODAL FUNCTIONS =====

const toggleModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle("active");
  }
};

// ===== EXPOSIÇÃO GLOBAL PARA INLINE ONCLICK =====
// Necessário porque type="module" isola o escopo
window.nextStep = nextStep;
window.prevStep = prevStep;
window.editStep = editStep;
window.cancelWizard = cancelWizard;
window.submitWizard = submitWizard;
window.toggleModal = toggleModal;
window.addAluno = addAluno;
window.removeAluno = removeAluno;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  initializeState();
  showStep(1);
  updateProgress(1);
  updateRemoveButtons();

  // Monitor de força de senha
  const senhaInput = document.getElementById("senha-responsavel");
  if (senhaInput) {
    senhaInput.addEventListener("input", (e) => {
      const password = e.target.value;
      const strength = calculatePasswordStrength(password);

      const strengthBar = document.getElementById("strength-bar");
      strengthBar.className = `strength-bar strength-${strength}`;

      document.getElementById("check-length").textContent =
        password.length >= 8 ? "☑" : "☐";
      document.getElementById("check-upper").textContent = /[A-Z]/.test(
        password,
      )
        ? "☑"
        : "☐";
      document.getElementById("check-number").textContent = /[0-9]/.test(
        password,
      )
        ? "☑"
        : "☐";
      document.getElementById("check-special").textContent =
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "☑" : "☐";
    });
  }

  // Toggle horário
  const notifForaHorario = document.getElementById("notif-fora-horario");
  if (notifForaHorario) {
    notifForaHorario.addEventListener("change", (e) => {
      const horarioContainer = document.getElementById("horario-container");
      horarioContainer.style.display = e.target.checked ? "block" : "none";
    });
  }

  // Máscara de data — aplica no card inicial já presente no DOM
  document.querySelectorAll(".data-nascimento-aluno").forEach(applyDateMaskToCard);

  const inputResp = document.getElementById("data-nascimento-responsavel");
  if (inputResp) {
    inputResp.addEventListener("keydown", function (e) {
      if (!["Tab","Backspace","Delete","ArrowLeft","ArrowRight","Home","End"].includes(e.key) && !/\d/.test(e.key)) e.preventDefault();
    });
    inputResp.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5);
      this.value = v;
    });
    inputResp.addEventListener("blur", function () {
      this.classList.toggle("border-red-500", !!this.value && !/^\d{2}\/\d{2}\/\d{4}$/.test(this.value));
    });
  }

  // Máscaras de input
  const cpfInput = document.getElementById("cpf-responsavel");
  if (cpfInput) {
    cpfInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      e.target.value = value
        .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        .slice(0, 14);
    });
  }

  const telefoneInput = document.getElementById("telefone-responsavel");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      if (value.length <= 10) {
        e.target.value = value.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
      } else {
        e.target.value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      }
    });
  }
});

// ===== END wizard-pai.js =====
