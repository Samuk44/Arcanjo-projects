import { ref, get, set, push, update } from "firebase/database";
import { db } from "../../firebase.js";

function buildError(message) {
  const error = new Error(message);
  error.code = "class-service-error";
  return error;
}

function normalizeClass(id, data, schoolId = "") {
  return {
    id,
    name: data?.name ?? "",
    grade: data?.grade ?? "",
    shift: data?.shift ?? "",
    schoolId: data?.schoolId ?? schoolId ?? "",
    status: data?.status ?? "active",
    students: data?.students ?? {},
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
  };
}

function requireText(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) throw buildError(`${fieldName} é obrigatório.`);
  return normalized;
}

export async function getClassesBySchool(schoolId) {
  const normalizedSchoolId = requireText(schoolId, "schoolId");
  const snap = await get(ref(db, `schools/${normalizedSchoolId}/classes`));

  if (!snap.exists()) return [];

  return Object.entries(snap.val())
    .map(([classId, data]) => normalizeClass(classId, data, normalizedSchoolId))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getClass(schoolIdOrClassId, maybeClassId) {
  if (maybeClassId) {
    const schoolId = requireText(schoolIdOrClassId, "schoolId");
    const classId = requireText(maybeClassId, "classId");
    const snap = await get(ref(db, `schools/${schoolId}/classes/${classId}`));
    return snap.exists() ? normalizeClass(classId, snap.val(), schoolId) : null;
  }

  throw buildError("schoolId é obrigatório para buscar turma por ID.");
}

export async function getClassById(schoolIdOrClassId, maybeClassId) {
  return getClass(schoolIdOrClassId, maybeClassId);
}

export async function createClass({ name, grade, shift, schoolId, status }) {
  const normalizedSchoolId = requireText(schoolId, "schoolId");
  const normalizedName = requireText(name, "Nome da turma");
  const normalizedGrade = requireText(grade, "Série");
  const normalizedShift = requireText(shift, "Turno");

  const classesRef = ref(db, `schools/${normalizedSchoolId}/classes`);
  const classRef = push(classesRef);
  const now = Date.now();

  const payload = {
    id: classRef.key,
    name: normalizedName,
    grade: normalizedGrade,
    shift: normalizedShift,
    schoolId: normalizedSchoolId,
    status: status || "active",
    students: {},
    createdAt: now,
    updatedAt: now,
  };

  await set(classRef, payload);

  return normalizeClass(classRef.key, payload, normalizedSchoolId);
}

export async function updateClass(classId, schoolId, data = {}) {
  const normalizedClassId = requireText(classId, "classId");
  const normalizedSchoolId = requireText(schoolId, "schoolId");
  const current = await getClass(normalizedSchoolId, normalizedClassId);

  if (!current) throw buildError("Turma não encontrada.");

  const updates = {};

  if ("name" in data) updates.name = requireText(data.name, "Nome da turma");
  if ("grade" in data) updates.grade = requireText(data.grade, "Série");
  if ("shift" in data) updates.shift = requireText(data.shift, "Turno");
  if ("status" in data) updates.status = String(data.status || "active").trim();
  updates.updatedAt = Date.now();

  await update(
    ref(db, `schools/${normalizedSchoolId}/classes/${normalizedClassId}`),
    updates,
  );

  return {
    ...current,
    ...updates,
  };
}

export const classService = {
  createClass,
  getClass,
  getClassById,
  getClassesBySchool,
  updateClass,
};
