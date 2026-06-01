/* ==========================================================================
   SGE v2.0 - FCM MOCK
   Simulação de Notificações Push e Mensageria
   ========================================================================== */

import { showToast } from "../core/notifications.js";

const USE_MOCK = true;
const messageListeners = [];

/**
 * Simula a obtenção de token FCM
 */
export async function getToken() {
  console.log(`📡 [MOCK FCM] Token gerado: mock_fcm_token_123`);
  return Promise.resolve("mock_fcm_token_123");
}

/**
 * Simula solicitação de permissão
 */
export async function requestPermission() {
  console.log(`📡 [MOCK FCM] Permissão solicitada: concedida`);
  return Promise.resolve("granted");
}

/**
 * Simula listener de mensagens em foreground
 */
export function onMessage(messaging, callback) {
  messageListeners.push(callback);
  return () => {
    const index = messageListeners.indexOf(callback);
    if (index > -1) messageListeners.splice(index, 1);
  };
}

/**
 * Helper para disparar um push simulado manualmente
 * @param {Object} payload
 */
export function triggerMockPush(payload) {
  console.log(`📡 [MOCK FCM] Mensagem recebida:`, payload);

  const data = {
    notification: {
      title: payload.title || "Notificação do Sistema",
      body: payload.body || "Você tem uma nova atualização.",
    },
    data: payload.data || {},
  };

  // Notificar listeners
  messageListeners.forEach((callback) => callback(data));

  // Feedback visual via Toast (integrado com notifications.js)
  if (typeof showToast === "function") {
    showToast(data.notification.body, "info");
  }

  // Vibração simulada
  if (navigator.vibrate) navigator.vibrate(200);
}

export function isSupported() {
  return true;
}

// SGE v2.0 • Mock FCM • 2026-05-14
