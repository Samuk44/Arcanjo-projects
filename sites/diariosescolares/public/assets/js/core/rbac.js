/* SGE v2.0 • Role Based Access Control & Plan System */

export const PLANOS = {
  SIMPLES: "simples",
  COMPLETO: "completo",
};

// PLANO SIMPLES: Módulos que exigem conta completa
export const MODULOS_RESTRITOS = [
  "dashboard",
  "chamada",
  "bilhetes",
  "alunos",
  "notas",
  "horarios",
  "relatorios",
  "gestao-academica",
  "aprovar-cadastros",
  "usuarios",
  "comunicados",
];

/**
 * Verifica se o usuário tem acesso ao módulo baseado no seu plano
 * @param {string} userRole
 * @param {string} targetModule
 * @param {string} userPlan
 * @returns {boolean}
 */
export function checkAccess(userRole, targetModule, userPlan = PLANOS.SIMPLES) {
  // Admin sempre tem acesso total
  if (userRole === "admin") return true;

  // Se o plano for completo, libera tudo
  if (userPlan === PLANOS.COMPLETO) return true;

  // Se o plano for simples, verifica se o módulo é restrito
  if (userPlan === PLANOS.SIMPLES) {
    if (MODULOS_RESTRITOS.includes(targetModule)) {
      showUpgradeModal();
      return false;
    }
  }

  return true; // Permite acesso a módulos não restritos (ex: perfil, feed)
}

/**
 * Exibe o modal de upgrade dinamicamente
 */
export function showUpgradeModal() {
  let modal = document.getElementById("upgrade-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "upgrade-modal";
    modal.className = "modal";
    modal.innerHTML = `
            <div class="modal-content animate-slide">
                <div class="modal-header">
                    <h2 style="font-family: Syne; color: var(--primary);">Funcionalidade Premium</h2>
                    <button class="close-modal" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.5rem;">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                        Este módulo faz parte do <strong>Plano Completo</strong>. 
                        Mude para a conta completa para desbloquear este recurso e ter acesso a todas as funcionalidades do SGE v2.0.
                    </p>
                    <div style="background: rgba(240, 165, 0, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid var(--border);">
                        <ul style="list-style: none; font-size: 0.9rem; display: grid; gap: 0.5rem;">
                            <li>✅ Gestão de Notas e Frequência</li>
                            <li>✅ Relatórios Avançados</li>
                            <li>✅ Comunicação Direta com Pais</li>
                            <li>✅ Gestão Acadêmica Completa</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal">Voltar</button>
                    <button class="btn btn-primary" onclick="window.location.href='/upgrade/'">Fazer Upgrade</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    // Eventos de fechamento
    const close = () => modal.classList.remove("active");
    modal.querySelectorAll(".close-modal").forEach((b) => (b.onclick = close));
    modal.onclick = (e) => {
      if (e.target === modal) close();
    };
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  modal.classList.add("active");
}

/**
 * Wrapper para verificar acesso usando o objeto de dados do usuário
 * @param {string} moduleName
 * @param {Object} userData
 * @returns {boolean}
 */
export function canAccessModule(moduleName, userData) {
  if (!userData) return false;
  return checkAccess(userData.role, moduleName, userData.plano);
}
