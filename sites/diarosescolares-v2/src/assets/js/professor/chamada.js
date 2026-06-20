import { authController } from "../../../auth/auth.controller.js";
import { bindLogoutButton } from "../auth/logout.js";
import { submitAttendance } from "../../../services/attendance.write.service.js";
import { getAttendanceByClassAndDate } from "../../../services/query/attendance.query.service.js";
import { getTeacherAssignments } from "../../../services/assignment.service.js";
import { getClassesBySchool } from "../../../services/class.service.js";
import { getStudentsBySchool } from "../../../services/student.service.js";
import { showToast } from "../shared/toast.js";
import { Logger } from "../shared/logger.js";

const $ = (id) => document.getElementById(id);
const STATUSES = ["present", "absent", "late"];
const STATUS_LABEL = { present: "Presente", absent: "Falta", late: "Atraso" };
const STATUS_COLOR = {
  present: "var(--success)",
  absent: "var(--danger)",
  late: "var(--warning)",
};

let user = null;
let assignments = []; // [{assignmentId, classId, subjectId}]
let classMap = {}; // classId → className
let allStudents = [];
let studentStatuses = {}; // studentId → status

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function renderStudentList(students, existingStatuses = {}) {
  studentStatuses = {};
  students.forEach((s) => {
    studentStatuses[s.id] = existingStatuses[s.id] || "present";
  });

  const list = $("student-list");
  if (!list) return;

  if (!students.length) {
    list.innerHTML =
      '<p class="empty-msg">Nenhum aluno encontrado nesta turma.</p>';
    $("submit-section")?.style?.setProperty("display", "none");
    return;
  }

  $("submit-section")?.style?.setProperty("display", "block");

  list.innerHTML = `
    <div class="student-rows">
      ${students
        .map((s) => {
          const status = studentStatuses[s.id];
          return `
          <div class="student-row" data-student-id="${s.id}">
            <span class="student-name">${s.name}</span>
            <div class="status-btns">
              ${STATUSES.map(
                (st) => `
                <button
                  class="status-btn ${st === status ? "active" : ""}"
                  data-status="${st}"
                  style="${st === status ? `background:${STATUS_COLOR[st]};border-color:${STATUS_COLOR[st]};color:#fff` : ""}"
                  aria-label="${STATUS_LABEL[st]}"
                >${STATUS_LABEL[st]}</button>
              `,
              ).join("")}
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  list.querySelectorAll(".student-row").forEach((row) => {
    const sid = row.dataset.studentId;
    row.querySelectorAll(".status-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const st = btn.dataset.status;
        studentStatuses[sid] = st;
        row.querySelectorAll(".status-btn").forEach((b) => {
          const active = b.dataset.status === st;
          b.classList.toggle("active", active);
          b.style.background = active ? STATUS_COLOR[st] : "";
          b.style.borderColor = active ? STATUS_COLOR[st] : "";
          b.style.color = active ? "#fff" : "";
        });
      });
    });
  });
}

async function onClassChange() {
  const classId = $("class-select")?.value;
  const date = $("date-input")?.value || todayISO();
  const loadingEl = $("loading-msg");
  const listSection = $("list-section");

  if (!classId) {
    if (listSection) listSection.style.display = "none";
    return;
  }

  if (listSection) listSection.style.display = "block";
  if (loadingEl) loadingEl.style.display = "block";

  const classStudents = allStudents.filter((s) => s.classId === classId);

  try {
    const existing = await getAttendanceByClassAndDate(
      user.schoolId,
      classId,
      date,
    );
    const existingStatuses = existing?.students || {};
    renderStudentList(classStudents, existingStatuses);

    if (existing) {
      showToast("Chamada já realizada para esta data.", "info");
    }
  } catch {
    renderStudentList(classStudents);
  }

  if (loadingEl) loadingEl.style.display = "none";
}

async function onSubmit(e) {
  e.preventDefault();

  const classId = $("class-select")?.value;
  const date = $("date-input")?.value || todayISO();
  const submitBtn = $("submit-btn");
  const errorEl = $("submit-error");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  if (!classId) {
    if (errorEl) {
      errorEl.textContent = "Selecione uma turma.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (!date) {
    if (errorEl) {
      errorEl.textContent = "Informe a data.";
      errorEl.style.display = "block";
    }
    return;
  }

  if (!Object.keys(studentStatuses).length) {
    if (errorEl) {
      errorEl.textContent = "Nenhum aluno para registrar.";
      errorEl.style.display = "block";
    }
    return;
  }

  const assignment = assignments.find((a) => a.classId === classId);
  const subjectId = assignment?.subjectId || "";

  if (submitBtn) submitBtn.disabled = true;

  try {
    await submitAttendance({
      classId,
      subjectId,
      date,
      students: { ...studentStatuses },
    });
    Logger.info("attendance.saved", { classId, date, schoolId: user.schoolId });
    showToast("Chamada registrada com sucesso!", "success");
    await onClassChange();
  } catch (err) {
    Logger.error("attendance.failed", { error: err.message });
    if (errorEl) {
      errorEl.textContent = err.message || "Erro ao registrar chamada.";
      errorEl.style.display = "block";
    }
    showToast("Erro ao registrar chamada.", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

(async () => {
  user = await authController.guardRoute("teacher");
  if (!user) return;

  if (!user.schoolId) {
    document.body.innerHTML =
      '<p style="color:red;padding:2rem">Conta sem escola vinculada.</p>';
    return;
  }

  const navUser = $("nav-user-name");
  if (navUser) navUser.textContent = user.displayName || "";
  bindLogoutButton($("logout-btn"));

  const [teacherAssignments, classes, students] = await Promise.all([
    getTeacherAssignments(user.uid).catch(() => []),
    getClassesBySchool(user.schoolId).catch(() => []),
    getStudentsBySchool(user.schoolId).catch(() => []),
  ]);

  assignments = teacherAssignments;
  allStudents = students;
  classes.forEach((c) => {
    classMap[c.id] = c.name;
  });

  const classSelect = $("class-select");
  if (classSelect) {
    const myClassIds = new Set(assignments.map((a) => a.classId));
    const myClasses = classes.filter((c) => myClassIds.has(c.id));

    if (!myClasses.length) {
      classSelect.innerHTML =
        '<option value="">Nenhuma turma vinculada</option>';
    } else {
      classSelect.innerHTML =
        '<option value="">Selecione a turma</option>' +
        myClasses
          .map((c) => `<option value="${c.id}">${c.name} — ${c.grade}</option>`)
          .join("");
    }

    classSelect.addEventListener("change", onClassChange);
  }

  const dateInput = $("date-input");
  if (dateInput) {
    dateInput.value = todayISO();
    dateInput.addEventListener("change", onClassChange);
  }

  $("chamada-form")?.addEventListener("submit", onSubmit);

  document.body.style.visibility = "visible";
})();
