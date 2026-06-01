/**
 * @module services/alunos
 * @description Carregamento e ordenação dos alunos de uma turma.
 */
import { db } from "../../../../../assets/js/firebase/config.js";
import {
  ref, get, query, orderByChild, equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH } from "../store/notas.store.js";
import { handleFirebaseError } from "../../../../../assets/js/utils.js";

/**
 * Busca os alunos da turmaId informada e popula state.alunos (ordenado por nome).
 * @param {string} turmaId
 * @param {() => boolean} isMounted
 */
export async function loadAlunos(turmaId, isMounted) {
  if (!isMounted()) return;
  try {
    const snap = await get(
      query(ref(db, PATH.alunos()), orderByChild("turmaId"), equalTo(turmaId))
    );
    state.alunos = [];
    if (snap.exists()) {
      snap.forEach((child) =>
        state.alunos.push({ uid: child.key, nome: child.val().nome ?? child.key })
      );
      state.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
    }
  } catch (err) {
    handleFirebaseError(err, "Erro ao carregar alunos.");
  }
}
