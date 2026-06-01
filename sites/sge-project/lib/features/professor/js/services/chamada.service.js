/**
 * @module services/chamada
 * @description Toda a lógica de negócio do módulo de chamada escolar.
 *
 *   Responsabilidades:
 *   - Carregar vínculos turma→professor
 *   - Verificar chamada existente
 *   - Orquestrar o fluxo de salvamento (5 passos)
 *   - Construir o payload de escritas em lote (chamada + auditoria + estatísticas + notificações)
 *
 *   NÃO renderiza HTML — delega para chamada-table.ui.js e chamada-header.ui.js.
 */
"use strict";

import { db } from "../../../assets/js/firebase/config.js";
import {
  ref,
  get,
  push,
  increment,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH, STATUS, resetChamada } from "../store/chamada.store.js";
import { batchWrite } from "../firebase/batch.js";
import { loadAlunosDaTurma } from "./chamada-alunos.service.js";
import { buildNotificacoesWrites } from "./notificacao.service.js";
import { validarParaSalvar } from "../utils/chamada-validators.js";
import {
  toFirebaseKey,
  formatDateBR,
  calcStats,
} from "../utils/chamada-utils.js";

// ── Vínculos do professor ─────────────────────────────────────────────────────

/**
 * Carrega todas as turmas nas quais professorId está vinculado e popula state.vinculos.
 * Suporta turma com campo `disciplinas` (array) ou `disciplina` (string).
 *
 * @param {() => boolean} isMounted
 * @returns {Promise<void>}
 * @throws {Error} propagado para o bootstrap tratar
 */
export async function loadVinculos(isMounted) {
  if (!isMounted()) return;

  const snap = await get(ref(db, PATH.turmas()));
  if (!isMounted()) return;

  state.vinculos = [];

  if (!snap.exists()) return;

  snap.forEach((child) => {
    const turma = child.val();
    const uid = state.professor.uid;

    // Verifica qualquer campo que possa indicar vínculo
    const vinculado =
      turma.professorId === uid ||
      turma.professorUid === uid ||
      (Array.isArray(turma.professores) && turma.professores.includes(uid)) ||
      (turma.professores &&
        typeof turma.professores === "object" &&
        turma.professores[uid]);

    if (!vinculado) return;

    // Normaliza disciplinas para array uniforme [{ id, nome }]
    let disciplinas = [];
    if (Array.isArray(turma.disciplinas)) {
      disciplinas = turma.disciplinas.map((d) =>
        typeof d === "string"
          ? { id: toFirebaseKey(d), nome: d }
          : {
              id: d.id ?? toFirebaseKey(d.nome ?? ""),
              nome: d.nome ?? d.id ?? "",
            },
      );
    } else if (turma.disciplinas && typeof turma.disciplinas === "object") {
      disciplinas = Object.entries(turma.disciplinas).map(([k, v]) => ({
        id: k,
        nome: typeof v === "string" ? v : (v.nome ?? k),
      }));
    } else if (turma.disciplina) {
      disciplinas = [
        { id: toFirebaseKey(turma.disciplina), nome: turma.disciplina },
      ];
    } else if (state.professor.disciplina) {
      disciplinas = [
        {
          id: toFirebaseKey(state.professor.disciplina),
          nome: state.professor.disciplina,
        },
      ];
    }

    state.vinculos.push({
      turmaId: child.key,
      turmaNome: turma.nome ?? child.key,
      disciplinas,
    });
  });
}

// ── Seleção de turma / disciplina ─────────────────────────────────────────────

/**
 * Reage à seleção de turma: atualiza state, reseta chamada, carrega alunos.
 * @param {string} turmaId
 * @param {() => boolean} isMounted
 */
export async function selecionarTurma(turmaId, isMounted) {
  resetChamada();
  state.turmaId = turmaId;

  const vinculo = state.vinculos.find((v) => v.turmaId === turmaId);
  state.turmaNome = vinculo?.turmaNome ?? turmaId;

  if (!turmaId) return;
  await loadAlunosDaTurma(turmaId, isMounted);
}

/**
 * Atualiza state com a disciplina selecionada.
 * @param {string} disciplinaId
 * @param {string} disciplinaNome
 */
export function selecionarDisciplina(disciplinaId, disciplinaNome) {
  state.disciplinaId = disciplinaId;
  state.disciplinaNome = disciplinaNome;
  state.chamadaExiste = false;
}

/**
 * Atualiza state com a data e verifica se já existe chamada.
 * @param {string} data YYYY-MM-DD
 * @param {() => boolean} isMounted
 */
export async function selecionarData(data, isMounted) {
  state.data = data;
  state.chamadaExiste = false;

  if (state.turmaId && state.disciplinaId && data) {
    await checkChamadaExistente(isMounted);
  }
}

// ── Verificação de chamada existente ──────────────────────────────────────────

/**
 * Verifica se já existe chamada para turmaId/data/disciplinaId e atualiza state.chamadaExiste.
 * Se existir, pré-popula state.chamadaAtual com os status já salvos.
 * @param {() => boolean} isMounted
 */
export async function checkChamadaExistente(isMounted) {
  if (!state.turmaId || !state.data || !state.disciplinaId) return;
  if (!isMounted()) return;

  try {
    const path = PATH.chamada(state.turmaId, state.data, state.disciplinaId);
    const snap = await get(ref(db, path));

    if (!isMounted()) return;

    if (snap.exists()) {
      state.chamadaExiste = true;
      // Pré-popula statuses existentes para permitir edição
      const chamadaSalva = snap.val();
      if (chamadaSalva?.alunos) {
        const alunosSalvos = chamadaSalva.alunos;
        for (const [uid, dados] of Object.entries(alunosSalvos)) {
          if (dados?.status) state.chamadaAtual[uid] = dados.status;
        }
      }
    } else {
      state.chamadaExiste = false;
    }
  } catch {
    // Falha silenciosa — não impede uso da chamada
    state.chamadaExiste = false;
  }
}

// ── Marcação de status individual ─────────────────────────────────────────────

/**
 * Marca o status de um aluno (rádio exclusivo: apenas um status por vez).
 * @param {string} alunoUid
 * @param {"P"|"F"|"J"} status
 */
export function marcarStatus(alunoUid, status) {
  if (!alunoUid || !STATUS[status]) return;
  state.chamadaAtual[alunoUid] = status;
}

/**
 * Marca todos os alunos com o status informado.
 * @param {"P"|"F"|"J"} status
 */
export function marcarTodos(status) {
  if (!STATUS[status]) return;
  for (const aluno of state.alunos) {
    state.chamadaAtual[aluno.uid] = status;
  }
}

// ── Salvamento — 5 passos ─────────────────────────────────────────────────────

/**
 * Salva a chamada completa no Firebase usando uma única operação batchWrite.
 * Passos:
 *   1. Valida todos os campos e statuses
 *   2. Salva a chamada em chamadas/{turmaId}/{data}/{discKey}
 *   3. Cria registro de auditoria em auditoria/chamadas/{pushKey}
 *   4. Atualiza estatísticas de frequência por aluno (ServerValue.increment)
 *   5. Gera notificações para responsáveis (F e J apenas)
 *
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export async function finalizarChamada() {
  // ── PASSO 1: Validação ─────────────────────────────────────────────────────
  const check = validarParaSalvar();
  if (!check.valid) return { ok: false, error: check.error };

  if (state.isLoading) return { ok: false, error: "Operação em andamento." };
  state.isLoading = true;

  try {
    const now = Date.now();
    const discKey = state.disciplinaId || toFirebaseKey(state.disciplinaNome);
    const dataBR = formatDateBR(state.data);
    const stats = calcStats(state.chamadaAtual, state.alunos.length);

    // ── PASSO 2: Payload da chamada ────────────────────────────────────────
    const alunosPayload = {};
    for (const aluno of state.alunos) {
      alunosPayload[aluno.uid] = {
        status: state.chamadaAtual[aluno.uid],
        nome: aluno.nome,
      };
    }

    const chamadaPath = PATH.chamada(state.turmaId, state.data, discKey);
    const writes = {
      [`${chamadaPath}/professorId`]: state.professor.uid,
      [`${chamadaPath}/professorNome`]: state.professor.nome ?? "",
      [`${chamadaPath}/disciplinaId`]: discKey,
      [`${chamadaPath}/disciplina`]: state.disciplinaNome,
      [`${chamadaPath}/turmaId`]: state.turmaId,
      [`${chamadaPath}/turmaNome`]: state.turmaNome,
      [`${chamadaPath}/data`]: state.data,
      [`${chamadaPath}/observacoes`]: state.observacoes.trim(),
      [`${chamadaPath}/presencas`]: stats.presentes,
      [`${chamadaPath}/faltas`]: stats.faltas,
      [`${chamadaPath}/justificadas`]: stats.justificadas,
      [`${chamadaPath}/totalAlunos`]: state.alunos.length,
      [`${chamadaPath}/timestamp`]: now,
      [`${chamadaPath}/alunos`]: alunosPayload,
    };

    // ── PASSO 3: Auditoria ─────────────────────────────────────────────────
    const auditKey = push(ref(db, PATH.auditoriaChamadas())).key;
    if (auditKey) {
      writes[`${PATH.auditoriaChamadas()}/${auditKey}`] = {
        professorId: state.professor.uid,
        professorNome: state.professor.nome ?? "",
        turmaId: state.turmaId,
        turmaNome: state.turmaNome,
        disciplinaId: discKey,
        disciplina: state.disciplinaNome,
        data: state.data,
        presencas: stats.presentes,
        faltas: stats.faltas,
        justificadas: stats.justificadas,
        totalAlunos: state.alunos.length,
        timestamp: now,
        editou: state.chamadaExiste,
      };
    }

    // ── PASSO 4: Estatísticas de frequência (ServerValue.increment) ────────
    for (const aluno of state.alunos) {
      const status = state.chamadaAtual[aluno.uid];
      const base = PATH.freqAluno(aluno.uid);

      if (status === STATUS.P) writes[`${base}/presencas`] = increment(1);
      else if (status === STATUS.F) writes[`${base}/faltas`] = increment(1);
      else if (status === STATUS.J)
        writes[`${base}/justificadas`] = increment(1);

      // Sempre incrementa o total de aulas
      writes[`${base}/totalAulas`] = increment(1);
    }

    // ── PASSO 5: Notificações para responsáveis ────────────────────────────
    const notifWrites = buildNotificacoesWrites(dataBR);
    Object.assign(writes, notifWrites);

    // Persiste tudo em uma única chamada à API Firebase
    await batchWrite(writes);

    return { ok: true, error: null };
  } catch (err) {
    console.error(
      "chamada.service finalizarChamada:",
      err?.code ?? err?.message,
    );
    return {
      ok: false,
      error: "Erro ao salvar chamada. Verifique sua conexão.",
    };
  } finally {
    state.isLoading = false;
  }
}
