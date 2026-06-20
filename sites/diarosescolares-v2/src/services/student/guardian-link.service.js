import { db } from "../../firebase/firebase.config.js";
import { ref, get, set, update, remove } from "firebase/database";
import { getUserProfile } from "../user.service.js";

const TOKENS = "studentLinkTokens";
const GUARDIAN_STUDENTS = "guardianStudents";

export const validateStudentLinkToken = async (token) => {
  if (!token) return { valid: false, reason: "INVALID_TOKEN" };
  const normalized = String(token).trim().toUpperCase();
  const snap = await get(ref(db, `${TOKENS}/${normalized}`));
  if (!snap.exists()) return { valid: false, reason: "INVALID_TOKEN" };
  const data = snap.val();
  if (data.expiresAt && data.expiresAt < Date.now())
    return { valid: false, reason: "TOKEN_EXPIRED" };
  return {
    valid: true,
    linkId: normalized,
    studentId: data.studentId,
    studentName: data.studentName || "",
    schoolId: data.schoolId,
    tenantId: data.tenantId || data.schoolId,
  };
};

export const createGuardianLink = async ({
  guardianUid,
  studentId,
  studentName,
  schoolId,
  tenantId,
}) => {
  await set(ref(db, `${GUARDIAN_STUDENTS}/${guardianUid}/${studentId}`), {
    studentId,
    studentName,
    schoolId,
    tenantId: tenantId || schoolId,
    status: "pending",
    createdAt: Date.now(),
  });
};

export const consumeLinkToken = async (linkId) => {
  if (!linkId) return;
  await remove(ref(db, `${TOKENS}/${linkId}`));
};

export const updateGuardianTenant = async (uid, schoolId, tenantId) => {
  if (!uid) return;
  await update(ref(db, `users/${uid}`), {
    schoolId,
    tenantId: tenantId || schoolId,
    updatedAt: Date.now(),
  });
};
