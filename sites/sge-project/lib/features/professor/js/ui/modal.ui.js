/**
 * @module ui/modal
 * @description Abertura, fechamento e acessibilidade de modais.
 *   Gerencia focus-trap e handler de ESC por modal.
 */

/**
 * Retorna todos os elementos focáveis dentro de um elemento.
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export function focusables(container) {
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((e) => !e.disabled && !e.closest("[hidden]"));
}

/**
 * Registra handler único de ESC para fechar o modal pelo id.
 * @param {string} id
 */
export function ensureEscHandler(id) {
  const onKey = (e) => {
    if (e.key === "Escape") {
      closeModal(id);
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
}

/**
 * Associa botões com data-close="<id>" ao fechamento do modal.
 * @param {string} id
 */
export function bindModalControls(id) {
  document
    .querySelectorAll(`[data-close="${id}"]`)
    .forEach((btn) => btn.addEventListener("click", () => closeModal(id)));
}

/**
 * Abre um modal pelo id e move o foco para o primeiro elemento focável.
 * @param {string} id
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("active");
  focusables(modal)[0]?.focus();
  ensureEscHandler(id);
}

/**
 * Fecha um modal pelo id.
 * @param {string} id
 */
export function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}
