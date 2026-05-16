// ===== wizard.js =====
// SGE v2.0 • Diretor Registration Wizard • Firebase Integration
// ES6 Modules • Async/Await • sessionStorage State Management

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyCOug2MkZHwH5rzGXxzlPpVZEu4IHbt0Ck",
  authDomain: "farolescolar.firebaseapp.com",
  databaseURL: "https://farolescolar-default-rtdb.firebaseio.com",
  projectId: "farolescolar",
  storageBucket: "farolescolar.firebasestorage.app",
  messagingSenderId: "31040592917",
  appId: "1:31040592917:web:f90e2f0441c35ed92b421c",
  measurementId: "G-1B6HPZNFFJ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// ===== STATE MANAGEMENT =====
const SESSION_KEY = "sge_diretor_wizard";
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

const getSessionData = () => {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data);
    const now = Date.now();
    if (parsed.timestamp && now - parsed.timestamp > SESSION_TTL) {
      sessionStorage.removeItem(SESSION_KEY);
      return {};
    }
    return parsed.data || {};
  } catch (e) {
    console.error("Error reading session:", e);
    return {};
  }
};

const setSessionData = (data) => {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch (e) {
    console.error("Error saving session:", e);
  }
};

const clearSessionData = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error("Error clearing session:", e);
  }
};

// ===== VALIDATION FUNCTIONS =====
const validateCNPJ = (cnpj) => {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;

  let sum = 0;
  let remainder;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * (5 - (i % 4));
  }
  remainder = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (remainder !== parseInt(cleaned[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * (6 - ((i + 1) % 4));
  }
  remainder = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return remainder === parseInt(cleaned[13]);
};

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

const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  if (strength <= 1) return "weak";
  if (strength <= 2) return "medium";
  return "strong";
};

// ===== FORMATTING FUNCTIONS =====
const formatCNPJ = (value) => {
  const cleaned = value.replace(/\D/g, "");
  return cleaned.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5",
  );
};

const formatCPF = (value) => {
  const cleaned = value.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatPhone = (value) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return value;
};

// ===== UI HELPERS =====
const showFeedback = (message, type = "error") => {
  const feedback = document.getElementById("form-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `${type} show`;
  feedback.setAttribute("aria-live", "polite");

  setTimeout(() => {
    feedback.classList.remove("show");
  }, 5000);
};

const showError = (fieldName, message) => {
  const errorEl = document.querySelector(`[data-field="${fieldName}"]`);
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

const setLoading = (button, isLoading) => {
  if (isLoading) {
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.classList.remove("loading");
    button.disabled = false;
  }
};

const checkOnlineStatus = () => {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;

  if (!navigator.onLine) {
    banner.classList.add("show");
  } else {
    banner.classList.remove("show");
  }
};

// ===== RETRY LOGIC =====
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

// ===== FIREBASE ERROR MAPPING =====
const mapFirebaseError = (error) => {
  const errorCode = error.code || "";
  const errorMap = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado no sistema.",
    "auth/weak-password":
      "A senha é muito fraca. Use 8+ caracteres, maiúsculas, números e símbolos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/operation-not-allowed": "Operação não permitida. Contate o suporte.",
    "auth/user-disabled": "Usuário desabilitado.",
    "database/permission-denied":
      "Erro de permissão ao salvar dados. Contate o suporte.",
    "network-error":
      "Erro de conexão. Verifique sua internet e tente novamente.",
  };
  return errorMap[errorCode] || "Erro desconhecido. Tente novamente.";
};

// ===== STEP VALIDATION =====
const validateStep1 = () => {
  clearErrors();
  const data = getSessionData();

  const nomeEscola = document.getElementById("nomeEscola").value.trim();
  const cnpjEscola = document.getElementById("cnpjEscola").value.trim();
  const telefoneEscola = document.getElementById("telefoneEscola").value.trim();
  const emailEscola = document.getElementById("emailEscola").value.trim();

  let isValid = true;

  if (!nomeEscola) {
    showError("nomeEscola", "Nome da escola é obrigatório.");
    isValid = false;
  }

  if (cnpjEscola && !validateCNPJ(cnpjEscola)) {
    showError("cnpjEscola", "CNPJ inválido.");
    isValid = false;
  }

  if (telefoneEscola && !validatePhone(telefoneEscola)) {
    showError("telefoneEscola", "Telefone inválido.");
    isValid = false;
  }

  if (emailEscola && !validateEmail(emailEscola)) {
    showError("emailEscola", "E-mail inválido.");
    isValid = false;
  }

  if (isValid) {
    data.step1 = {
      nomeEscola,
      cnpjEscola: cnpjEscola.replace(/\D/g, ""),
      telefoneEscola: telefoneEscola.replace(/\D/g, ""),
      emailEscola,
    };
    setSessionData(data);
  }

  return isValid;
};

const validateStep2 = () => {
  clearErrors();
  const data = getSessionData();

  const nomeCompleto = document.getElementById("nomeCompleto").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefone = document.getElementById("telefone").value.trim();

  let isValid = true;

  if (!nomeCompleto) {
    showError("nomeCompleto", "Nome completo é obrigatório.");
    isValid = false;
  }

  if (cpf && !validateCPF(cpf)) {
    showError("cpf", "CPF inválido.");
    isValid = false;
  }

  if (!email) {
    showError("email", "E-mail é obrigatório.");
    isValid = false;
  } else if (!validateEmail(email)) {
    showError("email", "E-mail inválido.");
    isValid = false;
  }

  if (telefone && !validatePhone(telefone)) {
    showError("telefone", "Telefone inválido.");
    isValid = false;
  }

  if (isValid) {
    data.step2 = {
      nomeCompleto,
      cpf: cpf.replace(/\D/g, ""),
      email,
      telefone: telefone.replace(/\D/g, ""),
    };
    setSessionData(data);
  }

  return isValid;
};

const validateStep3 = () => {
  clearErrors();
  const data = getSessionData();

  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;
  const plano = document.querySelector('input[name="plano"]:checked');

  let isValid = true;

  if (!senha) {
    showError("senha", "Senha é obrigatória.");
    isValid = false;
  } else if (!validatePasswordStrength(senha)) {
    showError(
      "senha",
      "Senha fraca. Use 8+ caracteres, maiúsculas, números e símbolos.",
    );
    isValid = false;
  }

  if (!confirmarSenha) {
    showError("confirmarSenha", "Confirmação de senha é obrigatória.");
    isValid = false;
  } else if (senha !== confirmarSenha) {
    showError("confirmarSenha", "As senhas não coincidem.");
    isValid = false;
  }

  if (!plano) {
    showError("plano", "Selecione um plano.");
    isValid = false;
  }

  if (isValid) {
    data.step3 = {
      senha,
      plano: plano.value,
    };
    setSessionData(data);
  }

  return isValid;
};

const validateStep4 = () => {
  clearErrors();

  const aceiteTermos = document.getElementById("aceiteTermos");

  if (!aceiteTermos.checked) {
    showError(
      "aceiteTermos",
      "Você deve aceitar os termos e a política de privacidade.",
    );
    return false;
  }

  return true;
};

// ===== STEP NAVIGATION =====
const getCurrentStep = () => {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("step")) || 1;
};

const goToStep = (step) => {
  window.location.href = `?step=${step}`;
};

const goBack = () => {
  const currentStep = getCurrentStep();
  if (currentStep > 1) {
    goToStep(currentStep - 1);
  } else {
    window.location.href = "/";
  }
};

// ===== STEP 4 SUMMARY =====
const renderSummary = () => {
  const data = getSessionData();
  const container = document.getElementById("summary-container");

  if (!container) return;

  const step1 = data.step1 || {};
  const step2 = data.step2 || {};
  const step3 = data.step3 || {};

  const html = `
        <div class="summary-item">
            <span class="summary-label">Escola</span>
            <span class="summary-value">${step1.nomeEscola || "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">CNPJ</span>
            <span class="summary-value">${step1.cnpjEscola ? formatCNPJ(step1.cnpjEscola) : "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Telefone Escola</span>
            <span class="summary-value">${step1.telefoneEscola ? formatPhone(step1.telefoneEscola) : "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">E-mail Escola</span>
            <span class="summary-value">${step1.emailEscola || "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Diretor</span>
            <span class="summary-value">${step2.nomeCompleto || "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">CPF</span>
            <span class="summary-value">${step2.cpf ? formatCPF(step2.cpf) : "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">E-mail Pessoal</span>
            <span class="summary-value">${step2.email || "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Telefone Pessoal</span>
            <span class="summary-value">${step2.telefone ? formatPhone(step2.telefone) : "-"}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Plano</span>
            <span class="summary-value">${step3.plano === "simples" ? "Simples" : "Completo"}</span>
        </div>
    `;

  container.innerHTML = html;
};

// ===== FIREBASE SUBMISSION =====
const submitRegistration = async () => {
  const data = getSessionData();

  if (!data.step1 || !data.step2 || !data.step3) {
    showFeedback(
      "Dados incompletos. Volte e preencha todos os campos.",
      "error",
    );
    return;
  }

  const button = document.getElementById("btn-submit");
  setLoading(button, true);

  try {
    // BACKEND: Create user in Firebase Auth
    const userCredential = await retryWithExponentialBackoff(() =>
      createUserWithEmailAndPassword(auth, data.step2.email, data.step3.senha),
    );

    const user = userCredential.user;
    const uid = user.uid;

    try {
      // BACKEND: Update user profile
      await updateProfile(user, {
        displayName: data.step2.nomeCompleto,
      });
    } catch (profileError) {
      console.error("Profile update error:", profileError);
    }

    try {
      // BACKEND: Write school data to database
      await retryWithExponentialBackoff(() =>
        set(ref(database, "escola/info"), {
          nome: data.step1.nomeEscola,
          cnpj: data.step1.cnpjEscola,
          telefone: data.step1.telefoneEscola,
          email: data.step1.emailEscola,
          logoURL: null,
          planoEscola: data.step3.plano,
          anoLetivoAtivo: new Date().getFullYear(),
          criadoEm: new Date().toISOString(),
        }),
      );
    } catch (schoolError) {
      console.error("School data write error:", schoolError);
      // BACKEND: Rollback - delete user if school data fails
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error("User deletion error:", deleteError);
      }
      throw new Error("Erro ao salvar dados da escola. Tente novamente.");
    }

    try {
      // BACKEND: Write user data to database
      await retryWithExponentialBackoff(() =>
        set(ref(database, `usuarios/${uid}`), {
          nome: data.step2.nomeCompleto,
          email: data.step2.email,
          cpf: data.step2.cpf,
          telefone: data.step2.telefone,
          role: "diretor",
          status: "ativo",
          plano: data.step3.plano,
          escolaId: "principal",
          fcmToken: null,
          prefs: {},
          criadoEm: new Date().toISOString(),
        }),
      );
    } catch (userError) {
      console.error("User data write error:", userError);
      // BACKEND: Rollback - delete user if user data fails
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error("User deletion error:", deleteError);
      }
      throw new Error("Erro ao salvar dados do usuário. Tente novamente.");
    }

    try {
      // BACKEND: Write audit log
      const logId = `log_${uid}_${Date.now()}`;
      await set(ref(database, `logs/${logId}`), {
        uid,
        acao: "cadastro_diretor",
        email: data.step2.email,
        escola: data.step1.nomeEscola,
        plano: data.step3.plano,
        timestamp: new Date().toISOString(),
        ip: "client-side", // IP real seria capturado no backend
      });
    } catch (logError) {
      console.error("Audit log error:", logError);
      // Log errors don't block the flow
    }

    // Success
    clearSessionData();
    showFeedback("Cadastro realizado com sucesso!", "success");

    setTimeout(() => {
      window.location.href = "../../diretor/index.html";
    }, 2000);
  } catch (error) {
    console.error("Registration error:", error);
    setLoading(button, false);

    const errorMessage = mapFirebaseError(error);
    showFeedback(errorMessage, "error");
  }
};

// ===== INPUT FORMATTING =====
const setupInputFormatting = () => {
  const cnpjInput = document.getElementById("cnpjEscola");
  if (cnpjInput) {
    cnpjInput.addEventListener("input", (e) => {
      e.target.value = formatCNPJ(e.target.value);
    });
  }

  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", (e) => {
      e.target.value = formatCPF(e.target.value);
    });
  }

  const telefoneInputs = document.querySelectorAll('input[type="tel"]');
  telefoneInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  });
};

// ===== PASSWORD STRENGTH METER =====
const setupPasswordStrengthMeter = () => {
  const senhaInput = document.getElementById("senha");
  if (senhaInput) {
    senhaInput.addEventListener("input", (e) => {
      const strength = getPasswordStrength(e.target.value);
      const bar = document.getElementById("password-strength-bar");
      if (bar) {
        bar.className = `password-strength-bar ${strength}`;
      }
    });
  }
};

// ===== FORM SUBMISSION =====
const setupFormSubmission = () => {
  const currentStep = getCurrentStep();

  if (currentStep === 1) {
    const form = document.getElementById("form-step-1");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateStep1()) {
          goToStep(2);
        }
      });
    }
  } else if (currentStep === 2) {
    const form = document.getElementById("form-step-2");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateStep2()) {
          goToStep(3);
        }
      });
    }
  } else if (currentStep === 3) {
    const form = document.getElementById("form-step-3");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateStep3()) {
          goToStep(4);
        }
      });
    }
  } else if (currentStep === 4) {
    const form = document.getElementById("form-step-4");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateStep4()) {
          submitRegistration();
        }
      });
    }
  }
};

// ===== BACK BUTTON HANDLERS =====
const setupBackButtons = () => {
  const backLinks = document.querySelectorAll("#btn-back, #btn-back-footer");
  backLinks.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      goBack();
    });
  });
};

// ===== RESTORE SESSION DATA =====
const restoreFormData = () => {
  const currentStep = getCurrentStep();
  const data = getSessionData();

  if (currentStep === 1 && data.step1) {
    const step1 = data.step1;
    if (document.getElementById("nomeEscola")) {
      document.getElementById("nomeEscola").value = step1.nomeEscola;
    }
    if (document.getElementById("cnpjEscola")) {
      document.getElementById("cnpjEscola").value = formatCNPJ(
        step1.cnpjEscola,
      );
    }
    if (document.getElementById("telefoneEscola")) {
      document.getElementById("telefoneEscola").value = formatPhone(
        step1.telefoneEscola,
      );
    }
    if (document.getElementById("emailEscola")) {
      document.getElementById("emailEscola").value = step1.emailEscola;
    }
  } else if (currentStep === 2 && data.step2) {
    const step2 = data.step2;
    if (document.getElementById("nomeCompleto")) {
      document.getElementById("nomeCompleto").value = step2.nomeCompleto;
    }
    if (document.getElementById("cpf")) {
      document.getElementById("cpf").value = formatCPF(step2.cpf);
    }
    if (document.getElementById("email")) {
      document.getElementById("email").value = step2.email;
    }
    if (document.getElementById("telefone")) {
      document.getElementById("telefone").value = formatPhone(step2.telefone);
    }
  } else if (currentStep === 3 && data.step3) {
    const step3 = data.step3;
    if (document.getElementById("plano")) {
      const planoRadio = document.querySelector(
        `input[name="plano"][value="${step3.plano}"]`,
      );
      if (planoRadio) {
        planoRadio.checked = true;
      }
    }
  }
};

// ===== INITIALIZATION =====
const init = () => {
  checkOnlineStatus();
  setupInputFormatting();
  setupPasswordStrengthMeter();
  setupFormSubmission();
  setupBackButtons();
  restoreFormData();

  const currentStep = getCurrentStep();
  if (currentStep === 4) {
    renderSummary();
  }

  window.addEventListener("online", checkOnlineStatus);
  window.addEventListener("offline", checkOnlineStatus);
};

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ===== END wizard.js =====
