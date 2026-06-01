/**
 * @module store/chamada
 * @description Estado global e constantes de paths do módulo de chamada escolar.
 *   Única fonte de verdade: professor, vínculos, alunos, statusAtual, turma/disciplina/data.
 *   Nenhum acesso direto ao Firebase — apenas dados em memória.
 */
"use strict";

// ── Paths do Firebase Realtime Database ───────────────────────────────────────

/** @type {Object.<string, (...args: string[]) => string>} */
export const PATH = {
  usuarios: (uid) => `usuarios/${uid}`,
  turmas: () => `turmas`,
  alunos: () => `alunos`,
  /** Chamada indexada por turma → data → disciplinaKey */
  chamada: (turmaId, data, discKey) => `chamadas/${turmaId}/${data}/${discKey}`,
  chamadaAlunos: (turmaId, data, discKey) =>
    `chamadas/${turmaId}/${data}/${discKey}/alunos`,
  /** Registro imutável de cada chamada para rastreabilidade */
  auditoriaChamadas: () => `auditoria/chamadas`,
  /** Contadores de frequência individuais com ServerValue.increment */
  freqAluno: (uid) => `estatisticas/frequencia/${uid}`,
  /** Inbox de notificações de cada responsável */
  notificacoes: (respUid) => `notificacoes/${respUid}`,
};

// ── Constantes de domínio ─────────────────────────────────────────────────────

/** Status válidos para presença */
export const STATUS = Object.freeze({ P: "P", F: "F", J: "J" });

/** Set para validação rápida O(1) */
export const VALID_STATUS = new Set(Object.values(STATUS));

/** Labels de exibição */
export const STATUS_LABEL = Object.freeze({
  P: "Presente",
  F: "Falta",
  J: "Justificada",
});

// ── Estado mutável global ─────────────────────────────────────────────────────

/**
 * Estado compartilhado entre services e UI.
 * Services escrevem; UI lê para renderizar.
 *
 * @type {{
 *   professor     : { uid: string|null, nome: string|null, disciplina: string|null },
 *   vinculos      : Array<{ turmaId: string, turmaNome: string, disciplinas: Array<{id:string,nome:string}> }>,
 *   alunos        : Array<{ uid: string, nome: string, matricula?: string }>,
 *   chamadaAtual  : Object.<string, "P"|"F"|"J">,
 *   turmaId       : string,
 *   turmaNome     : string,
 *   disciplinaId  : string,
 *   disciplinaNome: string,
 *   data          : string,
 *   observacoes   : string,
 *   chamadaExiste : boolean,
 *   isLoading     : boolean,
 * }}
 */
export const state = {
  professor: { uid: null, nome: null, disciplina: null },
  vinculos: [],
  alunos: [],
  chamadaAtual: {},
  turmaId: "",
  turmaNome: "",
  disciplinaId: "",
  disciplinaNome: "",
  data: "",
  observacoes: "",
  chamadaExiste: false,
  isLoading: false,
};

/** Reinicia apenas os campos de chamada em andamento, preservando professor e vínculos. */
export function resetChamada() {
  state.alunos = [];
  state.chamadaAtual = {};
  state.disciplinaId = "";
  state.disciplinaNome = "";
  state.data = "";
  state.observacoes = "";
  state.chamadaExiste = false;
  state.isLoading = false;
}

/** Reinicia completamente tudo menos professor. */
export function resetFull() {
  resetChamada();
  state.vinculos = [];
  state.turmaId = "";
  state.turmaNome = "";
}
