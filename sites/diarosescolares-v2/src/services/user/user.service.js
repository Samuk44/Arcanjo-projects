// src/services/user/user.service.js
// ESTE É O ARQUIVO ORIGINAL — restaure-o se foi sobrescrito acidentalmente
import { db } from "../../firebase/firebase.config.js";
import { ref, set, get, update } from "firebase/database";

const USERS = "users";
const SCHOOLS = "schools";
const now = () => Date.now();

const base = (uid, email, name, role, schoolId, extra = {}) => ({
  uid,
  email: String(email).trim().toLowerCase(),
  name: String(name).trim(),
  role,
  schoolId: schoolId || null,
  status: "active",
  createdAt: now(),
  updatedAt: now(),
  lastLoginAt: null,
  ...extra,
});

async function writeSchoolIndexes(schoolId, uid, role) {
  const promises = [];
  promises.push(
    set(ref(db, `${SCHOOLS}/${schoolId}/members/${uid}`), true),
  );
  if (role === "teacher") {
    promises.push(set(ref(db, `${SCHOOLS}/${schoolId}/teachers/${uid}`), true));
  }
  if (role === "guardian") {
    promises.push(set(ref(db, `${SCHOOLS}/${schoolId}/guardians/${uid}`), true));
  }
  await Promise.all(promises);
}

export const getUserProfile = async (uid) => {
  if (!uid) throw new Error("UID_REQUIRED");
  const snap = await get(ref(db, `${USERS}/${uid}`));
  if (!snap.exists()) throw new Error("USER_NOT_FOUND_IN_RTDB");
  return snap.val();
};

export const updateLastLogin = async (uid) => {
  if (!uid) return;
  try {
    await update(ref(db, `${USERS}/${uid}`), {
      lastLoginAt: now(),
      updatedAt: now(),
    });
  } catch (e) {
    // non-critical
  }
};

export const createDirectorUser = async ({
  uid,
  email,
  name,
  schoolId,
  phone,
  cnpj,
}) => {
  const data = base(uid, email, name, "director", schoolId, {
    phone: phone || "",
    cnpj: cnpj || "",
  });
  await set(ref(db, `${USERS}/${uid}`), data);
  await writeSchoolIndexes(schoolId, uid, "director");
  return data;
};

export const createTeacherUser = async ({
  uid,
  email,
  name,
  schoolId,
  phone,
}) => {
  const data = base(uid, email, name, "teacher", schoolId, {
    phone: phone || "",
  });
  await set(ref(db, `${USERS}/${uid}`), data);
  await writeSchoolIndexes(schoolId, uid, "teacher");
  return data;
};

export const createGuardianUser = async ({
  uid,
  email,
  name,
  schoolId,
  phone,
}) => {
  const data = base(uid, email, name, "guardian", schoolId, {
    phone: phone || "",
    children: {},
  });
  await set(ref(db, `${USERS}/${uid}`), data);
  await writeSchoolIndexes(schoolId, uid, "guardian");
  return data;
};

export const updateUserData = async (uid, data) => {
  if (!uid) throw new Error("UID_REQUIRED");
  const updates = { ...data, updatedAt: now() };
  await update(ref(db, `${USERS}/${uid}`), updates);
};
