import { ref, get } from "firebase/database";
import { db } from "../../firebase.js";
import { authStore } from "../../store/auth.store.js";

const err = (msg, code = "query-error") =>
  Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err("Sessão inativa.", "unauthenticated");
  return u;
}

function requireGuardian(u) {
  if (u.role !== "guardian") throw err("Acesso exclusivo para responsáveis.");
}

async function getLinkedStudentIds(guardianId) {
  const snap = await get(ref(db, `guardianStudents/${guardianId}`));
  return Object.keys(snap.val() || {});
}

async function assertStudentLinked(guardianId, studentId) {
  const snap = await get(
    ref(db, `guardianStudents/${guardianId}/${studentId}`),
  );
  if (!snap.exists()) throw err("Este aluno não está vinculado à sua conta.");
}

async function getAttendanceIdsForClass(schoolId, classId) {
  const snap = await get(
    ref(db, `indexes/attendanceByClass/${schoolId}/${classId}`),
  );
  return Object.keys(snap.val() || {});
}

/**
 * Responsável lista os alunos vinculados à sua conta.
 * Requer: /students/{studentId} com dados do aluno.
 */
export async function getMyStudents() {
  const u = actor();
  requireGuardian(u);

  const studentIds = await getLinkedStudentIds(u.uid);

  const students = await Promise.all(
    studentIds.map(async (id) => {
      const snap = await get(ref(db, `students/${id}`));
      return snap.exists() ? { id, ...snap.val() } : null;
    }),
  );

  return students.filter(Boolean);
}

/**
 * Responsável consulta o histórico de presença de um aluno vinculado.
 *
 * Requer os índices:
 *   - /guardianStudents/{guardianId}/{studentId}: true
 *   - /indexes/studentClasses/{studentId}/{classId}: true  (manter ao matricular)
 *   - /indexes/attendanceByClass/{schoolId}/{classId}/{attendanceId}: true
 *
 * Retorna apenas o status do aluno específico, não expõe dados de outros alunos.
 */
export async function getStudentAttendance(studentId) {
  const u = actor();
  requireGuardian(u);

  await assertStudentLinked(u.uid, studentId);

  // Busca turmas do aluno via índice
  const classSnap = await get(ref(db, `indexes/studentClasses/${studentId}`));
  const classIds = Object.keys(classSnap.val() || {});

  if (classIds.length === 0) return [];

  const allRecords = [];

  for (const classId of classIds) {
    const classData = await get(ref(db, `schools/${u.schoolId}/classes/${classId}`));
    if (!classData.exists()) continue;

    const schoolId = classData.val().schoolId;
    const attendanceIds = await getAttendanceIdsForClass(schoolId, classId);

    const records = await Promise.all(
      attendanceIds.map(async (attendanceId) => {
        const snap = await get(ref(db, `attendance/${attendanceId}`));
        if (!snap.exists()) return null;

        const data = snap.val();
        const status = data?.students?.[studentId];
        if (!status) return null;

        // Retorna apenas o status do aluno — não expõe outros alunos
        return {
          attendanceId,
          classId,
          date: data.date,
          status,
        };
      }),
    );

    allRecords.push(...records.filter(Boolean));
  }

  return allRecords.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Responsável consulta o resumo de frequência de um aluno.
 * Retorna taxa de presença e histórico completo.
 */
export async function getStudentHistory(studentId) {
  const u = actor();
  requireGuardian(u);

  const records = await getStudentAttendance(studentId);

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    studentId,
    summary: { total, present, absent, late, attendanceRate },
    records,
  };
}
