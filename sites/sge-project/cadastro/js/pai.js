import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let currentStep = 1;
let alunoVinculado = null;

onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("../index.html");
});

const elements = {
  form: document.getElementById("wizard-form"),
  btnNext: document.getElementById("btn-next"),
  btnPrev: document.getElementById("btn-prev"),
  btnVerificar: document.getElementById("btn-verificar"),
  alunoConfirm: document.getElementById("aluno-confirm"),
  toast: document.getElementById("toast"),
};

function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.style.display = "block";
  setTimeout(() => (elements.toast.style.display = "none"), 3000);
}

// Step Navigation
elements.btnNext.onclick = () => {
  if (currentStep < 3) {
    if (validateStep(currentStep)) {
      currentStep++;
      updateWizard();
    }
  } else {
    finalizarCadastro();
  }
};

elements.btnPrev.onclick = () => {
  if (currentStep > 1) {
    currentStep--;
    updateWizard();
  }
};

function validateStep(step) {
  if (step === 1) {
    const nome = document.getElementById("nome").value;
    const cpf = document.getElementById("cpf").value;
    const email = document.getElementById("email").value;
    if (!nome || !cpf || !email) {
      showToast("Preencha os campos obrigatórios.");
      return false;
    }
    return true;
  }
  if (step === 3) {
    const senha = document.getElementById("senha").value;
    const confirm = document.getElementById("confirmarSenha").value;
    if (senha.length < 8) {
      showToast("A senha deve ter no mínimo 8 caracteres.");
      return false;
    }
    if (senha !== confirm) {
      showToast("As senhas não coincidem.");
      return false;
    }
    return true;
  }
  return true;
}

function updateWizard() {
  document
    .querySelectorAll(".wizard-step")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`step-${currentStep}`).classList.add("active");

  document.querySelectorAll(".step").forEach((s) => {
    const sNum = parseInt(s.dataset.step);
    s.classList.remove("active", "completed");
    if (sNum === currentStep) s.classList.add("active");
    if (sNum < currentStep) s.classList.add("completed");
  });

  elements.btnPrev.disabled = currentStep === 1;
  elements.btnNext.textContent =
    currentStep === 4 ? "Finalizar Cadastro" : "Continuar →";

  if (currentStep === 4) renderRevisao();
}

// Aluno Verification
elements.btnVerificar.onclick = async () => {
  const ra = document.getElementById("raAluno").value;
  if (!ra) return showToast("Informe o RA do aluno.");

  elements.btnVerificar.disabled = true;
  elements.btnVerificar.textContent = "...";

  try {
    const snapshot = await get(ref(db, `alunos/${ra}`));
    if (snapshot.exists()) {
      alunoVinculado = { id: ra, ...snapshot.val() };
      document.getElementById("aluno-nome").textContent = alunoVinculado.nome;
      document.getElementById("aluno-turma").textContent =
        `Turma: ${alunoVinculado.turma}`;
      elements.alunoConfirm.style.display = "block";
      showToast("Aluno localizado!");
    } else {
      alunoVinculado = null;
      elements.alunoConfirm.style.display = "none";
      showToast("Aluno não localizado. Verifique o RA.");
    }
  } catch (err) {
    showToast("Erro ao verificar aluno.");
  } finally {
    elements.btnVerificar.disabled = false;
    elements.btnVerificar.textContent = "Verificar";
  }
};

function renderRevisao() {
  const content = document.getElementById("revisao-content");
  content.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="font-family: Syne; font-size: 1.1rem; margin-bottom: 0.5rem;">Dados Pessoais</h3>
            <p style="font-size: 0.9rem; color: var(--text-muted);">${document.getElementById("nome").value}</p>
            <p style="font-size: 0.9rem; color: var(--text-muted);">${document.getElementById("email").value}</p>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <h3 style="font-family: Syne; font-size: 1.1rem; margin-bottom: 0.5rem;">Aluno Vinculado</h3>
            <p style="font-size: 0.9rem; color: var(--text-muted);">${alunoVinculado.nome} (${alunoVinculado.turma})</p>
        </div>
    `;
}

async function finalizarCadastro() {
  if (!document.getElementById("termos").checked)
    return showToast("Aceite os termos de uso.");

  elements.btnNext.disabled = true;
  elements.btnNext.textContent = "Processando...";

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  let user = null;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, senha);
    user = credential.user;

    const payload = {
      uid: user.uid,
      role: "responsavel",
      status: "ativo",
      nome: document.getElementById("nome").value,
      cpf: document.getElementById("cpf").value,
      telefone: document.getElementById("telefone").value,
      email: email,
      filhos: [alunoVinculado.id],
      prefs: {
        faltas: document.getElementById("notif-faltas").checked,
        notas: document.getElementById("notif-notas").checked,
      },
      criadoEm: Date.now(),
    };

    await set(ref(db, `usuarios/${user.uid}`), payload);
    await set(ref(db, `pais/${user.uid}`), payload);

    showToast("Cadastro realizado com sucesso!");
    setTimeout(() => window.location.replace("../auth/login.html"), 2000);
  } catch (err) {
    console.error(err);
    if (user) await deleteUser(user);
    showToast(
      err.code === "auth/email-already-in-use"
        ? "E-mail já cadastrado."
        : "Erro ao finalizar cadastro.",
    );
    elements.btnNext.disabled = false;
    elements.btnNext.textContent = "Finalizar Cadastro";
  }
}
