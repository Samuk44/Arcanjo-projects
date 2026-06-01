// SGE v2.0 • Professor Registration Wizard • Firebase v9+ • ES6 Modules
// 5-step wizard: Identificação → Acesso → Profissional → Turmas → Revisão

import app, { auth, db } from "../../assets/js/firebase/config.js";
import {
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ============ PROFESSOR WIZARD CLASS ============
class ProfessorWizard {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 5;
    this.formData = {
      nome: "",
      cpf: "",
      dataNascimento: "",
      telefone: "",
      photoBase64: null,
      email: "",
      senha: "",
      matricula: "",
      cargo: "",
      turnos: [],
      disciplinas: [],
      turmas: [],
      aceitoTermos: false,
    };
    this.selectedDisciplinaForTurma = null;
    this.loadFromSessionStorage();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderStep();
    this.renderTurmasGrid();
    this.renderDisciplinaTags();
  }

  setupEventListeners() {
    document
      .getElementById("btnProximo")
      .addEventListener("click", () => this.next());
    document
      .getElementById("btnAnterior")
      .addEventListener("click", () => this.prev());

    // Step 1: Validações em tempo real
    document
      .getElementById("nome")
      .addEventListener("blur", () => this.validateNome());
    document
      .getElementById("cpf")
      .addEventListener("input", (e) => this.formatCPF(e));
    document
      .getElementById("cpf")
      .addEventListener("blur", () => this.validateCPF());
    document.getElementById("dataNascimento").addEventListener("keydown", (e) => {
      if (!["Tab","Backspace","Delete","ArrowLeft","ArrowRight","Home","End"].includes(e.key) && !/\d/.test(e.key)) e.preventDefault();
    });
    document.getElementById("dataNascimento").addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5);
      this.value = v;
    });
    document
      .getElementById("dataNascimento")
      .addEventListener("blur", () => this.validateDataNascimento());
    document
      .getElementById("telefone")
      .addEventListener("input", (e) => this.formatTelefone(e));
    document
      .getElementById("photoInput")
      .addEventListener("change", (e) => this.handlePhotoUpload(e));

    // Step 2: Validações
    document
      .getElementById("email")
      .addEventListener("blur", () => this.validateEmail());
    document
      .getElementById("senha")
      .addEventListener("input", () => this.validateSenha());
    document
      .getElementById("confirmarSenha")
      .addEventListener("blur", () => this.validateConfirmarSenha());
    document
      .getElementById("matricula")
      .addEventListener("blur", () => this.validateMatricula());

    // Step 3: Seleções
    document.getElementById("cargo").addEventListener("change", (e) => {
      this.formData.cargo = e.target.value;
      this.saveToSessionStorage();
    });

    document
      .querySelectorAll("input[type='checkbox'][id^='turno']")
      .forEach((cb) => {
        cb.addEventListener("change", () => this.updateTurnos());
      });

    // Step 4: Turmas
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("turma-btn")) {
        this.toggleTurma(e.target);
      }
    });

    // Step 5: Aceito Termos
    document.getElementById("aceitoTermos").addEventListener("change", (e) => {
      this.formData.aceitoTermos = e.target.checked;
      this.saveToSessionStorage();
    });
  }

  // ============ STEP NAVIGATION ============
  next() {
    if (!this.validateStep()) return;

    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.renderStep();
      this.saveToSessionStorage();
    } else {
      this.submit();
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  renderStep() {
    // Hide all steps
    document
      .querySelectorAll(".step-content")
      .forEach((el) => (el.style.display = "none"));
    document.getElementById(`step-${this.currentStep}`).style.display = "block";

    // Update progress
    const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
    document.getElementById("progressFill").style.width = progress + "%";

    // Update progress steps
    document.querySelectorAll(".progress-step").forEach((el, idx) => {
      el.classList.remove("active", "completed");
      if (idx < this.currentStep) el.classList.add("completed");
      if (idx === this.currentStep) el.classList.add("active");
    });

    // Update buttons
    document.getElementById("btnAnterior").style.display =
      this.currentStep > 0 ? "inline-flex" : "none";
    document.getElementById("btnProximo").textContent =
      this.currentStep === this.totalSteps - 1
        ? "Finalizar Cadastro"
        : "Próximo →";

    // Update subtitle
    const subtitles = [
      "Etapa 1 de 5: Identificação Pessoal",
      "Etapa 2 de 5: Dados de Acesso",
      "Etapa 3 de 5: Dados Profissionais",
      "Etapa 4 de 5: Vínculo com Turmas",
      "Etapa 5 de 5: Revisão e Confirmação",
    ];
    document.getElementById("stepSubtitle").textContent =
      subtitles[this.currentStep];

    // Load data into form if going back
    if (this.currentStep === 0) this.loadStep1();
    if (this.currentStep === 1) this.loadStep2();
    if (this.currentStep === 2) this.loadStep3();
    if (this.currentStep === 4) this.loadStep5();

    // Focus first input
    setTimeout(() => {
      const firstInput = document
        .getElementById(`step-${this.currentStep}`)
        .querySelector("input, select, textarea");
      if (firstInput) firstInput.focus();
    }, 100);
  }

  loadStep1() {
    document.getElementById("nome").value = this.formData.nome;
    document.getElementById("cpf").value = this.formData.cpf;
    document.getElementById("dataNascimento").value =
      this.formData.dataNascimento;
    document.getElementById("telefone").value = this.formData.telefone;
  }

  loadStep2() {
    document.getElementById("email").value = this.formData.email;
    document.getElementById("confirmarSenha").value = this.formData.senha;
    document.getElementById("matricula").value = this.formData.matricula;
  }

  loadStep3() {
    document.getElementById("cargo").value = this.formData.cargo;
    document
      .querySelectorAll("input[type='checkbox'][id^='turno']")
      .forEach((cb) => {
        cb.checked = this.formData.turnos.includes(cb.value);
      });
    document.querySelectorAll(".tag").forEach((tag) => {
      tag.classList.toggle(
        "selected",
        this.formData.disciplinas.includes(tag.dataset.value),
      );
    });
  }

  loadStep5() {
    document.getElementById("reviewNome").textContent = this.formData.nome;
    document.getElementById("reviewCpf").textContent = this.formData.cpf;
    document.getElementById("reviewDataNascimento").textContent =
      this.formData.dataNascimento || "—";
    document.getElementById("reviewTelefone").textContent =
      this.formData.telefone;
    document.getElementById("reviewEmail").textContent = this.formData.email;
    document.getElementById("reviewMatricula").textContent =
      this.formData.matricula;
    document.getElementById("reviewCargo").textContent = this.formData.cargo;
    document.getElementById("reviewTurnos").textContent =
      this.formData.turnos.join(", ");
    document.getElementById("reviewDisciplinas").textContent =
      this.formData.disciplinas.join(", ");
    document.getElementById("reviewTurmas").textContent =
      this.formData.turmas.length > 0
        ? this.formData.turmas.join(", ")
        : "Nenhuma";
    document.getElementById("aceitoTermos").checked =
      this.formData.aceitoTermos;
  }

  // ============ VALIDAÇÕES ============
  validateStep() {
    switch (this.currentStep) {
      case 0:
        return (
          this.validateNome() &&
          this.validateCPF() &&
          this.validateDataNascimento() &&
          this.validateTelefone()
        );
      case 1:
        return (
          this.validateEmail() &&
          this.validateSenha() &&
          this.validateConfirmarSenha() &&
          this.validateMatricula()
        );
      case 2:
        return (
          this.validateCargo() &&
          this.validateTurnos() &&
          this.validateDisciplinas()
        );
      case 3:
        return this.validateTurmas();
      case 4:
        return this.validateAceitoTermos();
      default:
        return true;
    }
  }

  validateNome() {
    const nome = document.getElementById("nome").value.trim();
    const parts = nome.split(" ");
    const valid = parts.length >= 2 && /^[a-záéíóúâêôãõç\s]+$/i.test(nome);
    this.setFieldStatus("nome", valid, "Nome deve ter pelo menos 2 palavras");
    this.formData.nome = nome;
    return valid;
  }

  validateCPF() {
    const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
    const valid = this.validateCPFAlgorithm(cpf);
    this.setFieldStatus("cpf", valid, "CPF inválido");
    this.formData.cpf = document.getElementById("cpf").value;
    return valid;
  }

  validateCPFAlgorithm(cpf) {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0,
      remainder;
    for (let i = 1; i <= 9; i++)
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++)
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.substring(10, 11));
  }

  validateDataNascimento() {
    const val = document.getElementById("dataNascimento").value;
    const parts = val.split("/");
    const data = parts.length === 3
      ? new Date(+parts[2], +parts[1] - 1, +parts[0])
      : new Date("invalid");
    const hoje = new Date();
    const idade = hoje.getFullYear() - data.getFullYear();
    const valid = !isNaN(data.getTime()) && val.length === 10 && idade >= 18 && data < hoje;
    this.setFieldStatus("dataNascimento", valid, "Deve ter pelo menos 18 anos");
    this.formData.dataNascimento = val;
    return valid;
  }

  validateTelefone() {
    const telefone = document
      .getElementById("telefone")
      .value.replace(/\D/g, "");
    const valid = telefone.length === 11;
    this.setFieldStatus("telefone", valid, "Telefone inválido");
    this.formData.telefone = document.getElementById("telefone").value;
    return valid;
  }

  formatCPF(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.substring(0, 11);
    value = value
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
  }

  formatTelefone(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.substring(0, 11);
    value = value
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
    e.target.value = value;
  }

  async validateEmail() {
    const email = document.getElementById("email").value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!valid) {
      this.setFieldStatus("email", false, "E-mail inválido");
      return false;
    }

    try {
      const emailRef = ref(db, `usuarios`);
      const snapshot = await get(emailRef);
      const exists =
        snapshot.val() &&
        Object.values(snapshot.val()).some((u) => u.email === email);

      if (exists) {
        this.setFieldStatus("email", false, "E-mail já cadastrado");
        return false;
      }

      this.setFieldStatus("email", true);
      this.formData.email = email;
      return true;
    } catch (error) {
      console.error("Email validation error:", error);
      this.setFieldStatus("email", true);
      this.formData.email = email;
      return true;
    }
  }

  validateSenha() {
    const senha = document.getElementById("senha").value;
    const hasMinLength = senha.length >= 8;
    const hasUppercase = /[A-Z]/.test(senha);
    const hasNumber = /[0-9]/.test(senha);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha);

    const strength = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(
      Boolean,
    ).length;
    const strengthLevels = ["Fraca", "Fraca", "Média", "Forte", "Muito Forte"];
    const strengthColors = [
      "#f43f5e",
      "#f43f5e",
      "#facc15",
      "#22c55e",
      "#22c55e",
    ];

    document.getElementById("strengthFill").style.width = strength * 25 + "%";
    document.getElementById("strengthFill").style.background =
      strengthColors[strength];
    document.getElementById("strengthText").textContent =
      `Força: ${strengthLevels[strength]}`;

    const valid = strength >= 3;
    this.setFieldStatus("senha", valid, "Senha fraca");
    this.formData.senha = senha;
    return valid;
  }

  validateConfirmarSenha() {
    const senha = document.getElementById("senha").value;
    const confirmar = document.getElementById("confirmarSenha").value;
    const valid = senha === confirmar && confirmar.length > 0;
    this.setFieldStatus("confirmarSenha", valid, "Senhas não conferem");
    return valid;
  }

  validateMatricula() {
    const matricula = document.getElementById("matricula").value.trim();
    const valid = /^[a-zA-Z0-9]{3,20}$/.test(matricula);
    this.setFieldStatus(
      "matricula",
      valid,
      "Matrícula inválida (3-20 caracteres alfanuméricos)",
    );
    this.formData.matricula = matricula;
    return valid;
  }

  validateCargo() {
    const cargo = document.getElementById("cargo").value;
    const valid = cargo.length > 0;
    this.setFieldStatus("cargo", valid, "Selecione um cargo");
    return valid;
  }

  validateTurnos() {
    const turnos = Array.from(
      document.querySelectorAll("input[type='checkbox'][id^='turno']:checked"),
    ).map((cb) => cb.value);
    const valid = turnos.length > 0;
    this.setFieldStatus("turnos", valid, "Selecione pelo menos um turno");
    this.formData.turnos = turnos;
    return valid;
  }

  validateDisciplinas() {
    const disciplinas = Array.from(
      document.querySelectorAll(".tag.selected"),
    ).map((tag) => tag.dataset.value);
    const valid = disciplinas.length > 0;
    this.setFieldStatus(
      "disciplinas",
      valid,
      "Selecione pelo menos uma disciplina",
    );
    this.formData.disciplinas = disciplinas;
    return valid;
  }

  validateTurmas() {
    const valid = this.formData.turmas.length > 0;
    this.setFieldStatus("turmas", valid, "Selecione pelo menos uma turma");
    return valid;
  }

  validateAceitoTermos() {
    const valid = document.getElementById("aceitoTermos").checked;
    this.setFieldStatus("aceitoTermos", valid, "Você deve aceitar os termos");
    return valid;
  }

  setFieldStatus(fieldName, valid, errorMessage = "") {
    const field = document.getElementById(fieldName);
    const errorEl = document.getElementById(`${fieldName}Error`);

    if (field) {
      field.classList.toggle("error", !valid);
      field.classList.toggle("success", valid && field.value);
    }

    if (errorEl) {
      errorEl.textContent = valid ? "" : errorMessage;
    }
  }

  // ============ PHOTO UPLOAD ============
  async handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Arquivo muito grande (máx. 5MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(img, 0, 0, 200, 200);
        this.formData.photoBase64 = canvas.toDataURL("image/jpeg", 0.8);
        document.getElementById("photoPreview").innerHTML =
          `<img src="${this.formData.photoBase64}" />`;
        this.saveToSessionStorage();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ============ DISCIPLINAS ============
  renderDisciplinaTags() {
    document.querySelectorAll(".tag").forEach((tag) => {
      tag.addEventListener("click", () => {
        tag.classList.toggle("selected");
        this.formData.disciplinas = Array.from(
          document.querySelectorAll(".tag.selected"),
        ).map((t) => t.dataset.value);
        this.saveToSessionStorage();
      });
    });
  }

  updateTurnos() {
    this.formData.turnos = Array.from(
      document.querySelectorAll("input[type='checkbox'][id^='turno']:checked"),
    ).map((cb) => cb.value);
    this.saveToSessionStorage();
  }

  // ============ TURMAS ============
  renderTurmasGrid() {
    const grid = document.getElementById("turmasGrid");
    grid.innerHTML = "";

    const turmas = [];
    for (let ano = 6; ano <= 9; ano++) {
      for (let letra = 0; letra < 6; letra++) {
        turmas.push(`${ano}º${String.fromCharCode(65 + letra)}`);
      }
    }
    for (let ano = 1; ano <= 3; ano++) {
      for (let letra = 0; letra < 6; letra++) {
        turmas.push(`${ano}º${String.fromCharCode(65 + letra)}M`);
      }
    }
    const cursosTecnicos = ["Administração", "Des. de Sistemas", "Logística", "Seg. do Trabalho"];
    for (let ano = 1; ano <= 3; ano++) {
      cursosTecnicos.forEach((curso) => {
        turmas.push(`${ano}º Ano A - ${curso}`);
      });
    }

    turmas.forEach((turma) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "turma-btn";
      btn.textContent = turma;
      if (this.formData.turmas.includes(turma)) btn.classList.add("selected");
      grid.appendChild(btn);
    });
  }

  toggleTurma(btn) {
    const turma = btn.textContent;
    if (this.formData.disciplinas.length === 0) {
      showToast("Selecione pelo menos uma disciplina primeiro", "warning");
      return;
    }

    if (btn.classList.contains("selected")) {
      btn.classList.remove("selected");
      this.formData.turmas = this.formData.turmas.filter((t) => t !== turma);
    } else {
      this.selectedDisciplinaForTurma = turma;
      this.openDisciplinaModal(turma);
    }

    this.updateTurmasSelecionadas();
    this.saveToSessionStorage();
  }

  openDisciplinaModal(turma) {
    document.getElementById("modalTurmaTitle").textContent =
      `Selecione a disciplina para ${turma}`;
    let html = "";
    this.formData.disciplinas.forEach((disc) => {
      html += `<button type="button" class="btn btn-secondary" style="width: 100%; margin-bottom: 0.5rem;" onclick="window.selectDisciplinaForTurma('${turma}', '${disc}')">${disc}</button>`;
    });
    document.getElementById("modalDisciplinasContent").innerHTML = html;
    document.getElementById("disciplinaModal").classList.add("active");
  }

  updateTurmasSelecionadas() {
    const text =
      this.formData.turmas.length > 0
        ? this.formData.turmas.join(", ")
        : "Nenhuma turma selecionada";
    document.getElementById("turmasSelecionadas").textContent = text;
  }

  // ============ SUBMIT ============
  async submit() {
    document.getElementById("btnProximo").disabled = true;
    document.getElementById("btnProximo").innerHTML =
      '<span class="loading-spinner"></span> Criando conta...';

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        this.formData.email,
        this.formData.senha,
      );
      const uid = userCredential.user.uid;

      // Save to /cadastrosPendentes
      const pendentesRef = ref(db, `cadastrosPendentes/${uid}`);
      const [_d, _m, _y] = (this.formData.dataNascimento || "").split("/");
      const dataNascimentoISO = (_d && _m && _y) ? `${_y}-${_m}-${_d}` : (this.formData.dataNascimento || "");
      await set(pendentesRef, {
        ...this.formData,
        dataNascimento: dataNascimentoISO,
        uid,
        dataCadastro: new Date().toISOString(),
        status: "pendente",
      });

      // Save to /usuarios
      const usuariosRef = ref(db, `usuarios/${uid}`);
      await set(usuariosRef, {
        uid,
        email: this.formData.email,
        nome: this.formData.nome,
        role: "professor",
        status: "pendente",
        dataCadastro: new Date().toISOString(),
        turmas: this.formData.turmas,
        disciplinas: this.formData.disciplinas,
      });

      // Success
      await signOut(auth);
      sessionStorage.removeItem("professorWizardData");
      this.showSuccessScreen();
    } catch (error) {
      console.error("Registration error:", error);

      // Rollback: delete auth user if DB write failed
      const orphan = auth.currentUser;
      if (orphan) {
        try { await deleteUser(orphan); } catch {}
      }

      let message = "Erro ao criar conta";
      if (error.code === "auth/email-already-in-use")
        message = "E-mail já cadastrado";
      if (error.code === "auth/weak-password") message = "Senha fraca";
      if (error.code === "auth/invalid-email") message = "E-mail inválido";

      showToast(message, "error");
      document.getElementById("btnProximo").disabled = false;
      document.getElementById("btnProximo").innerHTML = "Finalizar Cadastro";
    }
  }

  showSuccessScreen() {
    document.getElementById("wizardCard").innerHTML = `
      <div class="success-screen">
        <div class="success-icon">✓</div>
        <h2 class="success-title">Cadastro Realizado com Sucesso!</h2>
        <p class="success-text">Sua conta está pendente de aprovação pela direção. Você receberá um e-mail quando for aprovado.</p>
        <button class="btn btn-primary" onclick="location.replace('../auth/login.html')">Voltar ao Login</button>
      </div>
    `;
  }

  // ============ SESSION STORAGE ============
  saveToSessionStorage() {
    sessionStorage.setItem(
      "professorWizardData",
      JSON.stringify(this.formData),
    );
  }

  loadFromSessionStorage() {
    const saved = sessionStorage.getItem("professorWizardData");
    if (saved) {
      try {
        this.formData = JSON.parse(saved);
      } catch (e) {
        console.error("Session storage parse error:", e);
      }
    }
  }
}

// ============ GLOBAL FUNCTIONS ============
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById("toastContainer").appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease-out forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function closeDisciplinaModal() {
  document.getElementById("disciplinaModal").classList.remove("active");
}

window.selectDisciplinaForTurma = (turma, disciplina) => {
  wizard.formData.turmas.push(`${turma} (${disciplina})`);
  wizard.updateTurmasSelecionadas();
  wizard.saveToSessionStorage();

  // Mark turma button as selected
  document.querySelectorAll(".turma-btn").forEach((btn) => {
    if (btn.textContent === turma) btn.classList.add("selected");
  });

  closeDisciplinaModal();
};

// ============ INITIALIZATION ============
let wizard;
document.addEventListener("DOMContentLoaded", () => {
  wizard = new ProfessorWizard();
});

// ============ CLEANUP ============
window.addEventListener("beforeunload", () => {
  wizard?.saveToSessionStorage();
});

// SGE v2.0 • Professor Registration Wizard • 2026-05-14
