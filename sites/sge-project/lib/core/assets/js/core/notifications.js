"use strict";
/**
 * @file notifications.js
 * @description Fan-out de notificações para responsáveis. Importar onde necessário.
 */

import { db } from "../../assets/js/firebase/config.js";
import {
  ref,
  get,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/**
 * @typedef {Object} NotificationTemplate
 * @property {string} titulo
 * @property {string} conteudo
 * @property {"frequencia"|"notas"|"bilhete"|"comunicado"} tipo
 * @property {"alta"|"media"|"baixa"} prioridade
 * @property {string} linkAcao
 */

const LINK_MAP = {
  frequencia: "/pai/frequencia.html",
  notas: "/pai/notas.html",
  bilhete: "/pai/comunicados.html",
  comunicado: "/pai/comunicados.html",
};

const MAX_RETRIES = 2;

/**
 * Dispara notificação em fan-out atômico para lista de destinatários.
 * @param {string[]} destinatarios - UIDs dos responsáveis
 * @param {NotificationTemplate} template
 * @param {number} [retryCount=0]
 */
export async function triggerNotification(
  destinatarios,
  template,
  retryCount = 0,
) {
  if (!destinatarios?.length) return;

  const avisoId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    titulo: template.titulo,
    conteudo: template.conteudo,
    tipo: template.tipo,
    prioridade: template.prioridade ?? "media",
    linkAcao: template.linkAcao ?? LINK_MAP[template.tipo] ?? "/",
    criadoEm: Date.now(),
    lido: false,
  };

  try {
    const updates = {};
    for (const uid of destinatarios) {
      if (!uid) continue;
      updates[`entregas/${uid}/${avisoId}`] = payload;
    }

    // writeBatch atômico via multi-location update
    await writeBatch(db, updates);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
      return triggerNotification(destinatarios, template, retryCount + 1);
    }
    // Fallback silencioso - não quebra fluxo
    console.error("triggerNotification falhou:", err?.code ?? err?.message);
  }
}

/**
 * Busca UIDs dos responsáveis vinculados a uma lista de alunoIds.
 * Retorna array vazio silenciosamente se responsável não tiver UID mapeado.
 * @param {string[]} alunoIds
 * @returns {Promise<string[]>}
 */
export async function getResponsaveisUids(alunoIds) {
  const uids = [];
  await Promise.all(
    alunoIds.map(async (alunoId) => {
      try {
        const snap = await get(ref(db, `alunos/${alunoId}/responsavelUid`));
        if (snap.exists() && snap.val()) uids.push(snap.val());
      } catch {
        /* fallback silencioso */
      }
    }),
  );
  return [...new Set(uids)];
}

/**
 * Dispara notificação de falta para responsáveis do aluno.
 * @param {{ alunoId: string, alunoNome: string, turmaId: string, turmaNome: string, data: string }} params
 */
export async function notificarFalta({
  alunoId,
  alunoNome,
  turmaId,
  turmaNome,
  data,
}) {
  const responsaveis = await getResponsaveisUids([alunoId]);
  if (!responsaveis.length) return;
  await triggerNotification(responsaveis, {
    titulo: `Falta registrada - ${alunoNome}`,
    conteudo: `${alunoNome} foi marcado(a) como ausente na turma ${turmaNome} em ${data}.`,
    tipo: "frequencia",
    prioridade: "alta",
    linkAcao: "/pai/frequencia.html",
  });
}

/**
 * Dispara notificação de notas publicadas para responsáveis da turma.
 * @param {{ turmaId: string, turmaNome: string, bimestre: string, alunoIds: string[] }} params
 */
export async function notificarNotasPublicadas({
  turmaId,
  turmaNome,
  bimestre,
  alunoIds,
}) {
  const responsaveis = await getResponsaveisUids(alunoIds);
  if (!responsaveis.length) return;
  await triggerNotification(responsaveis, {
    titulo: `Notas do ${bimestre}º bimestre publicadas`,
    conteudo: `As notas de ${turmaNome} do ${bimestre}º bimestre foram lançadas. Acesse para conferir.`,
    tipo: "notas",
    prioridade: "media",
    linkAcao: "/pai/notas.html",
  });
}

/**
 * Dispara notificação de bilhete/comunicado.
 * @param {{ destinatarios: string[], titulo: string, conteudo: string }} params
 */
export async function notificarBilhete({ destinatarios, titulo, conteudo }) {
  await triggerNotification(destinatarios, {
    titulo,
    conteudo,
    tipo: "bilhete",
    prioridade: "media",
    linkAcao: "/pai/comunicados.html",
  });
}
