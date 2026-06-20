// src/services/school/school.query.service.js
// CORRIGIDO: removida dependência circular. getSchoolById lê direto do DB.
import { db } from "../../firebase/firebase.config.js";
import { ref, get } from "firebase/database";

const SCHOOLS = "schools";

export async function getSchoolById(schoolId) {
  if (!schoolId) return null;
  const snap = await get(ref(db, `${SCHOOLS}/${schoolId}`));
  return snap.exists() ? { id: snap.key, ...snap.val() } : null;
}

export async function getActiveSchools() {
  return [];
}
