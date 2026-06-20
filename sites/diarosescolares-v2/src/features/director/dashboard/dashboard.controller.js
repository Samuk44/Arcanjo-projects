import { authController } from "../../../auth/auth.controller.js";
import {
  loadDirectorDashboardData,
  renewDirectorInvite,
} from "./dashboard.service.js";
import * as View from "./dashboard.view.js";

const state = {
  data: null,
};

async function handleRenewInvite(role) {
  try {
    const data = await renewDirectorInvite(role);
    state.data = data;
    const invite =
      data.codeBlock.invites.find((i) => i.role === role) ||
      data.codeBlock.invites[0] ||
      {};
    View.updateSchoolCode(invite.code || "Ainda não gerado");
  } catch (error) {
    console.error("Erro ao renovar código:", error);
    alert(error.message || "Não foi possível renovar o código.");
  }
}

const setupActionListeners = (initialCode) => {
  const btnCopy = document.getElementById("btn-copy-code");
  if (btnCopy) {
    btnCopy.addEventListener("click", async () => {
      try {
        const currentCode =
          document.getElementById("school-code")?.textContent || initialCode;
        await navigator.clipboard.writeText(currentCode);
        const tooltip = btnCopy.querySelector(".tooltip-text");
        if (tooltip) {
          const originalText = tooltip.textContent;
          tooltip.textContent = "Copiado!";
          setTimeout(() => {
            tooltip.textContent = originalText;
          }, 2000);
        }
      } catch (err) {
        console.error("Falha ao copiar:", err);
      }
    });
  }

  const btnRenew = document.getElementById("btn-renew-code");
  if (btnRenew) {
    btnRenew.addEventListener("click", async () => {
      if (
        confirm(
          "Ao renovar o código, o código antigo será invalidado imediatamente. Deseja continuar?",
        )
      ) {
        const originalHtml = btnRenew.innerHTML;
        btnRenew.innerHTML = `<span style="font-size: 0.6875rem;">...</span>`;
        try {
          // A interface antiga não distingue qual papel renovar pelo botão do cabeçalho.
          // Vamos assumir "teacher" por padrão ou o ativo atual se houvesse estado.
          await handleRenewInvite("teacher");
        } finally {
          btnRenew.innerHTML = originalHtml;
        }
      }
    });
  }

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm("Deseja realmente sair do sistema?")) {
        await authController.logout();
      }
    });
  }
};

async function init() {
  const user = await authController.guardRoute("director");
  if (!user) return;

  try {
    const data = await loadDirectorDashboardData();
    state.data = data;

    const { school, director, codeBlock, summary, lists } = data;

    View.renderHeader(school, director);

    const invite =
      codeBlock.invites.find((i) => i.role === "teacher") ||
      codeBlock.invites[0] ||
      {};
    const code = invite.code || "Ainda não gerado";

    View.renderHero(director, summary, code);
    View.renderStats(summary);
    View.renderAlerts(lists.alerts);
    View.renderClassesTable(lists.classes);
    View.renderTeachersTable(lists.teachers);
    View.renderGuardiansTable(lists.guardians);

    // Como o dashboard original tem uma timeline mas os dados reais não retornam activity log
    // passamos array vazio ou omitimos
    View.renderTimeline([]);

    View.setupTabs();
    setupActionListeners(code);

    // Carregar Componente de Central de Avisos dinamicamente
    try {
      const res = await fetch("/app/director/dashboard/components/announcement.section.html");
      const html = await res.text();
      const splitContent = document.querySelector(".content-split");
      if (splitContent) {
        splitContent.insertAdjacentHTML("beforebegin", html);
        
        // Injetar CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/app/director/dashboard/components/announcement.section.css";
        document.head.appendChild(link);

        // Importar e inicializar JS do componente
        const { initAnnouncementSection } = await import("../../../../app/director/dashboard/components/announcement.section.js");
        initAnnouncementSection();
      }
    } catch (err) {
      console.error("Falha ao carregar o componente de Central de Avisos:", err);
    }
  } catch (error) {
    console.error("Erro ao carregar o dashboard:", error);
    alert(
      "Ocorreu um erro ao carregar os dados da escola. Verifique sua conexão.",
    );
  } finally {
    document.body.style.visibility = "visible";
  }
}

document.addEventListener("DOMContentLoaded", init);
