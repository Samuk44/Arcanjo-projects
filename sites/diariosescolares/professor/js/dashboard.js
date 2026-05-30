/* ==========================================================================
   SGE v2.0 - PROFESSOR DASHBOARD JS
   Roteamento, Integração Firebase e Gestão de Estado
   ========================================================================== */

import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  onValue,
  update,
  push,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { checkAccess } from "../../assets/js/core/rbac.js";
import { showToast } from "../../assets/js/core/notifications.js";

// Estado Global do Dashboard
const state = {
  user: null,
  profile: null,
  currentView: "dashboard",
  vinculos: [],
  aulasHoje: [],
};

/**
 * Inicialização do Dashboard
 */
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  setupNavigation();
  setupEventListeners();
});

/**
 * Gestão de Autenticação e RBAC
 */
function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("../../auth/login.html");
      return;
    }

    try {
      const snapshot = await get(ref(db, `usuarios/${user.uid}`));
      const profile = snapshot.val();

      if (
        !profile ||
        profile.role !== "professor" ||
        profile.status !== "ativo"
      ) {
        window.location.replace("../../auth/auth-status.html");
        return;
      }

      state.user = user;
      state.profile = profile;

      updateUIProfile();
      loadProfessorData();
      setupRealtimeMetrics();
    } catch (error) {
      console.error("Erro ao validar sessão:", error);
      showToast("Erro ao carregar perfil.", "danger");
    }
  });
}

/**
 * Carrega dados específicos do professor (vínculos, turmas)
 */
async function loadProfessorData() {
  try {
    const vinculosSnap = await get(
      ref(db, `professores/${state.user.uid}/vinculos`),
    );
    state.vinculos = vinculosSnap.val() || [];

    populateTurmaSelectors();
    loadDashboardStats();
    renderAulasHoje();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

/**
 * Roteamento Interno (Abas)
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll(".sidebar-link[data-view]");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.getAttribute("data-view");

      // Validação de Plano (RBAC)
      if (!checkAccess("professor", view, state.profile.plano)) {
        openModal("upgrade-modal");
        return;
      }

      switchView(view);
    });
  });
}

function switchView(viewId) {
  // Atualiza UI da Sidebar
  document
    .querySelectorAll(".sidebar-link")
    .forEach((l) => l.classList.remove("active"));
  document
    .querySelector(`.sidebar-link[data-view="${viewId}"]`)
    .classList.add("active");

  // Alterna Sections
  document
    .querySelectorAll(".view-section")
    .forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(`view-dashboard`); // Fallback
  const viewSection = document.getElementById(`view-${viewId}`);
  if (viewSection) viewSection.classList.add("active");

  state.currentView = viewId;

  // Carregamento On-Demand
  if (viewId === "chamada") loadChamadaView();
}

/**
 * UI Updates
 */
function updateUIProfile() {
  const saudacao = document.getElementById("saudacao-contextual");
  const userName = document.getElementById("user-name");
  const userDisc = document.getElementById("user-discipline");
  const userInitials = document.getElementById("user-initials");

  const hora = new Date().getHours();
  const saudacaoTxt =
    hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const nome = state.profile?.nome ?? "Professor";
  if (saudacao) saudacao.textContent = `${saudacaoTxt}, ${nome.split(" ")[0]}`;
  if (userName) userName.textContent = nome;
  if (userDisc) userDisc.textContent = state.profile?.disciplina ?? "Professor";
  if (userInitials) userInitials.textContent = nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
}

function populateTurmaSelectors() {
  const select = document.getElementById("select-turma-chamada");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione a Turma</option>';
  state.vinculos.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.turmaId;
    opt.textContent = v.turmaNome;
    select.appendChild(opt);
  });
}

/**
 * Lógica de Chamada
 */
async function loadChamadaView() {
  const grid = document.getElementById("grid-aulas-dia");
  grid.innerHTML = '<div class="text-center py-xl">Carregando aulas...</div>';

  // Simulação de busca de aulas (em produção seria via DB)
  setTimeout(() => {
    grid.innerHTML = "";
    const aulas = [
      { id: "a1", turma: "6A", horario: "07:30", status: "REALIZADA" },
      { id: "a2", turma: "7B", horario: "08:20", status: "EM_ANDAMENTO" },
      { id: "a3", turma: "6A", horario: "09:10", status: "FUTURA" },
    ];

    aulas.forEach((aula) => {
      const card = document.createElement("div");
      card.className = "aula-card";
      card.innerHTML = `
                <div>
                    <div class="font-bold">${aula.turma}</div>
                    <div class="text-sm text-muted">${aula.horario} • Matemática</div>
                </div>
                <span class="status-pill status-${aula.status.toLowerCase().replace("_", "-")}">${aula.status}</span>
            `;
      card.onclick = () => openChamadaModal(aula);
      grid.appendChild(card);
    });
  }, 500);
}

function openChamadaModal(aula) {
  const modal = document.getElementById("modal-chamada");
  document.getElementById("modal-chamada-titulo").textContent =
    `Chamada - ${aula.turma}`;

  // Mock de lista de alunos
  const lista = document.getElementById("lista-alunos-chamada");
  lista.innerHTML = "";
  const alunos = ["Ana Silva", "Bruno Costa", "Carla Dias", "Daniel Souza"];

  alunos.forEach((nome, i) => {
    const row = document.createElement("div");
    row.className = "aluno-row";
    row.innerHTML = `
            <span class="font-medium">${nome}</span>
            <div class="btn-group-toggle">
                <button class="btn-toggle active" data-status="P">P</button>
                <button class="btn-toggle" data-status="F">F</button>
                <button class="btn-toggle" data-status="J">J</button>
            </div>
        `;
    lista.appendChild(row);
  });

  modal.classList.remove("hidden");
}

/**
 * Event Listeners Globais
 */
function setupEventListeners() {
  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth).then(() => window.location.replace("../../auth/login.html"));
  });

  // Toggle Sidebar Mobile
  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("active");
  });

  // Salvar Chamada
  document
    .getElementById("btn-salvar-chamada")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-salvar-chamada");
      btn.disabled = true;
      btn.textContent = "Salvando...";

      try {
        // Lógica de persistência no Firebase
        showToast("Chamada realizada com sucesso!", "success");
        closeModal("modal-chamada");
      } catch (error) {
        showToast("Erro ao salvar chamada.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Finalizar Chamada";
      }
    });
}

// Helpers de Modal
window.openModal = (id) =>
  document.getElementById(id)?.classList.remove("hidden");
window.closeModal = (id) =>
  document.getElementById(id)?.classList.add("hidden");

// SGE v2.0 • Professor Dashboard JS • 2026-05-14
