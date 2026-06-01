/**
 * @module services/auth
 * @description Autenticação do professor: init, guard de role e logout.
 *   Toda lógica de onAuthStateChanged vive aqui.
 */
import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { state, PATH } from "../store/notas.store.js";
import { el } from "../utils/helpers.js";

const LOGIN_URL = "/auth/login.html";

/**
 * Inicia o listener de autenticação e guarda de role.
 * @param {() => boolean} isMounted - retorna false quando a página foi destruída
 * @param {() => Promise<void>} onReady - callback após professor autenticado e carregado
 * @returns {() => void} unsubscribe
 */
export function initAuth(isMounted, onReady) {
  return onAuthStateChanged(auth, async (user) => {
    if (!isMounted()) return;
    if (!user) { window.location.replace(LOGIN_URL); return; }

    try {
      const snap = await get(ref(db, PATH.usuarios(user.uid)));
      if (!snap.exists() || snap.val().role !== "professor") {
        window.location.replace(LOGIN_URL);
        return;
      }
      const data = snap.val();
      state.professor.uid        = user.uid;
      state.professor.nome       = data.nome       ?? "Professor";
      state.professor.disciplina = data.disciplina ?? "";

      _bindLogout();
      await onReady();
    } catch (err) {
      console.error("auth.service:", err?.code ?? err?.message);
    }
  });
}

function _bindLogout() {
  el("btn-logout")?.addEventListener(
    "click",
    async () => { try { await signOut(auth); } catch {} window.location.replace(LOGIN_URL); },
    { once: true }
  );
}
