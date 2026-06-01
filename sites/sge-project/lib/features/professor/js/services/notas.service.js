/**
 * @module services/notas
 * @description Regras de negócio de notas: cálculo de média/status,
 *   carregamento de configurações, leitura de notas existentes e
 *   salvamento individual ou em lote com auditoria.
 */
import { db } from "../../../../assets/js/firebase/config.js";
import {
  ref, get, set, update, push, query, orderByChild, equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH, CACHE_KEY_CONFIG } from "../store/notas.store.js";
import {
  showToast, sessionCache, handleFirebaseError, setBtnLoading, validateRange,
} from "../../../../assets/js/utils.js";
import { el } from "../utils/helpers.js";
import { batchWrite } from "../firebase/batch.js";

/**
 * Dispara notificações de notas publicadas de forma segura.
 * Import dinâmico evita que a ausência/mudança do módulo de notificações
 * quebre o carregamento da página inteira.
 * @param {object} params
 */
async function _tryNotificar(params) {
  try {
    const mod = await import("../../../../assets/js/notifications.js");
    await mod.notificarNotasPublicadas?.(params);
  } catch { /* notificações são não-críticas */ }
}

// ── Cálculo ───────────────────────────────────────────────────────────────────

/**
 * Calcula a média conforme a fórmula configurada em /configuracoes/avaliacoes.
 * @param {number} n1 @param {number} n2 @param {number} n3
 * @returns {number}
 */
export function calcularMedia(n1, n2, n3) {
  const f = state.config.formulaMedia ?? "media_simples";
  if (f === "media_ponderada_n3") return (n1 * 2 + n2 * 3 + n3 * 5) / 10;
  if (f === "maior_duas") {
    const [a, b] = [n1, n2, n3].sort((x, y) => y - x);
    return (a + b) / 2;
  }
  return (n1 + n2 + n3) / 3; // media_simples (padrão)
}

/**
 * Define status automático com base nas notas mínimas configuradas.
 * @param {number} media
 * @returns {"Aprovado"|"Recuperação"|"Reprovado"}
 */
export function calcularStatus(media) {
  const { notaMinimaAprovacao: aprov = 6, notaMinimaRecuperacao: recup = 4 } = state.config;
  if (media >= aprov) return "Aprovado";
  if (media >= recup) return "Recuperação";
  return "Reprovado";
}

// ── Configuração ──────────────────────────────────────────────────────────────

/**
 * Carrega /configuracoes/avaliacoes com cache sessionStorage de 30 min.
 */
export async function loadConfig() {
  const cached = sessionCache.get(CACHE_KEY_CONFIG);
  if (cached) { state.config = { ...state.config, ...cached }; return; }
  try {
    const snap = await get(ref(db, PATH.config()));
    if (snap.exists()) {
      const d = snap.val();
      state.config = {
        formulaMedia          : d.formulaMedia          ?? "media_simples",
        notaMinimaAprovacao   : d.notaMinimaAprovacao   ?? 6,
        notaMinimaRecuperacao : d.notaMinimaRecuperacao ?? 4,
      };
      sessionCache.set(CACHE_KEY_CONFIG, state.config, 30);
    }
  } catch { /* usa defaults */ }
}

// ── Leitura ───────────────────────────────────────────────────────────────────

/**
 * Carrega notas existentes de turmaId+bimestre e popula state.notas.
 * @param {string} turmaId
 * @param {() => boolean} isMounted
 */
export async function loadNotasExistentes(turmaId, isMounted) {
  if (!isMounted()) return;
  try {
    const snap = await get(
      query(ref(db, PATH.notas()), orderByChild("turmaId"), equalTo(turmaId))
    );
    state.notas = {};
    if (snap.exists()) {
      snap.forEach((child) => {
        const n = child.val();
        if (n.bimestre !== state.bimestre) return;
        state.notas[n.alunoId] = {
          n1       : n.n1        ?? "",
          n2       : n.n2        ?? "",
          n3       : n.n3        ?? "",
          media    : n.media     ?? null,
          status   : n.status    ?? "",
          notaKey  : child.key,
          timestamp: n.timestamp ?? null,
        };
      });
    }
  } catch (err) {
    handleFirebaseError(err, "Erro ao carregar notas.");
  }
}

// ── Persistência ──────────────────────────────────────────────────────────────

function _buildPayload(alunoId, entry) {
  return {
    professorId: state.professor.uid,
    turmaId    : state.turmaId,
    bimestre   : state.bimestre,
    alunoId,
    n1         : entry.n1,
    n2         : entry.n2,
    n3         : entry.n3,
    media      : entry.media,
    status     : entry.status,
    timestamp  : Date.now(),
  };
}

function _buildKey(alunoId) {
  return `${alunoId}_${state.turmaId}_${state.bimestre}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function _registrarAuditoria(alunoId, before, after) {
  try {
    await push(ref(db, PATH.auditoria()), {
      professorId  : state.professor.uid,
      professorNome: state.professor.nome,
      alunoId,
      turmaId      : state.turmaId,
      bimestre     : state.bimestre,
      antes        : before,
      depois       : after,
      timestamp    : Date.now(),
    });
  } catch { /* não quebra fluxo */ }
}

/**
 * Salva nota de um único aluno (criação ou edição na janela de 48h).
 * @param {string} alunoId
 */
export async function salvarNotaUnica(alunoId) {
  const entry = state.notas[alunoId];
  if (!entry) return;

  const { valid: v1, error: e1 } = validateRange(entry.n1);
  const { valid: v2, error: e2 } = validateRange(entry.n2);
  const { valid: v3, error: e3 } = validateRange(entry.n3);
  if (!v1 || !v2 || !v3) {
    showToast(`Nota inválida: ${[e1, e2, e3].find(Boolean)}`, "error");
    return;
  }
  try {
    const payload = _buildPayload(alunoId, entry);
    if (entry.notaKey) {
      await update(ref(db, PATH.nota(entry.notaKey)), payload);
      await _registrarAuditoria(alunoId, { n1: entry.n1, n2: entry.n2, n3: entry.n3, media: entry.media }, payload);
    } else {
      const key = _buildKey(alunoId);
      await set(ref(db, PATH.nota(key)), payload);
      state.notas[alunoId].notaKey   = key;
      state.notas[alunoId].timestamp = payload.timestamp;
    }
    showToast("Nota salva!", "success");
  } catch (err) {
    handleFirebaseError(err, "Erro ao salvar nota.");
  }
}

/**
 * Salvamento em lote de todas as notas válidas da turma.
 * Usa batchWrite para minimizar o número de escritas no Firebase.
 */
export async function salvarTodos() {
  if (state.isLoading) return;
  const btnSalvar = el("btn-salvar-notas");
  state.isLoading = true;
  setBtnLoading(btnSalvar, true, "Salvar Todas as Notas");

  try {
    const batchUpdates  = {}; // path → payload (notas já existentes)
    const batchNew      = {}; // path → payload (notas novas)
    const auditoriaJobs = []; // { alunoId, before, payload }
    const alunosSalvos  = [];

    for (const [alunoId, entry] of Object.entries(state.notas)) {
      if (entry.n1 === "" || entry.n2 === "" || entry.n3 === "") continue;
      if (!validateRange(entry.n1).valid) continue;
      if (!validateRange(entry.n2).valid) continue;
      if (!validateRange(entry.n3).valid) continue;

      const payload = _buildPayload(alunoId, entry);

      if (entry.notaKey) {
        batchUpdates[PATH.nota(entry.notaKey)] = payload;
        auditoriaJobs.push({ alunoId, before: { n1: entry.n1, n2: entry.n2, n3: entry.n3, media: entry.media }, payload });
      } else {
        const key = _buildKey(alunoId);
        batchNew[PATH.nota(key)] = payload;
        entry.notaKey   = key;
        entry.timestamp = payload.timestamp;
      }
      alunosSalvos.push(alunoId);
    }

    // Uma única escritas em lote para novas + uma para edições
    if (Object.keys(batchNew).length)     await batchWrite(batchNew);
    if (Object.keys(batchUpdates).length) await batchWrite(batchUpdates);

    // Auditoria após a escrita principal (não bloqueia se falhar)
    auditoriaJobs.forEach(({ alunoId, before, payload }) =>
      _registrarAuditoria(alunoId, before, payload)
    );

    if (alunosSalvos.length) {
      showToast(`${alunosSalvos.length} notas salvas com sucesso!`, "success");
      _tryNotificar({
        turmaId   : state.turmaId,
        turmaNome : state.turmas.find((t) => t.id === state.turmaId)?.nome ?? state.turmaId,
        bimestre  : state.bimestre,
        alunoIds  : alunosSalvos,
      });
    } else {
      showToast("Nenhuma nota válida para salvar.", "warning");
    }
  } catch (err) {
    handleFirebaseError(err, "Erro ao salvar notas.");
  } finally {
    state.isLoading = false;
    setBtnLoading(btnSalvar, false, "Salvar Todas as Notas");
  }
}
