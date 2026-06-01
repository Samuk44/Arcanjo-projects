import { ref, get, set, update, remove, push } from "firebase/database";
import { db } from "../firebase.js";

const CLASSES_PATH = "classes";
const SCHOOLS_PATH = "schools";
const INDEX_CLASSES_BY_SCHOOL_PATH = "indexes/classesBySchool";

const ALLOWED_SHIFTS = new Set(["morning", "afternoon", "night"]);

const isString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const buildError = (message) => {
  const error = new Error(message);
  error.code = "class-service-error";
  return error;
};

const normalizeClass = (classId, data) => ({
  id: classId,
  name: data?.name ?? "",
  grade: data?.grade ?? "",
  shift: data?.shift ?? "",
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

async function readClassesByIds(ids) {
  const items = await Promise.all(ids.map((id) => getClass(id)));
  return items.filter(Boolean);
}

async function writeClassIndex(classId, schoolId) {
  await update(ref(db), {
    [`${INDEX_CLASSES_BY_SCHOOL_PATH}/${schoolId}/${classId}`]: true,
  });
}

async function removeClassIndex(classId, schoolId) {
  await update(ref(db), {
    [`${INDEX_CLASSES_BY_SCHOOL_PATH}/${schoolId}/${classId}`]: null,
  });
}

export async function createClass(data) {
  if (!data || typeof data !== "object") {
    throw buildError("Dados inválidos.");
  }

  const { name, grade, shift, schoolId } = data;

  if (!isString(name)) throw buildError("name é obrigatório.");
  if (!isString(grade)) throw buildError("grade é obrigatório.");
  if (!isString(shift)) throw buildError("shift é obrigatório.");
  if (!isString(schoolId)) throw buildError("schoolId é obrigatório.");

  const normalizedShift = shift.trim().toLowerCase();
  if (!ALLOWED_SHIFTS.has(normalizedShift)) {
    throw buildError("shift inválido.");
  }

  const normalizedSchoolId = schoolId.trim();
  await ensureSchoolExists(normalizedSchoolId);

  const newRef = push(ref(db, CLASSES_PATH));

  const payload = {
    name: name.trim(),
    grade: grade.trim(),
    shift: normalizedShift,
    schoolId: normalizedSchoolId,
    createdAt: Date.now(),
  };

  await set(newRef, payload);
  await writeClassIndex(newRef.key, normalizedSchoolId);

  return getClass(newRef.key);
}

export async function getClass(classId) {
  if (!isString(classId)) {
    throw buildError("classId é obrigatório.");
  }

  const snap = await get(ref(db, `${CLASSES_PATH}/${classId.trim()}`));
  if (!snap.exists()) return null;

  return normalizeClass(classId.trim(), snap.val());
}

export async function getClassesBySchool(schoolId) {
  if (!isString(schoolId)) {
    throw buildError("schoolId é obrigatório.");
  }

  const ids = await readIndexedIds(
    `${INDEX_CLASSES_BY_SCHOOL_PATH}/${schoolId.trim()}`,
  );

  return readClassesByIds(ids).then((items) => items.sort(sortByName));
}

export async function updateClass(classId, data) {
  if (!isString(classId)) {
    throw buildError("classId é obrigatório.");
  }

  if (!data || typeof data !== "object") {
    throw buildError("Dados inválidos.");
  }

  const current = await getClass(classId);
  if (!current) {
    throw buildError("Turma não encontrada.");
  }

  const payload = {};

  if ("name" in data) {
    if (!isString(data.name)) throw buildError("name inválido.");
    payload.name = data.name.trim();
  }

  if ("grade" in data) {
    if (!isString(data.grade)) throw buildError("grade inválido.");
    payload.grade = data.grade.trim();
  }

  if ("shift" in data) {
    if (!isString(data.shift)) throw buildError("shift inválido.");
    const normalizedShift = data.shift.trim().toLowerCase();
    if (!ALLOWED_SHIFTS.has(normalizedShift)) {
      throw buildError("shift inválido.");
    }
    payload.shift = normalizedShift;
  }

  if ("schoolId" in data) {
    throw buildError("schoolId não pode ser alterado na turma.");
  }

  if (Object.keys(payload).length > 0) {
    await update(ref(db, `${CLASSES_PATH}/${current.id}`), payload);
  }

  return getClass(classId);
}

export async function deleteClass(classId) {
  if (!isString(classId)) {
    throw buildError("classId é obrigatório.");
  }

  const current = await getClass(classId);
  if (!current) return false;

  await removeClassIndex(current.id, current.schoolId);
  await remove(ref(db, `${CLASSES_PATH}/${current.id}`));

  return true;
}

export const classService = {
  createClass,
  getClass,
  getClassesBySchool,
  updateClass,
  deleteClass,
};
