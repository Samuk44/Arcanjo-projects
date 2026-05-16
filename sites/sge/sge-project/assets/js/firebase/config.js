/* ==========================================================================
   SGE v2.0 - FIREBASE CONFIGURATION
   Inicialização Modular v9 e Exportação de Instâncias
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js";

import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-check.js";
/**
 * Configuração do Firebase
 * Prioriza window.__firebaseConfig injetado pelo Hosting ou fallback seguro
 */
const firebaseConfig = window.__firebaseConfig || {
  apiKey: "AIzaSyCOug2MkZHwH5rzGXxzlPpVZEu4IHbt0Ck",
  authDomain: "farolescolar.firebaseapp.com",
  databaseURL: "https://farolescolar-default-rtdb.firebaseio.com",
  projectId: "farolescolar",
  storageBucket: "farolescolar.firebasestorage.app",
  messagingSenderId: "31040592917",
  appId: "1:31040592917:web:f90e2f0441c35ed92b421c",
  measurementId: "G-1B6HPZNFFJ",
};

let app;
let auth;
let db;
let storage;
let messaging;
let firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  storage = getStorage(app);

  // Messaging pode falhar em navegadores sem suporte ou sem HTTPS
  try {
    messaging = getMessaging(app);
  } catch (msgError) {
    console.warn("FCM não suportado neste ambiente:", msgError.message);
  }

  // Inicializar App Check depois de `app` estar disponível
  try {
    const recaptchaKey = window.__RECAPTCHA_KEY || "SEU_SITE_KEY_RECAPTCHA";
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (acErr) {
    console.warn("App Check initialization failed:", acErr.message);
  }

  // Firestore (opcional) - inicializa se a API estiver disponível
  try {
    firestore = getFirestore(app);
  } catch (fsErr) {
    console.warn("Firestore não disponível neste ambiente:", fsErr.message);
  }

  // Configurar persistência de sessão local
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Erro ao configurar persistência:", err.message);
  });
} catch (error) {
  console.error("Falha crítica na inicialização do Firebase:", error.message);
  // Fallback read-only ou redirecionamento pode ser implementado aqui
}

export { auth, db, storage, messaging, firestore };
export default app;

// SGE v2.0 • Firebase Config • 2026-05-14
