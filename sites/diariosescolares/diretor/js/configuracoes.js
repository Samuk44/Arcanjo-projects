import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ─── Firebase config ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  databaseURL: "__FIREBASE_DATABASE_URL__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// ─── Auth guard ──────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace("../auth/login.html");
    return;
  }
  const snap = await get(ref(db, `usuarios/${user.uid}`));
  if (
    !snap.exists() ||
    snap.val().role !== "diretor" ||
    snap.val().status !== "ativo"
  ) {
    location.replace("../auth/login.html");
    return;
  }
  initPage(user, snap.val());
});

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const colors =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";
  const icon =
    type === "success"
      ? `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
  toast.className = `toast flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-soft text-sm font-medium pointer-events-auto ${colors}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = icon + `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity .3s, transform .3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

// ─── Debounce ────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ─── Tab switching ───────────────────────────────────────────────────────────
function initTabs() {
  const buttons = document.querySelectorAll("#tab-nav [data-tab]");
  const sections = document.querySelectorAll("main section[id^='tab-']");

  function activate(tabName) {
    buttons.forEach((btn) => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle("active", active);
      btn.classList.toggle("hover:bg-blue-50", !active);
      btn.setAttribute("aria-selected", String(active));
    });
    sections.forEach((sec) => {
      sec.classList.toggle("hidden", sec.id !== `tab-${tabName}`);
    });
    history.replaceState(null, "", `#${tabName}`);
  }

  buttons.forEach((btn) =>
    btn.addEventListener("click", () => activate(btn.dataset.tab)),
  );

  const hash = location.hash.replace("#", "");
  const validTabs = [...buttons].map((b) => b.dataset.tab);
  activate(validTabs.includes(hash) ? hash : "perfil");
}

// ─── Image preview helper ────────────────────────────────────────────────────
function bindImagePreview(inputId, previewId, maxBytes = 2 * 1024 * 1024) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > maxBytes) {
      showToast("Imagem muito grande. Máx. 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.backgroundSize = "cover";
      preview.style.backgroundPosition = "center";
      preview.textContent = "";
    };
    reader.readAsDataURL(file);
  });
}

// ─── Upload file to Storage ──────────────────────────────────────────────────
async function uploadFile(uid, folder, file) {
  const ext = file.name.split(".").pop();
  const fileRef = storageRef(storage, `${folder}/${uid}.${ext}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

// ─── Main init ───────────────────────────────────────────────────────────────
function initPage(user, data) {
  initTabs();
  populateUI(user, data);
  bindImagePreview("avatar-upload", "avatar-preview");
  bindImagePreview("logo-upload", "logo-preview");
  bindSavePerfil(user, data);
  bindSaveEscola(user, data);
  bindSaveSenha(user);
  bindToggle2FA(user, data);
  bindSaveNotificacoes(user, data);
  bindPrivacidade(user, data);
  bindAssinatura(data);
  bindModalExcluir(user);
}

// ─── Populate form fields ─────────────────────────────────────────────────────
function populateUI(user, data) {
  const nome = data.nome || "";
  document.getElementById("perfil-nome").value = nome;
  document.getElementById("perfil-email").value =
    data.email || user.email || "";
  document.getElementById("perfil-telefone").value = data.telefone || "";
  document.getElementById("topbar-greeting").textContent =
    `Olá, ${nome.split(" ")[0] || "Diretor"}`;
  document.getElementById("avatar-name-label").textContent = nome || "Diretor";

  if (data.avatarUrl) {
    const av = document.getElementById("avatar-preview");
    av.style.backgroundImage = `url(${data.avatarUrl})`;
    av.style.backgroundSize = "cover";
    av.style.backgroundPosition = "center";
    av.textContent = "";
    const topAv = document.getElementById("topbar-avatar");
    topAv.style.backgroundImage = `url(${data.avatarUrl})`;
    topAv.style.backgroundSize = "cover";
    topAv.textContent = "";
  } else {
    const initials = nome ? nome[0].toUpperCase() : "D";
    document.getElementById("avatar-preview").textContent = initials;
    document.getElementById("topbar-avatar").textContent = initials;
  }

  const inst = data.instituicao || {};
  document.getElementById("escola-nome").value = inst.nome || "";
  document.getElementById("escola-cnpj").value = inst.cnpj || "";
  document.getElementById("escola-email").value = inst.emailEscola || "";

  if (inst.logoUrl) {
    const lp = document.getElementById("logo-preview");
    lp.style.backgroundImage = `url(${inst.logoUrl})`;
    lp.style.backgroundSize = "contain";
    lp.style.backgroundPosition = "center";
    lp.style.backgroundRepeat = "no-repeat";
    lp.textContent = "";
  }

  const prefs = data.preferencias || {};
  const notif = prefs.notificacoes || {};
  document.getElementById("notif-email").checked = notif.email !== false;
  document.getElementById("notif-push").checked = notif.push === true;
  const resumo = notif.resumo || "semanal";
  const resumoEl = document.querySelector(
    `input[name="resumo"][value="${resumo}"]`,
  );
  if (resumoEl) resumoEl.checked = true;

  const priv = data.privacidade || {};
  document.getElementById("lgpd-consent").checked =
    priv.consentimentoLGPD === true;

  const assin = data.assinatura || {};
  const plano = assin.plano || "basico";
  document.getElementById("plano-badge").textContent =
    plano.charAt(0).toUpperCase() + plano.slice(1);
  if (assin.ativaDesde) {
    const d = new Date(assin.ativaDesde).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    document.getElementById("plano-ativo-desde").textContent =
      `Ativo desde ${d}`;
  }
  if (plano === "premium") {
    document.getElementById("plano-badge").className =
      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700";
    document.getElementById("plano-desc").textContent =
      "Plano Premium: alunos ilimitados, relatórios avançados, suporte prioritário 24/7 e integrações.";
  }
}

// ─── Save perfil ──────────────────────────────────────────────────────────────
function bindSavePerfil(user, _data) {
  document.getElementById("save-perfil").addEventListener(
    "click",
    debounce(async () => {
      const nome = document.getElementById("perfil-nome").value.trim();
      const email = document.getElementById("perfil-email").value.trim();
      const telefone = document.getElementById("perfil-telefone").value.trim();
      if (!nome || !email) {
        showToast("Nome e e-mail são obrigatórios.", "error");
        return;
      }

      const updates = { nome, email, telefone };

      const avatarFile = document.getElementById("avatar-upload").files[0];
      if (avatarFile) {
        try {
          updates.avatarUrl = await uploadFile(user.uid, "avatars", avatarFile);
        } catch {
          showToast("Erro ao enviar avatar.", "error");
          return;
        }
      }

      try {
        await update(ref(db, `usuarios/${user.uid}`), updates);
        document.getElementById("topbar-greeting").textContent =
          `Olá, ${nome.split(" ")[0]}`;
        document.getElementById("avatar-name-label").textContent = nome;
        showToast("Perfil atualizado com sucesso!");
      } catch {
        showToast("Erro ao salvar perfil.", "error");
      }
    }, 400),
  );
}

// ─── Save escola ──────────────────────────────────────────────────────────────
function bindSaveEscola(user, _data) {
  document.getElementById("save-escola").addEventListener(
    "click",
    debounce(async () => {
      const nome = document.getElementById("escola-nome").value.trim();
      const emailEscola = document.getElementById("escola-email").value.trim();
      if (!nome) {
        showToast("Nome da escola é obrigatório.", "error");
        return;
      }

      const updates = {
        "instituicao/nome": nome,
        "instituicao/emailEscola": emailEscola,
      };

      const logoFile = document.getElementById("logo-upload").files[0];
      if (logoFile) {
        try {
          updates["instituicao/logoUrl"] = await uploadFile(
            user.uid,
            "logos",
            logoFile,
          );
        } catch {
          showToast("Erro ao enviar logo.", "error");
          return;
        }
      }

      try {
        await update(ref(db, `usuarios/${user.uid}`), updates);
        showToast("Dados da escola atualizados!");
      } catch {
        showToast("Erro ao salvar dados da escola.", "error");
      }
    }, 400),
  );
}

// ─── Save senha ───────────────────────────────────────────────────────────────
function bindSaveSenha(user) {
  document.getElementById("save-senha").addEventListener("click", async () => {
    const atual = document.getElementById("senha-atual").value;
    const nova = document.getElementById("senha-nova").value;
    const confirma = document.getElementById("senha-confirma").value;
    if (!atual || !nova || !confirma) {
      showToast("Preencha todos os campos de senha.", "error");
      return;
    }
    if (nova.length < 8) {
      showToast("A nova senha deve ter ao menos 8 caracteres.", "error");
      return;
    }
    if (!/[a-zA-Z]/.test(nova) || !/[0-9]/.test(nova)) {
      showToast("A senha deve conter letras e números.", "error");
      return;
    }
    if (nova !== confirma) {
      showToast("As senhas não coincidem.", "error");
      return;
    }
    try {
      const cred = EmailAuthProvider.credential(user.email, atual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, nova);
      document.getElementById("senha-atual").value = "";
      document.getElementById("senha-nova").value = "";
      document.getElementById("senha-confirma").value = "";
      showToast("Senha atualizada com sucesso!");
    } catch (err) {
      const msg =
        err.code === "auth/wrong-password"
          ? "Senha atual incorreta."
          : "Erro ao atualizar senha.";
      showToast(msg, "error");
    }
  });
}

// ─── 2FA toggle ───────────────────────────────────────────────────────────────
function bindToggle2FA(user, data) {
  const toggle = document.getElementById("toggle-2fa");
  toggle.checked = data.seguranca?.doisFatores === true;
  document
    .getElementById("2fa-hint")
    .classList.toggle("hidden", !toggle.checked);
  toggle.addEventListener(
    "change",
    debounce(async () => {
      try {
        await update(ref(db, `usuarios/${user.uid}/seguranca`), {
          doisFatores: toggle.checked,
        });
        document
          .getElementById("2fa-hint")
          .classList.toggle("hidden", !toggle.checked);
        showToast(toggle.checked ? "2FA ativado." : "2FA desativado.");
      } catch {
        showToast("Erro ao atualizar 2FA.", "error");
        toggle.checked = !toggle.checked;
      }
    }, 300),
  );
}

// ─── Save notificações ────────────────────────────────────────────────────────
function bindSaveNotificacoes(user, _data) {
  document.getElementById("save-notificacoes").addEventListener(
    "click",
    debounce(async () => {
      const notifEmail = document.getElementById("notif-email").checked;
      const notifPush = document.getElementById("notif-push").checked;
      const resumo =
        document.querySelector("input[name='resumo']:checked")?.value ||
        "semanal";
      try {
        await update(
          ref(db, `usuarios/${user.uid}/preferencias/notificacoes`),
          {
            email: notifEmail,
            push: notifPush,
            resumo,
          },
        );
        showToast("Preferências de notificação salvas!");
      } catch {
        showToast("Erro ao salvar notificações.", "error");
      }
    }, 400),
  );
}

// ─── Privacidade ──────────────────────────────────────────────────────────────
function bindPrivacidade(user, data) {
  document.getElementById("lgpd-consent").addEventListener(
    "change",
    debounce(async (e) => {
      try {
        await update(ref(db, `usuarios/${user.uid}/privacidade`), {
          consentimentoLGPD: e.target.checked,
        });
        showToast("Preferência de consentimento atualizada.");
      } catch {
        showToast("Erro ao salvar consentimento.", "error");
      }
    }, 400),
  );

  document.getElementById("btn-export-dados").addEventListener("click", () => {
    const exportData = {
      uid: user.uid,
      exportadoEm: new Date().toISOString(),
      dados: data,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sge-dados-${user.uid}.json`;
    a.click();
    update(ref(db, `usuarios/${user.uid}/privacidade`), {
      exportadoEm: Date.now(),
    });
    showToast("Exportação concluída!");
  });
}

// ─── Assinatura ───────────────────────────────────────────────────────────────
function bindAssinatura(_data) {
  document.getElementById("btn-upgrade").addEventListener("click", () => {
    showToast(
      "Redirecionando para planos... (integração com gateway pendente)",
    );
  });
}

// ─── Modal excluir conta ──────────────────────────────────────────────────────
function bindModalExcluir(user) {
  const modal = document.getElementById("modal-excluir");
  const input = document.getElementById("confirm-delete-input");
  const btnConfirm = document.getElementById("modal-confirmar");
  const btnCancel = document.getElementById("modal-cancelar");

  document.getElementById("btn-excluir-conta").addEventListener("click", () => {
    modal.classList.remove("hidden");
    input.value = "";
    btnConfirm.disabled = true;
    setTimeout(() => input.focus(), 80);
  });

  input.addEventListener("input", () => {
    btnConfirm.disabled = input.value !== "EXCLUIR";
  });

  btnCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  function closeModal() {
    modal.classList.add("hidden");
    input.value = "";
    btnConfirm.disabled = true;
  }

  btnConfirm.addEventListener("click", async () => {
    if (input.value !== "EXCLUIR") return;
    try {
      await update(ref(db, `usuarios/${user.uid}`), {
        status: "excluido",
        excluidoEm: Date.now(),
      });
      await deleteUser(user);
      location.replace("../auth/login.html");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        showToast("Faça login novamente antes de excluir a conta.", "error");
        closeModal();
        setTimeout(() => location.replace("../auth/login.html"), 1800);
      } else {
        showToast("Erro ao excluir conta.", "error");
        closeModal();
      }
    }
  });
}
