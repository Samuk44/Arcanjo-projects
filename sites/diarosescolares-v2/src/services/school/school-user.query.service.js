import { db } from "../../firebase/firebase.config.js";
import { ref, get } from "firebase/database";

const USERS = "users";
const SCHOOLS = "schools";

async function getUserByUid(uid) {
  if (!uid) return null;
  try {
    const snap = await get(ref(db, `${USERS}/${uid}`));
    if (!snap.exists()) return null;
    return { uid, ...snap.val() };
  } catch (error) {
    return null;
  }
}

async function getUsersByUids(uids) {
  const users = await Promise.all(
    (uids || []).map(async (uid) => getUserByUid(uid)),
  );
  return users.filter(Boolean);
}

async function getSchoolIndexUids(schoolId, indexName) {
  if (!schoolId) return [];
  try {
    const snap = await get(ref(db, `${SCHOOLS}/${schoolId}/${indexName}`));
    if (!snap.exists()) return [];
    return Object.keys(snap.val() || {});
  } catch (error) {
    return [];
  }
}

export async function getUsersBySchool(schoolId) {
  if (!schoolId) return [];
  const memberUids = await getSchoolIndexUids(schoolId, "members");

  if (memberUids.length > 0) {
    return getUsersByUids(memberUids);
  }

  const teachers = await getSchoolTeachers(schoolId);
  const guardians = await getSchoolGuardians(schoolId);
  return [...teachers, ...guardians];
}

export async function getUsersByRole(schoolId, role) {
  return (await getUsersBySchool(schoolId)).filter((u) => u.role === role);
}

async function getSchoolUsersByIndex(schoolId, indexName) {
  const uids = await getSchoolIndexUids(schoolId, indexName);
  return getUsersByUids(uids);
}

export async function getSchoolTeachers(schoolId) {
  return getSchoolUsersByIndex(schoolId, "teachers");
}

export async function getSchoolGuardians(schoolId) {
  return getSchoolUsersByIndex(schoolId, "guardians");
}
