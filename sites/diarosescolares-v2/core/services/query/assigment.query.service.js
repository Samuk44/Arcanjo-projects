import {
  readIndexIds,
  readManyByIds,
  createError,
  normalizeText,
  sortByCreatedAtDesc,
  uniqueById,
} from "./query.helpers.js";

const ASSIGNMENTS_PATH = "teacherAssignments";
const CLASSES_PATH = "classes";

function normalizeAssignment(id, data) {
  return {
    id,
    teacherId: data?.teacherId ?? "",
    classId: data?.classId ?? "",
    subjectId: data?.subjectId ?? "",
    schoolId: data?.schoolId ?? "",
    createdAt: data?.createdAt ?? null,
  };
}

function normalizeClass(id, data) {
  return {
    id,
    name: data?.name ?? "",
    grade: data?.grade ?? "",
    shift: data?.shift ?? "",
    schoolId: data?.schoolId ?? "",
    createdAt: data?.createdAt ?? null,
  };
}

async function readAssignmentsByIndex(indexPath) {
  const ids = await readIndexIds(indexPath);
  return readManyByIds(ASSIGNMENTS_PATH, ids, normalizeAssignment);
}

async function getClassesFromAssignments(assignments) {
  const classIds = [
    ...new Set(assignments.map((item) => item.classId).filter(Boolean)),
  ];

  const classes = await readManyByIds(CLASSES_PATH, classIds, normalizeClass);
  return uniqueById(classes).sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "pt-BR"),
  );
}

export async function getAssignmentsBySchool(schoolId) {
  const id = normalizeText(schoolId);
  if (!id) throw createError("schoolId é obrigatório.");

  const assignments = await readAssignmentsByIndex(
    `indexes/assignmentsBySchool/${id}`,
  );
  return assignments.sort(sortByCreatedAtDesc);
}

export async function getAssignmentsByTeacher(teacherId) {
  const id = normalizeText(teacherId);
  if (!id) throw createError("teacherId é obrigatório.");

  const assignments = await readAssignmentsByIndex(
    `indexes/assignmentsByTeacher/${id}`,
  );
  return assignments.sort(sortByCreatedAtDesc);
}

export async function getAssignmentsByClass(classId) {
  const id = normalizeText(classId);
  if (!id) throw createError("classId é obrigatório.");

  const assignments = await readAssignmentsByIndex(
    `indexes/assignmentsByClass/${id}`,
  );
  return assignments.sort(sortByCreatedAtDesc);
}

export async function getTeacherClasses(teacherId) {
  const assignments = await getAssignmentsByTeacher(teacherId);
  return getClassesFromAssignments(assignments);
}

export const assignmentQueryService = {
  getAssignmentsBySchool,
  getAssignmentsByTeacher,
  getAssignmentsByClass,
  getTeacherClasses,
};
