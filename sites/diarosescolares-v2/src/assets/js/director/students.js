import { authController } from "../../../auth/auth.controller.js";
import { bindLogoutButton } from "../auth/logout.js";
import {
  createStudent,
  getStudentsBySchool,
} from "../../../services/student.service.js";
import { getClassesBySchool } from "../../../services/class.service.js";
import { getGuardiansBySchool } from "../../../services/user.service.js";
import { showToast } from "../shared/toast.js";
import { Logger } from "../shared/logger.js";

let schoolId = null;

const $ = (id) => document.getElementById(id);

function renderStudents(students) {
  const container = $("student-list");
  if (!container) return;

  if (!students.length) {
    container.innerHTML =
      '<p class="empty-msg">Nenhum aluno cadastrado ainda.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Matrícula</th>
          <th>Turma</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${students
          .map(
            (s) => `
          <tr>
            <td>${s.name}</td>
            <td>${s.enrollmentNumber}</td>
            <td>${s.classId || "—"}</td>
            <td><span class="status-badge status-${s.status}">${s.status === "active" ? "Ativo" : s.status}</span></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function loadStudents() {
  const container = $("student-list");
  if (!container) return;
  container.innerHTML = '<p class="empty-msg">Carregando...</p>';

  try {
    const students = await getStudentsBySchool(schoolId);
    renderStudents(students);
  } catch (e) {
    Logger.error("students.load.failed", { error: e.message });
    container.innerHTML =
      '<p class="empty-msg error-msg">Erro ao carregar alunos.</p>';
  }
}

async function populateClassSelect() {
  const select = $("student-class");
  if (!select) return;

  try {
    const classes = await getClassesBySchool(schoolId);
    select.innerHTML = '<option value="">Sem turma definida</option>';
    classes.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} — ${c.grade}`;
      select.appendChild(opt);
    });
  } catch {
    select.innerHTML = '<option value="">Nenhuma turma disponível</option>';
  }
}

async function populateGuardianSelect() {
  const select = $("student-guardian");
  if (!select) return;

  try {
    const guardians = await getGuardiansBySchool(schoolId);
    select.innerHTML = guardians.length
      ? '<option value="">Selecione o responsável</option>'
      : '<option value="">Nenhum responsável cadastrado</option>';
    guardians.forEach((guardian) => {
      const opt = document.createElement("option");
      opt.value = guardian.uid;
      opt.textContent = guardian.name || guardian.displayName || guardian.email || guardian.uid;
      select.appendChild(opt);
    });
  } catch {
    select.innerHTML = '<option value="">Nenhum responsável disponível</option>';
  }
}

function bindForm() {
  const form = $("student-form");
  const submitBtn = $("student-submit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = ($("student-name")?.value ?? "").trim();
    const enrollmentNumber = ($("student-enrollment")?.value ?? "").trim();
    const classId = ($("student-class")?.value ?? "").trim() || null;
    const guardianUid = ($("student-guardian")?.value ?? "").trim();

    const errorEl = $("student-form-error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }

    if (!name) {
      if (errorEl) {
        errorEl.textContent = "Nome é obrigatório.";
        errorEl.style.display = "block";
      }
      return;
    }
    if (!enrollmentNumber) {
      if (errorEl) {
        errorEl.textContent = "Número de matrícula é obrigatório.";
        errorEl.style.display = "block";
      }
      return;
    }
    if (!guardianUid) {
      if (errorEl) {
        errorEl.textContent = "Selecione um responsável.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await createStudent({ guardianUid, name, enrollmentNumber, schoolId, classId });
      Logger.info("students.created", { schoolId });
      showToast("Aluno cadastrado com sucesso!", "success");
      form.reset();
      await loadStudents();
    } catch (err) {
      Logger.error("students.create.failed", { error: err.message });
      if (errorEl) {
        errorEl.textContent = err.message || "Erro ao cadastrar aluno.";
        errorEl.style.display = "block";
      }
      showToast("Erro ao cadastrar aluno.", "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

(async () => {
  const user = await authController.guardRoute("director");
  if (!user) return;

  if (!user.schoolId) {
    document.body.innerHTML =
      '<p style="color:red;padding:2rem">Conta sem escola vinculada. Contate o suporte.</p>';
    return;
  }

  schoolId = user.schoolId;

  const navUser = $("nav-user-name");
  if (navUser) navUser.textContent = user.displayName || "";

  bindLogoutButton($("logout-btn"));
  bindForm();

  await Promise.all([populateClassSelect(), populateGuardianSelect(), loadStudents()]);

  document.body.style.visibility = "visible";
})();
