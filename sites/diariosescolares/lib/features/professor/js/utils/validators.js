/**
 * @module utils/chamada-validators
 * @description Todas as validações do módulo de chamada escolar.
 *   Retorna { valid: boolean, error: string|null } para uso uniforme.
 *   Sem efeitos colaterais — apenas lógica pura.
 */
"use strict";

import { state, VALID_STATUS } from "../store/chamada.store.js";

// ── Validações de autenticação / autorização ──────────────────────────────────

/**
 * Verifica se o professor está autenticado.
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarProfessorAutenticado() {
  if (!state.professor.uid)
    return { valid: false, error: "Professor não autenticado." };
  return { valid: true, error: null };
}

/**
 * Verifica se o professor tem role válido (chamado após snap do banco).
 * @param {string|null} role
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarRoleProfessor(role) {
  if (role !== "professor")
    return { valid: false, error: "Acesso não autorizado." };
  return { valid: true, error: null };
}

/**
 * Verifica se o turmaId selecionado pertence ao professor.
 * @param {string} turmaId
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarTurmaAutorizada(turmaId) {
  if (!turmaId) return { valid: false, error: "Selecione uma turma." };
  const temVinculo = state.vinculos.some((v) => v.turmaId === turmaId);
  if (!temVinculo)
    return { valid: false, error: "Turma não autorizada para este professor." };
  return { valid: true, error: null };
}

// ── Validações de campos ──────────────────────────────────────────────────────

/**
 * Valida se disciplina foi selecionada.
 * @param {string} disciplinaNome
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarDisciplina(disciplinaNome) {
  if (!disciplinaNome?.trim())
    return { valid: false, error: "Selecione a disciplina." };
  return { valid: true, error: null };
}

/**
 * Valida se a data é uma string YYYY-MM-DD válida e não futura.
 * @param {string} data
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarData(data) {
  if (!data) return { valid: false, error: "Selecione a data da chamada." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data))
    return { valid: false, error: "Data inválida." };

  const [y, m, d] = data.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return { valid: false, error: "Data inválida." };

  // Não permite data com mais de 7 dias no futuro
  const maxFuturo = new Date();
  maxFuturo.setDate(maxFuturo.getDate() + 7);
  if (date > maxFuturo)
    return { valid: false, error: "Data não pode ser tão futura." };

  return { valid: true, error: null };
}

/**
 * Valida se um status é P, F ou J.
 * @param {string} status
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarStatus(status) {
  if (!VALID_STATUS.has(status))
    return { valid: false, error: `Status inválido: "${status}".` };
  return { valid: true, error: null };
}

// ── Validação da chamada completa ─────────────────────────────────────────────

/**
 * Verifica se todos os alunos possuem status registrado.
 * @returns {{ valid: boolean, error: string|null, pendentes: number }}
 */
export function validarChamadaCompleta() {
  const total = state.alunos.length;
  const registrados = Object.keys(state.chamadaAtual).length;

  if (total === 0) {
    return { valid: false, error: "Nenhum aluno carregado.", pendentes: 0 };
  }
  if (registrados < total) {
    const pendentes = total - registrados;
    return {
      valid: false,
      error: `${pendentes} aluno(s) sem status registrado. Marque todos antes de finalizar.`,
      pendentes,
    };
  }

  // Dupla verificação: garante que todos os UIDs do state.alunos estão presentes
  const semStatus = state.alunos.filter((a) => !state.chamadaAtual[a.uid]);
  if (semStatus.length > 0) {
    return {
      valid: false,
      error: `${semStatus.length} aluno(s) sem status: ${semStatus.map((a) => a.nome).join(", ")}.`,
      pendentes: semStatus.length,
    };
  }

  // Valida cada status individualmente
  for (const [uid, status] of Object.entries(state.chamadaAtual)) {
    const check = validarStatus(status);
    if (!check.valid) {
      const aluno = state.alunos.find((a) => a.uid === uid);
      return {
        valid: false,
        error: `Status inválido para ${aluno?.nome ?? uid}: "${status}".`,
        pendentes: 0,
      };
    }
  }

  return { valid: true, error: null, pendentes: 0 };
}

/**
 * Valida todos os campos necessários antes de salvar.
 * Retorna o primeiro erro encontrado.
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validarParaSalvar() {
  const checks = [
    validarProfessorAutenticado(),
    validarTurmaAutorizada(state.turmaId),
    validarDisciplina(state.disciplinaNome),
    validarData(state.data),
    validarChamadaCompleta(),
  ];

  for (const check of checks) {
    if (!check.valid) return { valid: false, error: check.error };
  }

  return { valid: true, error: null };
}
