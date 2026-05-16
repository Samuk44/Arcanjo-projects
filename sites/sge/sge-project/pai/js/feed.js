// Firebase v9+ Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  off,
  update,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import {
  getMessaging,
  onMessage,
  getToken,
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js";

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
const messaging = getMessaging(app);

// State Management
const state = {
  currentUser: null,
  currentChild: null,
  children: [],
  notifications: [],
  filteredNotifications: [],
  currentFilter: "todas",
  isLoading: true,
  sessionTimeout: null,
  listeners: [],
  unreadCount: 0,
};

// Localization
const LOCALES = {
  pt_BR: {
    greeting: "Bom dia",
    afternoon: "Boa tarde",
    evening: "Boa noite",
    noNotifications: "Nenhuma notificação",
    loadingError: "Erro ao carregar dados",
    sessionExpired: "Sua sessão expirou",
    unauthorized: "Acesso não autorizado",
    offline: "Sem conexão com a internet",
    falta: "Falta",
    bilhete: "Bilhete",
    aviso: "Aviso",
    nota: "Nota",
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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format time relative to now
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return "--";
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Agora";
  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;

  return formatDate(timestamp);
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
        <button class="toast-close" aria-label="Fechar notificação">✕</button>
    `;

  toastContainer.appendChild(toast);

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => toast.remove());

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
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get greeting based on time of day
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return i18n.greeting;
  if (hour < 18) return i18n.afternoon;
  return i18n.evening;
}

// ==================== AUTHENTICATION ====================

/**
 * Check authentication state and redirect if necessary
 */
function checkAuthState() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        state.currentUser = user;

        // Verify user status in database
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
          (error) => {
            console.error("Error checking user status:", error);
            showToast(i18n.loadingError, "error");
            resolve(user);
          },
        );
      } else {
        window.location.href = "../auth/login.html";
      }
    });
  });
}

/**
 * Request FCM token
 */
async function requestFCMToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: "YOUR_VAPID_KEY", // Replace with actual VAPID key
    });

    if (token && state.currentUser) {
      // Save token to database
      const tokenRef = ref(db, `usuarios/${state.currentUser.uid}/fcmToken`);
      await update(tokenRef, { token, updatedAt: serverTimestamp() });
    }
  } catch (error) {
    console.warn("FCM token request failed:", error);
  }
}

/**
 * Handle incoming FCM messages
 */
function setupFCMListener() {
  onMessage(messaging, (payload) => {
    console.log("FCM message received:", payload);

    const notification = payload.notification;
    const data = payload.data;

    if (notification) {
      showToast(notification.body, "info");
    }

    // Refresh feed
    if (state.currentChild) {
      loadNotifications(state.currentChild);
    }
  });
}

// ==================== DATA LOADING ====================

/**
 * Load children linked to current parent
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

            // Load first child by default
            if (state.children.length > 0 && !state.currentChild) {
              state.currentChild = state.children[0];
            }

            populateChildSelector();
            resolve(state.children);
          } else {
            showToast("Nenhum aluno vinculado", "warning");
            resolve([]);
          }
        },
        (error) => {
          console.error("Error loading children:", error);
          showToast(i18n.loadingError, "error");
          resolve([]);
        },
      );
    });
  } catch (error) {
    console.error("Error in loadChildren:", error);
    showToast(i18n.loadingError, "error");
    return [];
  }
}

/**
 * Load notifications for current child
 */
function loadNotifications(childId) {
  if (!childId || !state.currentUser) return;

  try {
    // Clear previous listeners
    state.listeners.forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    state.listeners = [];

    // Load from multiple sources
    const notificationsRef = ref(db, `notificacoes/${state.currentUser.uid}`);
    const q = query(notificationsRef, limitToLast(100));

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        state.notifications = [];

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const notification = childSnapshot.val();
            notification.id = childSnapshot.key;

            // Filter by current child
            if (notification.alunoId === childId || !notification.alunoId) {
              state.notifications.push(notification);
            }
          });
        }

        // Sort by timestamp descending
        state.notifications.sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
        );

        // Apply filter
        applyFilter(state.currentFilter);
        updateMetrics();
        renderFeed();
        state.isLoading = false;
      },
      (error) => {
        console.error("Error loading notifications:", error);
        showToast(i18n.loadingError, "error");
        state.isLoading = false;
      },
    );

    state.listeners.push(unsubscribe);
  } catch (error) {
    console.error("Error in loadNotifications:", error);
    showToast(i18n.loadingError, "error");
  }
}

/**
 * Update metrics based on current data
 */
function updateMetrics() {
  try {
    // Calculate frequency
    const frequencyMetric = document.getElementById("frequencyMetric");
    const frequencyTime = document.getElementById("frequencyTime");

    // Load frequency from database
    if (state.currentChild) {
      const frequencyRef = ref(db, `alunos/${state.currentChild}/frequencia`);
      onValue(
        frequencyRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data && data.percentual) {
            frequencyMetric.textContent = `${data.percentual}%`;
            frequencyTime.textContent = formatDate(data.ultimaAtualizacao);
          }
        },
        { onlyOnce: true },
      );
    }

    // Count unread tickets
    const ticketsCount = state.notifications.filter(
      (n) => n.tipo === "bilhete" && !n.lido,
    ).length;
    document.getElementById("ticketsMetric").textContent = ticketsCount;

    // Count pending notices
    const noticesCount = state.notifications.filter(
      (n) => n.tipo === "aviso" && !n.lido,
    ).length;
    document.getElementById("noticesMetric").textContent = noticesCount;

    // Update unread count
    state.unreadCount = state.notifications.filter((n) => !n.lido).length;
    const badge = document.getElementById("notificationCount");
    badge.textContent = state.unreadCount;
    badge.style.display = state.unreadCount > 0 ? "flex" : "none";
  } catch (error) {
    console.error("Error updating metrics:", error);
  }
}

// ==================== FILTERING & RENDERING ====================

/**
 * Apply filter to notifications
 */
function applyFilter(filter) {
  state.currentFilter = filter;

  if (filter === "todas") {
    state.filteredNotifications = [...state.notifications];
  } else {
    state.filteredNotifications = state.notifications.filter(
      (n) => n.tipo === filter,
    );
  }

  // Update active filter tab
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.filter === filter);
  });

  renderFeed();
}

/**
 * Render feed cards
 */
function renderFeed() {
  const feedContainer = document.getElementById("feedContainer");
  const emptyState = document.getElementById("emptyState");

  if (state.isLoading) {
    feedContainer.innerHTML = Array(6)
      .fill(0)
      .map(
        () => `
            <div class="skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
            </div>
        `,
      )
      .join("");
    emptyState.style.display = "none";
    return;
  }

  if (state.filteredNotifications.length === 0) {
    feedContainer.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  feedContainer.innerHTML = state.filteredNotifications
    .map((notification) => createNotificationCard(notification))
    .join("");

  // Add event listeners to cards
  document.querySelectorAll(".feed-card").forEach((card) => {
    card.addEventListener("click", () => {
      const notificationId = card.dataset.id;
      const notification = state.filteredNotifications.find(
        (n) => n.id === notificationId,
      );
      if (notification) {
        showNotificationDetail(notification);
      }
    });
  });
}

/**
 * Create notification card HTML
 */
function createNotificationCard(notification) {
  const typeClass = notification.tipo;
  const isUnread = !notification.lido;
  const timeAgo = formatTimeAgo(notification.timestamp);

  let icon = "📬";
  switch (notification.tipo) {
    case "falta":
      icon = "❌";
      break;
    case "bilhete":
      icon = "📧";
      break;
    case "aviso":
      icon = "📢";
      break;
    case "nota":
      icon = "📊";
      break;
  }

  return `
        <div class="feed-card ${isUnread ? "feed-card-unread" : ""}" data-id="${notification.id}">
            <div class="feed-card-header">
                <span class="feed-card-type ${typeClass}">${icon} ${notification.tipo}</span>
                ${isUnread ? '<div class="feed-card-unread-indicator"></div>' : ""}
            </div>
            <h3 class="feed-card-title">${sanitizeHTML(notification.titulo || "Sem título")}</h3>
            <div class="feed-card-meta">
                <div class="feed-card-meta-item">
                    <span>👤</span>
                    <span>${sanitizeHTML(notification.remetente || "Sistema")}</span>
                </div>
                <div class="feed-card-meta-item">
                    <span>🕐</span>
                    <span>${timeAgo}</span>
                </div>
            </div>
            <div class="feed-card-content">
                ${sanitizeHTML(notification.mensagem || notification.descricao || "Sem descrição")}
            </div>
            <div class="feed-card-footer">
                <div class="feed-card-actions">
                    ${!isUnread ? "" : '<button class="btn-small">Marcar como lido</button>'}
                    <button class="btn-small">Ver detalhes</button>
                </div>
                <div class="feed-card-time">${formatDate(notification.timestamp)}</div>
            </div>
        </div>
    `;
}

/**
 * Show notification detail modal
 */
function showNotificationDetail(notification) {
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
    `;

  // Add type-specific details
  if (notification.tipo === "falta") {
    detailHTML += `
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Disciplina</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${sanitizeHTML(notification.disciplina || "--")}</p>
            </div>
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Professor</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${sanitizeHTML(notification.professor || "--")}</p>
            </div>
        `;
  }

  if (notification.tipo === "nota") {
    detailHTML += `
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Nota</label>
                <p style="color: var(--text); margin-top: 0.25rem; font-size: 1.25rem; font-weight: 600;">${notification.valor || "--"}</p>
            </div>
            <div>
                <label style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Disciplina</label>
                <p style="color: var(--text); margin-top: 0.25rem;">${sanitizeHTML(notification.disciplina || "--")}</p>
            </div>
        `;
  }

  detailHTML += "</div>";
  modalBody.innerHTML = detailHTML;

  // Footer buttons
  let footerHTML =
    '<button class="btn btn-secondary" id="modalCloseBtn">Fechar</button>';

  if (!notification.lido) {
    footerHTML +=
      '<button class="btn" id="markReadBtn">Marcar como lido</button>';
  }

  modalFooter.innerHTML = footerHTML;

  // Add event listeners
  document.getElementById("modalCloseBtn").addEventListener("click", () => {
    modal.classList.remove("active");
  });

  if (document.getElementById("markReadBtn")) {
    document.getElementById("markReadBtn").addEventListener("click", () => {
      markNotificationAsRead(notification.id);
      modal.classList.remove("active");
    });
  }

  modal.classList.add("active");
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
  try {
    if (!state.currentUser) return;

    const notificationRef = ref(
      db,
      `notificacoes/${state.currentUser.uid}/${notificationId}`,
    );
    await update(notificationRef, {
      lido: true,
      lidoEm: serverTimestamp(),
    });

    showToast("Marcado como lido", "success");
  } catch (error) {
    console.error("Error marking as read:", error);
    showToast("Erro ao atualizar", "error");
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  try {
    if (!state.currentUser) return;

    const updates = {};
    state.filteredNotifications.forEach((notification) => {
      if (!notification.lido) {
        updates[
          `notificacoes/${state.currentUser.uid}/${notification.id}/lido`
        ] = true;
        updates[
          `notificacoes/${state.currentUser.uid}/${notification.id}/lidoEm`
        ] = serverTimestamp();
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
      showToast("Todas as notificações marcadas como lidas", "success");
    }
  } catch (error) {
    console.error("Error marking all as read:", error);
    showToast("Erro ao atualizar", "error");
  }
}

// ==================== UI INTERACTIONS ====================

/**
 * Populate child selector dropdown
 */
function populateChildSelector() {
  const selector = document.getElementById("childSelector");

  if (state.children.length === 0) {
    selector.innerHTML = '<option value="">Nenhum aluno vinculado</option>';
    return;
  }

  selector.innerHTML = state.children
    .map(
      (childId) => `
        <option value="${childId}" ${childId === state.currentChild ? "selected" : ""}>
            ${childId}
        </option>
    `,
    )
    .join("");
}

/**
 * Update greeting
 */
function updateGreeting() {
  const greeting = document.getElementById("greeting");
  const userName = state.currentUser?.displayName || "Responsável";
  greeting.textContent = `${getGreeting()}, ${userName}`;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Sidebar toggle
  document.getElementById("sidebarToggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("collapsed");
  });

  // Child selector
  document.getElementById("childSelector").addEventListener("change", (e) => {
    state.currentChild = e.target.value;
    if (state.currentChild) {
      loadNotifications(state.currentChild);
    }
  });

  // Filter tabs
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      applyFilter(tab.dataset.filter);
    });
  });

  // Mark all as read
  document
    .getElementById("markAllRead")
    .addEventListener("click", markAllAsRead);

  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", () => {
    if (state.currentChild) {
      loadNotifications(state.currentChild);
      showToast("Atualizando...", "info");
    }
  });

  // Modal close
  document.getElementById("modalClose").addEventListener("click", () => {
    document.getElementById("detailModal").classList.remove("active");
  });

  // Modal backdrop click
  document.getElementById("detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal") {
      e.target.classList.remove("active");
    }
  });

  // User menu
  document.getElementById("userAvatar").addEventListener("click", () => {
    const confirmed = confirm("Deseja sair?");
    if (confirmed) {
      signOut(auth).then(() => {
        sessionStorage.clear();
        window.location.href = "../auth/login.html";
      });
    }
  });

  // FAB
  document.getElementById("fab").addEventListener("click", () => {
    window.location.href = "perfil.html";
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "k") {
        e.preventDefault();
        // Focus search (if implemented)
      }
    }
    if (e.key === "Escape") {
      document.getElementById("detailModal").classList.remove("active");
    }
  });

  // Connection status
  window.addEventListener("online", () => {
    document.getElementById("connectionStatus").classList.remove("offline");
  });

  window.addEventListener("offline", () => {
    document.getElementById("connectionStatus").classList.add("offline");
  });

  // Session timeout
  setupSessionTimeout();
}

/**
 * Setup session timeout
 */
function setupSessionTimeout() {
  const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  const WARNING_DURATION = 30 * 1000; // 30 seconds before timeout

  let timeoutId;
  let warningId;

  function resetTimeout() {
    clearTimeout(timeoutId);
    clearTimeout(warningId);

    warningId = setTimeout(() => {
      showToast("Sua sessão expirará em 30 segundos", "warning");
    }, TIMEOUT_DURATION - WARNING_DURATION);

    timeoutId = setTimeout(() => {
      signOut(auth).then(() => {
        sessionStorage.clear();
        window.location.href = "../auth/login.html";
      });
    }, TIMEOUT_DURATION);
  }

  // Reset timeout on user activity
  ["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
    document.addEventListener(event, resetTimeout, true);
  });

  resetTimeout();
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the application
 */
async function init() {
  try {
    // Check authentication
    await checkAuthState();

    // Update greeting
    updateGreeting();

    // Load children
    await loadChildren();

    // Load notifications for first child
    if (state.currentChild) {
      loadNotifications(state.currentChild);
    }

    // Request FCM token
    await requestFCMToken();

    // Setup FCM listener
    setupFCMListener();

    // Setup event listeners
    setupEventListeners();

    // Register Service Worker for offline support
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("../service-worker.js");
      } catch (error) {
        console.warn("Service Worker registration failed:", error);
      }
    }
  } catch (error) {
    console.error("Initialization error:", error);
    showToast(i18n.loadingError, "error");
  }
}

// Start initialization when DOM is ready
document.addEventListener("DOMContentLoaded", init);

// Cleanup on page unload
window.addEventListener("pagehide", () => {
  state.listeners.forEach((unsubscribe) => {
    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  });
});
