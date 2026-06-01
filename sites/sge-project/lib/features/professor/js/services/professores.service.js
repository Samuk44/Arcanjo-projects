/**
 * @module services/professores
 * @description Carregamento das turmas vinculadas ao professor autenticado.
 */
import { db } from "../../../../assets/js/firebase/config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH } from "../store/notas.store.js";
import { sessionCache, handleFirebaseError } from "../../../../assets/js/utils.js";
import { el } from "../utils/helpers.js";

/**
 * Carrega as turmas do professor com cache sessionStorage (10 min).
 * Popula state.turmas e preenche o select#select-turma.
 * @param {() => boolean} isMounted
 */
export async function loadVinculos(isMounted) {
  if (!isMounted()) return;
  const cacheKey = `sge_turmas_${state.professor.uid}`;
  let turmas = sessionCache.get(cacheKey);

  if (!turmas) {
    try {
      const snap = await get(ref(db, PATH.turmas()));
      turmas = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const t = child.val();
          if (t.professorId === state.professor.uid)
            turmas.push({ id: child.key, nome: t.nome ?? child.key });
        });
      }
      sessionCache.set(cacheKey, turmas, 10);
    } catch (err) {
      handleFirebaseError(err, "Erro ao carregar turmas.");
      return;
    }
  }

  state.turmas = turmas;
  const sel = el("select-turma");
  if (sel) {
    sel.innerHTML =
      '<option value="">Selecione a turma</option>' +
      turmas.map((t) => `<option value="${t.id}">${t.nome}</option>`).join("");
  }
}
