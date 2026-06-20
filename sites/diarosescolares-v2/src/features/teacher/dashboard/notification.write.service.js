// src/features/teacher/dashboard/notification.write.service.js
// Escrita de notificações — restrita ao próprio UID do professor
import { ref, set, update, get } from "firebase/database";
import { db } from "../../../firebase.js";

function generateId() {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Cria uma nova notificação para o professor.
 * O professor só pode escrever em users/{ownUid}/notifications/{id}.
 */
export async function createNotification(teacherUid, notifData) {
  if (!teacherUid || !notifData?.schoolId) {
    throw new Error("teacherUid e schoolId são obrigatórios.");
  }

  const id = generateId();
  const record = {
    id,
    type: String(notifData.type || "aviso-admin"),
    title: String(notifData.title || ""),
    message: String(notifData.message || ""),
    schoolId: String(notifData.schoolId),
    teacherUid: String(teacherUid),
    createdAt: Date.now(),
    readAt: null,
    status: "unread",
    actionType: String(notifData.actionType || "none"),
    actionTarget: String(notifData.actionTarget || ""),
  };

  await set(ref(db, `users/${teacherUid}/notifications/${id}`), record);
  return record;
}

/**
 * Marca uma notificação como lida.
 */
export async function markNotificationRead(teacherUid, notifId) {
  if (!teacherUid || !notifId) return;
  await update(ref(db, `users/${teacherUid}/notifications/${notifId}`), {
    status: "read",
    readAt: Date.now(),
  });
}

/**
 * Marca todas as notificações do professor como lidas (dentro da escola).
 */
export async function markAllNotificationsRead(teacherUid, schoolId) {
  if (!teacherUid || !schoolId) return;

  const snap = await get(ref(db, `users/${teacherUid}/notifications`));
  if (!snap.exists()) return;

  const updates = {};
  const now = Date.now();

  Object.entries(snap.val()).forEach(([id, data]) => {
    if (data?.schoolId === schoolId && data?.status === "unread") {
      updates[`users/${teacherUid}/notifications/${id}/status`] = "read";
      updates[`users/${teacherUid}/notifications/${id}/readAt`] = now;
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(db, "/"), updates);
  }
}

export const notificationWriteService = {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
};
