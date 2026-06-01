/**
 * @module services/chamada-alunos
 * @description Carregamento e ordenação dos alunos de uma turma para o módulo de chamada.
 *   Isolado do módulo de notas para não haver dependências cruzadas.
 *   Resultado gravado em state.alunos (array ordenado por nome).
 */
"use strict";

import { db } from "../../../assets/js/firebase/config.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH } from "../store/chamada.store.js";

/**
 * Busca todos os alunos vinculados à turmaId e popula state.alunos (ordenado por nome).
 * Também mantém os dados completos do aluno no objeto para uso pela notificação.
 *
 * @param {string} turmaId
 * @param {() => boolean} isMounted - guard de lifecycle
 * @returns {Promise<void>}
 * @throws {Error} propagado para o chamador tratar
 */
export async function loadAlunosDaTurma(turmaId, isMounted) {
  if (!isMounted()) return;

  const snap = await get(
    query(ref(db, PATH.alunos()), orderByChild("turmaId"), equalTo(turmaId)),
  );

  if (!isMounted()) return;

  state.alunos = [];

  if (snap.exists()) {
    snap.forEach((child) => {
      const data = child.val();
      state.alunos.push({
        uid: child.key,
        nome: data.nome ?? child.key,
        matricula: data.matricula ?? null,
        // mantém todos os campos para o serviço de responsáveis
        ...data,
        // garante que uid não seja sobrescrito por um campo "uid" no banco
        uid: child.key,
      });
    });
    state.alunos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
}
