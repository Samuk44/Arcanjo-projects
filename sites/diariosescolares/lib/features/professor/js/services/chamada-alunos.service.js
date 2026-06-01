/**
 * @module services/chamada-alunos
 * @description Carregamento e ordenação dos alunos de uma turma para o módulo de chamada.
 *
 *   Estratégia de carregamento (compatível com a estrutura real do Firebase):
 *   1. Lê turmas/{turmaId}/alunoId — objeto cujas chaves são os UIDs dos alunos
 *   2. Para cada UID, busca o perfil completo em alunos/{uid}
 *   3. Ordena por nome (pt-BR) e numera sequencialmente (nChamada)
 *
 *   Fallback: se alunoId não existir na turma, tenta a query legada
 *   orderByChild("turmaId") em alunos/ para manter compatibilidade.
 */
"use strict";

import { db } from "../../../../../assets/js/firebase/config.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH } from "../store/chamada.store.js";

/**
 * Busca todos os alunos vinculados à turmaId e popula state.alunos
 * (ordenado por nome, com nChamada sequencial).
 *
 * @param {string} turmaId
 * @param {() => boolean} isMounted - guard de lifecycle
 * @returns {Promise<void>}
 * @throws {Error} propagado para o chamador tratar
 */
export async function loadAlunosDaTurma(turmaId, isMounted) {
  if (!isMounted()) return;

  state.alunos = [];

  // ── Estratégia 1: lê alunoId da turma (estrutura atual do Firebase) ───────
  const turmaSnap = await get(ref(db, `turmas/${turmaId}`));
  if (!isMounted()) return;

  if (turmaSnap.exists()) {
    const turmaData = turmaSnap.val();
    const alunoIdObj = turmaData.alunoId; // objeto { uid1: true/uid1, uid2: true/uid2, ... }

    if (alunoIdObj && typeof alunoIdObj === "object") {
      // Extrai todos os UIDs das chaves do objeto alunoId
      const uids = Object.keys(alunoIdObj);

      if (uids.length > 0) {
        // Busca os perfis em paralelo (Promise.all para performance)
        const snapshots = await Promise.all(
          uids.map((uid) => get(ref(db, `alunos/${uid}`))),
        );

        if (!isMounted()) return;

        for (let i = 0; i < uids.length; i++) {
          const uid = uids[i];
          const snap = snapshots[i];

          if (snap.exists()) {
            const data = snap.val();
            state.alunos.push({
              ...data,
              uid, // garante que uid não seja sobrescrito
              nome: data.nome ?? uid,
              matricula: data.matricula ?? null,
            });
          } else {
            // Aluno listado na turma mas sem perfil em /alunos — inclui com dados mínimos
            state.alunos.push({
              uid,
              nome: `Aluno ${uid.slice(-4)}`,
              matricula: null,
            });
          }
        }

        // Ordena por nome e adiciona número de chamada
        _sortAndNumber(state.alunos);
        return;
      }
    }
  }

  // ── Estratégia 2 (fallback legado): query orderByChild("turmaId") ─────────
  const legacySnap = await get(
    query(ref(db, PATH.alunos()), orderByChild("turmaId"), equalTo(turmaId)),
  );

  if (!isMounted()) return;

  if (legacySnap.exists()) {
    legacySnap.forEach((child) => {
      const data = child.val();
      state.alunos.push({
        ...data,
        uid: child.key,
        nome: data.nome ?? child.key,
        matricula: data.matricula ?? null,
      });
    });
  }

  _sortAndNumber(state.alunos);
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Ordena o array por nome (pt-BR) e atribui nChamada sequencial (1-based).
 * @param {Array<{nome: string}>} alunos - mutado in-place
 */
function _sortAndNumber(alunos) {
  alunos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  alunos.forEach((aluno, idx) => {
    aluno.nChamada = idx + 1;
  });
}
