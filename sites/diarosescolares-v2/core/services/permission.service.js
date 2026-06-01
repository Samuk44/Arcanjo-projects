import { ref, get } from "firebase/database";
import { db } from "../firebase.js";

const USERS_PATH = "users";
const CLASSES_PATH = "classes";
const ASSIGNMENTS_PATH = "teacherAssignments";
const INDEX_BY_TEACHER = "indexes/assignmentsByTeacher";

const GUARDIAN_LINKS_PATH = "guardianStudents"; // reservado para o módulo de alunos
const isString = (v) => typeof v === "string" && v.trim().length > 0;

const error = (message) => {
  const e = new Error(message);
  e.code = "permission-service-error";
  return e;
};

async function getUser(user) {
  if (!user) return null;
  if (user.uid && user.role) return user;

  if (!user.uid) return null;

  const snap = await get(ref(db, `${USERS_PATH}/${user.uid}`));
  return snap.exists() ? { uid: user.uid, ...snap.val() } : null;
}

async function getClass(classId) {
  const snap = await get(ref(db, `${CLASSES_PATH}/${classId}`));
  return snap.exists() ? { id: classId, ...snap.val() } : null;
}

async function getTeacherAssignmentIds(teacherId) {
  const snap = await get(ref(db, `${INDEX_BY_TEACHER}/${teacherId}`));
  return Object.keys(snap.val() || {});
}

async function getAssignmentsByIds(ids) {
  const items = await Promise.all(
    ids.map(async (id) => {
      const snap = await get(ref(db, `${ASSIGNMENTS_PATH}/${id}`));
      return snap.exists() ? { id, ...snap.val() } : null;
    }),
  );
  return items.filter(Boolean);
}

async function getGuardianStudentIds(guardianId) {
  const snap = await get(ref(db, `${GUARDIAN_LINKS_PATH}/${guardianId}`));
  return Object.keys(snap.val() || {});
}

function sameSchool(a, b) {
  return a && b && a.schoolId === b.schoolId;
}

export async function canAccessClass(userInput, classId) {
  const user = await getUser(userInput);
  if (!user) return false;

  const klass = await getClass(classId);
  if (!klass) return false;

  if (user.role === "director") {
    return sameSchool(user, klass);
  }

  if (user.role === "teacher") {
    if (!sameSchool(user, klass)) return false;

    const assignmentIds = await getTeacherAssignmentIds(user.uid);
    const assignments = await getAssignmentsByIds(assignmentIds);

    return assignments.some(
      (a) => a.classId === classId && a.schoolId === user.schoolId,
    );
  }

  return false;
}

export async function canCreateAttendance(userInput, classId) {
  const user = await getUser(userInput);
  if (!user) return false;

  const klass = await getClass(classId);
  if (!klass) return false;

  if (user.role === "director") {
    return sameSchool(user, klass);
  }

  if (user.role === "teacher") {
    return canAccessClass(user, classId);
  }

  return false;
}

export async function canViewAttendance(userInput, classId) {
  return canAccessClass(userInput, classId);
}

export async function filterByPermission(userInput, data) {
  const user = await getUser(userInput);
  if (!user) return Array.isArray(data) ? [] : null;

  const items = Array.isArray(data) ? data : [data].filter(Boolean);

  if (user.role === "director") {
    return Array.isArray(data) ? items : (items[0] ?? null);
  }

  if (user.role === "teacher") {
    const filtered = items.filter(
      (item) => item && item.schoolId === user.schoolId,
    );
    return Array.isArray(data) ? filtered : (filtered[0] ?? null);
  }

  if (user.role === "guardian") {
    const linkedStudentIds = await getGuardianStudentIds(user.uid);

    const filtered = items.filter((item) => {
      const students = item?.students || {};
      return Object.keys(students).some((studentId) =>
        linkedStudentIds.includes(studentId),
      );
    });

    return Array.isArray(data) ? filtered : (filtered[0] ?? null);
  }

  return Array.isArray(data) ? [] : null;
}

export const permissionService = {
  canAccessClass,
  canCreateAttendance,
  canViewAttendance,
  filterByPermission,
};
