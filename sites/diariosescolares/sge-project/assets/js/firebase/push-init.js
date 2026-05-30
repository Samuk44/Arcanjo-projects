/* ==========================================================================
   SGE v2.0 - Push Notifications Initializer
   Módulo de inicialização automática de notificações após login
   ========================================================================== */

import { auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { initializeNotifications } from "./fcm.js";
import { showToast } from "../core/notifications.js";

/**
 * Inicializa automaticamente as notificações push quando o usuário está autenticado.
 * Importar este módulo em qualquer página que deseja ativar notificações.
 */
function initPushOnAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Pequeno delay para não interferir no carregamento da página
      setTimeout(async () => {
        try {
          const token = await initializeNotifications(user.uid, (payload) => {
            // Callback customizado para notificações em foreground
            console.log("[Push] Notificação recebida:", payload);
          });

          if (token) {
            console.log("[Push] Notificações ativas para:", user.email);
          }
        } catch (err) {
          console.warn("[Push] Não foi possível ativar notificações:", err.message);
        }
      }, 2000);
    }
  });
}

// Auto-executa ao importar
initPushOnAuth();

export { initPushOnAuth };
