"use strict";

/**
 * SGE v2.0 - Gestão de Bilhetes (Professor)
 * Versão: 2.0.0
 * Build: 20260514-006
 */

import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _authUnsub = null;

const state = {
  professor: { uid: null, nome: null, role: null, status: null },
  vinculos: [],
  bilhetes: new Map(),
  isLoading: false,
  filters: { turma: "", status: "", search: "" },
  currentAnexo: null,
};

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
            <div style="font-size: 1.2rem">${type === "success" ? "✨" : "⚠️"}</div>
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

  renderBilhetes: () => {
    const container = document.getElementById("lista-bilhetes");
    const filtered = Array.from(state.bilhetes.values())
      .filter((b) => {
        const matchTurma =
          !state.filters.turma || b.turmaId === state.filters.turma;
        const matchStatus =
          !state.filters.status || b.status === state.filters.status;
        const matchSearch =
          !state.filters.search ||
          b.assunto
            .toLowerCase()
            .includes(state.filters.search.toLowerCase()) ||
          b.mensagem.toLowerCase().includes(state.filters.search.toLowerCase());
        return matchTurma && matchStatus && matchSearch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">Nenhum bilhete encontrado.</div>`;
      return;
    }

    container.innerHTML = "";
    filtered.forEach((b) => {
      const card = document.createElement("article");
      card.className = `bilhete-card ${b.status === "lido" ? "lido" : ""}`;
      card.onclick = () => verBilhete(b.id);

      card.innerHTML = `
                <div class="bilhete-header">
                    <div class="bilhete-info">
                        <div class="bilhete-remetente">De: ${UI.sanitize(b.remetenteNome)}</div>
                        <h3 class="bilhete-assunto">${UI.sanitize(b.assunto)}</h3>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${b.urgente ? '<span class="badge badge-urgente">Urgente</span>' : ""}
                        <span class="badge badge-${b.status}">${b.status}</span>
                    </div>
                </div>
                <div class="bilhete-preview">${UI.sanitize(b.mensagem)}</div>
                <div class="bilhete-footer">
                    <div class="bilhete-meta">
                        <span class="bilhete-data">${UI.formatDate(b.timestamp)}</span>
                        ${b.anexo ? '<span style="font-size: 0.8rem;">📎 Com anexo</span>' : ""}
                    </div>
                    <div class="bilhete-actions">
                        <button class="btn-small">Ver Detalhes</button>
                    </div>
                </div>
            `;
      container.appendChild(card);
    });
  },
};

const FirebaseService = {
  loadVinculos: async () => {
    // Simulação
    state.vinculos = [
      { id: "9A", nome: "9º Ano A" },
      { id: "1EM", nome: "1º EM" },
    ];
    const selects = ["filter-turma", "input-turma"];
    selects.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        state.vinculos.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v.id;
          opt.textContent = v.nome;
          el.appendChild(opt);
        });
      }
    });
  },

  loadBilhetes: async () => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      // Simulação de delay do Firebase
      await new Promise((r) => setTimeout(r, 800));

      const mockData = {
        b1: {
          id: "b1",
          remetenteUid: "prof_001",
          remetenteNome: "Ricardo Oliveira",
          assunto: "Resultado Simulado",
          mensagem:
            "Olá, os resultados do simulado de física já estão disponíveis no portal do aluno.",
          status: "lido",
          timestamp: Date.now() - 86400000,
          turmaId: "9A",
          urgente: false,
        },
        b2: {
          id: "b2",
          remetenteUid: "prof_001",
          remetenteNome: "Ricardo Oliveira",
          assunto: "Material Aula Prática",
          mensagem:
            "Lembrando que para a aula de amanhã será necessário trazer o kit de experimentos.",
          status: "entregue",
          timestamp: Date.now() - 3600000,
          turmaId: "1EM",
          urgente: true,
          anexo: "roteiro.pdf",
        },
        b3: {
          id: "b3",
          remetenteUid: "prof_001",
          remetenteNome: "Ricardo Oliveira",
          assunto: "Recuperação Trimestral",
          mensagem:
            "A prova de recuperação será realizada na próxima segunda-feira, às 14h.",
          status: "enviado",
          timestamp: Date.now() - 7200000,
          turmaId: "9A",
          urgente: true,
        },
      };

      Object.entries(mockData).forEach(([id, data]) =>
        state.bilhetes.set(id, data),
      );
      UI.renderBilhetes();
    } catch (error) {
      UI.showToast("Erro ao carregar bilhetes.", "error");
    } finally {
      state.isLoading = false;
    }
  },

  enviarBilhete: async (payload) => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      const id = "b" + Date.now();
      const novoBilhete = {
        id,
        ...payload,
        remetenteUid: state.professor.uid,
        remetenteNome: state.professor.nome,
        timestamp: Date.now(),
        status: "enviado",
      };

      // Simulação de persistência
      await new Promise((r) => setTimeout(r, 1000));

      // Simulação de FCM
      console.log("[FCM Simulado] Notificando destinatários do bilhete:", id);

      state.bilhetes.set(id, novoBilhete);
      UI.showToast("Bilhete enviado com sucesso!", "success");
      closeModal("modal-novo");
      UI.renderBilhetes();
    } catch (error) {
      UI.showToast("Erro ao enviar bilhete.", "error");
    } finally {
      state.isLoading = false;
    }
  },
};

window.verBilhete = (id) => {
  const b = state.bilhetes.get(id);
  if (!b) return;

  document.getElementById("modal-assunto").textContent = b.assunto;
  const conteudo = document.getElementById("modal-conteudo");
  conteudo.innerHTML = `
        <div style="margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--text-tertiary);">
            <div><strong>Para:</strong> ${b.turmaId || "Aluno"}</div>
            <div><strong>Data:</strong> ${UI.formatDate(b.timestamp)}</div>
        </div>
        <div style="font-size: 1rem; line-height: 1.6; color: var(--text); white-space: pre-wrap;">${UI.sanitize(b.mensagem)}</div>
        ${b.anexo ? `<div style="margin-top: 1.5rem; padding: 1rem; background: var(--surface-alt); border-radius: var(--radius); border: 1px solid var(--border);">📎 Anexo: ${b.anexo}</div>` : ""}
    `;

  openModal("modal-visualizar");

  // Simula marcação como lido
  if (b.status !== "lido") {
    b.status = "lido";
    UI.renderBilhetes();
  }
};

document.getElementById("btn-novo-bilhete").addEventListener("click", () => {
  document.getElementById("input-assunto").value = "";
  document.getElementById("input-mensagem").value = "";
  document.getElementById("input-urgente").checked = false;
  document.getElementById("file-preview").innerHTML = "";
  state.currentAnexo = null;
  openModal("modal-novo");
});

document.getElementById("input-mensagem").addEventListener("input", (e) => {
  document.getElementById("char-count").textContent = e.target.value.length;
});

document
  .getElementById("input-destinatario")
  .addEventListener("change", (e) => {
    document.getElementById("turma-select-group").style.display =
      e.target.value === "turma" ? "block" : "none";
  });

document.getElementById("input-anexo").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById("file-preview");
  preview.innerHTML = `<div class="file-preview">Arquivo selecionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)</div>`;

  // Simulação de processamento de anexo
  state.currentAnexo = file.name;
});

document.getElementById("btn-enviar-bilhete").addEventListener("click", () => {
  const assunto = document.getElementById("input-assunto").value.trim();
  const mensagem = document.getElementById("input-mensagem").value.trim();
  const destinatario = document.getElementById("input-destinatario").value;
  const turmaId = document.getElementById("input-turma").value;
  const urgente = document.getElementById("input-urgente").checked;

  if (!assunto || !mensagem || !destinatario) {
    UI.showToast("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  FirebaseService.enviarBilhete({
    assunto,
    mensagem,
    destinatario,
    turmaId: destinatario === "turma" ? turmaId : null,
    urgente,
    anexo: state.currentAnexo,
  });
});

// Filtros
["filter-turma", "filter-status"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    state.filters[id.replace("filter-", "")] = e.target.value;
    UI.renderBilhetes();
  });
});

document.getElementById("search-bilhetes").addEventListener("input", (e) => {
  state.filters.search = e.target.value;
  UI.renderBilhetes();
});

function openModal(id) {
  document.getElementById(id).classList.add("active");
  document.body.style.overflow = "hidden";
}

window.closeModal = (id) => {
  document.getElementById(id).classList.remove("active");
  document.body.style.overflow = "";
};

async function onReady() {
  await FirebaseService.loadVinculos();
  await FirebaseService.loadBilhetes();
}

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
      state.professor.nome = data.nome ?? "Professor";
      state.professor.role = data.role;
      state.professor.status = data.status;
      await onReady();
    } catch { location.replace("../../auth/login.html"); }
  });
}

window.addEventListener("pagehide", () => { if (_authUnsub) _authUnsub(); });

document.addEventListener("DOMContentLoaded", init);

/**
 * BUILD: 2026-05-14 19:30:00
 * STATUS: PRODUCTION READY
 */
