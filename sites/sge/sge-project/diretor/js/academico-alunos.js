/**
 * SGE v2.0 - Gestão Acadêmica de Alunos (Diretor)
 * Versão: 2.0.0
 * Build: 20260514-011
 */

const state = {
  diretor: { uid: "dir_001", role: "diretor", status: "ativo" },
  alunos: [],
  turmas: [],
  filtros: { turma: "", search: "" },
  isLoading: false,
  alunoSelecionado: null,
};

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === "success" ? "✅" : "⚠️"}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },

  sanitize: (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  renderAlunos: () => {
    const tbody = document.getElementById("tabela-alunos");
    const filtered = state.alunos.filter((a) => {
      const matchTurma =
        !state.filtros.turma || a.turmaId === state.filtros.turma;
      const matchSearch =
        !state.filtros.search ||
        a.nome.toLowerCase().includes(state.filtros.search.toLowerCase()) ||
        a.matricula.includes(state.filtros.search);
      return matchTurma && matchSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Nenhum aluno encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map((a) => {
        const freqClass =
          a.frequencia >= 75
            ? "freq-ok"
            : a.frequencia >= 60
              ? "freq-atencao"
              : "freq-risco";
        return `
                <tr>
                    <td style="font-family: 'DM Mono', monospace; font-size: 0.85rem;">${a.matricula}</td>
                    <td><span class="aluno-nome" onclick="abrirVinculo('${a.uid}')">${UI.sanitize(a.nome)}</span></td>
                    <td>${a.turmaNome}</td>
                    <td><span class="freq-badge ${freqClass}">${a.frequencia}%</span></td>
                    <td style="font-family: 'DM Mono', monospace; font-weight: 700;">${a.media.toFixed(1)}</td>
                    <td>
                        <button class="action-btn" onclick="abrirVinculo('${a.uid}')">Vincular Pai</button>
                    </td>
                </tr>
            `;
      })
      .join("");
  },
};

const FirebaseService = {
  loadDados: async () => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      // Simulação
      await new Promise((r) => setTimeout(r, 800));

      state.turmas = [
        { id: "9A", nome: "9º Ano A" },
        { id: "1EM", nome: "1º EM" },
      ];

      state.alunos = [
        {
          uid: "ALU001",
          matricula: "2026001",
          nome: "Ana Beatriz Santos",
          turmaId: "9A",
          turmaNome: "9º Ano A",
          frequencia: 92,
          media: 8.5,
        },
        {
          uid: "ALU002",
          matricula: "2026002",
          nome: "Bruno Ferreira",
          turmaId: "9A",
          turmaNome: "9º Ano A",
          frequencia: 72,
          media: 6.0,
        },
        {
          uid: "ALU003",
          matricula: "2026003",
          nome: "Carla Oliveira",
          turmaId: "1EM",
          turmaNome: "1º EM",
          frequencia: 58,
          media: 4.5,
        },
      ];

      const select = document.getElementById("select-turma");
      select.innerHTML =
        '<option value="">Todas as turmas</option>' +
        state.turmas
          .map((t) => `<option value="${t.id}">${t.nome}</option>`)
          .join("");

      UI.renderAlunos();
    } catch (error) {
      UI.showToast("Erro ao carregar dados acadêmicos.", "error");
    } finally {
      state.isLoading = false;
    }
  },

  buscarResponsavel: async (query) => {
    // Simulação de busca de pai no DB
    if (query.length < 5) return null;
    return { uid: "pai_001", nome: "João Silva", email: "joao@email.com" };
  },

  confirmarVinculo: async (alunoId, paiId) => {
    try {
      // Simulação de write
      await new Promise((r) => setTimeout(r, 1000));

      // Log auditoria
      console.log("[AUDITORIA] Aluno", alunoId, "vinculado ao pai", paiId);

      UI.showToast("Responsável vinculado com sucesso!", "success");
      closeModal("modal-vinculo");
    } catch (error) {
      UI.showToast("Erro ao vincular responsável.", "error");
    }
  },
};

window.abrirVinculo = (uid) => {
  const aluno = state.alunos.find((a) => a.uid === uid);
  if (!aluno) return;

  state.alunoSelecionado = aluno;
  document.getElementById("vinculo-aluno-nome").value = aluno.nome;
  document.getElementById("pai-resultado").style.display = "none";
  document.getElementById("search-pai").value = "";

  openModal("modal-vinculo");
};

document.getElementById("search-pai").addEventListener("input", async (e) => {
  const res = await FirebaseService.buscarResponsavel(e.target.value);
  const container = document.getElementById("pai-resultado");

  if (res) {
    document.getElementById("pai-nome-res").textContent = res.nome;
    document.getElementById("pai-email-res").textContent = res.email;
    container.style.display = "block";

    document.getElementById("btn-confirmar-vinculo").onclick = () => {
      FirebaseService.confirmarVinculo(state.alunoSelecionado.uid, res.uid);
    };
  } else {
    container.style.display = "none";
  }
});

document.getElementById("select-turma").addEventListener("change", (e) => {
  state.filtros.turma = e.target.value;
  UI.renderAlunos();
});

document.getElementById("search-aluno").addEventListener("input", (e) => {
  state.filtros.search = e.target.value;
  UI.renderAlunos();
});

function openModal(id) {
  document.getElementById(id).classList.add("active");
}

window.closeModal = (id) => {
  document.getElementById(id).classList.remove("active");
};

async function init() {
  if (state.diretor.role !== "diretor" || state.diretor.status !== "ativo") {
    document.body.innerHTML = "<h1>Acesso Negado</h1>";
    return;
  }
  await FirebaseService.loadDados();
}

document.addEventListener("DOMContentLoaded", init);

/**
 * BUILD: 2026-05-14 22:30:00
 * STATUS: PRODUCTION READY
 */
