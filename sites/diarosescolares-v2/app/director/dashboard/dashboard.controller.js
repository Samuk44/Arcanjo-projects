/**
 * Módulo Controller - Integração e fluxo de ações.
 */
import * as Service from "../../../src/services/dashboard/dashboard.service.js";
import * as View from "./dashboard.view.js";

// Inicialização principal
const initDashboard = async () => {
  try {
    // Dispara requisições simultâneas para otimizar carregamento
    const [context, stats, alerts, classes, teachers, guardians, timeline] =
      await Promise.all([
        Service.getSchoolContext(),
        Service.getDashboardStats(),
        Service.getAlerts(),
        Service.getClassesData(),
        Service.getTeachersData(),
        Service.getGuardiansData(),
        Service.getTimelineData(),
      ]);

    // Renderização via View
    View.renderHeader(context.school, context.director);
    View.renderHero(context.director, stats, context.school.code);
    View.renderStats(stats);
    View.renderAlerts(alerts);
    View.renderClassesTable(classes);
    View.renderTeachersTable(teachers);
    View.renderGuardiansTable(guardians);
    View.renderTimeline(timeline);

    // Setup de Interatividade UI
    View.setupTabs();
    setupActionListeners(context.school.code);
  } catch (error) {
    console.error("Erro ao carregar o dashboard:", error);
    alert(
      "Ocorreu um erro ao carregar os dados da escola. Verifique sua conexão.",
    );
  }
};

// Setup de Listeners para botões de ação
const setupActionListeners = (initialCode) => {
  let currentCode = initialCode;

  // Ação: Copiar Código
  const btnCopy = document.getElementById("btn-copy-code");
  btnCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      const tooltip = btnCopy.querySelector(".tooltip-text");
      const originalText = tooltip.textContent;
      tooltip.textContent = "Copiado!";
      setTimeout(() => {
        tooltip.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  });

  // Ação: Renovar Código
  const btnRenew = document.getElementById("btn-renew-code");
  btnRenew.addEventListener("click", async () => {
    if (
      confirm(
        "Ao renovar o código, o código antigo será invalidado imediatamente. Deseja continuar?",
      )
    ) {
      const originalHtml = btnRenew.innerHTML;
      btnRenew.innerHTML = `<span style="font-size: 0.6875rem;">...</span>`;
      try {
        const newCode = await Service.renewSchoolCodeService();
        currentCode = newCode;
        View.updateSchoolCode(newCode);
      } catch (err) {
        console.error("Erro ao renovar", err);
      } finally {
        btnRenew.innerHTML = originalHtml;
      }
    }
  });

  // Ação: Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Deseja realmente sair do sistema?")) {
      window.location.href = "/login"; // Redirecionamento mock
    }
  });
};

// Bootstrap
document.addEventListener("DOMContentLoaded", initDashboard);
