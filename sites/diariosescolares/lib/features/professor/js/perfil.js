"use strict";

/**
 * SGE v2.0 - Perfil e Configurações (Professor)
 * Versão: 2.0.0
 * Build: 20260514-010
 */

import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _authUnsub = null;

const state = {
  professor: { uid: null, nome: null, email: null, cpf: null, telefone: null, role: null, status: null, prefs: null },
  isLoading: false,
};

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === "success" ? "✅" : "⚠️"}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },

  loadData: () => {
    const p = state.professor;
    const nomePerfil = document.getElementById("nome-perfil");
    const uidPerfil = document.getElementById("uid-perfil");
    const inputNome = document.getElementById("input-nome");
    const inputEmail = document.getElementById("input-email");
    const inputCpf = document.getElementById("input-cpf");
    const inputTelefone = document.getElementById("input-telefone");

    if (nomePerfil) nomePerfil.textContent = p.nome ?? "";
    if (uidPerfil) uidPerfil.textContent = `UID: ${p.uid}`;
    if (inputNome) inputNome.value = p.nome ?? "";
    if (inputEmail) inputEmail.value = p.email ?? "";
    if (inputCpf) inputCpf.value = p.cpf ?? "";
    if (inputTelefone) inputTelefone.value = p.telefone ?? "";

    const prefs = p.prefs?.notificacoes ?? {};
    const silencio = p.prefs?.silencio ?? { inicio: "22:00", fim: "07:00" };
    const prefFalta = document.getElementById("pref-falta");
    const prefBilhete = document.getElementById("pref-bilhete");
    const prefNota = document.getElementById("pref-nota");
    const prefAviso = document.getElementById("pref-aviso");
    const silencioInicio = document.getElementById("silencio-inicio");
    const silencioFim = document.getElementById("silencio-fim");

    if (prefFalta) prefFalta.checked = prefs.falta ?? true;
    if (prefBilhete) prefBilhete.checked = prefs.bilhete ?? true;
    if (prefNota) prefNota.checked = prefs.nota ?? true;
    if (prefAviso) prefAviso.checked = prefs.aviso ?? true;
    if (silencioInicio) silencioInicio.value = silencio.inicio;
    if (silencioFim) silencioFim.value = silencio.fim;
  },
};

const FirebaseService = {
  updateProfile: async (data) => {
    if (state.isLoading) return;
    state.isLoading = true;
    try {
      await update(ref(db, `usuarios/${state.professor.uid}`), data);
      Object.assign(state.professor, data);
      UI.showToast("Perfil atualizado com sucesso!", "success");
    } catch {
      UI.showToast("Erro ao atualizar perfil.", "error");
    } finally {
      state.isLoading = false;
    }
  },
};

document.getElementById("input-foto")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = document.getElementById("img-perfil");
    if (img) img.src = event.target.result;
    UI.showToast("Foto carregada localmente. Salve para confirmar.", "info");
  };
  reader.readAsDataURL(file);
});

document.getElementById("btn-salvar")?.addEventListener("click", () => {
  const nome = document.getElementById("input-nome")?.value?.trim();
  const telefone = document.getElementById("input-telefone")?.value?.trim();
  if (!nome) { UI.showToast("Nome é obrigatório.", "error"); return; }
  const data = {
    nome,
    telefone: telefone ?? "",
    prefs: {
      notificacoes: {
        falta: document.getElementById("pref-falta")?.checked ?? true,
        bilhete: document.getElementById("pref-bilhete")?.checked ?? true,
        nota: document.getElementById("pref-nota")?.checked ?? true,
        aviso: document.getElementById("pref-aviso")?.checked ?? true,
      },
      silencio: {
        inicio: document.getElementById("silencio-inicio")?.value ?? "22:00",
        fim: document.getElementById("silencio-fim")?.value ?? "07:00",
      },
    },
  };
  FirebaseService.updateProfile(data);
});

document.getElementById("btn-sair")?.addEventListener("click", async () => {
  if (confirm("Deseja realmente sair do sistema?")) {
    UI.showToast("Saindo...", "info");
    try { await signOut(auth); } finally { location.replace("../../auth/login.html"); }
  }
});

function init() {
  _authUnsub = onAuthStateChanged(auth, async (user) => {
    _authUnsub();
    _authUnsub = null;
    if (!user) { location.replace("../../auth/login.html"); return; }
    try {
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists()) { await signOut(auth); location.replace("../../auth/login.html"); return; }
      const data = snap.val();
      if (data.role !== "professor" || data.status !== "ativo") {
        await signOut(auth); location.replace("../../auth/login.html"); return;
      }
      state.professor.uid = user.uid;
      state.professor.nome = data.nome ?? null;
      state.professor.email = data.email ?? null;
      state.professor.cpf = data.cpf ?? null;
      state.professor.telefone = data.telefone ?? null;
      state.professor.role = data.role;
      state.professor.status = data.status;
      state.professor.prefs = data.prefs ?? null;
      UI.loadData();
    } catch { location.replace("../../auth/login.html"); }
  });
}

window.addEventListener("pagehide", () => { if (_authUnsub) _authUnsub(); });
document.addEventListener("DOMContentLoaded", init);
