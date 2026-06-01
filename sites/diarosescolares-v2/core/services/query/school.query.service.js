import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { db } from "../../firebase.js";
import {
  createError,
  normalizeText,
  mapChildrenObjectToList,
  sortByName,
} from "./query.helpers.js";

const SCHOOLS_PATH = "schools";

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

function normalizeSchoolUser(uid, data) {
  return {
    uid,
    name: data?.name ?? "",
    email: data?.email ?? "",
    role: data?.role ?? "",
    schoolId: data?.schoolId ?? "",
    createdAt: data?.createdAt ?? null,
  };
}

export async function getSchoolById(schoolId) {
  const id = normalizeText(schoolId);
  if (!id) throw createError("schoolId é obrigatório.");

  const snapshot = await get(ref(db, `${SCHOOLS_PATH}/${id}`));
  if (!snapshot.exists()) return null;

  return normalizeSchool(id, snapshot.val());
}

export async function getSchoolUsers(schoolId) {
  const id = normalizeText(schoolId);
  if (!id) throw createError("schoolId é obrigatório.");

  const snapshot = await get(ref(db, `${SCHOOLS_PATH}/${id}/users`));
  if (!snapshot.exists()) return [];

  const value = snapshot.val();
  return mapChildrenObjectToList(value, normalizeSchoolUser).sort(sortByName);
}

export async function getActiveSchools() {
  const q = query(ref(db, SCHOOLS_PATH), orderByChild("active"), equalTo(true));
  const snapshot = await get(q);

  if (!snapshot.exists()) return [];

  const value = snapshot.val() || {};
  return mapChildrenObjectToList(value, normalizeSchool).sort(sortByName);
}

export const schoolQueryService = {
  getSchoolById,
  getSchoolUsers,
  getActiveSchools,
};
