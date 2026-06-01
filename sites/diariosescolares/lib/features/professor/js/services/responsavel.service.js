/**
 * @module services/responsavel
 * @description Busca e normalização dos responsáveis de um aluno.
 *   Suporta todas as variações de campo usadas no banco:
 *   responsavelId, responsavelIds, responsavelUid, responsavelUids,
 *   responsaveis (object ou array), paiId, maeId.
 *
 *   NÃO acessa o Firebase diretamente — opera sobre o objeto aluno já carregado.
 *   Desta forma evita n+1 queries na camada de notificações.
 */
"use strict";

import { normalizeToArray } from "../../../professor/js/utils/chamada.utils.js";

// ── Extração de IDs dos responsáveis ─────────────────────────────────────────

/**
 * Extrai todos os UIDs de responsáveis de um objeto aluno,
 * suportando qualquer combinação de campos.
 *
 * @param {Object} aluno - Objeto aluno tal como salvo no Firebase
 * @returns {string[]} Array de UIDs únicos, sem valores falsy
 */
export function extractResponsavelIds(aluno) {
  const ids = new Set();

  const add = (val) => normalizeToArray(val).forEach((v) => v && ids.add(v));

  // Campos mais comuns primeiro
  add(aluno.responsavelId);
  add(aluno.responsavelIds);
  add(aluno.responsavelUid);
  add(aluno.responsavelUids);
  add(aluno.responsaveis);
  add(aluno.paiId);
  add(aluno.maeId);

  return [...ids];
}

/**
 * Coleta todos os pares { alunoUid, responsavelUid } para um conjunto de alunos.
 * Usado para montar o batch de notificações de uma só vez.
 *
 * @param {Array<Object>} alunos - Lista de objetos aluno (com uid + campos de responsável)
 * @returns {Array<{ alunoUid: string, alunoNome: string, responsavelUid: string }>}
 */
export function buildNotifTargets(alunos) {
  const targets = [];

  for (const aluno of alunos) {
    const respIds = extractResponsavelIds(aluno);
    for (const responsavelUid of respIds) {
      targets.push({
        alunoUid: aluno.uid,
        alunoNome: aluno.nome ?? aluno.uid,
        responsavelUid,
      });
    }
  }

  return targets;
}
