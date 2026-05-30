import app, { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { ref, onValue, off, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

// State Management
const state = {
  currentUser: null,
  children: [],
  allNotifications: [],
  filteredNotifications: [],
  currentPage: 1,
  itemsPerPage: 20,
  filters: {
    type: "",
    status: "",
    child: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  },
  listeners: [],
};

// Localization
const LOCALES = {
  pt_BR: {
    loadingError: "Erro ao carregar dados",
    unauthorized: "Acesso não autorizado",
    noResults: "Nenhum resultado encontrado",
    exportSuccess: "Histórico exportado com sucesso",
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
 * Format date for input
 */
function formatDateForInput(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
 * Export to CSV
 */
function exportToCSV(data, filename = "historico.csv") {
  const headers = ["Tipo", "Título", "Remetente", "Data", "Status"];
  const rows = data.map((item) => [
    item.tipo,
    item.titulo,
    item.remetente,
    formatDate(item.timestamp),
    item.lido ? "Lido" : "Não lido",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(i18n.exportSuccess, "success");
}

/**
 * Export to JSON
 */
function exportToJSON(data, filename = "historico.json") {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(i18n.exportSuccess, "success");
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
            populateChildFilter();
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
 * Load all notifications
 */
function loadAllNotifications() {
  try {
    const notificationsRef = ref(db, `notificacoes/${state.currentUser.uid}`);
    const q = query(notificationsRef, limitToLast(500));

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        state.allNotifications = [];

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const notification = childSnapshot.val();
            notification.id = childSnapshot.key;
            state.allNotifications.push(notification);
          });
        }

        // Sort by timestamp descending
        state.allNotifications.sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
        );

        // Apply filters and render
        applyFilters();
        renderTable();
      },
      (error) => {
        console.error("Error loading notifications:", error);
        showToast(i18n.loadingError, "error");
      },
    );

    state.listeners.push(unsubscribe);
  } catch (error) {
    console.error("Error in loadAllNotifications:", error);
    showToast(i18n.loadingError, "error");
  }
}

// ==================== FILTERING ====================

/**
 * Apply all filters
 */
function applyFilters() {
  state.filteredNotifications = state.allNotifications.filter(
    (notification) => {
      // Type filter
      if (state.filters.type && notification.tipo !== state.filters.type) {
        return false;
      }

      // Status filter
      if (state.filters.status === "lido" && !notification.lido) {
        return false;
      }
      if (state.filters.status === "nao-lido" && notification.lido) {
        return false;
      }

      // Child filter
      if (state.filters.child && notification.alunoId !== state.filters.child) {
        return false;
      }

      // Date range filter
      if (state.filters.dateFrom) {
        const fromDate = new Date(state.filters.dateFrom).getTime();
        if (notification.timestamp < fromDate) {
          return false;
        }
      }

      if (state.filters.dateTo) {
        const toDate = new Date(state.filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (notification.timestamp > toDate.getTime()) {
          return false;
        }
      }

      // Search filter
      if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        const titulo = (notification.titulo || "").toLowerCase();
        const remetente = (notification.remetente || "").toLowerCase();
        const mensagem = (notification.mensagem || "").toLowerCase();

        if (
          !titulo.includes(search) &&
          !remetente.includes(search) &&
          !mensagem.includes(search)
        ) {
          return false;
        }
      }

      return true;
    },
  );

  state.currentPage = 1;
}

/**
 * Populate child filter dropdown
 */
function populateChildFilter() {
  const childFilter = document.getElementById("childFilter");

  const options = state.children
    .map(
      (childId) => `
        <option value="${childId}">${childId}</option>
    `,
    )
    .join("");

  childFilter.innerHTML = '<option value="">Todos os alunos</option>' + options;
}

// ==================== RENDERING ====================

/**
 * Render history table
 */
function renderTable() {
  const tableBody = document.getElementById("historyTableBody");
  const emptyState = document.getElementById("emptyState");
  const table = document.getElementById("historyTable");

  if (state.filteredNotifications.length === 0) {
    tableBody.innerHTML = "";
    table.style.display = "none";
    emptyState.style.display = "block";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  table.style.display = "table";
  emptyState.style.display = "none";

  // Calculate pagination
  const totalPages = Math.ceil(
    state.filteredNotifications.length / state.itemsPerPage,
  );
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageItems = state.filteredNotifications.slice(startIndex, endIndex);

  // Render rows
  tableBody.innerHTML = pageItems
    .map(
      (notification) => `
        <tr onclick="showDetail('${notification.id}')">
            <td>
                <span class="type-badge ${notification.tipo}">
                    ${notification.tipo}
                </span>
            </td>
            <td>${sanitizeHTML(notification.titulo || "Sem título")}</td>
            <td>${sanitizeHTML(notification.remetente || "Sistema")}</td>
            <td>${formatDate(notification.timestamp)}</td>
            <td>
                <span class="status-badge ${notification.lido ? "" : "unread"}">
                    ${notification.lido ? "Lido" : "Não lido"}
                </span>
            </td>
        </tr>
    `,
    )
    .join("");

  // Render pagination
  renderPagination(totalPages);
}

/**
 * Render pagination
 */
function renderPagination(totalPages) {
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = `
        <button class="pagination-btn" ${state.currentPage === 1 ? "disabled" : ""} onclick="previousPage()">
            ← Anterior
        </button>
    `;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-info">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
            <button class="pagination-btn ${i === state.currentPage ? "active" : ""}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-info">...</span>`;
    }
    html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  html += `
        <button class="pagination-btn" ${state.currentPage === totalPages ? "disabled" : ""} onclick="nextPage()">
            Próxima →
        </button>
    `;

  html += `
        <span class="pagination-info">
            Página ${state.currentPage} de ${totalPages} | Total: ${state.filteredNotifications.length} registros
        </span>
    `;

  pagination.innerHTML = html;
}

/**
 * Show notification detail
 */
function showDetail(notificationId) {
  const notification = state.allNotifications.find(
    (n) => n.id === notificationId,
  );
  if (!notification) return;

  const modal = document.getElementById("detailModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalFooter = document.getElementById("modalFooter");

  modalTitle.textContent = notification.titulo || "Detalhes";

  let detailHTML = `
        <div style="display: grid; gap: 1rem;">
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Tipo</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${notification.tipo}</p>
            </div>
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Remetente</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${sanitizeHTML(notification.remetente || "Sistema")}</p>
            </div>
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Mensagem</label>
                <p style="color: var(--text); margin-top: 0.25rem; line-height: 1.6;">${sanitizeHTML(notification.mensagem || notification.descricao || "Sem conteúdo")}</p>
            </div>
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Data</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${formatDate(notification.timestamp)}</p>
            </div>
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Status</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${notification.lido ? "Lido" : "Não lido"}</p>
            </div>
    `;

  if (notification.lidoEm) {
    detailHTML += `
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Lido em</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${formatDate(notification.lidoEm)}</p>
            </div>
        `;
  }

  detailHTML += "</div>";
  modalBody.innerHTML = detailHTML;

  modalFooter.innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Fechar</button>';

  modal.classList.add("active");
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById("detailModal").classList.remove("active");
}

// ==================== PAGINATION CONTROLS ====================

/**
 * Go to specific page
 */
function goToPage(page) {
  const totalPages = Math.ceil(
    state.filteredNotifications.length / state.itemsPerPage,
  );
  if (page >= 1 && page <= totalPages) {
    state.currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Next page
 */
function nextPage() {
  const totalPages = Math.ceil(
    state.filteredNotifications.length / state.itemsPerPage,
  );
  if (state.currentPage < totalPages) {
    goToPage(state.currentPage + 1);
  }
}

/**
 * Previous page
 */
function previousPage() {
  if (state.currentPage > 1) {
    goToPage(state.currentPage - 1);
  }
}

// ==================== EVENT LISTENERS ====================

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Type filter
  document.getElementById("typeFilter").addEventListener("change", (e) => {
    state.filters.type = e.target.value;
    applyFilters();
    renderTable();
  });

  // Status filter
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    state.filters.status = e.target.value;
    applyFilters();
    renderTable();
  });

  // Child filter
  document.getElementById("childFilter").addEventListener("change", (e) => {
    state.filters.child = e.target.value;
    applyFilters();
    renderTable();
  });

  // Date filters
  function parseDMY(v) {
    const [d, m, y] = (v || "").split("/");
    return (d && m && y) ? `${y}-${m}-${d}` : "";
  }

  ["dateFrom", "dateTo"].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keydown", function (e) {
      if (!["Tab","Backspace","Delete","ArrowLeft","ArrowRight","Home","End"].includes(e.key) && !/\d/.test(e.key)) e.preventDefault();
    });
    el.addEventListener("input", function () {
      let v = this.value.replace(/\D/g, "").slice(0, 8);
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5);
      this.value = v;
    });
    el.addEventListener("blur", function () {
      this.classList.toggle("border-red-500", !!this.value && !/^\d{2}\/\d{2}\/\d{4}$/.test(this.value));
    });
  });

  document.getElementById("dateFrom").addEventListener("change", (e) => {
    state.filters.dateFrom = parseDMY(e.target.value);
    applyFilters();
    renderTable();
  });

  document.getElementById("dateTo").addEventListener("change", (e) => {
    state.filters.dateTo = parseDMY(e.target.value);
    applyFilters();
    renderTable();
  });

  // Search filter with debounce
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener(
    "input",
    debounce((e) => {
      state.filters.search = e.target.value;
      applyFilters();
      renderTable();
    }, 300),
  );

  // Clear filters
  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    state.filters = {
      type: "",
      status: "",
      child: "",
      dateFrom: "",
      dateTo: "",
      search: "",
    };

    document.getElementById("typeFilter").value = "";
    document.getElementById("statusFilter").value = "";
    document.getElementById("childFilter").value = "";
    document.getElementById("dateFrom").value = "";
    document.getElementById("dateTo").value = "";
    document.getElementById("searchInput").value = "";

    applyFilters();
    renderTable();
    showToast("Filtros limpos", "success");
  });

  // Export button
  document.getElementById("exportBtn").addEventListener("click", () => {
    exportToCSV(state.filteredNotifications, "historico-notificacoes.csv");
  });

  // Modal close
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal") {
      closeModal();
    }
  });
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

    // Load all notifications
    loadAllNotifications();

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

// Make functions globally accessible
window.goToPage = goToPage;
window.nextPage = nextPage;
window.previousPage = previousPage;
window.showDetail = showDetail;
window.closeModal = closeModal;
