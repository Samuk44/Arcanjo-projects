import { ref, get, set, update, remove } from "firebase/database";
import { db } from "../firebase.js";

const USERS_PATH = "users";
const CLASSES_PATH = "classes";
const SUBJECTS_PATH = "subjects";
const ASSIGNMENTS_PATH = "teacherAssignments";

const INDEX_ASSIGNMENTS_BY_SCHOOL_PATH = "indexes/assignmentsBySchool";
const INDEX_ASSIGNMENTS_BY_TEACHER_PATH = "indexes/assignmentsByTeacher";
const INDEX_ASSIGNMENTS_BY_CLASS_PATH = "indexes/assignmentsByClass";
const INDEX_TEACHER_CLASSES_PATH = "indexes/teacherClasses";

const isString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const buildError = (message) => {
  const error = new Error(message);
  error.code = "assignment-service-error";
  return error;
};

const normalizeAssignment = (assignmentId, data) => ({
  id: assignmentId,
  teacherId: data?.teacherId ?? "",
  classId: data?.classId ?? "",
  subjectId: data?.subjectId ?? "",
  schoolId: data?.schoolId ?? "",
  createdAt: data?.createdAt ?? null,
});

const sortByCreatedAtDesc = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);

async function readNode(nodePath) {
  const snap = await get(ref(db, nodePath));
  return snap.exists() ? snap.val() : null;
}

async function getUserOrThrow(uid) {
  const data = await readNode(`${USERS_PATH}/${uid}`);
  if (!data) throw buildError("Usuário não encontrado.");
  return data;
}

async function getClassOrThrow(classId) {
  const data = await readNode(`${CLASSES_PATH}/${classId}`);
  if (!data) throw buildError("Turma não encontrada.");
  return data;
}

async function getSubjectOrThrow(subjectId) {
  const data = await readNode(`${SUBJECTS_PATH}/${subjectId}`);
  if (!data) throw buildError("Disciplina não encontrada.");
  return data;
}

async function readIndexedIds(indexPath) {
  const snap = await get(ref(db, indexPath));
  const value = snap.val();
  if (!value) return [];
  return Object.keys(value);
}

async function readAssignmentsByIds(ids) {
  const items = await Promise.all(ids.map((id) => getAssignment(id)));
  return items.filter(Boolean);
}

async function getAssignment(assignmentId) {
  const snap = await get(ref(db, `${ASSIGNMENTS_PATH}/${assignmentId}`));
  if (!snap.exists()) return null;
  return normalizeAssignment(assignmentId, snap.val());
}

function makeAssignmentId({ schoolId, teacherId, classId, subjectId }) {
  return [schoolId, teacherId, classId, subjectId].join("__");
}

async function writeAssignmentIndexes(assignmentId, assignment) {
  const updates = {};
  updates[`${INDEX_ASSIGNMENTS_BY_SCHOOL_PATH}/${assignment.schoolId}/${assignmentId}`] = true;
  updates[`${INDEX_ASSIGNMENTS_BY_TEACHER_PATH}/${assignment.teacherId}/${assignmentId}`] = true;
  updates[`${INDEX_ASSIGNMENTS_BY_CLASS_PATH}/${assignment.classId}/${assignmentId}`] = true;
  // Índice direto para regras do Firebase: teacher → class sem percorrer assignmentIds
  updates[`${INDEX_TEACHER_CLASSES_PATH}/${assignment.teacherId}/${assignment.classId}/${assignment.subjectId}`] = true;
  await update(ref(db), updates);
}

async function removeAssignmentIndexes(assignmentId, assignment) {
  const updates = {};
  updates[`${INDEX_ASSIGNMENTS_BY_SCHOOL_PATH}/${assignment.schoolId}/${assignmentId}`] = null;
  updates[`${INDEX_ASSIGNMENTS_BY_TEACHER_PATH}/${assignment.teacherId}/${assignmentId}`] = null;
  updates[`${INDEX_ASSIGNMENTS_BY_CLASS_PATH}/${assignment.classId}/${assignmentId}`] = null;
  updates[`${INDEX_TEACHER_CLASSES_PATH}/${assignment.teacherId}/${assignment.classId}/${assignment.subjectId}`] = null;
  await update(ref(db), updates);
}

export async function assignTeacherToClass({
  teacherId,
  classId,
  subjectId,
  schoolId,
}) {
  if (!isString(teacherId)) throw buildError("teacherId é obrigatório.");
  if (!isString(classId)) throw buildError("classId é obrigatório.");
  if (!isString(subjectId)) throw buildError("subjectId é obrigatório.");
  if (!isString(schoolId)) throw buildError("schoolId é obrigatório.");

  const normalizedTeacherId = teacherId.trim();
  const normalizedClassId = classId.trim();
  const normalizedSubjectId = subjectId.trim();
  const normalizedSchoolId = schoolId.trim();

  const teacher = await getUserOrThrow(normalizedTeacherId);
  if (teacher.role !== "teacher") {
    throw buildError("Esse usuário não é professor.");
  }
  if (teacher.schoolId !== normalizedSchoolId) {
    throw buildError("Professor não pertence a esta escola.");
  }

  const classData = await getClassOrThrow(normalizedClassId);
  if (classData.schoolId !== normalizedSchoolId) {
    throw buildError("Turma não pertence a esta escola.");
  }

  const subjectData = await getSubjectOrThrow(normalizedSubjectId);
  if (subjectData.schoolId !== normalizedSchoolId) {
    throw buildError("Disciplina não pertence a esta escola.");
  }

  const assignmentId = makeAssignmentId({
    schoolId: normalizedSchoolId,
    teacherId: normalizedTeacherId,
    classId: normalizedClassId,
    subjectId: normalizedSubjectId,
  });

  const existing = await getAssignment(assignmentId);
  if (existing) return existing;

  const payload = {
    teacherId: normalizedTeacherId,
    classId: normalizedClassId,
    subjectId: normalizedSubjectId,
    schoolId: normalizedSchoolId,
    createdAt: Date.now(),
  };

  await set(ref(db, `${ASSIGNMENTS_PATH}/${assignmentId}`), payload);
  await writeAssignmentIndexes(assignmentId, payload);

  return getAssignment(assignmentId);
}

export async function getTeacherAssignments(teacherId) {
  if (!isString(teacherId)) {
    throw buildError("teacherId é obrigatório.");
  }

  const teacher = await getUserOrThrow(teacherId.trim());
  if (teacher.role !== "teacher") {
    throw buildError("Esse usuário não é professor.");
  }

  const ids = await readIndexedIds(
    `${INDEX_ASSIGNMENTS_BY_TEACHER_PATH}/${teacherId.trim()}`,
  );

  return readAssignmentsByIds(ids).then((items) =>
    items.sort(sortByCreatedAtDesc),
  );
}

export async function getClassAssignments(classId) {
  if (!isString(classId)) {
    throw buildError("classId é obrigatório.");
  }

  const classData = await getClassOrThrow(classId.trim());

  const ids = await readIndexedIds(
    `${INDEX_ASSIGNMENTS_BY_CLASS_PATH}/${classData.classId ?? classId.trim()}`,
  );

  return readAssignmentsByIds(ids).then((items) =>
    items.sort(sortByCreatedAtDesc),
  );
}

export async function removeAssignment(assignmentId) {
  if (!isString(assignmentId)) {
    throw buildError("assignmentId é obrigatório.");
  }

  const current = await getAssignment(assignmentId.trim());
  if (!current) return false;

  await removeAssignmentIndexes(current.id, current);
  await remove(ref(db, `${ASSIGNMENTS_PATH}/${current.id}`));

  return true;
}

export const assignmentService = {
  assignTeacherToClass,
  getTeacherAssignments,
  getClassAssignments,
  removeAssignment,
};
