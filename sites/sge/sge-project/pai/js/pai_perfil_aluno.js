// Firebase v9+ Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
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
  currentChild: null,
  children: [],
  studentData: null,
  absences: [],
  grades: [],
  tickets: [],
  documents: [],
  listeners: [],
};

// Localization
const LOCALES = {
  pt_BR: {
    loadingError: "Erro ao carregar dados",
    uploadSuccess: "Arquivo enviado com sucesso",
    uploadError: "Erro ao enviar arquivo",
    unauthorized: "Acesso não autorizado",
  },
};

const i18n = LOCALES.pt_BR;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format date to Brazilian Portuguese
 */
function formatDate(timestamp) {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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
 * Sanitize HTML
 */
function sanitizeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format number to Brazilian format
 */
function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculate average
 */
function calculateAverage(grades) {
  if (!grades || grades.length === 0) return 0;
  const sum = grades.reduce((acc, grade) => acc + (grade || 0), 0);
  return sum / grades.length;
}

/**
 * Get grade badge class
 */
function getGradeBadgeClass(grade) {
  if (grade >= 7) return "high";
  if (grade >= 5) return "medium";
  return "low";
}

/**
 * Get frequency bar class
 */
function getFrequencyBarClass(percentage) {
  if (percentage >= 75) return "";
  if (percentage >= 60) return "warning";
  return "danger";
}

/**
 * Create SVG bar chart
 */
function createBarChart(data, width = 400, height = 250) {
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  const maxValue = Math.max(...data.map((d) => d.value), 10);
  const barWidth = (chartWidth / data.length) * 0.8;
  const barSpacing = chartWidth / data.length;

  let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: auto;">`;

  // Grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i;
    svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border)" stroke-dasharray="4" stroke-width="1"/>`;
  }

  // Bars
  data.forEach((item, index) => {
    const x = padding + barSpacing * index + (barSpacing - barWidth) / 2;
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = padding + chartHeight - barHeight;

    svg += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="var(--primary)" opacity="0.8" rx="4"/>
            <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="var(--text-secondary)">
                ${item.label}
            </text>
            <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--primary)">
                ${item.value.toFixed(1)}
            </text>
        `;
  });

  // Axes
  svg += `
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="var(--text-secondary)" stroke-width="2"/>
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--text-secondary)" stroke-width="2"/>
    `;

  svg += "</svg>";
  return svg;
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
 * Load children
 */
async function loadChildren() {
  try {
    const paiRef = ref(db, `pais/${state.currentUser.uid}`);

    return new Promise((resolve) => {
      onValue(
        paiRef,
        (snapshot) => {
          const paiData = snapshot.val();
          if (paiData && paiData.alunosIds) {
            state.children = paiData.alunosIds;
            state.currentChild = state.children[0];
            loadStudentData();
            resolve(state.children);
          } else {
            resolve([]);
          }
        },
        { onlyOnce: true },
      );
    });
  } catch (error) {
    console.error("Error loading children:", error);
    return [];
  }
}

/**
 * Load student data
 */
function loadStudentData() {
  if (!state.currentChild) return;

  try {
    // Load student info
    const studentRef = ref(db, `alunos/${state.currentChild}`);
    const unsubscribe1 = onValue(studentRef, (snapshot) => {
      state.studentData = snapshot.val();
      renderStudentHeader();
    });

    // Load absences
    const absencesRef = ref(db, `chamadas/${state.currentChild}`);
    const unsubscribe2 = onValue(absencesRef, (snapshot) => {
      state.absences = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data.status === "F") {
            state.absences.push({
              id: childSnapshot.key,
              ...data,
            });
          }
        });
      }
      renderAbsences();
    });

    // Load grades
    const gradesRef = ref(db, `notas/${state.currentChild}`);
    const unsubscribe3 = onValue(gradesRef, (snapshot) => {
      state.grades = [];
      if (snapshot.exists()) {
        snapshot.forEach((disciplinaSnapshot) => {
          const disciplina = disciplinaSnapshot.key;
          const disciplinaData = disciplinaSnapshot.val();
          if (typeof disciplinaData === "object") {
            Object.entries(disciplinaData).forEach(
              ([bimestre, bimestreData]) => {
                if (typeof bimestreData === "object") {
                  Object.entries(bimestreData).forEach(
                    ([avaliacao, avaliacaoData]) => {
                      if (
                        typeof avaliacaoData === "object" &&
                        avaliacaoData.valor
                      ) {
                        state.grades.push({
                          disciplina,
                          bimestre,
                          avaliacao,
                          valor: avaliacaoData.valor,
                          peso: avaliacaoData.peso || 1,
                        });
                      }
                    },
                  );
                }
              },
            );
          }
        });
      }
      renderGrades();
    });

    // Load tickets
    const ticketsRef = ref(db, `bilhetes`);
    const unsubscribe4 = onValue(ticketsRef, (snapshot) => {
      state.tickets = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const ticket = childSnapshot.val();
          if (ticket.alunoId === state.currentChild) {
            state.tickets.push({
              id: childSnapshot.key,
              ...ticket,
            });
          }
        });
      }
      renderTickets();
    });

    state.listeners.push(
      unsubscribe1,
      unsubscribe2,
      unsubscribe3,
      unsubscribe4,
    );
  } catch (error) {
    console.error("Error loading student data:", error);
    showToast(i18n.loadingError, "error");
  }
}

// ==================== RENDERING ====================

/**
 * Render student header
 */
function renderStudentHeader() {
  if (!state.studentData) return;

  const data = state.studentData;
  document.getElementById("studentName").textContent = sanitizeHTML(
    data.nome || "Aluno",
  );
  document.getElementById("studentClass").textContent = sanitizeHTML(
    data.turma || "--",
  );
  document.getElementById("studentShift").textContent = sanitizeHTML(
    data.turno || "--",
  );
  document.getElementById("studentRA").textContent = sanitizeHTML(
    data.ra || "--",
  );
  document.getElementById("studentBirth").textContent = formatDate(
    data.dataNascimento,
  );

  // Render frequency chart
  const frequencyChart = document.getElementById("frequencyChart");
  if (data.frequencia) {
    const freq = data.frequencia.percentual || 0;
    const barClass = getFrequencyBarClass(freq);
    frequencyChart.innerHTML = `
            <div class="frequency-item">
                <div class="frequency-value">${freq}%</div>
                <div class="frequency-label">Frequência Geral</div>
                <div class="frequency-bar">
                    <div class="frequency-bar-fill ${barClass}" style="width: ${freq}%"></div>
                </div>
            </div>
        `;
  }
}

/**
 * Render absences
 */
function renderAbsences() {
  const tbody = document.getElementById("absenceTableBody");

  if (state.absences.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Nenhuma falta registrada</td></tr>';
    return;
  }

  tbody.innerHTML = state.absences
    .map(
      (absence) => `
        <tr>
            <td>${formatDate(absence.data)}</td>
            <td>${sanitizeHTML(absence.aula || "--")}</td>
            <td>${sanitizeHTML(absence.professor || "--")}</td>
            <td>${absence.justificada ? "✓ Justificada" : "✗ Não justificada"}</td>
        </tr>
    `,
    )
    .join("");
}

/**
 * Render grades
 */
function renderGrades() {
  const tbody = document.getElementById("gradesTableBody");

  // Group grades by discipline
  const disciplineMap = {};
  state.grades.forEach((grade) => {
    if (!disciplineMap[grade.disciplina]) {
      disciplineMap[grade.disciplina] = { 1: [], 2: [], 3: [], 4: [] };
    }
    if (disciplineMap[grade.disciplina][grade.bimestre]) {
      disciplineMap[grade.disciplina][grade.bimestre].push(grade.valor);
    }
  });

  if (Object.keys(disciplineMap).length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Nenhuma nota registrada</td></tr>';
    return;
  }

  tbody.innerHTML = Object.entries(disciplineMap)
    .map(([disciplina, bimestres]) => {
      const grades = [
        calculateAverage(bimestres[1]),
        calculateAverage(bimestres[2]),
        calculateAverage(bimestres[3]),
        calculateAverage(bimestres[4]),
      ];
      const average = calculateAverage(grades);
      const badgeClass = getGradeBadgeClass(average);

      return `
            <tr>
                <td>${sanitizeHTML(disciplina)}</td>
                <td><span class="grade-badge ${getGradeBadgeClass(grades[0])}">${grades[0] > 0 ? formatNumber(grades[0]) : "--"}</span></td>
                <td><span class="grade-badge ${getGradeBadgeClass(grades[1])}">${grades[1] > 0 ? formatNumber(grades[1]) : "--"}</span></td>
                <td><span class="grade-badge ${getGradeBadgeClass(grades[2])}">${grades[2] > 0 ? formatNumber(grades[2]) : "--"}</span></td>
                <td><span class="grade-badge ${getGradeBadgeClass(grades[3])}">${grades[3] > 0 ? formatNumber(grades[3]) : "--"}</span></td>
                <td><span class="grade-badge ${badgeClass}">${average > 0 ? formatNumber(average) : "--"}</span></td>
            </tr>
        `;
    })
    .join("");

  // Render performance chart
  const chartData = Object.entries(disciplineMap).map(
    ([disciplina, bimestres]) => {
      const grades = [
        calculateAverage(bimestres[1]),
        calculateAverage(bimestres[2]),
        calculateAverage(bimestres[3]),
        calculateAverage(bimestres[4]),
      ];
      return {
        label: disciplina.substring(0, 3),
        value: calculateAverage(grades),
      };
    },
  );

  const chartContainer = document.getElementById("performanceChart");
  chartContainer.innerHTML = createBarChart(chartData);
}

/**
 * Render tickets
 */
function renderTickets() {
  const tbody = document.getElementById("ticketsTableBody");

  if (state.tickets.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Nenhum bilhete recebido</td></tr>';
    return;
  }

  tbody.innerHTML = state.tickets
    .map(
      (ticket) => `
        <tr>
            <td>${sanitizeHTML(ticket.remetente || "--")}</td>
            <td>${sanitizeHTML(ticket.assunto || "--")}</td>
            <td>${formatDate(ticket.data)}</td>
            <td>${ticket.lido ? "✓ Lido" : "✗ Não lido"}</td>
        </tr>
    `,
    )
    .join("");
}

// ==================== TAB SWITCHING ====================

/**
 * Setup tab switching
 */
function setupTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.dataset.tab;

      // Update active button
      document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");

      // Update active content
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(`tab-${tabName}`).classList.add("active");
    });
  });
}

// ==================== EXPORT & PRINT ====================

/**
 * Export bulletin as HTML
 */
function exportBulletin() {
  if (!state.studentData) return;

  const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Boletim - ${state.studentData.nome}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 2rem; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
                th { background-color: #f0a500; color: white; }
                .header { margin-bottom: 2rem; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Boletim Escolar</h1>
                <p><strong>Aluno:</strong> ${state.studentData.nome}</p>
                <p><strong>Turma:</strong> ${state.studentData.turma}</p>
                <p><strong>RA:</strong> ${state.studentData.ra}</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
            </div>

            <h2>Notas</h2>
            <table>
                <thead>
                    <tr>
                        <th>Disciplina</th>
                        <th>1º Bim</th>
                        <th>2º Bim</th>
                        <th>3º Bim</th>
                        <th>4º Bim</th>
                        <th>Média</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from(
                      document.querySelectorAll("#gradesTable tbody tr"),
                    )
                      .map((row) => {
                        const cells = row.querySelectorAll("td");
                        return `<tr>${Array.from(cells)
                          .map((cell) => `<td>${cell.textContent}</td>`)
                          .join("")}</tr>`;
                      })
                      .join("")}
                </tbody>
            </table>

            <h2>Frequência</h2>
            <p>Frequência Geral: ${document.querySelector(".frequency-value")?.textContent || "--"}</p>
        </body>
        </html>
    `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `boletim-${state.studentData.nome}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Boletim exportado com sucesso", "success");
}

/**
 * Print page
 */
function printPage() {
  window.print();
}

// ==================== EVENT LISTENERS ====================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  setupTabs();

  document
    .getElementById("exportBtn")
    .addEventListener("click", exportBulletin);
  document.getElementById("printBtn").addEventListener("click", printPage);

  document.getElementById("uploadBtn").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadDocument(file);
      }
    };
    input.click();
  });
}

/**
 * Upload document
 */
async function uploadDocument(file) {
  try {
    if (!state.currentChild) return;

    const fileName = `${state.currentChild}_${Date.now()}_${file.name}`;
    const fileRef = storageRef(
      storage,
      `documentos/${state.currentChild}/${fileName}`,
    );

    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);

    // Save reference in database
    const docRef = ref(db, `documentos/${state.currentChild}/${Date.now()}`);
    await update(docRef, {
      nome: file.name,
      tipo: file.type,
      url: url,
      data: serverTimestamp(),
      status: "pendente",
    });

    showToast(i18n.uploadSuccess, "success");
  } catch (error) {
    console.error("Error uploading document:", error);
    showToast(i18n.uploadError, "error");
  }
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
async function init() {
  try {
    // Check authentication
    await checkAuthState();

    // Load children
    await loadChildren();

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
