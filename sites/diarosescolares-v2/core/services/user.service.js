import { ref, get, set, update, remove } from "firebase/database";
import { db } from "../firebase.js";

const USERS_PATH = "users";
const INDEX_USERS_BY_SCHOOL_PATH = "indexes/usersBySchool";
const INDEX_USERS_BY_SCHOOL_ROLE_PATH = "indexes/usersBySchoolRole";

const ALLOWED_ROLES = new Set(["teacher", "director", "guardian"]);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeRole = (role) => role.trim().toLowerCase();

const buildError = (message) => {
  const error = new Error(message);
  error.code = "user-service-error";
  return error;
};

const normalizeUser = (uid, data) => ({
  uid,
  name: data?.name ?? "",
  email: data?.email ?? "",
  role: data?.role ?? "",
  schoolId: data?.schoolId ?? "",
  createdAt: data?.createdAt ?? null,
});

const sortByName = (a, b) =>
  String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");

async function readIndexIds(indexPath) {
  const snap = await get(ref(db, indexPath));
  const value = snap.val();
  if (!value) return [];
  return Object.keys(value);
}

async function readUsersByIds(ids) {
  const users = await Promise.all(ids.map((uid) => getUser(uid)));
  return users.filter(Boolean);
}

function validateBaseUserData(data) {
  if (!data || typeof data !== "object") {
    throw buildError("Dados inválidos.");
  }

  const { name, email, role, schoolId } = data;

  if (!isNonEmptyString(name)) throw buildError("name é obrigatório.");
  if (!isNonEmptyString(email)) throw buildError("email é obrigatório.");
  if (!isNonEmptyString(role)) throw buildError("role é obrigatório.");
  if (!isNonEmptyString(schoolId)) throw buildError("schoolId é obrigatório.");

  const normalizedRole = normalizeRole(role);
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    throw buildError("Role inválida.");
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: normalizedRole,
    schoolId: schoolId.trim(),
  };
}

function userPath(uid) {
  return `${USERS_PATH}/${uid}`;
}

function userRef(uid) {
  return ref(db, userPath(uid));
}

async function writeUserIndexes(uid, user) {
  const updates = {};
  updates[`${INDEX_USERS_BY_SCHOOL_PATH}/${user.schoolId}/${uid}`] = true;
  updates[
    `${INDEX_USERS_BY_SCHOOL_ROLE_PATH}/${user.schoolId}/${user.role}/${uid}`
  ] = true;
  await update(ref(db), updates);
}

async function removeUserIndexes(uid, user) {
  const updates = {};
  updates[`${INDEX_USERS_BY_SCHOOL_PATH}/${user.schoolId}/${uid}`] = null;
  updates[
    `${INDEX_USERS_BY_SCHOOL_ROLE_PATH}/${user.schoolId}/${user.role}/${uid}`
  ] = null;
  await update(ref(db), updates);
}

export async function createUser(uid, data) {
  if (!isNonEmptyString(uid)) {
    throw buildError("uid é obrigatório.");
  }

  const payload = validateBaseUserData(data);

  const existing = await get(userRef(uid));
  if (existing.exists()) {
    throw buildError("Usuário já existe.");
  }

  const user = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    schoolId: payload.schoolId,
    createdAt: Date.now(),
  };

  await set(userRef(uid), user);
  await writeUserIndexes(uid, user);

  return getUser(uid);
}

export async function getUser(uid) {
  if (!isNonEmptyString(uid)) {
    throw buildError("uid é obrigatório.");
  }

  const snap = await get(userRef(uid));
  if (!snap.exists()) {
    return null;
  }

  return normalizeUser(uid, snap.val());
}

export async function updateUser(uid, data) {
  if (!isNonEmptyString(uid)) {
    throw buildError("uid é obrigatório.");
  }

  if (!data || typeof data !== "object") {
    throw buildError("Dados de atualização inválidos.");
  }

  const current = await getUser(uid);
  if (!current) {
    throw buildError("Usuário não encontrado.");
  }

  const next = { ...current };

  if ("name" in data) {
    if (!isNonEmptyString(data.name)) throw buildError("name inválido.");
    next.name = data.name.trim();
  }

  if ("email" in data) {
    if (!isNonEmptyString(data.email)) throw buildError("email inválido.");
    next.email = data.email.trim().toLowerCase();
  }

  if ("role" in data) {
    if (!isNonEmptyString(data.role)) throw buildError("role inválido.");
    const normalizedRole = normalizeRole(data.role);
    if (!ALLOWED_ROLES.has(normalizedRole)) {
      throw buildError("Role inválida.");
    }
    next.role = normalizedRole;
  }

  if ("schoolId" in data) {
    if (!isNonEmptyString(data.schoolId))
      throw buildError("schoolId inválido.");
    next.schoolId = data.schoolId.trim();
  }

  await set(userRef(uid), {
    name: next.name,
    email: next.email,
    role: next.role,
    schoolId: next.schoolId,
    createdAt: current.createdAt ?? Date.now(),
  });

  if (current.schoolId !== next.schoolId || current.role !== next.role) {
    await removeUserIndexes(uid, current);
  }

  await writeUserIndexes(uid, next);

  return getUser(uid);
}

export async function getUsersBySchool(schoolId) {
  if (!isNonEmptyString(schoolId)) {
    throw buildError("schoolId é obrigatório.");
  }

  const ids = await readIndexIds(
    `${INDEX_USERS_BY_SCHOOL_PATH}/${schoolId.trim()}`,
  );
  return readUsersByIds(ids).then((users) => users.sort(sortByName));
}

export async function getUsersByRole(schoolId, role) {
  if (!isNonEmptyString(schoolId)) {
    throw buildError("schoolId é obrigatório.");
  }

  if (!isNonEmptyString(role)) {
    throw buildError("role é obrigatório.");
  }

  const normalizedRole = normalizeRole(role);

  if (!ALLOWED_ROLES.has(normalizedRole)) {
    throw buildError("Role inválida.");
  }

  const ids = await readIndexIds(
    `${INDEX_USERS_BY_SCHOOL_ROLE_PATH}/${schoolId.trim()}/${normalizedRole}`,
  );

  return readUsersByIds(ids).then((users) => users.sort(sortByName));
}

export const userService = {
  createUser,
  getUser,
  updateUser,
  getUsersBySchool,
  getUsersByRole,
};
