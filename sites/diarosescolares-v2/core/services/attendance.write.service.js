import { ref, get } from 'firebase/database';
import { db } from '../firebase.js';
import { authStore } from '../store/auth.store.js';
import { createAttendance, updateAttendance, removeAttendance } from './attendance.service.js';

const err = (msg, code = 'write-forbidden') => Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err('Sessão inativa. Faça login novamente.', 'unauthenticated');
  return u;
}

function requireRole(u, ...roles) {
  if (!roles.includes(u.role)) {
    throw err(`Permissão negada. Requer: ${roles.join(' | ')}.`);
  }
}

async function fetchAttendance(attendanceId) {
  const snap = await get(ref(db, `attendance/${attendanceId}`));
  if (!snap.exists()) throw err('Chamada não encontrada.');
  return { id: attendanceId, ...snap.val() };
}

async function assertTeacherIsAssigned(uid, classId) {
  const snap = await get(ref(db, `indexes/teacherClasses/${uid}/${classId}`));
  if (!snap.exists()) throw err('Você não está vinculado a esta turma.');
}

/**
 * Registra uma nova chamada.
 * teacherId e schoolId vêm do auth — nunca do cliente.
 */
export async function submitAttendance({ classId, subjectId, date, students, notes = '' }) {
  const u = actor();
  requireRole(u, 'teacher', 'director');

  if (u.role === 'teacher') {
    await assertTeacherIsAssigned(u.uid, classId);
  }

  return createAttendance(classId, {
    teacherId: u.uid,
    subjectId,
    schoolId: u.schoolId,
    date,
    students,
    notes,
  });
}

/**
 * Atualiza presença/notas de uma chamada existente.
 * Professor só edita chamadas que ele mesmo criou.
 */
export async function editAttendance(attendanceId, { students, notes }) {
  const u = actor();
  requireRole(u, 'teacher', 'director');

  const record = await fetchAttendance(attendanceId);

  if (record.schoolId !== u.schoolId) throw err('Acesso negado. Escola incompatível.');

  if (u.role === 'teacher' && record.teacherId !== u.uid) {
    throw err('Você não pode editar chamadas de outros professores.');
  }

  return updateAttendance(attendanceId, { students, notes });
}

/**
 * Remove uma chamada. Apenas diretores.
 */
export async function deleteAttendance(attendanceId) {
  const u = actor();
  requireRole(u, 'director');

  const record = await fetchAttendance(attendanceId);
  if (record.schoolId !== u.schoolId) throw err('Acesso negado. Escola incompatível.');

  return removeAttendance(attendanceId);
}
