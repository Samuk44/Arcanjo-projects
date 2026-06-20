// src/features/teacher/dashboard/dashboard.view.js
// Funções puras de renderização — apenas DOM, sem lógica de negócio.

const $ = (id) => document.getElementById(id);

// ─── Utilitários ──────────────────────────────────────────────────

function badge(text, variant = "default") {
  const colors = {
    success: "background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.3)",
    warning: "background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3)",
    danger: "background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3)",
    default: "background:rgba(148,163,184,.1);color:#94a3b8;border:1px solid rgba(148,163,184,.2)",
    accent: "background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)",
  };
  return `<span style="padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:600;${colors[variant] || colors.default}">${text}</span>`;
}

function iconSvg(name) {
  const icons = {
    classes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    students: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    attendance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>`,
    pending: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    arrow: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  };
  return icons[name] || "";
}

// ─── Header / Saudação ────────────────────────────────────────────

export function renderHeader(data) {
  const el = $("header-greeting");
  if (el) el.textContent = data.greeting;

  const dt = $("header-date");
  if (dt) dt.textContent = data.dateFormatted;

  const school = $("header-school");
  if (school) school.textContent = data.user.schoolId;

  const nav = $("nav-user-name");
  if (nav) nav.textContent = data.user.name;
}

// ─── Métricas ─────────────────────────────────────────────────────

export function renderMetrics(summary) {
  const map = {
    "metric-classes": summary.totalClasses,
    "metric-students": summary.totalStudents,
    "metric-attendance-today": summary.attendanceToday,
    "metric-pending": summary.pendingCount,
    "metric-notifs": summary.unreadNotifications,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = $(id);
    if (el) el.textContent = val;
  });
}

// ─── Turmas ───────────────────────────────────────────────────────

export function renderClasses(classes) {
  const container = $("classes-list");
  if (!container) return;

  if (!classes.length) {
    container.innerHTML = `
      <div style="padding:2.5rem;text-align:center;color:#94a3b8;">
        <div style="margin-bottom:.75rem;opacity:.5">${iconSvg("classes")}</div>
        <p style="font-weight:500;color:#cbd5e1;">Nenhuma turma atribuída</p>
        <p style="font-size:.875rem;margin-top:.25rem;">Aguarde o diretor vincular você a uma turma.</p>
      </div>`;
    return;
  }

  container.innerHTML = classes.map(klass => `
    <div class="teacher-class-card glass card-hover" data-class-id="${klass.id}" style="padding:1.25rem;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:1rem;cursor:pointer;margin-bottom:.75rem;">
      <div style="display:flex;align-items:center;gap:1rem;min-width:0;">
        <div style="width:2.5rem;height:2.5rem;border-radius:10px;background:rgba(59,130,246,.15);display:flex;align-items:center;justify-content:center;color:#60a5fa;flex-shrink:0;">
          ${iconSvg("classes")}
        </div>
        <div style="min-width:0;">
          <p style="font-weight:600;color:#f8fafc;font-size:.9375rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${klass.name}</p>
          <p style="font-size:.8125rem;color:#94a3b8;margin-top:.1rem;">${klass.grade} · ${klass.shift} · ${klass.studentCount} aluno${klass.studentCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.75rem;flex-shrink:0;">
        ${klass.doneToday
          ? badge("Chamada feita", "success")
          : badge("Pendente", "warning")}
        <span style="color:#94a3b8;">${iconSvg("arrow")}</span>
      </div>
    </div>`).join("");
}

// ─── Pendências ───────────────────────────────────────────────────

export function renderPending(pendingClasses) {
  const container = $("pending-list");
  if (!container) return;

  if (!pendingClasses.length) {
    container.innerHTML = `<p style="color:#22c55e;font-size:.875rem;display:flex;align-items:center;gap:.5rem;">${iconSvg("check")} Tudo em dia! Nenhuma chamada pendente.</p>`;
    return;
  }

  container.innerHTML = pendingClasses.map(klass => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.875rem 1rem;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:10px;margin-bottom:.5rem;">
      <div>
        <p style="font-weight:500;color:#f8fafc;font-size:.875rem;">${klass.name}</p>
        <p style="font-size:.75rem;color:#94a3b8;">${klass.grade} · ${klass.shift}</p>
      </div>
      <a href="/app/professor/chamada.html?classId=${klass.id}" style="padding:.375rem .875rem;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:8px;font-size:.8125rem;font-weight:600;color:#f59e0b;cursor:pointer;text-decoration:none;">
        Fazer chamada
      </a>
    </div>`).join("");
}

// ─── Notificações ─────────────────────────────────────────────────

export function renderNotifications(notifications, onMarkRead, onMarkAll) {
  const container = $("notifications-list");
  const badge_el = $("notif-badge");

  const unread = notifications.filter(n => n.status === "unread").length;
  if (badge_el) {
    badge_el.textContent = unread;
    badge_el.style.display = unread > 0 ? "flex" : "none";
  }

  if (!container) return;

  if (!notifications.length) {
    container.innerHTML = `<p style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:.875rem;">Nenhuma notificação.</p>`;
    return;
  }

  const typeIcon = {
    "nova-turma": "📚",
    "turma-removida": "❌",
    "chamada-pendente": "⏰",
    "chamada-salva": "✅",
    "aluno-adicionado": "👤",
    "aluno-removido": "👤",
    "aviso-admin": "📢",
    "ausencia-recorrente": "⚠️",
  };

  container.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.status === "unread" ? "notif-unread" : ""}" data-notif-id="${n.id}" style="padding:1rem;border-bottom:1px solid rgba(255,255,255,.05);display:flex;gap:.875rem;align-items:flex-start;cursor:pointer;transition:background .2s;${n.status === "unread" ? "background:rgba(59,130,246,.04);" : ""}">
      <span style="font-size:1.25rem;flex-shrink:0;margin-top:.125rem;">${typeIcon[n.type] ?? "🔔"}</span>
      <div style="flex:1;min-width:0;">
        <p style="font-weight:${n.status === "unread" ? "600" : "400"};color:${n.status === "unread" ? "#f8fafc" : "#cbd5e1"};font-size:.875rem;">${n.title}</p>
        <p style="font-size:.8125rem;color:#94a3b8;margin-top:.2rem;">${n.message}</p>
        <p style="font-size:.75rem;color:#64748b;margin-top:.35rem;">${iconSvg("clock")} ${new Date(n.createdAt).toLocaleDateString("pt-BR")} ${new Date(n.createdAt).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</p>
      </div>
      ${n.status === "unread" ? `<span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;flex-shrink:0;margin-top:.375rem;"></span>` : ""}
    </div>`).join("");

  // Bind click por item
  container.querySelectorAll(".notif-item").forEach(el => {
    el.addEventListener("click", () => onMarkRead(el.dataset.notifId));
  });

  // Botão marcar todas
  const markAllBtn = $("btn-mark-all-read");
  if (markAllBtn) {
    markAllBtn.style.display = unread > 0 ? "inline-flex" : "none";
    const clone = markAllBtn.cloneNode(true);
    markAllBtn.parentNode.replaceChild(clone, markAllBtn);
    clone.addEventListener("click", onMarkAll);
  }
}

// ─── Atividade Recente ────────────────────────────────────────────

export function renderRecentActivity(activity) {
  const container = $("recent-activity");
  if (!container) return;

  if (!activity.length) {
    container.innerHTML = `<p style="color:#94a3b8;font-size:.875rem;">Nenhuma chamada registrada ainda.</p>`;
    return;
  }

  container.innerHTML = activity.map(a => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <div style="display:flex;align-items:center;gap:.75rem;">
        <div style="width:2rem;height:2rem;border-radius:8px;background:rgba(34,197,94,.1);display:flex;align-items:center;justify-content:center;color:#22c55e;flex-shrink:0;">${iconSvg("check")}</div>
        <div>
          <p style="font-size:.875rem;font-weight:500;color:#f8fafc;">${a.className}</p>
          <p style="font-size:.75rem;color:#94a3b8;">${a.dateFormatted} · ${a.studentCount} aluno${a.studentCount !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <a href="/app/professor/chamada.html?classId=${a.classId}" style="font-size:.75rem;color:#60a5fa;">Ver</a>
    </div>`).join("");
}

// ─── Estados de interface ─────────────────────────────────────────

export function showLoading(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;padding:4rem;gap:1.5rem;color:#94a3b8;">
      <div style="width:40px;height:40px;border:3px solid rgba(59,130,246,.2);border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;"></div>
      <p style="font-size:.9375rem;">Carregando dashboard...</p>
    </div>`;
}

export function showError(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:4rem 1.5rem;color:#94a3b8;">
      <p style="font-size:2rem;margin-bottom:1rem;">⚠️</p>
      <p style="font-weight:600;color:#f8fafc;margin-bottom:.5rem;">Erro ao carregar</p>
      <p style="font-size:.875rem;">${message}</p>
      <button onclick="location.reload()" style="margin-top:1.5rem;padding:.625rem 1.25rem;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:8px;color:#60a5fa;font-weight:600;cursor:pointer;">Tentar novamente</button>
    </div>`;
}

export function showOfflineBanner(show) {
  const el = $("offline-banner");
  if (el) el.style.display = show ? "flex" : "none";
}
