import { authController } from "../../../auth/auth.controller.js";
import { bindLogoutButton } from "../auth/logout.js";
import {
  assignTeacherToClass,
  getAssignmentsBySchool,
} from "../../../services/assignment.service.js";
import { getTeachersBySchool } from "../../../services/user.service.js";
import { getClassesBySchool } from "../../../services/class.service.js";
import { getSubjectsBySchool } from "../../../services/subject.service.js";
import { showToast } from "../shared/toast.js";
import { Logger } from "../shared/logger.js";

let schoolId = null;
const cache = { teachers: [], classes: [], subjects: [] };

const $ = (id) => document.getElementById(id);

function nameById(list, id, fallback = "—") {
  return (
    list.find((x) => x.id === id || x.uid === id)?.name ||
    list.find((x) => x.id === id || x.uid === id)?.displayName ||
    fallback
  );
}

function populateSelect(selectEl, items, placeholder, labelFn) {
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id || item.uid;
    opt.textContent = labelFn(item);
    selectEl.appendChild(opt);
  });
}

async function loadSelects() {
  const [teachers, classes, subjects] = await Promise.all([
    getTeachersBySchool(schoolId).catch(() => []),
    getClassesBySchool(schoolId).catch(() => []),
    getSubjectsBySchool(schoolId).catch(() => []),
  ]);

  cache.teachers = teachers;
  cache.classes = classes;
  cache.subjects = subjects;

  const tSel = $("ta-teacher");
  const cSel = $("ta-class");
  const sSel = $("ta-subject");

  if (tSel)
    populateSelect(
      tSel,
      teachers,
      teachers.length ? "Selecione o professor" : "Nenhum professor ativo",
      (t) => t.displayName || t.name || t.email || t.uid,
    );
  if (cSel)
    populateSelect(
      cSel,
      classes,
      classes.length ? "Selecione a turma" : "Nenhuma turma cadastrada",
      (c) => `${c.name} — ${c.grade}`,
    );
  if (sSel)
    populateSelect(
      sSel,
      subjects,
      subjects.length
        ? "Selecione a disciplina"
        : "Nenhuma disciplina cadastrada",
      (s) => s.name,
    );
}

function renderAssignments(assignments) {
  const container = $("ta-list");
  if (!container) return;

  if (!assignments.length) {
    container.innerHTML =
      '<p class="empty-msg">Nenhum vínculo cadastrado ainda.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Professor</th>
          <th>Turma</th>
          <th>Disciplina</th>
        </tr>
      </thead>
      <tbody>
        ${assignments
          .map(
            (a) => `
          <tr>
            <td>${nameById(cache.teachers, a.teacherId)}</td>
            <td>${nameById(cache.classes, a.classId)}</td>
            <td>${nameById(cache.subjects, a.subjectId)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function loadAssignments() {
  const container = $("ta-list");
  if (container) container.innerHTML = '<p class="empty-msg">Carregando...</p>';
  try {
    const assignments = await getAssignmentsBySchool(schoolId);
    renderAssignments(assignments);
  } catch (e) {
    Logger.error("teacher-assignments.load.failed", { error: e.message });
    if (container)
      container.innerHTML =
        '<p class="empty-msg error-msg">Erro ao carregar vínculos.</p>';
  }
}

function bindForm() {
  const form = $("ta-form");
  const submitBtn = $("ta-submit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const teacherId = ($("ta-teacher")?.value ?? "").trim();
    const classId = ($("ta-class")?.value ?? "").trim();
    const subjectId = ($("ta-subject")?.value ?? "").trim();

    const errorEl = $("ta-form-error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }

    if (!teacherId) {
      if (errorEl) {
        errorEl.textContent = "Selecione um professor.";
        errorEl.style.display = "block";
      }
      return;
    }
    if (!classId) {
      if (errorEl) {
        errorEl.textContent = "Selecione uma turma.";
        errorEl.style.display = "block";
      }
      return;
    }
    if (!subjectId) {
      if (errorEl) {
        errorEl.textContent = "Selecione uma disciplina.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      await assignTeacherToClass({ teacherId, classId, subjectId, schoolId });
      Logger.info("teacher-assignment.created", {
        schoolId,
        teacherId,
        classId,
        subjectId,
      });
      showToast("Vínculo criado com sucesso!", "success");
      form.reset();
      await loadAssignments();
    } catch (err) {
      Logger.error("teacher-assignment.create.failed", { error: err.message });
      if (errorEl) {
        errorEl.textContent = err.message || "Erro ao criar vínculo.";
        errorEl.style.display = "block";
      }
      showToast("Erro ao criar vínculo.", "error");
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

  await Promise.all([loadSelects(), loadAssignments()]);

  document.body.style.visibility = "visible";
})();
