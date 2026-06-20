/**
 * Módulo de View - Manipulação de DOM exclusiva.
 * Nenhuma regra de negócio deve residir aqui.
 */

// Cache de elementos do DOM
const els = {
  schoolName: document.getElementById("school-name"),
  schoolLocation: document.getElementById("school-location"),
  currentDate: document.getElementById("current-date"),
  directorInitials: document.getElementById("director-initials"),
  directorName: document.getElementById("director-name"),
  directorRole: document.getElementById("director-role"),
  greetingText: document.getElementById("greeting-text"),
  schoolSummary: document.getElementById("school-summary"),
  schoolCode: document.getElementById("school-code"),

  // Stats
  statStudents: document.getElementById("stat-students"),
  statTeachers: document.getElementById("stat-teachers"),
  statGuardians: document.getElementById("stat-guardians"),
  statClasses: document.getElementById("stat-classes"),
  statAttendance: document.getElementById("stat-attendance-today"),
  statAttendanceRate: document.getElementById("stat-attendance-rate"),

  // Containers
  alertsContainer: document.getElementById("alerts-container"),
  tbodyClasses: document.getElementById("tbody-classes"),
  tbodyTeachers: document.getElementById("tbody-teachers"),
  tbodyGuardians: document.getElementById("tbody-guardians"),
  timelineContainer: document.getElementById("recent-activity"),

  // Tabs
  tabBtns: document.querySelectorAll(".tab-btn"),
  tableContainers: document.querySelectorAll(".table-container"),
};

export const renderHeader = (school, director) => {
  els.schoolName.textContent = school.name;
  els.schoolLocation.textContent = `${school.city}, ${school.state}`;
  els.directorName.textContent = director.name;
  els.directorRole.textContent = director.role;

  const initials = director.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  els.directorInitials.textContent = initials;

  const hoje = new Date();
  els.currentDate.textContent = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const renderHero = (director, stats, code) => {
  const firstName = director.name.split(" ")[0];
  els.greetingText.textContent = `Olá, ${firstName}`;
  els.schoolSummary.innerHTML = `Acompanhe a situação de <strong>${stats.students} alunos</strong> distribuídos em <strong>${stats.classes} turmas</strong>.`;
  els.schoolCode.textContent = code;
};

export const updateSchoolCode = (newCode) => {
  els.schoolCode.textContent = newCode;
};

export const renderStats = (stats) => {
  els.statStudents.textContent = stats.students;
  els.statTeachers.textContent = stats.teachers;
  els.statGuardians.textContent = stats.guardians;
  els.statClasses.textContent = stats.classes;
  els.statAttendance.textContent = stats.attendanceToday;
  els.statAttendanceRate.textContent = `${stats.attendanceRate}%`;
};

export const renderAlerts = (alerts) => {
  if (alerts.length === 0) {
    els.alertsContainer.innerHTML = `<div class="text-muted" style="padding: 1rem;">Nenhum alerta pendente.</div>`;
    return;
  }

  const getIcon = (type) => {
    if (type === "danger")
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
  };

  const html = alerts
    .map(
      (alert) => `
        <div class="alert-card ${alert.type} glass">
            <div class="alert-icon">${getIcon(alert.type)}</div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
            </div>
        </div>
    `,
    )
    .join("");

  els.alertsContainer.innerHTML = html;
};

export const renderClassesTable = (classes) => {
  els.tbodyClasses.innerHTML = classes
    .map(
      (c) => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.grade}</td>
            <td>${c.shift}</td>
            <td>${c.studentsCount}</td>
            <td>${c.teacher === "Sem Professor" ? `<span class="badge badge-danger">Sem Professor</span>` : c.teacher}</td>
        </tr>
    `,
    )
    .join("");
};

export const renderTeachersTable = (teachers) => {
  els.tbodyTeachers.innerHTML = teachers
    .map(
      (t) => `
        <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.email}</td>
            <td>${t.classes === "Nenhuma" ? `<span class="text-muted">Nenhuma</span>` : t.classes}</td>
            <td>${t.status === "active" ? `<span class="badge badge-success">Ativo</span>` : `<span class="badge badge-warning">Pendente</span>`}</td>
        </tr>
    `,
    )
    .join("");
};

export const renderGuardiansTable = (guardians) => {
  els.tbodyGuardians.innerHTML = guardians
    .map(
      (g) => `
        <tr>
            <td><strong>${g.name}</strong></td>
            <td>${g.email}</td>
            <td>${g.childrenCount} aluno(s)</td>
        </tr>
    `,
    )
    .join("");
};

export const renderTimeline = (events) => {
  const getDotIcon = (iconClass) => {
    if (iconClass === "success")
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
    if (iconClass === "warning")
      return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/></svg>`;
  };

  els.timelineContainer.innerHTML = events
    .map(
      (ev) => `
        <div class="timeline-item">
            <div class="timeline-dot ${ev.icon}">
                ${getDotIcon(ev.icon)}
            </div>
            <div class="timeline-content">
                <h5>${ev.text}</h5>
                <span class="timeline-time">${ev.time}</span>
            </div>
        </div>
    `,
    )
    .join("");
};

export const setupTabs = () => {
  els.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      els.tabBtns.forEach((b) => b.classList.remove("active"));
      els.tableContainers.forEach((t) => t.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(targetId).classList.add("active");
    });
  });
};
