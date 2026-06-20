import { db } from "../firebase/firebase.config.js";
import { ref, get, update } from "firebase/database";
import { validateSchool } from "../services/tenant/tenant.service.js";

const INVITES = "invites";

export const validateInviteCode = async (code, role = "teacher") => {
  if (!code) return { valid: false, reason: "INVITE_NOT_FOUND" };
  const normalized = String(code).trim().toUpperCase();

  const snap = await get(ref(db, `${INVITES}/${normalized}`));
  if (snap.exists()) {
    const invite = snap.val();
    if (invite.usedBy) return { valid: false, reason: "INVITE_USED" };
    if (invite.expiresAt && invite.expiresAt < Date.now())
      return { valid: false, reason: "INVITE_EXPIRED" };
    if (invite.role && invite.role !== role)
      return { valid: false, reason: "INVITE_WRONG_ROLE" };
    return { valid: true, schoolId: invite.schoolId, inviteId: normalized };
  }

  // fallback: treat code as schoolId directly
  try {
    const school = await validateSchool(normalized);
    return { valid: true, schoolId: school.schoolId, inviteId: normalized };
  } catch {
    return { valid: false, reason: "INVITE_NOT_FOUND" };
  }
};

export const consumeInvite = async (inviteId, uid) => {
  if (!inviteId || !uid) return;
  const snap = await get(ref(db, `${INVITES}/${inviteId}`));
  if (!snap.exists()) return;
  await update(ref(db, `${INVITES}/${inviteId}`), {
    usedBy: uid,
    usedAt: Date.now(),
  });
};
