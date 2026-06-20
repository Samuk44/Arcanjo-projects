import { authController } from "../../../auth/auth.controller.js";
import { bindLogoutButton } from "../auth/logout.js";
import {
  createSubject,
  getSubjectsBySchool,
  deleteSubject,
} from "../../../services/subject.service.js";
import { showToast } from "../shared/toast.js";
import { Logger } from "../shared/logger.js";

let schoolId = null;
const $ = (id) => document.getElementById(id);

function renderSubjects(subjects) {
  const container = $("subject-list");
  if (!container) return;

  if (!subjects.length) {
    container.innerHTML =
      '<p class="empty-msg">Nenhuma disciplina cadastrada ainda.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>Nome</th><th></th></tr>
      </thead>
      <tbody>
        ${subjects
          .map(
            (s) => `
          <tr>
            <td>${s.name}</td>
            <td style="text-align:right">
              <button class="btn-del" data-id="${s.id}" aria-label="Excluir ${s.name}">Excluir</button>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.querySelectorAll(".btn-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await deleteSubject(id);
        Logger.info("subject.deleted", { schoolId, id });
        showToast("Disciplina excluída.", "success");
        await load();
      } catch (e) {
        Logger.error("subject.delete.failed", { error: e.message });
        showToast("Erro ao excluir disciplina.", "error");
        btn.disabled = false;
      }
    });
  });
}

async function load() {
  const container = $("subject-list");
  if (container) container.innerHTML = '<p class="empty-msg">Carregando...</p>';
  try {
    const subjects = await getSubjectsBySchool(schoolId);
    renderSubjects(subjects);
  } catch (e) {
    Logger.error("subjects.load.failed", { error: e.message });
    if (container)
      container.innerHTML =
        '<p class="empty-msg error-msg">Erro ao carregar disciplinas.</p>';
  }
}

function bindForm() {
  const form = $("subject-form");
  const submitBtn = $("subject-submit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = ($("subject-name")?.value ?? "").trim();
    const errorEl = $("subject-form-error");

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

    if (submitBtn) submitBtn.disabled = true;
    try {
      await createSubject({ name, schoolId });
      Logger.info("subject.created", { schoolId });
      showToast("Disciplina cadastrada!", "success");
      form.reset();
      await load();
    } catch (err) {
      Logger.error("subject.create.failed", { error: err.message });
      if (errorEl) {
        errorEl.textContent = err.message || "Erro ao cadastrar.";
        errorEl.style.display = "block";
      }
      showToast("Erro ao cadastrar disciplina.", "error");
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
  await load();

  document.body.style.visibility = "visible";
})();
