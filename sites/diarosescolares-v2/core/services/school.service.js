import { ref, get, set, update, push } from "firebase/database";
import { db } from "../firebase.js";

const SCHOOLS_PATH = "schools";

const isString = (v) => typeof v === "string" && v.trim().length > 0;
const isBoolean = (v) => typeof v === "boolean";

const error = (message) => {
  const e = new Error(message);
  e.code = "school-service-error";
  return e;
};

function normalizeSchool(id, data) {
  return {
    id,
    name: data?.name ?? "",
    city: data?.city ?? "",
    state: data?.state ?? "",
    active: data?.active ?? true,
    createdAt: data?.createdAt ?? null,
  };
}

export async function createSchool(data) {
  if (!data || typeof data !== "object") throw error("Dados inválidos.");

  const { name, city, state, active = true } = data;

  if (!isString(name)) throw error("name é obrigatório.");
  if (!isString(city)) throw error("city é obrigatório.");
  if (!isString(state)) throw error("state é obrigatório.");
  if (!isBoolean(active)) throw error("active precisa ser boolean.");

  const schoolRef = push(ref(db, SCHOOLS_PATH));
  const schoolId = schoolRef.key;

  await set(schoolRef, {
    name: name.trim(),
    city: city.trim(),
    state: state.trim(),
    active,
    createdAt: Date.now(),
    users: {},
  });

  return getSchool(schoolId);
}

export async function getSchool(schoolId) {
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");

  const snap = await get(ref(db, `${SCHOOLS_PATH}/${schoolId.trim()}`));
  if (!snap.exists()) return null;

  const data = snap.val();
  return normalizeSchool(schoolId.trim(), data);
}

export async function updateSchool(schoolId, data) {
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");
  if (!data || typeof data !== "object") throw error("Dados inválidos.");

  const payload = {};

  if ("name" in data) {
    if (!isString(data.name)) throw error("name inválido.");
    payload.name = data.name.trim();
  }

  if ("city" in data) {
    if (!isString(data.city)) throw error("city inválido.");
    payload.city = data.city.trim();
  }

  if ("state" in data) {
    if (!isString(data.state)) throw error("state inválido.");
    payload.state = data.state.trim();
  }

  if ("active" in data) {
    if (!isBoolean(data.active)) throw error("active precisa ser boolean.");
    payload.active = data.active;
  }

  if (Object.keys(payload).length === 0) {
    return getSchool(schoolId);
  }

  await update(ref(db, `${SCHOOLS_PATH}/${schoolId.trim()}`), payload);
  return getSchool(schoolId);
}

export async function getSchools() {
  const snap = await get(ref(db, SCHOOLS_PATH));
  const value = snap.val() || {};

  return Object.entries(value)
    .map(([id, data]) => normalizeSchool(id, data))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
}

export async function deactivateSchool(schoolId) {
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");

  await update(ref(db, `${SCHOOLS_PATH}/${schoolId.trim()}`), {
    active: false,
  });

  return getSchool(schoolId);
}

export const schoolService = {
  createSchool,
  getSchool,
  updateSchool,
  getSchools,
  deactivateSchool,
};
