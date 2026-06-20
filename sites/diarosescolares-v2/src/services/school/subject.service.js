import { ref, get, set, push, update, remove } from "firebase/database";
import { db } from "../../firebase.js";

function buildError(message) {
  const error = new Error(message);
  error.code = "subject-service-error";
  return error;
}

function requireText(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) throw buildError(`${fieldName} é obrigatório.`);
  return normalized;
}

function normalizeSubject(id, data) {
  return {
    id,
    name: data?.name ?? "",
    schoolId: data?.schoolId ?? "",
    createdAt: data?.createdAt ?? null,
  };
}

export async function getSubject(subjectId) {
  const normalizedId = requireText(subjectId, "subjectId");
  const snap = await get(ref(db, `subjects/${normalizedId}`));
  return snap.exists() ? normalizeSubject(normalizedId, snap.val()) : null;
}

export async function getSubjectsBySchool(schoolId) {
  const normalizedSchoolId = requireText(schoolId, "schoolId");
  const indexSnap = await get(
    ref(db, `indexes/subjectsBySchool/${normalizedSchoolId}`),
  );

  if (!indexSnap.exists()) return [];

  const subjectIds = Object.keys(indexSnap.val());
  const subjects = await Promise.all(
    subjectIds.map((subjectId) => getSubject(subjectId)),
  );

  return subjects
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function createSubject({ name, schoolId }) {
  const normalizedName = requireText(name, "Nome da disciplina");
  const normalizedSchoolId = requireText(schoolId, "schoolId");

  const subjectRef = push(ref(db, "subjects"));
  const payload = {
    name: normalizedName,
    schoolId: normalizedSchoolId,
    createdAt: Date.now(),
  };

  await set(subjectRef, payload);
  await update(ref(db), {
    [`indexes/subjectsBySchool/${normalizedSchoolId}/${subjectRef.key}`]: true,
  });

  return normalizeSubject(subjectRef.key, payload);
}

export async function deleteSubject(subjectId) {
  const normalizedId = requireText(subjectId, "subjectId");
  const subject = await getSubject(normalizedId);
  if (!subject) return false;

  await update(ref(db), {
    [`indexes/subjectsBySchool/${subject.schoolId}/${normalizedId}`]: null,
  });
  await remove(ref(db, `subjects/${normalizedId}`));
  return true;
}

export const subjectService = {
  createSubject,
  getSubject,
  getSubjectsBySchool,
  deleteSubject,
};
