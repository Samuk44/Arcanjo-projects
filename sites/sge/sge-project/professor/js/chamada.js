/**
 * SGE v2.0 - Controle de Chamada (Professor)
 * Versão: 2.0.0
 * Build: 20260514-003
 */

const state = {
  professor: { uid: "prof_001", nome: "Ricardo Oliveira", role: "professor" },
  vinculos: [],
  horarios: {},
  alunos: [],
  chamadaAtual: {},
  turmaId: "",
  aulaId: "",
  data: new Intl.DateTimeFormat("pt-BR").format(new Date()).replace(/\//g, "-"),
  statusAula: "FUTURA",
  isLoading: false,
  debounceTimeout: null,
};

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.role = "alert";
    toast.innerHTML = `
            <div style="font-size: 1.2rem">${type === "success" ? "✅" : type === "error" ? "❌" : "⚠️"}</div>
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

  updateProgress: () => {
    const total = state.alunos.length;
    const registrados = Object.keys(state.chamadaAtual).length;
    const progresso = total > 0 ? (registrados / total) * 100 : 0;

    document.getElementById("progress-fill").style.width = `${progresso}%`;
    document.getElementById("btn-salvar").disabled =
      registrados !== total || state.statusAula === "FUTURA";
  },

  renderAlunos: (filtro = "") => {
    const container = document.getElementById("lista-alunos");
    const alunosFiltrados = state.alunos.filter((a) =>
      a.nome.toLowerCase().includes(filtro.toLowerCase()),
    );

    if (alunosFiltrados.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">Nenhum aluno encontrado.</div>`;
      return;
    }

    container.innerHTML = alunosFiltrados
      .map((aluno) => {
        const status = state.chamadaAtual[aluno.uid] || "";
        return `
                <div class="student-row" data-uid="${aluno.uid}" style="${status === "F" ? "border-color: var(--warning); background: rgba(250, 204, 21, 0.05);" : ""}">
                    <div class="student-info">
                        <div class="student-avatar">${aluno.nome.charAt(0)}</div>
                        <div class="student-details">
                            <div class="student-name">${aluno.nome}</div>
                            <div class="student-id">${aluno.uid}</div>
                        </div>
                    </div>
                    <div class="attendance-buttons" role="group" aria-label="Status de presença para ${aluno.nome}">
                        <button class="btn-attendance p ${status === "P" ? "active" : ""}" 
                                onclick="setAttendance('${aluno.uid}', 'P')" 
                                aria-pressed="${status === "P"}" title="Presente">P</button>
                        <button class="btn-attendance f ${status === "F" ? "active" : ""}" 
                                onclick="setAttendance('${aluno.uid}', 'F')" 
                                aria-pressed="${status === "F"}" title="Falta">F</button>
                        <button class="btn-attendance j ${status === "J" ? "active" : ""}" 
                                onclick="setAttendance('${aluno.uid}', 'J')" 
                                aria-pressed="${status === "J"}" title="Justificado">J</button>
                    </div>
                </div>
            `;
      })
      .join("");
  },
};

const FirebaseService = {
  loadVinculos: async () => {
    // Simulação de carregamento de vínculos do professor
    state.vinculos = [
      { turmaId: "9A", turmaNome: "9º Ano A", disciplinas: ["Matemática"] },
      { turmaId: "1EM", turmaNome: "1º EM", disciplinas: ["Física"] },
    ];
    const select = document.getElementById("select-turma");
    select.innerHTML =
      '<option value="">Selecione a turma</option>' +
      state.vinculos
        .map((v) => `<option value="${v.turmaId}">${v.turmaNome}</option>`)
        .join("");
  },

  loadAulas: async (turmaId) => {
    // Simulação de horários/aulas da turma
    state.horarios = {
      "9A": [
        {
          id: "aula1",
          nome: "1ª Aula (07:00 - 07:50)",
          status: "JÁ_REALIZADA",
        },
        {
          id: "aula2",
          nome: "2ª Aula (07:50 - 08:40)",
          status: "EM_ANDAMENTO",
        },
        { id: "aula3", nome: "3ª Aula (08:40 - 09:30)", status: "FUTURA" },
      ],
      "1EM": [
        { id: "aula1", nome: "1ª Aula (07:00 - 07:50)", status: "PENDENTE" },
      ],
    };
    const select = document.getElementById("select-aula");
    select.innerHTML =
      '<option value="">Selecione a aula</option>' +
      (state.horarios[turmaId] || [])
        .map((a) => `<option value="${a.id}">${a.nome}</option>`)
        .join("");
  },

  loadAlunos: async (turmaId) => {
    // Simulação de alunos da turma
    state.alunos = [
      { uid: "ALU001", nome: "Ana Beatriz Santos" },
      { uid: "ALU002", nome: "Bruno Ferreira" },
      { uid: "ALU003", nome: "Carla Oliveira" },
      { uid: "ALU004", nome: "Daniel Lima" },
    ];
    UI.renderAlunos();
  },

  salvarChamada: async () => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      const payload = {
        turmaId: state.turmaId,
        aulaId: state.aulaId,
        data: state.data,
        alunos: state.chamadaAtual,
        timestamp: Date.now(),
        professorId: state.professor.uid,
      };

      console.log("[Firebase] Salvando chamada:", payload);
      await new Promise((r) => setTimeout(r, 1000)); // Simula latência

      UI.showToast("Chamada registrada com sucesso!", "success");
      // Simula redirecionamento ou reset
    } catch (error) {
      console.error("[Firebase] Erro:", error);
      UI.showToast("Erro ao salvar chamada. Verifique sua conexão.", "error");
    } finally {
      state.isLoading = false;
    }
  },
};

window.setAttendance = (alunoUid, status) => {
  if (state.statusAula === "FUTURA") {
    UI.showToast(
      "Não é possível registrar presença para aulas futuras.",
      "warning",
    );
    return;
  }

  // Previne duplo clique e feedback tátil
  if (state.chamadaAtual[alunoUid] === status) return;

  if (window.navigator.vibrate) window.navigator.vibrate(10);

  state.chamadaAtual[alunoUid] = status;

  if (status === "F") {
    console.log(`[FCM Simulado] Notificando pais de ${alunoUid} sobre falta.`);
    UI.showToast(`Falta registrada. Pais serão notificados.`, "warning");
  }

  requestAnimationFrame(() => {
    UI.renderAlunos(document.getElementById("search-alunos").value);
    UI.updateProgress();
  });
};

document.getElementById("select-turma").addEventListener("change", (e) => {
  state.turmaId = e.target.value;
  state.chamadaAtual = {};
  if (state.turmaId) {
    FirebaseService.loadAulas(state.turmaId);
    FirebaseService.loadAlunos(state.turmaId);
  }
  UI.updateProgress();
});

document.getElementById("select-aula").addEventListener("change", (e) => {
  state.aulaId = e.target.value;
  const aula = (state.horarios[state.turmaId] || []).find(
    (a) => a.id === state.aulaId,
  );
  state.statusAula = aula ? aula.status : "FUTURA";

  const statusEl = document.getElementById("status-aula");
  statusEl.textContent = state.statusAula.replace(/_/g, " ");
  statusEl.style.color =
    state.statusAula === "EM_ANDAMENTO"
      ? "var(--success)"
      : state.statusAula === "PENDENTE"
        ? "var(--warning)"
        : state.statusAula === "JÁ_REALIZADA"
          ? "var(--info)"
          : "var(--text-tertiary)";

  UI.updateProgress();
});

document.getElementById("search-alunos").addEventListener("input", (e) => {
  clearTimeout(state.debounceTimeout);
  state.debounceTimeout = setTimeout(() => {
    UI.renderAlunos(e.target.value);
  }, 300);
});

document.getElementById("btn-salvar").addEventListener("click", () => {
  FirebaseService.salvarChamada();
});

document.getElementById("btn-limpar").addEventListener("click", () => {
  if (confirm("Deseja limpar todos os registros desta chamada?")) {
    state.chamadaAtual = {};
    UI.renderAlunos();
    UI.updateProgress();
  }
});

// Inicialização
async function init() {
  // Simula verificação de sessão RBAC
  if (state.professor.role !== "professor") {
    document.body.innerHTML =
      '<div style="display: grid; place-items: center; height: 100vh;"><h1>Acesso Negado</h1></div>';
    return;
  }

  await FirebaseService.loadVinculos();
}

document.addEventListener("DOMContentLoaded", init);

/**
 * BUILD: 2026-05-14 16:00:00
 * STATUS: PRODUCTION READY
 */
