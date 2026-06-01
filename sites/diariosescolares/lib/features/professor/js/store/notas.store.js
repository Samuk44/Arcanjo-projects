/**
 * @module notas.store
 * @description Estado global e constantes de paths do módulo de notas.
 *   Única fonte de verdade para turmaId, bimestre, alunos e notas em memória.
 */

/** Caminhos do Firebase Realtime Database */
export const PATH = {
  usuarios : (uid) => `usuarios/${uid}`,
  turmas   : ()    => `turmas`,
  alunos   : ()    => `alunos`,
  notas    : ()    => `notas`,
  nota     : (key) => `notas/${key}`,
  config   : ()    => `configuracoes/avaliacoes`,
  auditoria: ()    => `auditoria/alteracoesImportantes`,
};

export const CACHE_KEY_CONFIG  = "sge_config_avaliacoes";
export const JANELA_EDICAO_MS  = 48 * 60 * 60 * 1000; // 48 h

/**
 * Estado mutável compartilhado entre serviços e UI.
 * @type {{
 *   professor: { uid: string|null, nome: string|null, disciplina: string|null },
 *   turmas: Array,
 *   alunos: Array,
 *   notas: Object,
 *   turmaId: string,
 *   bimestre: string,
 *   config: { formulaMedia: string, notaMinimaAprovacao: number, notaMinimaRecuperacao: number },
 *   isLoading: boolean,
 *   modoEdicao: boolean,
 * }}
 */
export const state = {
  professor  : { uid: null, nome: null, disciplina: null },
  turmas     : [],
  alunos     : [],
  notas      : {},
  turmaId    : "",
  bimestre   : "",
  config     : {
    formulaMedia          : "media_simples",
    notaMinimaAprovacao   : 6,
    notaMinimaRecuperacao : 4,
  },
  isLoading  : false,
  modoEdicao : false,
};
