/**
 * @module services/notificacao
 * @description Geração de notificações para responsáveis baseadas no status da chamada.
 *   Apenas F e J geram notificação; P não gera.
 *
 *   Operação: monta o batch de paths e retorna para quem chama (chamada.service.js)
 *   consolidar com as demais escritas em um único batchWrite.
 *   Isso garante atomicidade e minimiza chamadas à rede.
 */
"use strict";

import { state, PATH, STATUS } from "../store/chamada.store.js";
import { buildNotifTargets } from "./responsavel.service.js";
import { db } from "../../../../../assets/js/firebase/config.js";
import {
  ref,
  push,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ── Builders de payload ───────────────────────────────────────────────────────

/**
 * @param {string} alunoNome
 * @param {string} disciplina
 * @param {string} dataBR ex: "03/03/2026"
 * @returns {Object}
 */
function _buildFaltaPayload(alunoNome, disciplina, dataBR) {
  return {
    tipo: "falta",
    titulo: "Falta registrada",
    mensagem: `${alunoNome} faltou à aula de ${disciplina} no dia ${dataBR}.`,
    lida: false,
    alunoNome,
    disciplina,
    data: dataBR,
    timestamp: Date.now(),
  };
}

/**
 * @param {string} alunoNome
 * @param {string} disciplina
 * @param {string} dataBR
 * @returns {Object}
 */
function _buildJustificadaPayload(alunoNome, disciplina, dataBR) {
  return {
    tipo: "falta_justificada",
    titulo: "Falta Justificada",
    mensagem: `${alunoNome} possui falta justificada em ${disciplina} no dia ${dataBR}.`,
    lida: false,
    alunoNome,
    disciplina,
    data: dataBR,
    timestamp: Date.now(),
  };
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Monta o mapa de escritas { path: payload } para todas as notificações
 * necessárias baseadas na chamada atual.
 *
 * Apenas alunos com status F ou J geram notificação.
 * Gera uma chave push única por responsável × aluno para não sobrescrever notifs anteriores.
 *
 * @param {string} dataBR - Data formatada "DD/MM/YYYY" para inclusão na mensagem
 * @returns {Object.<string, Object>} Mapa de paths prontos para batchWrite
 */
export function buildNotificacoesWrites(dataBR) {
  const writes = {};

  // Filtra apenas alunos que terão notificação (F ou J)
  const alunosNotif = state.alunos.filter((a) => {
    const s = state.chamadaAtual[a.uid];
    return s === STATUS.F || s === STATUS.J;
  });

  if (!alunosNotif.length) return writes;

  const targets = buildNotifTargets(alunosNotif);
  const disciplina = state.disciplinaNome || "Aula";

  for (const { alunoNome, responsavelUid, alunoUid } of targets) {
    const status = state.chamadaAtual[alunoUid];
    if (!responsavelUid || !status) continue;

    // Gera chave push único localmente (sem escrever no banco)
    const newKey = push(ref(db, PATH.notificacoes(responsavelUid))).key;
    if (!newKey) continue;

    const payload =
      status === STATUS.F
        ? _buildFaltaPayload(alunoNome, disciplina, dataBR)
        : _buildJustificadaPayload(alunoNome, disciplina, dataBR);

    writes[`${PATH.notificacoes(responsavelUid)}/${newKey}`] = {
      ...payload,
      alunoId: alunoUid,
      turmaId: state.turmaId,
      turmaNome: state.turmaNome,
    };
  }

  return writes;
}
