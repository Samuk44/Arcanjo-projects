import {
  readNode,
  readIndexIds,
  readManyByIds,
  createError,
  normalizeText,
  sortByDateDesc,
} from "./query.helpers.js";

const USERS_PATH = "users";
const ATTENDANCE_PATH = "attendance";
const STUDENTS_PATH = "students";

function normalizeGuardianChild(studentId, data) {
  return {
    studentId,
    schoolId: data?.schoolId ?? "",
    relation: data?.relation ?? "",
    linkedAt: data?.linkedAt ?? null,
  };
}

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

async function getGuardianSchoolId(uid) {
  const user = await readNode(`${USERS_PATH}/${uid}`);
  if (!user) return null;
  if (user.role !== "guardian") return null;
  return user.schoolId ?? null;
}

export async function getGuardianChildren(uid) {
  const id = normalizeText(uid);
  if (!id) throw createError("uid é obrigatório.");

  const schoolId = await getGuardianSchoolId(id);
  if (!schoolId) return [];

  const raw = await readNode(`guardianChildren/${schoolId}/${id}`);
  if (!raw) return [];

  const children = Object.entries(raw).map(([studentId, data]) =>
    normalizeGuardianChild(studentId, data === true ? {} : data),
  );

  const detailed = await Promise.all(
    children.map(async (child) => {
      const student = await readNode(`${STUDENTS_PATH}/${child.studentId}`);
      if (!student) return child;
      return {
        ...child,
        name: student.name ?? "",
        classId: student.classId ?? "",
      };
    }),
  );

  return detailed;
}

export async function getStudentAttendance(studentId) {
  const id = normalizeText(studentId);
  if (!id) throw createError("studentId é obrigatório.");

  const student = await readNode(`${STUDENTS_PATH}/${id}`);
  if (!student?.schoolId) return [];

  const ids = await readIndexIds(
    `indexes/attendanceByStudent/${student.schoolId}/${id}`,
  );
  const items = await readManyByIds(ATTENDANCE_PATH, ids, normalizeAttendance);

  return items.sort(sortByDateDesc);
}

export async function getStudentGrades(studentId) {
  const id = normalizeText(studentId);
  if (!id) throw createError("studentId é obrigatório.");

  const student = await readNode(`${STUDENTS_PATH}/${id}`);
  if (!student?.schoolId) return [];

  const grades = await readNode(`gradesByStudent/${student.schoolId}/${id}`);
  if (!grades) return [];

  return Array.isArray(grades)
    ? grades
    : Object.entries(grades).map(([gradeId, value]) => ({
        id: gradeId,
        ...value,
      }));
}

export const guardianQueryService = {
  getGuardianChildren,
  getStudentAttendance,
  getStudentGrades,
};
