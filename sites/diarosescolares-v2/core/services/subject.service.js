import { ref, get, set, update, remove, push } from "firebase/database";
import { db } from "../firebase.js";

const SUBJECTS_PATH = "subjects";
const SCHOOLS_PATH = "schools";
const INDEX_SUBJECTS_BY_SCHOOL_PATH = "indexes/subjectsBySchool";

const isString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const buildError = (message) => {
  const error = new Error(message);
  error.code = "subject-service-error";
  return error;
};

const normalizeSubject = (subjectId, data) => ({
  id: subjectId,
  name: data?.name ?? "",
  schoolId: data?.schoolId ?? "",
  createdAt: data?.createdAt ?? null,
});

const sortByName = (a, b) =>
  String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");

async function ensureSchoolExists(schoolId) {
  const snap = await get(ref(db, `${SCHOOLS_PATH}/${schoolId}`));
  if (!snap.exists()) {
    throw buildError("Escola não encontrada.");
  }

  const data = snap.val() || {};
  if (data.active === false) {
    throw buildError("Escola inativa.");
  }
}

async function readIndexedIds(indexPath) {
  const snap = await get(ref(db, indexPath));
  const value = snap.val();
  if (!value) return [];
  return Object.keys(value);
}

async function readSubjectsByIds(ids) {
  const items = await Promise.all(ids.map((id) => getSubject(id)));
  return items.filter(Boolean);
}

async function writeSubjectIndex(subjectId, schoolId) {
  await update(ref(db), {
    [`${INDEX_SUBJECTS_BY_SCHOOL_PATH}/${schoolId}/${subjectId}`]: true,
  });
}

async function removeSubjectIndex(subjectId, schoolId) {
  await update(ref(db), {
    [`${INDEX_SUBJECTS_BY_SCHOOL_PATH}/${schoolId}/${subjectId}`]: null,
  });
}

async function getSubject(subjectId) {
  const snap = await get(ref(db, `${SUBJECTS_PATH}/${subjectId}`));
  if (!snap.exists()) return null;
  return normalizeSubject(subjectId, snap.val());
}

export async function createSubject(data) {
  if (!data || typeof data !== "object") {
    throw buildError("Dados inválidos.");
  }

  const { name, schoolId } = data;

  if (!isString(name)) throw buildError("name é obrigatório.");
  if (!isString(schoolId)) throw buildError("schoolId é obrigatório.");

  const normalizedSchoolId = schoolId.trim();
  await ensureSchoolExists(normalizedSchoolId);

  const newRef = push(ref(db, SUBJECTS_PATH));
  const payload = {
    name: name.trim(),
    schoolId: normalizedSchoolId,
    createdAt: Date.now(),
  };

  await set(newRef, payload);
  await writeSubjectIndex(newRef.key, normalizedSchoolId);

  return getSubject(newRef.key);
}

export async function getSubjectsBySchool(schoolId) {
  if (!isString(schoolId)) {
    throw buildError("schoolId é obrigatório.");
  }

  const ids = await readIndexedIds(
    `${INDEX_SUBJECTS_BY_SCHOOL_PATH}/${schoolId.trim()}`,
  );

  return readSubjectsByIds(ids).then((items) => items.sort(sortByName));
}

export const subjectService = {
  createSubject,
  getSubjectsBySchool,
};
