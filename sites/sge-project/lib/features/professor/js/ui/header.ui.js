/**
 * @module ui/header
 * @description Atualização do cabeçalho com nome, disciplina e iniciais do professor.
 */
import { el } from "../utils/helpers.js";
import { state } from "../store/notas.store.js";

/**
 * Preenche os elementos #user-name, #user-discipline e #user-initials
 * com os dados do professor atualmente autenticado.
 */
export function updateHeader() {
  const { nome, disciplina } = state.professor;
  const nameEl = el("user-name");
  const discEl = el("user-discipline");
  const initEl = el("user-initials");

  if (nameEl) nameEl.textContent = nome ?? "Professor";
  if (discEl) discEl.textContent = disciplina ?? "";
  if (initEl) {
    initEl.textContent =
      (nome ?? "P")
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .substring(0, 2)
        .toUpperCase() || "P";
  }
}
