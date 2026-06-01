"use strict";

import { db } from "./firebase/config.js";
import {
  ref,
  get,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const LEGACY_FIELDS = ["profileType", "isComplete", "pendingFields", "simpleData", "completeData"];

export async function cleanupLegacyFields(uid) {
  if (!uid) return false;
  try {
    const snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) return false;
    const data = snap.val();
    const found = LEGACY_FIELDS.filter((f) => f in data);
    if (!found.length) return false;
    const patch = {};
    found.forEach((f) => { patch[f] = null; });
    await update(ref(db, `usuarios/${uid}`), patch);
    return true;
  } catch {
    return false;
  }
}

export async function cleanupAndNormalize(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `usuarios/${uid}`));
    if (!snap.exists()) return null;
    const raw = snap.val();
    const patch = {};
    LEGACY_FIELDS.forEach((f) => { if (f in raw) patch[f] = null; });
    if (!raw.updatedAt) patch.updatedAt = new Date().toISOString();
    if (Object.keys(patch).length) await update(ref(db, `usuarios/${uid}`), patch);
    const { profileType, isComplete, pendingFields, simpleData, completeData, ...clean } = raw;
    return { ...clean, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== null)) };
  } catch {
    return null;
  }
}
