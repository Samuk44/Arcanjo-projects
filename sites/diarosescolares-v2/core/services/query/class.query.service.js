import {
  readNode,
  readIndexIds,
  readManyByIds,
  createError,
  normalizeText,
  sortByName,
  uniqueById,
} from "./query.helpers.js";
import { getTeacherClasses as getTeacherClassesFromAssignments } from "./assignment.query.service.js";

const CLASSES_PATH = "classes";

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

export async function getClassesBySchool(schoolId) {
  const id = normalizeText(schoolId);
  if (!id) throw createError("schoolId é obrigatório.");

  const ids = await readIndexIds(`indexes/classesBySchool/${id}`);
  const classes = await readManyByIds(CLASSES_PATH, ids, normalizeClass);

  return classes.sort(sortByName);
}

export async function getClassById(classId) {
  const id = normalizeText(classId);
  if (!id) throw createError("classId é obrigatório.");

  const data = await readNode(`${CLASSES_PATH}/${id}`);
  if (!data) return null;

  return normalizeClass(id, data);
}

export async function getClassesByTeacher(teacherId) {
  return getTeacherClassesFromAssignments(teacherId);
}

export async function getClassesByAssignment(teacherId) {
  return getTeacherClassesFromAssignments(teacherId);
}

export const classQueryService = {
  getClassesBySchool,
  getClassById,
  getClassesByTeacher,
  getClassesByAssignment,
};
