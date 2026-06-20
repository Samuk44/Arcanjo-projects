// src/features/teacher/dashboard/notification.query.service.js
// Leitura de notificações do professor — escopo restrito ao próprio UID
import { ref, get } from "firebase/database";
import { db } from "../../../firebase.js";

function normalizeNotif(id, data) {
  return {
    id,
    type: data?.type ?? "",
    title: data?.title ?? "",
    message: data?.message ?? "",
    schoolId: data?.schoolId ?? "",
    teacherUid: data?.teacherUid ?? "",
    createdAt: data?.createdAt ?? 0,
    readAt: data?.readAt ?? null,
    status: data?.status ?? "unread",
    actionType: data?.actionType ?? "none",
    actionTarget: data?.actionTarget ?? "",
  };
}

/**
 * Retorna todas as notificações do professor, ordenadas da mais recente.
 * Filtra pelo schoolId para evitar contaminação entre escolas.
 */
export async function getTeacherNotifications(teacherUid, schoolId) {
  if (!teacherUid || !schoolId) return [];

  const snap = await get(ref(db, `users/${teacherUid}/notifications`));
  if (!snap.exists()) return [];

  return Object.entries(snap.val())
    .map(([id, data]) => normalizeNotif(id, data))
    .filter((n) => n.schoolId === schoolId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUnreadCount(teacherUid, schoolId) {
  const all = await getTeacherNotifications(teacherUid, schoolId);
  return all.filter((n) => n.status === "unread").length;
}

export const notificationQueryService = {
  getTeacherNotifications,
  getUnreadCount,
};
