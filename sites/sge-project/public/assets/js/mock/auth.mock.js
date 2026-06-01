/* ==========================================================================
   SGE v2.0 - AUTH MOCK
   Simulação de Autenticação Firebase v9
   ========================================================================== */

import { MOCK_DB, deepClone } from "./data.js";

const USE_MOCK = true;

let currentUser = null;
const authStateListeners = [];

/**
 * Simula login com e-mail e senha
 */
export async function signInWithEmailAndPassword(auth, email, password) {
  console.log(`🔑 [MOCK AUTH] Tentativa de login: ${email}`);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (password !== "123456") {
        return reject({
          code: "auth/invalid-credential",
          message: "Senha incorreta.",
        });
      }

      const userEntry = Object.entries(MOCK_DB.usuarios).find(
        ([uid, u]) => u.email === email,
      );

      if (userEntry) {
        const [uid, userData] = userEntry;
        currentUser = { uid, email, ...userData };
        notifyListeners();
        resolve({ user: currentUser });
      } else {
        reject({
          code: "auth/user-not-found",
          message: "Usuário não cadastrado.",
        });
      }
    }, 500);
  });
}

/**
 * Simula logout
 */
export async function signOut() {
  console.log(`🚪 [MOCK AUTH] Logout realizado`);
  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = null;
      notifyListeners();
      resolve();
    }, 300);
  });
}

/**
 * Simula observador de estado de autenticação
 */
export function onAuthStateChanged(auth, callback) {
  authStateListeners.push(callback);
  // Dispara imediatamente com o estado atual
  setTimeout(() => callback(deepClone(currentUser)), 0);

  // Retorna função de unsubscribe
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) authStateListeners.splice(index, 1);
  };
}

/**
 * Simula criação de usuário
 */
export async function createUserWithEmailAndPassword(auth, email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const exists = Object.values(MOCK_DB.usuarios).some(
        (u) => u.email === email,
      );
      if (exists) {
        reject({ code: "auth/email-already-in-use" });
      } else {
        const uid = `mock_uid_${Date.now()}`;
        currentUser = { uid, email };
        notifyListeners();
        resolve({ user: currentUser });
      }
    }, 800);
  });
}

/**
 * Simula recuperação de senha
 */
export async function sendPasswordResetEmail(auth, email) {
  console.log(`📧 [MOCK AUTH] E-mail de recuperação enviado para: ${email}`);
  return Promise.resolve();
}

function notifyListeners() {
  authStateListeners.forEach((callback) => callback(deepClone(currentUser)));
}

// SGE v2.0 • Mock Auth • 2026-05-14
