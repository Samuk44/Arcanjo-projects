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

  statStudents: document.getElementById("stat-students"),
  statTeachers: document.getElementById("stat-teachers"),
  statGuardians: document.getElementById("stat-guardians"),
  statClasses: document.getElementById("stat-classes"),
  statAttendance: document.getElementById("stat-attendance-today"),
  statAttendanceRate: document.getElementById("stat-attendance-rate"),

  alertsContainer: document.getElementById("alerts-container"),
  tbodyClasses: document.getElementById("tbody-classes"),
  tbodyTeachers: document.getElementById("tbody-teachers"),
  tbodyGuardians: document.getElementById("tbody-guardians"),
  timelineContainer: document.getElementById("recent-activity"),

  tabBtns: document.querySelectorAll(".tab-btn"),
  tableContainers: document.querySelectorAll(".table-container"),
};

export const renderHeader = (school, director) => {
  if (els.schoolName) els.schoolName.textContent = school.name;
  if (els.schoolLocation) els.schoolLocation.textContent = `${school.city || ""}, ${school.state || ""}`;
  if (els.directorName) els.directorName.textContent = director.name;
  if (els.directorRole) els.directorRole.textContent = "Diretor(a)";

  if (els.directorInitials && director.name) {
    const initials = director.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    els.directorInitials.textContent = initials;
  }

  if (els.currentDate) {
    const hoje = new Date();
    els.currentDate.textContent = hoje.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
};

export const renderHero = (director, stats, code) => {
  if (els.greetingText && director.name) {
    const firstName = director.name.split(" ")[0];
    els.greetingText.textContent = `Olá, ${firstName}`;
  }
  if (els.schoolSummary) {
    els.schoolSummary.innerHTML = `Acompanhe a situação de <strong>${stats.students} alunos</strong> distribuídos em <strong>${stats.classes} turmas</strong>.`;
  }
  if (els.schoolCode) {
    els.schoolCode.textContent = code || "Ainda não gerado";
  }
};

export const updateSchoolCode = (newCode) => {
  if (els.schoolCode) els.schoolCode.textContent = newCode || "Ainda não gerado";
};

export const renderStats = (stats) => {
  if (els.statStudents) els.statStudents.textContent = stats.students;
  if (els.statTeachers) els.statTeachers.textContent = stats.teachers;
  if (els.statGuardians) els.statGuardians.textContent = stats.guardians;
  if (els.statClasses) els.statClasses.textContent = stats.classes;
  if (els.statAttendance) els.statAttendance.textContent = stats.attendanceToday;
  if (els.statAttendanceRate) els.statAttendanceRate.textContent = "100%"; // Pode ser calculado se houver lógica
};

export const renderAlerts = (alerts) => {
  if (!els.alertsContainer) return;
  if (!alerts || alerts.length === 0) {
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
        <div class="alert-card ${alert.level} glass">
            <div class="alert-icon">${getIcon(alert.level)}</div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.description}</p>
            </div>
        </div>
    `,
    )
    .join("");

  els.alertsContainer.innerHTML = html;
};

export const renderClassesTable = (classes) => {
  if (!els.tbodyClasses) return;
  els.tbodyClasses.innerHTML = classes
    .map(
      (c) => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.grade}</td>
            <td>${c.shift}</td>
            <td>${c.studentsCount}</td>
            <td>${c.teacherIds && c.teacherIds.length === 0 ? `<span class="badge badge-danger">Sem Professor</span>` : c.teacherLabel}</td>
        </tr>
    `,
    )
    .join("");
};

export const renderTeachersTable = (teachers) => {
  if (!els.tbodyTeachers) return;
  els.tbodyTeachers.innerHTML = teachers
    .map(
      (t) => `
        <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.email}</td>
            <td>${t.classCount === 0 ? `<span class="text-muted">Nenhuma</span>` : `${t.classCount} turma(s)`}</td>
            <td>${t.status === "active" ? `<span class="badge badge-success">Ativo</span>` : `<span class="badge badge-warning">Pendente</span>`}</td>
        </tr>
    `,
    )
    .join("");
};

export const renderGuardiansTable = (guardians) => {
  if (!els.tbodyGuardians) return;
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
  if (!els.timelineContainer) return;
  if (!events || events.length === 0) {
    els.timelineContainer.innerHTML = `<div class="text-muted" style="padding: 1rem;">Nenhuma atividade recente.</div>`;
    return;
  }
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
            <div class="timeline-dot ${ev.icon || 'accent'}">
                ${getDotIcon(ev.icon || 'accent')}
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
  if (!els.tabBtns) return;
  els.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      els.tabBtns.forEach((b) => b.classList.remove("active"));
      els.tableContainers.forEach((t) => t.classList.remove("active"));

      btn.classList.add("active");
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add("active");
    });
  });
};
