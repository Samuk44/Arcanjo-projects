// src/features/teacher/dashboard/dashboard.controller.js
// Fluxo e coordenação apenas. Sem lógica de negócio nem DOM direto.
import { authController } from "../../../auth/auth.controller.js";
import { loadTeacherDashboard } from "./dashboard.service.js";
import { markNotificationRead, markAllNotificationsRead } from "./notification.write.service.js";
import * as View from "./dashboard.view.js";

const state = { data: null };

async function handleMarkRead(notifId) {
  if (!state.data || !notifId) return;
  await markNotificationRead(state.data.user.uid, notifId).catch(console.error);

  // Atualiza estado local e re-renderiza apenas as notificações
  const notif = state.data.notifications.find(n => n.id === notifId);
  if (notif && notif.status === "unread") {
    notif.status = "read";
    notif.readAt = Date.now();
    state.data.summary.unreadNotifications = Math.max(0, state.data.summary.unreadNotifications - 1);
    state.data.unreadNotifications = state.data.notifications.filter(n => n.status === "unread");
  }

  View.renderNotifications(state.data.notifications, handleMarkRead, handleMarkAll);
  View.renderMetrics(state.data.summary);
}

async function handleMarkAll() {
  if (!state.data) return;
  await markAllNotificationsRead(state.data.user.uid, state.data.user.schoolId).catch(console.error);

  state.data.notifications.forEach(n => { n.status = "read"; n.readAt = Date.now(); });
  state.data.summary.unreadNotifications = 0;
  state.data.unreadNotifications = [];

  View.renderNotifications(state.data.notifications, handleMarkRead, handleMarkAll);
  View.renderMetrics(state.data.summary);
}

function bindClassNavigation() {
  document.querySelectorAll(".teacher-class-card").forEach(card => {
    card.addEventListener("click", () => {
      const classId = card.dataset.classId;
      if (classId) {
        window.location.href = `/app/professor/chamada.html?classId=${encodeURIComponent(classId)}`;
      }
    });
  });
}

function bindLogout() {
  const btn = document.getElementById("logout-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (confirm("Deseja realmente sair?")) {
        await authController.logout();
      }
    });
  }
}

function bindNotificationToggle() {
  const toggle = document.getElementById("notif-toggle");
  const panel = document.getElementById("notifications-panel");
  if (toggle && panel) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel.style.display === "block";
      panel.style.display = isOpen ? "none" : "block";
    });
    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && e.target !== toggle) {
        panel.style.display = "none";
      }
    });
  }
}

function bindOnlineStatus() {
  const update = () => View.showOfflineBanner(!navigator.onLine);
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

async function init() {
  const user = await authController.guardRoute("teacher");
  if (!user) return;

  const root = document.getElementById("dashboard-root");
  View.showLoading(root);

  try {
    const data = await loadTeacherDashboard();
    state.data = data;

    if (root) {
      // Injeta o template do dashboard no root
      const tpl = document.getElementById("dash-content");
      if (tpl) {
        root.innerHTML = "";
        root.appendChild(tpl.content.cloneNode(true));
      }
    }

    View.renderHeader(data);
    View.renderMetrics(data.summary);
    View.renderClasses(data.classes);
    View.renderPending(data.pendingClasses);
    View.renderNotifications(data.notifications, handleMarkRead, handleMarkAll);
    View.renderRecentActivity(data.recentActivity);

    bindClassNavigation();
    bindNotificationToggle();
  } catch (err) {
    console.error("[TeacherDashboard]", err);
    View.showError(
      document.getElementById("dashboard-root"),
      err.message || "Não foi possível carregar o dashboard."
    );
  } finally {
    bindLogout();
    bindOnlineStatus();
    document.body.style.visibility = "visible";
  }
}

document.addEventListener("DOMContentLoaded", init);
