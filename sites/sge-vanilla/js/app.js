// ============================================
// DADOS
// ============================================

const children = [
  {
    id: "1",
    name: "João Silva",
    grade: "5º Ano",
    school: "Escola Municipal Central",
    avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663644445708/kBzKFVS3bUjiq4ChdzuRX6/notification-card-grades-iPKyQpGio4L5UuEQaNL7yz.webp",
  },
  {
    id: "2",
    name: "Maria Silva",
    grade: "7º Ano",
    school: "Escola Municipal Central",
    avatar: "https://d2xsxph8kpxj0f.cloudfront.net/310519663644445708/kBzKFVS3bUjiq4ChdzuRX6/notification-card-absence-ZLU5aLTGQRSkVmxmsSaLpJ.webp",
  },
];

const notifications = [
  {
    id: "1",
    type: "absence",
    title: "Falta Registrada",
    description: "João faltou à aula de Matemática hoje",
    student: "João Silva",
    timestamp: "Hoje às 10:30",
    read: false,
    iconType: "calendar",
    iconColor: "#3498DB",
    details: {
      fullText: "João Silva faltou à aula de Matemática. Esta é a primeira falta registrada neste mês.",
      teacher: "Prof. Carlos Mendes",
      subject: "Matemática",
      date: "12 de maio de 2026",
      time: "10:30",
      location: "Sala 5º Ano - Bloco A",
    },
  },
  {
    id: "2",
    type: "grades",
    title: "Notas Publicadas",
    description: "Notas de Português foram publicadas. Desempenho excelente!",
    student: "João Silva",
    timestamp: "Ontem às 14:00",
    read: false,
    iconType: "file",
    iconColor: "#27AE60",
    details: {
      fullText: "As notas da avaliação de Português foram publicadas no sistema.",
      teacher: "Profa. Ana Silva",
      subject: "Português",
      date: "11 de maio de 2026",
      time: "14:00",
      location: "Plataforma SGE",
    },
  },
  {
    id: "3",
    type: "message",
    title: "Novo Bilhete",
    description: "Professora de Inglês enviou um bilhete sobre o projeto final",
    student: "Maria Silva",
    timestamp: "Ontem às 16:45",
    read: true,
    iconType: "message",
    iconColor: "#E91E63",
    details: {
      fullText: "Prezados responsáveis,\n\nGostaria de informar que o projeto final de Inglês será apresentado na próxima semana. Maria está progredindo muito bem na disciplina e já está preparando sua apresentação.",
      teacher: "Profa. Jennifer",
      subject: "Inglês",
      date: "11 de maio de 2026",
      time: "16:45",
      location: "Sala 7º Ano - Bloco B",
    },
  },
  {
    id: "4",
    type: "announcement",
    title: "Aviso Importante",
    description: "Reunião de pais agendada para próximo sábado às 10h",
    student: "Todos",
    timestamp: "2 dias atrás",
    read: true,
    iconType: "bell",
    iconColor: "#F39C12",
    details: {
      fullText: "Comunicamos que a reunião bimestral de pais e mestres será realizada no próximo sábado, 18 de maio de 2026, às 10h00 na quadra poliesportiva da escola.",
      teacher: "Direção",
      subject: "Reunião de Pais",
      date: "18 de maio de 2026",
      time: "10:00",
      location: "Quadra Poliesportiva",
    },
  },
];

const attendanceData = [
  { date: "01/05", day: "Seg", status: "P", subject: "Matemática" },
  { date: "02/05", day: "Ter", status: "P", subject: "Português" },
  { date: "03/05", day: "Qua", status: "P", subject: "Ciências" },
  { date: "04/05", day: "Qui", status: "F", subject: "Educação Física" },
  { date: "05/05", day: "Sex", status: "P", subject: "História" },
  { date: "08/05", day: "Seg", status: "P", subject: "Matemática" },
  { date: "09/05", day: "Ter", status: "P", subject: "Português" },
  { date: "10/05", day: "Qua", status: "P", subject: "Ciências" },
  { date: "11/05", day: "Qui", status: "P", subject: "Educação Física" },
  { date: "12/05", day: "Sex", status: "F", subject: "História" },
];

const gradesData = [
  { subject: "Português", grade: 8.5, status: "Bom" },
  { subject: "Matemática", grade: 7.8, status: "Bom" },
  { subject: "Ciências", grade: 9.0, status: "Excelente" },
  { subject: "História", grade: 8.2, status: "Bom" },
  { subject: "Geografia", grade: 7.5, status: "Bom" },
  { subject: "Educação Física", grade: 9.5, status: "Excelente" },
];

// ============================================
// ESTADO
// ============================================

let state = {
  selectedChildId: "1",
  selectedNotification: null,
  sidebarOpen: false,
};

// ============================================
// DOM ELEMENTS
// ============================================

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const modalOverlay = document.getElementById("modalOverlay");
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");
const childrenGrid = document.getElementById("childrenGrid");
const notificationsList = document.getElementById("notificationsList");
const notificationsTitle = document.getElementById("notificationsTitle");
const statsGrid = document.getElementById("statsGrid");
const notificationBadge = document.getElementById("notificationBadge");
const headerBadge = document.getElementById("headerBadge");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalIcon = document.getElementById("modalIcon");

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  renderChildren();
  renderNotifications();
  renderStats();
  updateBadges();
  setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  menuToggle.addEventListener("click", toggleSidebar);
  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      console.log("Navigation item clicked:", item.dataset.page);
    });
  });
}

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  sidebar.classList.toggle("hidden", !state.sidebarOpen);
}

function closeModal() {
  state.selectedNotification = null;
  modal.classList.remove("active");
  modalOverlay.classList.remove("active");
}

function openModal(notification) {
  state.selectedNotification = notification;
  modal.classList.add("active");
  modalOverlay.classList.add("active");
  renderModalContent(notification);
}

// ============================================
// RENDER CHILDREN
// ============================================

function renderChildren() {
  childrenGrid.innerHTML = children
    .map((child) => {
      const isSelected = state.selectedChildId === child.id;
      return `
        <div class="child-card ${isSelected ? "selected" : ""}" data-child-id="${child.id}">
          <div class="child-avatar">
            <img src="${child.avatar}" alt="${child.name}">
          </div>
          <div class="child-info">
            <h4>${child.name}</h4>
            <p>${child.grade}</p>
            <p>${child.school}</p>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".child-card").forEach((card) => {
    card.addEventListener("click", () => {
      const childId = card.dataset.childId;
      selectChild(childId);
    });
  });
}

function selectChild(childId) {
  state.selectedChildId = childId;
  renderChildren();
  renderNotifications();
  updateNotificationsTitle();
}

function updateNotificationsTitle() {
  const child = children.find((c) => c.id === state.selectedChildId);
  if (child) {
    notificationsTitle.textContent = `Notificações de ${child.name}`;
  }
}

// ============================================
// RENDER NOTIFICATIONS
// ============================================

function renderNotifications() {
  const filteredNotifications = notifications.filter(
    (n) =>
      n.student === "Todos" ||
      n.student === children.find((c) => c.id === state.selectedChildId)?.name
  );

  notificationsList.innerHTML = filteredNotifications
    .map((notification) => {
      const iconSvg = getIconSvg(notification.iconType);
      return `
        <div class="notification-card ${notification.read ? "" : "unread"}" data-notification-id="${notification.id}">
          <div class="notification-icon" style="color: ${notification.iconColor}">
            ${iconSvg}
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <div>
                <div class="notification-title">${notification.title}</div>
                <div class="notification-description">${notification.description}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${!notification.read ? '<div class="notification-unread"></div>' : ""}
                <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
            <div class="notification-meta">
              <span>${notification.student}</span>
              <span>•</span>
              <span>${notification.timestamp}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".notification-card").forEach((card) => {
    card.addEventListener("click", () => {
      const notificationId = card.dataset.notificationId;
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        openModal(notification);
      }
    });
  });
}

// ============================================
// RENDER STATS
// ============================================

function renderStats() {
  const stats = [
    {
      label: "Presenças",
      value: "95%",
      iconType: "calendar",
      color: "#3498DB",
    },
    {
      label: "Média Geral",
      value: "8.5",
      iconType: "file",
      color: "#27AE60",
    },
    {
      label: "Bilhetes",
      value: "3",
      iconType: "message",
      color: "#E91E63",
    },
    {
      label: "Avisos",
      value: "5",
      iconType: "bell",
      color: "#F39C12",
    },
  ];

  statsGrid.innerHTML = stats
    .map((stat) => {
      const iconSvg = getIconSvg(stat.iconType);
      return `
        <div class="stat-card">
          <div class="stat-icon" style="background-color: ${stat.color}20; color: ${stat.color}">
            ${iconSvg}
          </div>
          <div class="stat-label">${stat.label}</div>
          <div class="stat-value">${stat.value}</div>
        </div>
      `;
    })
    .join("");
}

// ============================================
// RENDER MODAL
// ============================================

function renderModalContent(notification) {
  modalTitle.textContent = notification.title;
  modalSubtitle.textContent = notification.student;
  modalIcon.innerHTML = getIconSvg(notification.iconType);
  modalIcon.style.color = notification.iconColor;

  if (notification.type === "absence") {
    modalBody.innerHTML = renderAttendanceBoletim();
  } else if (notification.type === "grades") {
    modalBody.innerHTML = renderGradesBoletim();
  } else {
    modalBody.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: #2C3E50;">Detalhes</h3>
        <p style="color: #2C3E50; line-height: 1.6; white-space: pre-line;">${notification.details.fullText}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${notification.details.teacher ? renderInfoItem("Professor/Responsável", notification.details.teacher) : ""}
        ${notification.details.subject ? renderInfoItem("Disciplina/Assunto", notification.details.subject) : ""}
        ${notification.details.date ? renderInfoItem("Data", notification.details.date, "calendar") : ""}
        ${notification.details.time ? renderInfoItem("Horário", notification.details.time, "clock") : ""}
        ${notification.details.location ? renderInfoItem("Local", notification.details.location, "location") : ""}
      </div>
    `;
  }
}

function renderAttendanceBoletim() {
  const totalClasses = attendanceData.length;
  const absences = attendanceData.filter((a) => a.status === "F").length;
  const attendancePercentage = Math.round(
    ((totalClasses - absences) / totalClasses) * 100
  );

  const tableRows = attendanceData
    .map(
      (item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.day}</td>
      <td>${item.subject}</td>
      <td style="text-align: center;">
        <span class="status-badge ${item.status === "P" ? "present" : "absent"}">
          ${item.status}
        </span>
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <div class="attendance-stats">
      <div class="stat-box success">
        <div class="stat-box-label">Presenças</div>
        <div class="stat-box-value">${totalClasses - absences}</div>
        <div class="stat-box-note">de ${totalClasses} aulas</div>
      </div>
      <div class="stat-box danger">
        <div class="stat-box-label">Faltas</div>
        <div class="stat-box-value">${absences}</div>
        <div class="stat-box-note">não justificadas</div>
      </div>
      <div class="stat-box ${attendancePercentage >= 90 ? "success" : "warning"}">
        <div class="stat-box-label">Frequência</div>
        <div class="stat-box-value">${attendancePercentage}%</div>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: #2C3E50;">Histórico de Frequência</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Dia</th>
              <th>Disciplina</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="legend">
      <div class="legend-title">Legenda</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-indicator" style="background-color: rgba(39, 174, 96, 0.2); color: #27AE60;">P</span>
          <span>Presente</span>
        </div>
        <div class="legend-item">
          <span class="legend-indicator" style="background-color: rgba(231, 76, 60, 0.2); color: #E74C3C;">F</span>
          <span>Falta</span>
        </div>
      </div>
    </div>
  `;
}

function renderGradesBoletim() {
  const averageGrade = (
    gradesData.reduce((acc, g) => acc + g.grade, 0) / gradesData.length
  ).toFixed(1);
  const excellentCount = gradesData.filter((g) => g.grade >= 9).length;

  const gradeCards = gradesData
    .map((item) => {
      const statusClass =
        item.grade >= 9 ? "excellent" : item.grade >= 7 ? "good" : "warning";
      const percentage = (item.grade / 10) * 100;

      return `
      <div class="grade-card">
        <div class="grade-header">
          <div class="grade-subject">${item.subject}</div>
          <span class="grade-status ${statusClass}">${item.status}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar ${statusClass}" style="width: ${percentage}%"></div>
        </div>
        <div class="grade-footer">
          <span class="grade-footer-label">Nota</span>
          <span class="grade-footer-value">${item.grade.toFixed(1)}</span>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="stat-box" style="background: rgba(52, 152, 219, 0.05); border-color: rgba(52, 152, 219, 0.3);">
        <div class="stat-box-label" style="color: #3498DB;">Média Geral</div>
        <div class="stat-box-value" style="color: #3498DB; font-size: 2.5rem;">${averageGrade}</div>
      </div>
      <div class="stat-box" style="background: rgba(155, 89, 182, 0.05); border-color: rgba(155, 89, 182, 0.3);">
        <div class="stat-box-label" style="color: #9B59B6;">Excelentes</div>
        <div class="stat-box-value" style="color: #9B59B6; font-size: 2.5rem;">${excellentCount}</div>
        <div class="stat-box-note">de ${gradesData.length} disciplinas</div>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: #2C3E50;">Notas por Disciplina</h3>
      <div class="grades-container">
        ${gradeCards}
      </div>
    </div>

    <div class="legend">
      <p style="font-size: 0.875rem; color: #2C3E50;">
        <span style="font-weight: 600;">Período:</span> Maio de 2026
      </p>
      <p style="font-size: 0.875rem; color: #2C3E50; margin-top: 0.5rem;">
        <span style="font-weight: 600;">Próxima Avaliação:</span> 25 de maio (Português)
      </p>
    </div>
  `;
}

function renderInfoItem(label, value, iconType = null) {
  const iconSvg = iconType ? getIconSvg(iconType) : "";
  return `
    <div style="background-color: rgba(0, 0, 0, 0.02); border-radius: calc(1rem - 0.25rem); padding: 1rem; border: 1px solid #E0D5CC;">
      <p style="font-size: 0.75rem; color: #7F8C8D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
        ${label}
      </p>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        ${iconSvg ? `<span style="color: #4A90E2;">${iconSvg}</span>` : ""}
        <p style="color: #2C3E50; font-weight: 500;">${value}</p>
      </div>
    </div>
  `;
}

// ============================================
// UTILITIES
// ============================================

function updateBadges() {
  const unreadCount = notifications.filter((n) => !n.read).length;
  if (unreadCount > 0) {
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = "inline-block";
    headerBadge.textContent = unreadCount;
    headerBadge.style.display = "inline-block";
  } else {
    notificationBadge.style.display = "none";
    headerBadge.style.display = "none";
  }
}

function getIconSvg(iconType) {
  const icons = {
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
      <polyline points="13 2 13 9 20 9"></polyline>
    </svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`,
    location: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>`,
  };

  return icons[iconType] || icons.calendar;
}
