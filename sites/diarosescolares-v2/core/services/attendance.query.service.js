import { ref, get } from 'firebase/database';
import { db } from '../firebase.js';
import { authStore } from '../store/auth.store.js';
import { getAttendanceByClass, getAttendanceByDate } from './attendance.service.js';

const err = (msg, code = 'query-error') => Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err('Sessão inativa.', 'unauthenticated');
  return u;
}

async function assertClassAccess(u, classId) {
  const snap = await get(ref(db, `classes/${classId}`));
  if (!snap.exists()) throw err('Turma não encontrada.');

  const klass = snap.val();
  if (klass.schoolId !== u.schoolId) throw err('Acesso negado. Escola incompatível.');

  if (u.role === 'teacher') {
    const assigned = await get(ref(db, `indexes/teacherClasses/${u.uid}/${classId}`));
    if (!assigned.exists()) throw err('Você não está vinculado a esta turma.');
  }

  return klass;
}

/**
 * Retorna todas as chamadas de uma turma.
 * - Director: qualquer turma da escola.
 * - Teacher: apenas turmas vinculadas.
 */
export async function getAttendanceForClass(classId) {
  const u = actor();
  if (u.role === 'guardian') throw err('Responsáveis não têm acesso direto ao histórico de chamadas.');

  await assertClassAccess(u, classId);
  return getAttendanceByClass(classId);
}

/**
 * Retorna a chamada de uma turma em uma data específica.
 */
export async function getAttendanceForDate(classId, date) {
  const u = actor();
  if (u.role === 'guardian') throw err('Acesso negado.');

  await assertClassAccess(u, classId);
  return getAttendanceByDate(classId, date);
}

/**
 * Professor consulta seu histórico de chamadas (todas as suas turmas).
 * Usa o índice teacherClasses para evitar scan global.
 */
export async function getMyAttendanceHistory() {
  const u = actor();
  if (u.role !== 'teacher') throw err('Apenas professores podem consultar o próprio histórico.');

  const classSnap = await get(ref(db, `indexes/teacherClasses/${u.uid}`));
  const classIds = Object.keys(classSnap.val() || {});

  if (classIds.length === 0) return [];

  const recordsByClass = await Promise.all(
    classIds.map(classId => getAttendanceByClass(classId))
  );

  return recordsByClass
    .flat()
    .filter(r => r.teacherId === u.uid)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Diretor consulta todas as chamadas da escola em um período.
 * Usa o índice attendanceByDate para evitar scan completo.
 */
export async function getSchoolAttendanceByDate(date) {
  const u = actor();
  if (u.role !== 'director') throw err('Apenas diretores podem consultar chamadas da escola.');

  const snap = await get(ref(db, `indexes/attendanceByDate/${u.schoolId}/${date}`));
  const classIds = snap.val() || {};

  const records = await Promise.all(
    Object.values(classIds).map(classId => getAttendanceByDate(classId, date))
  );

  return records.filter(Boolean);
}
