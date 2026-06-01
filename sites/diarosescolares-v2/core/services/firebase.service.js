/**
 * @deprecated LEGADO — NÃO USAR
 * Substituído por core/firebase/config.js + core/firebase.js
 * Imports quebrados: usa CDN v10.7.0 (Firestore, não Realtime DB)
 * e referencia ../config/firebase.config.js que não existe.
 * Nenhum arquivo importa este módulo. Manter apenas para histórico.
 */

// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
// import { firebaseConfig } from "../config/firebase.config.js";

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Exportar instâncias do Firebase
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export default firebaseApp;
