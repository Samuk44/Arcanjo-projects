// src/assets/js/director/classes.js — CORRIGIDO
import { authController } from "../../../auth/auth.controller.js";
import { bindLogoutButton } from "../auth/logout.js";
import {
  createClass,
  getClassesBySchool,
} from "../../../services/class.service.js";
import { showToast } from "../shared/toast.js";
import { Logger } from "../shared/logger.js";

let schoolId = null;
const $ = (id) => document.getElementById(id);

function renderClasses(classes) {
  const container = $("class-list-container");
  if (!container) return;

  if (!classes.length) {
    container.innerHTML =
      '<p class="empty-msg">Nenhuma turma cadastrada ainda.</p>';
    return;
  }

  container.innerHTML = `
    <table class="data-table min-w-full bg-white responsive-table">
      <thead>
        <tr>
          <th>Nome</th><th>Série</th><th>Turno</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${classes
          .map(
            (c) => `
          <tr>
            <td>${c.name}</td>
            <td>${c.grade || "—"}</td>
            <td>${c.shift || "—"}</td>
            <td><span class="status-badge status-${c.status}">${c.status === "active" ? "Ativa" : c.status}</span></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

async function loadClasses() {
  const container = $("class-list-container");
  if (container) container.innerHTML = '<p class="empty-msg">Carregando...</p>';
  try {
    const classes = await getClassesBySchool(schoolId);
    renderClasses(classes);
  } catch (e) {
    Logger.error("classes.load.failed", { error: e.message });
    if (container)
      container.innerHTML =
        '<p class="empty-msg error-msg">Erro ao carregar turmas.</p>';
  }
}

function bindForm() {
  const form = $("class-form");
  const submitBtn = $("class-submit");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = ($("class-name")?.value ?? "").trim();
    const grade = ($("class-grade")?.value ?? "").trim();
    const shift = ($("class-shift")?.value ?? "").trim();
    const errorEl = $("class-form-error");

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
    if (!grade) {
      if (errorEl) {
        errorEl.textContent = "Série é obrigatória.";
        errorEl.style.display = "block";
      }
      return;
    }
    if (!shift) {
      if (errorEl) {
        errorEl.textContent = "Turno é obrigatório.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      await createClass({ name, grade, shift, schoolId });
      Logger.info("class.created", { schoolId });
      showToast("Turma cadastrada com sucesso!", "success");
      form.reset();
      await loadClasses();
    } catch (err) {
      Logger.error("class.create.failed", { error: err.message });
      if (errorEl) {
        errorEl.textContent = err.message || "Erro ao cadastrar turma.";
        errorEl.style.display = "block";
      }
      showToast("Erro ao cadastrar turma.", "error");
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
  await loadClasses();

  document.body.style.visibility = "visible";
})();
