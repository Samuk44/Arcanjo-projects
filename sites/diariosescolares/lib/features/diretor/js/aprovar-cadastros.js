/**
 * SGE v2.0 - Aprovação de Cadastros
 * Design: Dark Premium (Inspirado no Dashboard de Métricas)
 * Build: 20260514-002
 */

import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const state = {
  pendingUsers: new Map(),
  isLoading: false,
  abortController: new AbortController(),
  currentUser: null,
};

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast`;
    if (type === "error") toast.style.borderLeftColor = "var(--danger)";
    if (type === "info") toast.style.borderLeftColor = "var(--info)";

    toast.innerHTML = `
            <div style="font-size: 1.2rem">${type === "success" ? "✨" : type === "error" ? "⚠️" : "ℹ️"}</div>
            <div>
                <div style="font-weight: 700; font-size: 0.9rem">${type.toUpperCase()}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary)">${message}</div>
            </div>
        `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },

  sanitize: (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate: (timestamp) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  },
};

const FirebaseService = {
  initList: async () => {
    // Simulação de dados com o novo padrão visual
    const mockData = {
      p1: {
        nome: "Marcos Silveira",
        email: "marcos.s@sge.edu",
        disciplinas: ["Física Quantum", "Matemática"],
        turmas: ["3º EM A", "2º EM B"],
        dataSolicitacao: Date.now() - 4500000,
        fotoUrl: "https://i.pravatar.cc/150?u=m1",
        bio: "Doutorado em Astrofísica pela USP.",
      },
      p2: {
        nome: "Helena Costa",
        email: "h.costa@sge.edu",
        disciplinas: ["História", "Sociologia"],
        turmas: ["1º EM C"],
        dataSolicitacao: Date.now() - 12000000,
        fotoUrl: "https://i.pravatar.cc/150?u=h1",
        bio: "Especialista em História do Brasil Colônia.",
      },
      p3: {
        nome: "Gabriel Mendes",
        email: "g.mendes@sge.edu",
        disciplinas: ["Artes", "Design"],
        turmas: ["9º Ano A"],
        dataSolicitacao: Date.now() - 86400000,
        fotoUrl: "https://i.pravatar.cc/150?u=g1",
        bio: "Artista plástico com 10 anos de experiência.",
      },
    };
    setTimeout(() => renderTable(mockData), 800);
  },

  aprovar: async (uid) => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      const user = state.pendingUsers.get(uid);
      // Simula persistência atômica
      await new Promise((r) => setTimeout(r, 1000));

      UI.showToast(`${user.nome} agora faz parte da equipe!`, "success");
      state.pendingUsers.delete(uid);
      renderTable(Object.fromEntries(state.pendingUsers));
      closeModal("modal-detalhes");
    } catch (e) {
      UI.showToast("Erro ao processar aprovação.", "error");
    } finally {
      state.isLoading = false;
    }
  },

  rejeitar: async (uid, motivo) => {
    if (!motivo.trim())
      return UI.showToast("Descreva o motivo da rejeição.", "error");

    await new Promise((r) => setTimeout(r, 800));
    UI.showToast("Cadastro removido e professor notificado.", "info");
    state.pendingUsers.delete(uid);
    renderTable(Object.fromEntries(state.pendingUsers));
    closeModal("modal-rejeicao");
    closeModal("modal-detalhes");
  },
};

function renderTable(data) {
  const tbody = document.getElementById("lista-pendentes");
  tbody.innerHTML = "";

  if (!data || Object.keys(data).length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 4rem; color: var(--text-tertiary);">Nenhuma solicitação pendente no momento.</td></tr>';
    return;
  }

  Object.entries(data).forEach(([uid, user]) => {
    state.pendingUsers.set(uid, user);
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${user.fotoUrl}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border);">
                    <div>
                        <div style="font-weight: 600; color: var(--text)">${UI.sanitize(user.nome)}</div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary)">${UI.sanitize(user.email)}</div>
                    </div>
                </div>
            </td>
            <td><div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">${user.disciplinas.map((d) => `<span class="badge badge-pending">${d}</span>`).join("")}</div></td>
            <td style="font-family: 'DM Mono', monospace; font-size: 0.85rem;">${user.turmas.join(" • ")}</td>
            <td style="font-size: 0.85rem;">${UI.formatDate(user.dataSolicitacao)}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem;" onclick="verDetalhes('${uid}')">Detalhes</button>
                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem;" onclick="FirebaseService.aprovar('${uid}')">Aprovar</button>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

window.verDetalhes = (uid) => {
  const user = state.pendingUsers.get(uid);
  const container = document.getElementById("detalhes-professor");
  container.innerHTML = `
        <div style="display: flex; gap: 1.5rem; margin-bottom: 2rem; align-items: center;">
            <img src="${user.fotoUrl}" style="width: 80px; height: 80px; border-radius: 1rem; border: 2px solid var(--primary);">
            <div>
                <h3 style="color: var(--text); font-size: 1.25rem;">${UI.sanitize(user.nome)}</h3>
                <p style="color: var(--primary); font-size: 0.9rem; font-weight: 600;">Candidato a Professor</p>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="detail-item">
                <span class="detail-label">Formação / Bio</span>
                <span class="detail-value">${UI.sanitize(user.bio)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Disciplinas</span>
                <span class="detail-value">${user.disciplinas.join(", ")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Turmas Solicitadas</span>
                <span class="detail-value">${user.turmas.join(", ")}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">E-mail de Contato</span>
                <span class="detail-value">${UI.sanitize(user.email)}</span>
            </div>
        </div>
    `;
  document.getElementById("btn-aprovar-modal").onclick = () =>
    FirebaseService.aprovar(uid);
  document.getElementById("btn-rejeitar-modal").onclick = () =>
    abrirRejeicao(uid);
  openModal("modal-detalhes");
};

window.abrirRejeicao = (uid) => {
  const btnConfirmar = document.getElementById("confirmar-rejeicao");
  btnConfirmar.onclick = () =>
    FirebaseService.rejeitar(
      uid,
      document.getElementById("motivo-rejeicao").value,
    );
  openModal("modal-rejeicao");
};

function openModal(id) {
  document.getElementById(id).classList.add("active");
  document.body.style.overflow = "hidden";
}

window.closeModal = (id) => {
  document.getElementById(id).classList.remove("active");
  document.body.style.overflow = "";
};

function init() {
  const unsub = onAuthStateChanged(auth, async (user) => {
    unsub();
    if (!user) { location.replace("../../auth/login.html"); return; }
    try {
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists()) { await signOut(auth); location.replace("../../auth/login.html"); return; }
      const data = snap.val();
      if (data.role !== "diretor" || data.status !== "ativo") {
        await signOut(auth); location.replace("../../auth/login.html"); return;
      }
      state.currentUser = { uid: user.uid, ...data };

      FirebaseService.initList();

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting)
          console.log("Observer: Fim da lista alcançado");
      });
      observer.observe(document.getElementById("sentinel"));
    } catch { location.replace("../../auth/login.html"); }
  });
}

document.addEventListener("DOMContentLoaded", init);

/**
 * BUILD: 2026-05-14 15:10:00
 * DESIGN: DARK PREMIUM / SGE v2.0
 */
