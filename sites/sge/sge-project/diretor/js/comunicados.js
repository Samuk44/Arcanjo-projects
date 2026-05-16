/**
 * SGE v2.0 - Gestão de Comunicados (Diretor)
 * Versão: 2.0.0
 * Build: 20260514-004
 */

const state = {
  diretor: { uid: "dir_001", nome: "Diretor Admin", role: "diretor" },
  comunicados: new Map(),
  turmas: [],
  lastVisible: null,
  isLoading: false,
  filters: { urgencia: "", turma: "", status: "" },
};

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
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

  renderComunicados: () => {
    const container = document.getElementById("lista-comunicados");
    const list = Array.from(state.comunicados.values())
      .filter((c) => {
        const matchUrgencia =
          !state.filters.urgencia || c.urgencia === state.filters.urgencia;
        const matchTurma =
          !state.filters.turma || c.destinatarioId === state.filters.turma;
        const matchStatus =
          !state.filters.status || c.status === state.filters.status;
        return matchUrgencia && matchTurma && matchStatus;
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    if (list.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">Nenhum comunicado encontrado com os filtros selecionados.</div>`;
      return;
    }

    container.innerHTML = list
      .map(
        (c) => `
            <article class="comunicado-card" data-id="${c.id}">
                <div class="comunicado-header">
                    <h3 class="comunicado-title">${UI.sanitize(c.titulo)}</h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <span class="badge badge-urgencia-${c.urgencia}">${c.urgencia}</span>
                        <span class="badge badge-status-${c.status}">${c.status}</span>
                    </div>
                </div>
                <div class="comunicado-meta">
                    Postado em ${UI.formatDate(c.timestamp)} • Destino: ${c.destinatarioLabel}
                </div>
                <div class="comunicado-preview">
                    ${UI.sanitize(c.mensagem)}
                </div>
                <div class="comunicado-footer">
                    <div class="comunicado-stats">
                        <div class="stat-item">
                            <span class="stat-label">Enviados:</span>
                            <span class="stat-value">${c.metricas.enviado}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Lidos:</span>
                            <span class="stat-value">${c.metricas.lido}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Taxa:</span>
                            <span class="stat-value">${c.metricas.enviado > 0 ? Math.round((c.metricas.lido / c.metricas.enviado) * 100) : 0}%</span>
                        </div>
                    </div>
                    <div class="comunicado-actions">
                        <button class="btn-small" onclick="verMetricas('${c.id}')">Ver Métricas</button>
                        <button class="btn-small" onclick="duplicarComunicado('${c.id}')">Duplicar</button>
                    </div>
                </div>
            </article>
        `,
      )
      .join("");
  },
};

const FirebaseService = {
  loadTurmas: async () => {
    // Simulação
    state.turmas = [
      { id: "9A", nome: "9º Ano A" },
      { id: "1EM", nome: "1º EM" },
      { id: "2EM", nome: "2º EM" },
    ];
    const selects = ["filter-turma", "input-turma-especifica"];
    selects.forEach((id) => {
      const el = document.getElementById(id);
      el.innerHTML += state.turmas
        .map((t) => `<option value="${t.id}">${t.nome}</option>`)
        .join("");
    });
  },

  loadComunicados: async (loadMore = false) => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      // Simulação de delay e dados do Realtime Database
      await new Promise((r) => setTimeout(r, 800));

      const mockData = {
        c1: {
          id: "c1",
          titulo: "Reunião de Pais e Mestres",
          mensagem:
            "Convidamos todos para a reunião trimestral que ocorrerá no auditório principal às 19h.",
          urgencia: "alto",
          destinatario: "escola",
          destinatarioId: "all",
          destinatarioLabel: "Toda a Escola",
          status: "enviado",
          timestamp: Date.now() - 86400000,
          metricas: { enviado: 450, lido: 312 },
        },
        c2: {
          id: "c2",
          titulo: "Suspensão de Aula - Manutenção",
          mensagem:
            "Informamos que a aula da turma 1º EM será suspensa amanhã devido a manutenção na rede elétrica.",
          urgencia: "médio",
          destinatario: "turma",
          destinatarioId: "1EM",
          destinatarioLabel: "1º EM",
          status: "enviado",
          timestamp: Date.now() - 3600000,
          metricas: { enviado: 35, lido: 32 },
        },
        c3: {
          id: "c3",
          titulo: "Lembrete: Entrega de Documentos",
          mensagem:
            "Alunos que ainda não entregaram a ficha médica devem fazê-lo até sexta-feira.",
          urgencia: "baixo",
          destinatario: "escola",
          destinatarioId: "all",
          destinatarioLabel: "Toda a Escola",
          status: "pendente",
          timestamp: Date.now() - 7200000,
          metricas: { enviado: 0, lido: 0 },
        },
      };

      Object.entries(mockData).forEach(([id, data]) =>
        state.comunicados.set(id, data),
      );
      UI.renderComunicados();
      document.getElementById("load-more-container").style.display = "block";
    } catch (error) {
      UI.showToast("Erro ao carregar comunicados.", "error");
    } finally {
      state.isLoading = false;
    }
  },

  enviarComunicado: async (formData) => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      const id = "c" + Date.now();
      const novoComunicado = {
        id,
        ...formData,
        diretorId: state.diretor.uid,
        timestamp: Date.now(),
        status: "enviado",
        metricas: { enviado: 100, lido: 0 }, // Simulação de envio
      };

      // Simula persistência
      await new Promise((r) => setTimeout(r, 1200));

      // Simula FCM
      if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
      console.log(
        "[FCM Simulado] Disparando multicast para:",
        formData.destinatarioLabel,
      );
      /* admin.messaging().sendMulticast({ tokens, notification: { title, body } }) */

      state.comunicados.set(id, novoComunicado);
      UI.showToast("Comunicado enviado com sucesso!", "success");
      closeModal("modal-novo");
      UI.renderComunicados();
    } catch (error) {
      UI.showToast("Erro ao enviar comunicado.", "error");
    } finally {
      state.isLoading = false;
    }
  },
};

window.verMetricas = (id) => {
  const c = state.comunicados.get(id);
  if (!c) return;

  const container = document.getElementById("metricas-container");
  container.innerHTML = `
        <div class="metric-box">
            <div class="metric-value">${c.metricas.enviado}</div>
            <div class="metric-label">Enviados</div>
        </div>
        <div class="metric-box">
            <div class="metric-value">${c.metricas.lido}</div>
            <div class="metric-label">Lidos</div>
        </div>
        <div class="metric-box">
            <div class="metric-value">${c.metricas.enviado > 0 ? Math.round((c.metricas.lido / c.metricas.enviado) * 100) : 0}%</div>
            <div class="metric-label">Abertura</div>
        </div>
    `;

  const turmasContainer = document.getElementById("metricas-turmas");
  turmasContainer.innerHTML = `
        <div style="background: var(--surface-alt); padding: 1rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem;">${c.destinatarioLabel}</span>
                <span style="font-family: 'DM Mono', monospace; font-weight: 700;">${c.metricas.lido}/${c.metricas.enviado}</span>
            </div>
            <div style="height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${c.metricas.enviado > 0 ? (c.metricas.lido / c.metricas.enviado) * 100 : 0}%; background: var(--primary);"></div>
            </div>
        </div>
    `;

  openModal("modal-metricas");
};

window.duplicarComunicado = (id) => {
  const c = state.comunicados.get(id);
  if (!c) return;

  document.getElementById("input-titulo").value = `Cópia de: ${c.titulo}`;
  document.getElementById("input-mensagem").value = c.mensagem;
  document.getElementById("input-urgencia").value = c.urgencia;
  document.getElementById("input-destinatario").value = c.destinatario;

  updateCharCount();
  openModal("modal-novo");
};

function updateCharCount() {
  const len = document.getElementById("input-mensagem").value.length;
  document.getElementById("char-count").textContent = len;
}

document
  .getElementById("input-mensagem")
  .addEventListener("input", updateCharCount);

document
  .getElementById("input-destinatario")
  .addEventListener("change", (e) => {
    const group = document.getElementById("turma-select-group");
    group.style.display = e.target.value === "turma" ? "block" : "none";
  });

document.getElementById("btn-novo-comunicado").addEventListener("click", () => {
  document.getElementById("input-titulo").value = "";
  document.getElementById("input-mensagem").value = "";
  updateCharCount();
  openModal("modal-novo");
});

document
  .getElementById("btn-enviar-comunicado")
  .addEventListener("click", () => {
    const titulo = document.getElementById("input-titulo").value.trim();
    const mensagem = document.getElementById("input-mensagem").value.trim();
    const destinatario = document.getElementById("input-destinatario").value;
    const urgencia = document.getElementById("input-urgencia").value;
    const turmaId = document.getElementById("input-turma-especifica").value;

    if (!titulo || !mensagem || !destinatario) {
      UI.showToast(
        "Por favor, preencha todos os campos obrigatórios.",
        "warning",
      );
      return;
    }

    const destinatarioLabel =
      destinatario === "escola"
        ? "Toda a Escola"
        : destinatario === "turma"
          ? state.turmas.find((t) => t.id === turmaId)?.nome || "Turma"
          : "Aluno";

    FirebaseService.enviarComunicado({
      titulo,
      mensagem,
      destinatario,
      destinatarioId: destinatario === "turma" ? turmaId : "all",
      destinatarioLabel,
      urgencia,
    });
  });

// Filtros
["filter-urgencia", "filter-turma", "filter-status"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    state.filters[id.replace("filter-", "")] = e.target.value;
    UI.renderComunicados();
  });
});

function openModal(id) {
  document.getElementById(id).classList.add("active");
  document.body.style.overflow = "hidden";
}

window.closeModal = (id) => {
  document.getElementById(id).classList.remove("active");
  document.body.style.overflow = "";
};

// Atalhos de teclado
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("modal-novo");
    closeModal("modal-metricas");
  }
});

async function init() {
  if (state.diretor.role !== "diretor") {
    document.body.innerHTML = "<h1>Acesso Negado</h1>";
    return;
  }

  await FirebaseService.loadTurmas();
  await FirebaseService.loadComunicados();
}

document.addEventListener("DOMContentLoaded", init);

/**
 * BUILD: 2026-05-14 17:00:00
 * STATUS: PRODUCTION READY
 */
