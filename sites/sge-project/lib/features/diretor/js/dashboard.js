// SGE v2.0 • Diretor Dashboard • Firebase v9+ • ES6 Modules
// Verificação de sessão, RBAC, métricas em tempo real, atividades

import app, { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { ref, get, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

let currentUser = null;
let diretorData = null;
let refreshInterval = null;
const cache = {
  pendentes: 0,
  professores: 0,
  alunos: 0,
  frequencia: 0,
  atividades: [],
  turmas: [],
};

// ============ VERIFICAÇÃO DE SESSÃO ============
async function checkSession() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        location.replace("../../auth/login.html");
        return;
      }

      try {
        const diretorRef = ref(db, `usuarios/${user.uid}`);
        const snapshot = await get(diretorRef);

        if (!snapshot.exists()) {
          await signOut(auth);
          location.replace("../../auth/login.html");
          return;
        }

        const userData = snapshot.val();
        if (userData.status !== "ativo" || userData.role !== "diretor") {
          await signOut(auth);
          location.replace("../../auth/auth-status.html");
          return;
        }

        currentUser = user;
        diretorData = userData;
        initializeDashboard();
        resolve();
      } catch (error) {
        console.error("Session check error:", error);
        showToast("Erro ao verificar sessão", "error");
        location.replace("../../auth/login.html");
      }
    });
  });
}

// ============ INICIALIZAÇÃO DO DASHBOARD ============
function initializeDashboard() {
  updateUserInfo();
  setupEventListeners();
  loadMetrics();
  loadActivities();
  loadTurmasComBaixaFrequencia();

  // Refresh leve a cada 60s
  refreshInterval = setInterval(() => {
    loadMetrics();
    loadActivities();
  }, 60000);

  // Cleanup ao sair
  window.addEventListener("pagehide", () => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
}

function updateUserInfo() {
  const firstName = diretorData.nome?.split(" ")[0] || "Diretor";
  document.getElementById("diretorName").textContent = firstName;
  document.getElementById("userName").textContent = firstName;
  document.getElementById("userAvatar").textContent = firstName
    .substring(0, 2)
    .toUpperCase();
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
  // Navegação Sidebar
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      switchSection(section);
      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Menu Toggle Mobile
  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
  });

  // FAB Button
  const fab = document.getElementById("fabButton");
  const fabMenu = document.getElementById("fabMenu");
  fab.addEventListener("click", () => fabMenu.classList.toggle("active"));

  document.getElementById("fabApprovar")?.addEventListener("click", () => {
    showToast("Abrindo cadastros pendentes...", "info");
    fabMenu.classList.remove("active");
  });

  document.getElementById("fabComunicado")?.addEventListener("click", () => {
    showToast("Novo comunicado em desenvolvimento", "info");
    fabMenu.classList.remove("active");
  });

  document.getElementById("fabRelatorio")?.addEventListener("click", () => {
    showToast("Exportando relatório...", "info");
    fabMenu.classList.remove("active");
  });

  // Close FAB menu on outside click
  document.addEventListener("click", (e) => {
    if (!fab.contains(e.target) && !fabMenu.contains(e.target)) {
      fabMenu.classList.remove("active");
    }
  });
}

// ============ NAVEGAÇÃO DE SEÇÕES ============
function switchSection(section) {
  document
    .querySelectorAll(".section")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById(`${section}-section`).style.display = "block";
  document.getElementById("topbarTitle").textContent =
    section.charAt(0).toUpperCase() + section.slice(1);
}

// ============ MÉTRICAS ============
async function loadMetrics() {
  try {
    // Cadastros Pendentes
    const pendentesRef = ref(db, "cadastrosPendentes");
    const pendentesSnapshot = await get(pendentesRef);
    const pendentesCount = pendentesSnapshot.exists()
      ? Object.keys(pendentesSnapshot.val()).length
      : 0;
    cache.pendentes = pendentesCount;
    document.getElementById("metricPendentes").textContent = pendentesCount;
    document.getElementById("notificationCount").textContent = pendentesCount;

    // Professores Ativos
    const usuariosRef = ref(db, "usuarios");
    const usuariosSnapshot = await get(usuariosRef);
    let professoresCount = 0;
    if (usuariosSnapshot.exists()) {
      Object.values(usuariosSnapshot.val()).forEach((user) => {
        if (user.role === "professor" && user.status === "ativo")
          professoresCount++;
      });
    }
    cache.professores = professoresCount;
    document.getElementById("metricProfessores").textContent = professoresCount;

    // Alunos Matriculados
    const alunosRef = ref(db, "alunos");
    const alunosSnapshot = await get(alunosRef);
    const alunosCount = alunosSnapshot.exists()
      ? Object.keys(alunosSnapshot.val()).length
      : 0;
    cache.alunos = alunosCount;
    document.getElementById("metricAlunos").textContent = alunosCount;

    // Frequência Média (simulada)
    const chamadaRef = ref(db, "chamadas");
    const chamadaSnapshot = await get(chamadaRef);
    let totalPresenca = 0;
    let totalRegistros = 0;
    if (chamadaSnapshot.exists()) {
      Object.values(chamadaSnapshot.val()).forEach((professor) => {
        Object.values(professor).forEach((turma) => {
          Object.values(turma).forEach((chamada) => {
            if (chamada.alunos) {
              Object.values(chamada.alunos).forEach((status) => {
                if (status === "presente") totalPresenca++;
                totalRegistros++;
              });
            }
          });
        });
      });
    }
    const frequenciaMedia =
      totalRegistros > 0
        ? Math.round((totalPresenca / totalRegistros) * 100)
        : 0;
    cache.frequencia = frequenciaMedia;
    document.getElementById("metricFrequencia").textContent =
      frequenciaMedia + "%";
  } catch (error) {
    console.error("Metrics load error:", error);
    showToast("Erro ao carregar métricas", "error");
  }
}

// ============ ATIVIDADES RECENTES ============
async function loadActivities() {
  try {
    const logsRef = query(ref(db, "logs"), limitToLast(3));
    const logsSnapshot = await get(logsRef);

    const activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    if (!logsSnapshot.exists()) {
      activityList.innerHTML =
        '<div class="activity-item"><div class="activity-icon">📭</div><div class="activity-content"><div class="activity-title">Nenhuma atividade</div></div></div>';
      return;
    }

    const logs = [];
    logsSnapshot.forEach((child) => {
      logs.push(child.val());
    });
    logs.reverse();

    logs.slice(0, 3).forEach((log) => {
      const item = document.createElement("div");
      item.className = "activity-item";

      const icon = getActivityIcon(log.tipo);
      const timeAgo = getTimeAgo(new Date(log.data));

      item.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <div class="activity-title">${log.descricao || log.tipo}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      `;

      activityList.appendChild(item);
    });

    cache.atividades = logs;
  } catch (error) {
    console.error("Activities load error:", error);
    const activityList = document.getElementById("activityList");
    activityList.innerHTML =
      '<div class="activity-item"><div class="activity-icon">⚠️</div><div class="activity-content"><div class="activity-title">Erro ao carregar atividades</div></div></div>';
  }
}

function getActivityIcon(tipo) {
  const icons = {
    cadastro: "📝",
    login: "🔓",
    logout: "🔒",
    chamada: "✓",
    notas: "📊",
    bilhete: "💬",
    aprovacao: "✅",
    default: "📌",
  };
  return icons[tipo] || icons.default;
}

function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Agora mesmo";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}

// ============ TURMAS COM BAIXA FREQUÊNCIA ============
async function loadTurmasComBaixaFrequencia() {
  try {
    const chamadaRef = ref(db, "chamadas");
    const chamadaSnapshot = await get(chamadaRef);

    const turmasFreq = {};

    if (chamadaSnapshot.exists()) {
      Object.entries(chamadaSnapshot.val()).forEach(([professorId, turmas]) => {
        Object.entries(turmas).forEach(([turmaId, chamadas]) => {
          if (!turmasFreq[turmaId])
            turmasFreq[turmaId] = {
              presente: 0,
              total: 0,
              professor: professorId,
            };

          Object.values(chamadas).forEach((chamada) => {
            if (chamada.alunos) {
              Object.values(chamada.alunos).forEach((status) => {
                if (status === "presente") turmasFreq[turmaId].presente++;
                turmasFreq[turmaId].total++;
              });
            }
          });
        });
      });
    }

    const turmasComBaixaFreq = Object.entries(turmasFreq)
      .map(([turmaId, data]) => ({
        turma: turmaId,
        professor: data.professor,
        frequencia:
          data.total > 0 ? Math.round((data.presente / data.total) * 100) : 0,
      }))
      .filter((t) => t.frequencia < 75)
      .sort((a, b) => a.frequencia - b.frequencia);

    const tbody = document.getElementById("turmasTableBody");
    tbody.innerHTML = "";

    if (turmasComBaixaFreq.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Todas as turmas com frequência acima de 75%</td></tr>';
      return;
    }

    turmasComBaixaFreq.forEach((turma) => {
      const row = document.createElement("tr");
      const isCritical = turma.frequencia < 60;
      if (isCritical) row.classList.add("critical");

      const frequenciaClass = turma.frequencia < 60 ? "danger" : "warning";
      const statusText = turma.frequencia < 60 ? "Crítica" : "Atenção";

      row.innerHTML = `
        <td>${turma.turma}</td>
        <td>${turma.professor}</td>
        <td>
          <div class="frequency-bar">
            <span class="frequency-value">${turma.frequencia}%</span>
            <div class="frequency-bar-bg">
              <div class="frequency-bar-fill ${frequenciaClass}" style="width: ${turma.frequencia}%"></div>
            </div>
          </div>
        </td>
        <td><span style="color: var(--${frequenciaClass})">${statusText}</span></td>
      `;

      tbody.appendChild(row);
    });

    cache.turmas = turmasComBaixaFreq;
  } catch (error) {
    console.error("Turmas load error:", error);
    const tbody = document.getElementById("turmasTableBody");
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Erro ao carregar turmas</td></tr>';
  }
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById("toastContainer").appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease-out forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============ INICIALIZAÇÃO ============
document.addEventListener("DOMContentLoaded", checkSession);

// ============ CLEANUP ============
window.addEventListener("beforeunload", () => {
  if (refreshInterval) clearInterval(refreshInterval);
});

// SGE v2.0 • Diretor Dashboard • 2026-05-14
