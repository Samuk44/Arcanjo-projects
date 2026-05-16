// Firebase v9+ Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// Firebase Configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// State Management
const state = {
  currentUser: null,
  userData: null,
  children: [],
  listeners: [],
};

// Localization
const LOCALES = {
  pt_BR: {
    loadingError: "Erro ao carregar dados",
    saveSuccess: "Alterações salvas com sucesso",
    saveError: "Erro ao salvar alterações",
    passwordSuccess: "Senha alterada com sucesso",
    passwordError: "Erro ao alterar senha",
    uploadSuccess: "Foto atualizada com sucesso",
    uploadError: "Erro ao enviar foto",
    unauthorized: "Acesso não autorizado",
    confirmDelete:
      "Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.",
    deleteSuccess: "Conta excluída com sucesso",
    deleteError: "Erro ao excluir conta",
  },
};

const i18n = LOCALES.pt_BR;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Show toast notification
 */
function showToast(message, type = "info", duration = 3000) {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "slideInRight 0.3s ease reverse";
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/**
 * Validate email
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*]/.test(password)) return false;
  return true;
}

/**
 * Validate phone
 */
function validatePhone(phone) {
  const re = /^(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/;
  return re.test(phone.replace(/\s/g, ""));
}

/**
 * Sanitize HTML
 */
function sanitizeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get initials
 */
function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// ==================== AUTHENTICATION ====================

/**
 * Check authentication state
 */
function checkAuthState() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        state.currentUser = user;

        // Verify user status
        const userRef = ref(db, `usuarios/${user.uid}`);
        onValue(
          userRef,
          (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
              state.userData = userData;
              if (userData.status === "pendente") {
                window.location.href = "../auth/auth-status.html";
                return;
              }
              if (userData.status === "desativado") {
                window.location.href = "../auth/auth-status.html";
                return;
              }
              if (userData.role !== "pai") {
                window.location.href = "../errors/sem-permissao.html";
                return;
              }
              loadUserData();
            }
            resolve(user);
          },
          { onlyOnce: true },
        );
      } else {
        window.location.href = "../auth/login.html";
      }
    });
  });
}

// ==================== DATA LOADING ====================

/**
 * Load user data
 */
function loadUserData() {
  if (!state.currentUser) return;

  try {
    // Load user info
    const userRef = ref(db, `usuarios/${state.currentUser.uid}`);
    const unsubscribe1 = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        document.getElementById("fullName").value = sanitizeHTML(
          userData.nome || "",
        );
        document.getElementById("email").value = userData.email || "";
        document.getElementById("phone").value = sanitizeHTML(
          userData.telefone || "",
        );
        document.getElementById("cpf").value = sanitizeHTML(userData.cpf || "");

        // Update avatar
        const initials = getInitials(userData.nome || "Responsável");
        document.getElementById("avatarPreview").textContent = initials;
      }
    });

    // Load children
    const paiRef = ref(db, `pais/${state.currentUser.uid}`);
    const unsubscribe2 = onValue(paiRef, (snapshot) => {
      const paiData = snapshot.val();
      if (paiData && paiData.alunosIds) {
        state.children = paiData.alunosIds;
        renderChildren();
      }
    });

    // Load preferences
    const prefsRef = ref(db, `preferencias/${state.currentUser.uid}`);
    const unsubscribe3 = onValue(prefsRef, (snapshot) => {
      const prefs = snapshot.val();
      if (prefs) {
        // Load notification preferences
        if (prefs.notificacoes) {
          document.getElementById("notifyAbsences").checked =
            prefs.notificacoes.faltas !== false;
          document.getElementById("notifyTickets").checked =
            prefs.notificacoes.bilhetes !== false;
          document.getElementById("notifyGrades").checked =
            prefs.notificacoes.notas !== false;
          document.getElementById("notifyNotices").checked =
            prefs.notificacoes.avisos !== false;
        }

        // Load silent hours
        if (prefs.silentHours) {
          document.getElementById("silentHoursStart").value =
            prefs.silentHours.inicio || "22:00";
          document.getElementById("silentHoursEnd").value =
            prefs.silentHours.fim || "08:00";
        }

        // Load other preferences
        if (prefs.idioma)
          document.getElementById("language").value = prefs.idioma;
        if (prefs.tema) document.getElementById("theme").value = prefs.tema;
        if (prefs.altoContraste)
          document.getElementById("highContrast").checked = prefs.altoContraste;
      }
    });

    state.listeners.push(unsubscribe1, unsubscribe2, unsubscribe3);
  } catch (error) {
    console.error("Error loading user data:", error);
    showToast(i18n.loadingError, "error");
  }
}

/**
 * Render children list
 */
function renderChildren() {
  const childrenList = document.getElementById("childrenList");

  if (state.children.length === 0) {
    childrenList.innerHTML =
      '<p style="color: var(--text-secondary); font-size: 0.9rem;">Nenhum aluno vinculado</p>';
    return;
  }

  childrenList.innerHTML = state.children
    .map(
      (childId) => `
        <div style="padding: 0.75rem; background-color: var(--surface-light); border-radius: 0.5rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <span>${sanitizeHTML(childId)}</span>
            <button class="btn-small" onclick="removeChild('${childId}')">Remover</button>
        </div>
    `,
    )
    .join("");
}

// ==================== PERSONAL DATA ====================

/**
 * Save personal data
 */
async function savePersonalData() {
  try {
    if (!state.currentUser) return;

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!fullName) {
      showToast("Nome é obrigatório", "warning");
      return;
    }

    if (phone && !validatePhone(phone)) {
      showToast("Telefone inválido", "warning");
      return;
    }

    const userRef = ref(db, `usuarios/${state.currentUser.uid}`);
    await update(userRef, {
      nome: fullName,
      telefone: phone,
      atualizadoEm: serverTimestamp(),
    });

    showToast(i18n.saveSuccess, "success");
  } catch (error) {
    console.error("Error saving personal data:", error);
    showToast(i18n.saveError, "error");
  }
}

/**
 * Upload avatar
 */
async function uploadAvatar(file) {
  try {
    if (!state.currentUser) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      showToast("Apenas imagens são permitidas", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      showToast("Arquivo muito grande (máximo 5MB)", "warning");
      return;
    }

    // Upload to storage
    const fileName = `${state.currentUser.uid}_${Date.now()}`;
    const fileRef = storageRef(storage, `avatares/${fileName}`);
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);

    // Update user record
    const userRef = ref(db, `usuarios/${state.currentUser.uid}`);
    await update(userRef, {
      avatar: url,
      atualizadoEm: serverTimestamp(),
    });

    showToast(i18n.uploadSuccess, "success");
  } catch (error) {
    console.error("Error uploading avatar:", error);
    showToast(i18n.uploadError, "error");
  }
}

// ==================== SECURITY ====================

/**
 * Change password
 */
async function changePassword() {
  try {
    if (!state.currentUser) return;

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Todos os campos são obrigatórios", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("As senhas não correspondem", "warning");
      return;
    }

    if (!validatePasswordStrength(newPassword)) {
      showToast("Senha fraca. Use letras, números e símbolos", "warning");
      return;
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(
      state.currentUser.email,
      currentPassword,
    );

    await reauthenticateWithCredential(state.currentUser, credential);

    // Update password
    await updatePassword(state.currentUser, newPassword);

    // Clear form
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    showToast(i18n.passwordSuccess, "success");
  } catch (error) {
    console.error("Error changing password:", error);
    if (error.code === "auth/wrong-password") {
      showToast("Senha atual incorreta", "error");
    } else {
      showToast(i18n.passwordError, "error");
    }
  }
}

// ==================== NOTIFICATIONS ====================

/**
 * Save notification preferences
 */
async function saveNotificationPreferences() {
  try {
    if (!state.currentUser) return;

    const prefs = {
      notificacoes: {
        faltas: document.getElementById("notifyAbsences").checked,
        bilhetes: document.getElementById("notifyTickets").checked,
        notas: document.getElementById("notifyGrades").checked,
        avisos: document.getElementById("notifyNotices").checked,
      },
      silentHours: {
        inicio: document.getElementById("silentHoursStart").value,
        fim: document.getElementById("silentHoursEnd").value,
      },
      atualizadoEm: serverTimestamp(),
    };

    const prefsRef = ref(db, `preferencias/${state.currentUser.uid}`);
    await update(prefsRef, prefs);

    showToast(i18n.saveSuccess, "success");
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    showToast(i18n.saveError, "error");
  }
}

// ==================== PREFERENCES ====================

/**
 * Save preferences
 */
async function savePreferences() {
  try {
    if (!state.currentUser) return;

    const prefs = {
      idioma: document.getElementById("language").value,
      tema: document.getElementById("theme").value,
      altoContraste: document.getElementById("highContrast").checked,
      atualizadoEm: serverTimestamp(),
    };

    const prefsRef = ref(db, `preferencias/${state.currentUser.uid}`);
    await update(prefsRef, prefs);

    showToast(i18n.saveSuccess, "success");
  } catch (error) {
    console.error("Error saving preferences:", error);
    showToast(i18n.saveError, "error");
  }
}

// ==================== ACCOUNT MANAGEMENT ====================

/**
 * Request access to another student
 */
async function requestAccess() {
  try {
    if (!state.currentUser) return;

    const studentName = document.getElementById("studentName").value.trim();
    const studentRA = document.getElementById("studentRA").value.trim();
    const relationship = document.getElementById("relationship").value;

    if (!studentName || !studentRA) {
      showToast("Todos os campos são obrigatórios", "warning");
      return;
    }

    // Create request in database
    const requestRef = ref(db, `solicitacoesAcesso/${Date.now()}`);
    await update(requestRef, {
      paiId: state.currentUser.uid,
      nomeAluno: studentName,
      ra: studentRA,
      vinculo: relationship,
      status: "pendente",
      criado: serverTimestamp(),
    });

    // Clear form
    document.getElementById("studentName").value = "";
    document.getElementById("studentRA").value = "";
    document.getElementById("relationship").value = "pai";

    // Close modal
    document.getElementById("requestAccessModal").classList.remove("active");

    showToast("Solicitação enviada para aprovação", "success");
  } catch (error) {
    console.error("Error requesting access:", error);
    showToast(i18n.saveError, "error");
  }
}

/**
 * Delete account
 */
async function deleteAccount() {
  try {
    if (!state.currentUser) return;

    const password = document.getElementById("deleteConfirm").value;

    if (!password) {
      showToast("Digite sua senha para confirmar", "warning");
      return;
    }

    // Reauthenticate user
    const credential = EmailAuthProvider.credential(
      state.currentUser.email,
      password,
    );

    await reauthenticateWithCredential(state.currentUser, credential);

    // Delete user data from database
    const userRef = ref(db, `usuarios/${state.currentUser.uid}`);
    await update(userRef, {
      status: "deletado",
      deletadoEm: serverTimestamp(),
    });

    // Delete user account
    await deleteUser(state.currentUser);

    // Close modal
    document.getElementById("deleteAccountModal").classList.remove("active");

    showToast(i18n.deleteSuccess, "success");

    // Redirect to login
    setTimeout(() => {
      window.location.href = "../auth/login.html";
    }, 2000);
  } catch (error) {
    console.error("Error deleting account:", error);
    if (error.code === "auth/wrong-password") {
      showToast("Senha incorreta", "error");
    } else {
      showToast(i18n.deleteError, "error");
    }
  }
}

/**
 * Logout
 */
async function logout() {
  try {
    await signOut(auth);
    sessionStorage.clear();
    window.location.href = "../auth/login.html";
  } catch (error) {
    console.error("Error logging out:", error);
    showToast("Erro ao sair", "error");
  }
}

/**
 * Remove child
 */
async function removeChild(childId) {
  try {
    if (!state.currentUser) return;

    const confirmed = confirm(`Deseja remover acesso ao aluno ${childId}?`);
    if (!confirmed) return;

    const paiRef = ref(db, `pais/${state.currentUser.uid}`);
    const newChildren = state.children.filter((id) => id !== childId);

    await update(paiRef, {
      alunosIds: newChildren,
    });

    showToast("Aluno removido", "success");
  } catch (error) {
    console.error("Error removing child:", error);
    showToast("Erro ao remover aluno", "error");
  }
}

// ==================== EVENT LISTENERS ====================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Personal data
  document
    .getElementById("savePersonalBtn")
    .addEventListener("click", savePersonalData);

  // Avatar upload
  document.getElementById("avatarUploadBtn").addEventListener("click", () => {
    document.getElementById("avatarUploadInput").click();
  });

  document
    .getElementById("avatarUploadInput")
    .addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        uploadAvatar(file);
      }
    });

  // Security
  document
    .getElementById("changePasswordBtn")
    .addEventListener("click", changePassword);

  // Notifications
  document
    .getElementById("saveNotificationsBtn")
    .addEventListener("click", saveNotificationPreferences);

  // Preferences
  document
    .getElementById("savePreferencesBtn")
    .addEventListener("click", savePreferences);

  // Request access
  document.getElementById("requestAccessBtn").addEventListener("click", () => {
    document.getElementById("requestAccessModal").classList.add("active");
  });

  document
    .getElementById("requestAccessClose")
    .addEventListener("click", () => {
      document.getElementById("requestAccessModal").classList.remove("active");
    });

  document
    .getElementById("requestAccessCancel")
    .addEventListener("click", () => {
      document.getElementById("requestAccessModal").classList.remove("active");
    });

  document
    .getElementById("requestAccessSubmit")
    .addEventListener("click", requestAccess);

  // Delete account
  document.getElementById("deleteAccountBtn").addEventListener("click", () => {
    document.getElementById("deleteAccountModal").classList.add("active");
  });

  document
    .getElementById("deleteAccountClose")
    .addEventListener("click", () => {
      document.getElementById("deleteAccountModal").classList.remove("active");
    });

  document
    .getElementById("deleteAccountCancel")
    .addEventListener("click", () => {
      document.getElementById("deleteAccountModal").classList.remove("active");
    });

  document
    .getElementById("deleteAccountConfirm")
    .addEventListener("click", deleteAccount);

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Modal backdrop clicks
  document
    .getElementById("requestAccessModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "requestAccessModal") {
        e.target.classList.remove("active");
      }
    });

  document
    .getElementById("deleteAccountModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "deleteAccountModal") {
        e.target.classList.remove("active");
      }
    });
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
async function init() {
  try {
    // Check authentication
    await checkAuthState();

    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    showToast(i18n.loadingError, "error");
  }
}

// Start initialization
document.addEventListener("DOMContentLoaded", init);

// Cleanup on page unload
window.addEventListener("pagehide", () => {
  state.listeners.forEach((unsubscribe) => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  });
});

// Make functions globally accessible
window.removeChild = removeChild;
