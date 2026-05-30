/* ==========================================================================
   SGE v2.0 - FIREBASE FCM (Cloud Messaging)
   Notificações Push e Mensageria em Foreground
   ========================================================================== */

import { messaging, db } from "./config.js";
import {
  getToken,
  onMessage,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js";
import {
  ref,
  update,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { showToast } from "../core/notifications.js";

/**
 * Solicita permissão e obtém o token FCM
 * @param {string} uid
 */
export async function requestNotificationPermission(uid) {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "SEU_VAPID_KEY_AQUI", // Substituir pelo VAPID real
      });

      if (token) {
        await sendTokenToDB(uid, token);
        return token;
      }
    }
  } catch (error) {
    console.error("Erro ao obter token FCM:", error.message);
  }
  return null;
}

/**
 * Salva o token no perfil do usuário no Realtime Database
 * @param {string} uid
 * @param {string} token
 */
async function sendTokenToDB(uid, token) {
  try {
    await update(ref(db, `usuarios/${uid}`), {
      fcmToken: token,
      lastTokenUpdate: Date.now(),
    });
  } catch (error) {
    console.error("Erro ao salvar token no DB:", error.message);
  }
}

/**
 * Listener para mensagens recebidas com o app em primeiro plano
 * @param {Function} callback
 */
export function setupForegroundListener(callback) {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log("Mensagem recebida em foreground:", payload);

    // Feedback visual padrão
    showToast(payload.notification.body, "info");

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    if (callback) callback(payload);
  });
}

/**
 * Simula um push para testes locais sem depender de Service Worker
 * @param {Object} data
 */
export function simulatePush(data) {
  showToast(data.body || "Nova notificação do sistema", "info");
  if (navigator.vibrate) navigator.vibrate(200);
}

// SGE v2.0 • Firebase FCM • 2026-05-14
