/* ==========================================================================
   SGE v2.0 - FIREBASE AUTH
   Gestão de Autenticação, Sessão e RBAC Awareness
   ========================================================================== */

import { auth, db } from "./config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { saveSession, clearSession } from "../core/session.js";

/**
 * Realiza login com e-mail e senha
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return userCredential.user;
  } catch (error) {
    const errorMap = {
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/too-many-requests": "Muitas tentativas. Tente mais tarde.",
      "auth/user-disabled": "Esta conta foi desativada.",
    };
    throw new Error(
      errorMap[error.code] || "Erro ao realizar login. Tente novamente.",
    );
  }
}

/**
 * Realiza logout e limpa dados locais
 */
export async function logout() {
  try {
    await signOut(auth);
    clearSession();
    window.location.replace("/auth/login.html");
  } catch (error) {
    console.error("Erro ao deslogar:", error.message);
  }
}

/**
 * Envia e-mail de recuperação de senha
 * @param {string} email
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw new Error("Erro ao enviar e-mail de recuperação.");
  }
}

/**
 * Observa mudanças no estado de autenticação e valida perfil
 * @param {Function} callback
 */
export function observeAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = ref(db, `usuarios/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();

          // Validação de Status
          if (
            userData.status === "pendente" ||
            userData.status === "desativado"
          ) {
            if (!window.location.pathname.includes("auth/status.html")) {
              window.location.replace("/auth/status.html");
            }
          }

          saveSession({ uid: user.uid, ...userData });
          if (callback) callback(user, userData);
        } else {
          // Usuário autenticado mas sem perfil no DB
          if (!window.location.pathname.includes("cadastro")) {
            window.location.replace("/auth/escolha-cadastro.html");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error.message);
      }
    } else {
      clearSession();
      if (callback) callback(null, null);
    }
  });
}

/**
 * Retorna o usuário atual (Auth)
 */
export function getCurrentUser() {
  return auth.currentUser;
}

// SGE v2.0 • Firebase Auth • 2026-05-14
