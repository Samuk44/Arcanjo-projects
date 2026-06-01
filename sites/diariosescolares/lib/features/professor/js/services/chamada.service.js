/**
 * @module services/chamada
 * @description Toda a lógica de negócio do módulo de chamada escolar.
 *
 *   Responsabilidades:
 *   - Carregar vínculos turma→professor (estratégia multi-caminho)
 *   - Verificar chamada existente
 *   - Orquestrar o fluxo de salvamento (5 passos)
 *   - Construir o payload de escritas em lote (chamada + auditoria + estatísticas + notificações)
 *
 *   NÃO renderiza HTML — delega para chamada-table.ui.js e chamada-header.ui.js.
 */
"use strict";

import { db } from "../../../../../assets/js/firebase/config.js";
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
import { validarParaSalvar } from "../utils/validators.js";
import {
  toFirebaseKey,
  formatDateBR,
  calcStats,
} from "../utils/chamada.utils.js";

// ── Vínculos do professor ─────────────────────────────────────────────────────

/**
 * Carrega todas as turmas vinculadas ao professor logado e popula state.vinculos.
 *
 * Estratégia multi-caminho (tenta 4 formas diferentes de vínculo):
 *   1. turma.professorId === uid  (campo direto na turma)
 *   2. turma.professorUid === uid
 *   3. turma.professores[uid] existe  (objeto ou array com uid)
 *   4. Professor possui usuarios/{uid}/turmas com nome/id da turma (match por nome ou key)
 *
 * Disciplinas são lidas de:
 *   a. turma.disciplinas  (array ou objeto)
 *   b. turma.disciplina   (string)
 *   c. usuarios/{uid}/disciplinas  (array de ids ou nomes — fallback)
 *
 * @param {() => boolean} isMounted
 * @returns {Promise<void>}
 */
export async function loadVinculos(isMounted) {
  if (!isMounted()) return;

  const uid = state.professor.uid;

  // Carrega turmas e perfil do professor em paralelo
  const [turmasSnap, profSnap] = await Promise.all([
    get(ref(db, PATH.turmas())),
    get(ref(db, PATH.usuarios(uid))),
  ]);

  if (!isMounted()) return;

  state.vinculos = [];

  if (!turmasSnap.exists()) return;

  // Disciplinas do professor salvas no perfil (fallback quando turma não tem)
  const profData = profSnap.exists() ? profSnap.val() : {};
  const profDisciplinasRaw = profData.disciplinas ?? [];      // ex: ["mat","por"] ou ["Matemática"]
  const profTurmasRaw = profData.turmas ?? [];                 // ex: ["9º Ano A", "2º EM B"]

  // Normaliza disciplinas do perfil → [{ id, nome }]
  const profDisciplinas = _normalizeDisciplinas(profDisciplinasRaw);

  // Monta set de nomes/ids de turmas que o professor declarou ter
  const profTurmaNames = new Set(
    profTurmasRaw.map((t) => String(t).toLowerCase().trim())
  );

  turmasSnap.forEach((child) => {
    const turma = child.val();
    const turmaKey = child.key;

    // ── Testa vínculo ─────────────────────────────────────────────────────
    const vinculadoDireto =
      turma.professorId === uid ||
      turma.professorUid === uid ||
      (Array.isArray(turma.professores) && turma.professores.includes(uid)) ||
      (turma.professores &&
        typeof turma.professores === "object" &&
        turma.professores[uid]);

    // Match por nome da turma (cadastro do professor usa nome texto)
    const turmaNome = String(turma.nome ?? turmaKey).toLowerCase().trim();
    const vinculadoPorNome =
      profTurmaNames.size > 0 &&
      (profTurmaNames.has(turmaNome) || profTurmaNames.has(turmaKey.toLowerCase()));

    if (!vinculadoDireto && !vinculadoPorNome) return;

    // ── Normaliza disciplinas da turma ────────────────────────────────────
    let disciplinas = _normalizeDisciplinas(turma.disciplinas ?? turma.disciplina);

    // Fallback: usa as disciplinas do perfil do professor
    if (!disciplinas.length) {
      disciplinas = profDisciplinas;
    }

    state.vinculos.push({
      turmaId: turmaKey,
      turmaNome: turma.nome ?? turmaKey,
      disciplinas,
    });
  });

  // Se ainda não encontrou nenhuma turma, tenta carregar TODAS as turmas ativas
  // e exibe para o professor filtrar (modo permissivo para banco sem vínculos)
  if (state.vinculos.length === 0) {
    console.warn(
      "[chamada.service] Nenhuma turma vinculada ao professor via campos padrão. " +
      "Carregando todas as turmas ativas como fallback."
    );
    turmasSnap.forEach((child) => {
      const turma = child.val();
      if (turma.ativa === false) return; // só pula turmas explicitamente inativas

      let disciplinas = _normalizeDisciplinas(turma.disciplinas ?? turma.disciplina);
      if (!disciplinas.length) disciplinas = profDisciplinas;

      state.vinculos.push({
        turmaId: child.key,
        turmaNome: turma.nome ?? child.key,
        disciplinas,
      });
    });
  }
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
      const chamadaSalva = snap.val();
      if (chamadaSalva?.alunos) {
        for (const [uid, dados] of Object.entries(chamadaSalva.alunos)) {
          if (dados?.status) state.chamadaAtual[uid] = dados.status;
        }
      }
    } else {
      state.chamadaExiste = false;
    }
  } catch {
    state.chamadaExiste = false;
  }
}

// ── Marcação de status individual ─────────────────────────────────────────────

export function marcarStatus(alunoUid, status) {
  if (!alunoUid || !STATUS[status]) return;
  state.chamadaAtual[alunoUid] = status;
}

export function marcarTodos(status) {
  if (!STATUS[status]) return;
  for (const aluno of state.alunos) {
    state.chamadaAtual[aluno.uid] = status;
  }
}

// ── Salvamento ────────────────────────────────────────────────────────────────

export async function finalizarChamada() {
  const check = validarParaSalvar();
  if (!check.valid) return { ok: false, error: check.error };

  if (state.isLoading) return { ok: false, error: "Operação em andamento." };
  state.isLoading = true;

  try {
    const now = Date.now();
    const discKey = state.disciplinaId || toFirebaseKey(state.disciplinaNome);
    const dataBR = formatDateBR(state.data);
    const stats = calcStats(state.chamadaAtual, state.alunos.length);

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

    for (const aluno of state.alunos) {
      const status = state.chamadaAtual[aluno.uid];
      const base = PATH.freqAluno(aluno.uid);

      if (status === STATUS.P) writes[`${base}/presencas`] = increment(1);
      else if (status === STATUS.F) writes[`${base}/faltas`] = increment(1);
      else if (status === STATUS.J) writes[`${base}/justificadas`] = increment(1);

      writes[`${base}/totalAulas`] = increment(1);
    }

    const notifWrites = buildNotificacoesWrites(dataBR);
    Object.assign(writes, notifWrites);

    await batchWrite(writes);

    return { ok: true, error: null };
  } catch (err) {
    console.error("chamada.service finalizarChamada:", err?.code ?? err?.message);
    return { ok: false, error: "Erro ao salvar chamada. Verifique sua conexão." };
  } finally {
    state.isLoading = false;
  }
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Normaliza qualquer formato de disciplinas para [{ id, nome }].
 * Aceita: string, string[], objeto {key: nome}, array de objetos {id, nome}
 * @param {*} raw
 * @returns {Array<{id: string, nome: string}>}
 */
function _normalizeDisciplinas(raw) {
  if (!raw) return [];

  // String simples: "Matemática"
  if (typeof raw === "string") {
    return [{ id: toFirebaseKey(raw), nome: raw }];
  }

  // Array
  if (Array.isArray(raw)) {
    return raw.map((d) => {
      if (typeof d === "string") return { id: toFirebaseKey(d), nome: d };
      return {
        id: d.id ?? toFirebaseKey(d.nome ?? ""),
        nome: d.nome ?? d.id ?? "",
      };
    }).filter((d) => d.nome);
  }

  // Objeto { mat: "Matemática" } ou { mat: { nome: "Matemática" } }
  if (typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => ({
      id: k,
      nome: typeof v === "string" ? v : (v?.nome ?? k),
    })).filter((d) => d.nome);
  }

  return [];
}