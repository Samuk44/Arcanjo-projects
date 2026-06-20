// src/services/attendance/attendance.service.js
import { ref, get, set, update, runTransaction } from "firebase/database";
import { db } from "../../firebase/firebase.config.js";

const ATTENDANCE_PATH = "attendance";
const INDEX_BY_SCHOOL = "indexes/attendanceBySchool";
const INDEX_BY_CLASS = "indexes/attendanceByClass";
const INDEX_BY_DATE = "indexes/attendanceByDate";
const INDEX_UNIQUE = "indexes/attendanceUnique";
const INDEX_BY_TEACHER = "indexes/attendanceByTeacher";

const ALLOWED_STATUSES = new Set(["present", "absent", "late"]);

const isString = (v) => typeof v === "string" && v.trim().length > 0;
const error = (message) => {
  const e = new Error(message);
  e.code = "attendance-service-error";
  return e;
};

function normalizeDateKey(date) {
  if (!date) throw error("date é obrigatório.");
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) throw error("date inválida.");
  return value.toISOString().slice(0, 10);
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

// CORRIGIDO: lê de schools/{schoolId}/classes/{classId} conforme estrutura real do banco
async function getClassSnapshot(schoolId, classId) {
  const snap = await get(ref(db, `schools/${schoolId}/classes/${classId}`));
  return snap.exists() ? { id: classId, ...snap.val() } : null;
}

function buildAttendanceId({ schoolId, classId, dateKey }) {
  return [schoolId, classId, dateKey].join("__");
}

async function writeAttendanceIndexes(attendanceId, payload, dateKey) {
  await update(ref(db), {
    [`${INDEX_BY_SCHOOL}/${payload.schoolId}/${attendanceId}`]: true,
    [`${INDEX_BY_CLASS}/${payload.schoolId}/${payload.classId}/${attendanceId}`]:
      dateKey,
    [`${INDEX_BY_DATE}/${payload.schoolId}/${dateKey}/${attendanceId}`]:
      payload.classId,
    [`${INDEX_UNIQUE}/${payload.schoolId}/${payload.classId}/${dateKey}`]:
      attendanceId,
    // CORRIGIDO: escreve o índice por professor, necessário para getLatestAttendanceByTeacher
    [`${INDEX_BY_TEACHER}/${payload.teacherId}/${attendanceId}`]: true,
  });
}

async function removeAttendanceIndexes(attendance) {
  const dateKey = attendance.date;
  await update(ref(db), {
    [`${INDEX_BY_SCHOOL}/${attendance.schoolId}/${attendance.id}`]: null,
    [`${INDEX_BY_CLASS}/${attendance.schoolId}/${attendance.classId}/${attendance.id}`]:
      null,
    [`${INDEX_BY_DATE}/${attendance.schoolId}/${dateKey}/${attendance.id}`]:
      null,
    [`${INDEX_UNIQUE}/${attendance.schoolId}/${attendance.classId}/${dateKey}`]:
      null,
    [`${INDEX_BY_TEACHER}/${attendance.teacherId}/${attendance.id}`]: null,
  });
}

async function fetchAttendanceById(attendanceId) {
  const snap = await get(ref(db, `${ATTENDANCE_PATH}/${attendanceId}`));
  return snap.exists() ? normalizeAttendance(attendanceId, snap.val()) : null;
}

async function fetchIdsAtPath(path) {
  const snap = await get(ref(db, path));
  return Object.keys(snap.val() || {});
}

function validateStudents(students) {
  if (!students || typeof students !== "object" || Array.isArray(students)) {
    throw error("students precisa ser um objeto.");
  }
  for (const status of Object.values(students)) {
    if (!ALLOWED_STATUSES.has(status)) {
      throw error("Status de aluno inválido.");
    }
  }
}

export async function preventDuplicateAttendance(classId, date, schoolId) {
  if (!isString(classId)) throw error("classId é obrigatório.");
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");
  const dateKey = normalizeDateKey(date);
  const snap = await get(
    ref(db, `${INDEX_UNIQUE}/${schoolId.trim()}/${classId.trim()}/${dateKey}`),
  );
  return snap.exists();
}

export async function createAttendance(classId, data) {
  if (!isString(classId)) throw error("classId é obrigatório.");
  if (!data || typeof data !== "object") throw error("Dados inválidos.");

  const { teacherId, subjectId, schoolId, date, students, notes = "" } = data;

  if (!isString(teacherId)) throw error("teacherId é obrigatório.");
  if (!isString(subjectId)) throw error("subjectId é obrigatório.");
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");

  validateStudents(students);

  // CORRIGIDO: passa schoolId para getClassSnapshot
  const classSnapshot = await getClassSnapshot(schoolId.trim(), classId.trim());
  if (!classSnapshot) throw error("Turma não encontrada.");

  if (classSnapshot.schoolId !== schoolId.trim()) {
    throw error("Turma não pertence a esta escola.");
  }

  // CORRIGIDO: verificação de permissão inline, sem canCreateAttendance inexistente
  const assignmentSnap = await get(
    ref(db, `indexes/teacherClasses/${teacherId.trim()}/${classId.trim()}`),
  );
  if (!assignmentSnap.exists()) {
    throw error("Sem permissão para criar chamada nesta turma.");
  }

  const dateKey = normalizeDateKey(date);
  const normalizedSchoolId = schoolId.trim();
  const normalizedClassId = classId.trim();
  const normalizedTeacherId = teacherId.trim();
  const normalizedSubjectId = subjectId.trim();

  const attendanceId = buildAttendanceId({
    schoolId: normalizedSchoolId,
    classId: normalizedClassId,
    dateKey,
  });

  const uniqueRef = ref(
    db,
    `${INDEX_UNIQUE}/${normalizedSchoolId}/${normalizedClassId}/${dateKey}`,
  );

  const lockResult = await runTransaction(uniqueRef, (current) => {
    if (current !== null) return;
    return attendanceId;
  });

  if (!lockResult.committed) {
    throw error("Já existe chamada para essa turma nessa data.");
  }

  const payload = {
    classId: normalizedClassId,
    subjectId: normalizedSubjectId,
    teacherId: normalizedTeacherId,
    schoolId: normalizedSchoolId,
    date: dateKey,
    students,
    notes: String(notes).trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await set(ref(db, `${ATTENDANCE_PATH}/${attendanceId}`), payload);
    await writeAttendanceIndexes(attendanceId, payload, dateKey);
    return normalizeAttendance(attendanceId, payload);
  } catch (e) {
    await runTransaction(uniqueRef, () => null);
    throw e;
  }
}

export async function getAttendanceByClass(classId, schoolId) {
  if (!isString(classId)) throw error("classId é obrigatório.");
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");

  const ids = await fetchIdsAtPath(
    `${INDEX_BY_CLASS}/${schoolId.trim()}/${classId.trim()}`,
  );

  const items = await Promise.all(ids.map((id) => fetchAttendanceById(id)));

  return items
    .filter(Boolean)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function getAttendanceByDate(classId, date, schoolId) {
  if (!isString(classId)) throw error("classId é obrigatório.");
  if (!isString(schoolId)) throw error("schoolId é obrigatório.");

  const dateKey = normalizeDateKey(date);
  const snap = await get(
    ref(db, `${INDEX_UNIQUE}/${schoolId.trim()}/${classId.trim()}/${dateKey}`),
  );

  if (!snap.exists()) return null;
  return fetchAttendanceById(snap.val());
}

export async function updateAttendance(attendanceId, data) {
  if (!isString(attendanceId)) throw error("attendanceId é obrigatório.");
  if (!data || typeof data !== "object") throw error("Dados inválidos.");

  const current = await fetchAttendanceById(attendanceId.trim());
  if (!current) throw error("Chamada não encontrada.");

  const payload = {};

  if ("students" in data) {
    validateStudents(data.students);
    payload.students = data.students;
  }

  if ("notes" in data) {
    payload.notes = String(data.notes ?? "").trim();
  }

  if (
    "classId" in data ||
    "teacherId" in data ||
    "subjectId" in data ||
    "schoolId" in data ||
    "date" in data
  ) {
    throw error(
      "classId, teacherId, subjectId, schoolId e date não podem ser alterados.",
    );
  }

  payload.updatedAt = Date.now();
  await update(ref(db, `${ATTENDANCE_PATH}/${current.id}`), payload);
  return fetchAttendanceById(current.id);
}

export async function removeAttendance(attendanceId) {
  if (!isString(attendanceId)) throw error("attendanceId é obrigatório.");
  const current = await fetchAttendanceById(attendanceId.trim());
  if (!current) return false;
  await removeAttendanceIndexes(current);
  await set(ref(db, `${ATTENDANCE_PATH}/${current.id}`), null);
  return true;
}

export const attendanceService = {
  createAttendance,
  getAttendanceByClass,
  getAttendanceByDate,
  updateAttendance,
  preventDuplicateAttendance,
};
