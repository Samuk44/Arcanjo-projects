import {
  readNode,
  readIndexIds,
  readManyByIds,
  createError,
  normalizeText,
  sortByDateDesc,
  uniqueById,
} from "./query.helpers.js";

const ATTENDANCE_PATH = "attendance";
const STUDENTS_PATH = "students";

function normalizeAttendance(id, data) {
  return {
    id,
    classId: data?.classId ?? "",
    subjectId: data?.subjectId ?? "",
    teacherId: data?.teacherId ?? "",
    schoolId: data?.schoolId ?? "",
    date: data?.date ?? "",
    students: data?.students ?? {},
    notes: data?.notes ?? "",
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
  };
}

async function readAttendanceByIndex(indexPath) {
  const ids = await readIndexIds(indexPath);
  const items = await readManyByIds(ATTENDANCE_PATH, ids, normalizeAttendance);
  return uniqueById(items);
}

export async function getAttendanceBySchool(schoolId) {
  const id = normalizeText(schoolId);
  if (!id) throw createError("schoolId é obrigatório.");

  const items = await readAttendanceByIndex(`indexes/attendanceBySchool/${id}`);
  return items.sort(sortByDateDesc);
}

export async function getAttendanceByClass(schoolId, classId) {
  const sId = normalizeText(schoolId);
  const cId = normalizeText(classId);
  if (!sId) throw createError("schoolId é obrigatório.");
  if (!cId) throw createError("classId é obrigatório.");

  const items = await readAttendanceByIndex(
    `indexes/attendanceByClass/${sId}/${cId}`,
  );
  return items.sort(sortByDateDesc);
}

export async function getAttendanceByDate(schoolId, dateKey) {
  const sId = normalizeText(schoolId);
  const dKey = normalizeText(dateKey);
  if (!sId) throw createError("schoolId é obrigatório.");
  if (!dKey) throw createError("dateKey é obrigatório.");

  const items = await readAttendanceByIndex(
    `indexes/attendanceByDate/${sId}/${dKey}`,
  );
  return items.sort(sortByDateDesc);
}

export async function getAttendanceByClassAndDate(schoolId, classId, dateKey) {
  const sId = normalizeText(schoolId);
  const cId = normalizeText(classId);
  const dKey = normalizeText(dateKey);
  if (!sId) throw createError("schoolId é obrigatório.");
  if (!cId) throw createError("classId é obrigatório.");
  if (!dKey) throw createError("dateKey é obrigatório.");

  const attendanceId = await readNode(
    `indexes/attendanceUnique/${sId}/${cId}/${dKey}`,
  );
  if (!attendanceId) return null;

  const attendance = await readNode(`${ATTENDANCE_PATH}/${attendanceId}`);
  if (!attendance) return null;

  return normalizeAttendance(attendanceId, attendance);
}

export async function getLatestAttendanceByTeacher(teacherId, limit = 10) {
  const id = normalizeText(teacherId);
  if (!id) throw createError("teacherId é obrigatório.");

  const items = await readAttendanceByIndex(
    `indexes/attendanceByTeacher/${id}`,
  );
  return items.sort(sortByDateDesc).slice(0, Math.max(0, Number(limit) || 10));
}

export const attendanceQueryService = {
  getAttendanceBySchool,
  getAttendanceByClass,
  getAttendanceByDate,
  getAttendanceByClassAndDate,
  getLatestAttendanceByTeacher,
};
