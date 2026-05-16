import { auth, firestore as db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loadUserProfile();
  } else {
    window.location.replace("/auth/login.html");
  }
});

async function loadUserProfile() {
  try {
    const snap = await getDoc(doc(db, "usuarios", currentUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      document.getElementById("user-display-name").textContent =
        data.nome || "Usuário";
      document.getElementById("user-initials").textContent = (data.nome || "U")
        .charAt(0)
        .toUpperCase();
      document.getElementById("perfil-nome").value = data.nome || "";
      document.getElementById("perfil-email").value = currentUser.email;
      document.getElementById("perfil-tel").value = data.telefone || "";

      if (data.prefs) {
        document.getElementById("pref-notif").checked =
          data.prefs.notificacoes !== false;
        document.getElementById("pref-silence").checked =
          !!data.prefs.silencioso;
      }
    }
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// Tab Switcher
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll(".tab-btn, .tab-content")
      .forEach((el) => el.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

document.getElementById("btn-save-perfil").onclick = async () => {
  const btn = document.getElementById("btn-save-perfil");
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "usuarios", currentUser.uid), {
      nome: document.getElementById("perfil-nome").value,
      telefone: document.getElementById("perfil-tel").value,
      "prefs.notificacoes": document.getElementById("pref-notif").checked,
      "prefs.silencioso": document.getElementById("pref-silence").checked,
    });
    alert("Perfil atualizado!");
    location.reload();
  } catch (err) {
    alert("Erro ao atualizar perfil.");
  } finally {
    btn.disabled = false;
  }
};

document.getElementById("btn-change-pass").onclick = async () => {
  const newPass = document.getElementById("new-pass").value;
  if (newPass.length < 6)
    return alert("Senha deve ter no mínimo 6 caracteres.");

  try {
    await updatePassword(currentUser, newPass);
    alert("Senha alterada com sucesso!");
    document.getElementById("new-pass").value = "";
  } catch (err) {
    alert(
      "Erro ao alterar senha. Talvez seja necessário fazer login novamente.",
    );
  }
};
