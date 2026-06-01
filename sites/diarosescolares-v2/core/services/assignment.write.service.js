import { ref, get } from 'firebase/database';
import { db } from '../firebase.js';
import { authStore } from '../store/auth.store.js';
import { assignTeacherToClass, removeAssignment } from './assignment.service.js';

const err = (msg, code = 'write-forbidden') => Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err('Sessão inativa.', 'unauthenticated');
  return u;
}

function requireDirector(u) {
  if (u.role !== 'director') throw err('Apenas diretores podem gerenciar vínculos de professores.');
}

async function assertTeacherInSchool(teacherId, schoolId) {
  const snap = await get(ref(db, `users/${teacherId}`));
  if (!snap.exists()) throw err('Professor não encontrado.');
  const data = snap.val();
  if (data.role !== 'teacher') throw err('O usuário informado não é um professor.');
  if (data.schoolId !== schoolId) throw err('Este professor não pertence à sua escola.');
}

async function assertAssignmentInSchool(assignmentId, schoolId) {
  const snap = await get(ref(db, `teacherAssignments/${assignmentId}`));
  if (!snap.exists()) throw err('Vínculo não encontrado.');
  if (snap.val().schoolId !== schoolId) throw err('Acesso negado. Escola incompatível.');
}

/**
 * Vincula um professor a uma turma/disciplina.
 * schoolId sempre vem do diretor autenticado — nunca do cliente.
 */
export async function linkTeacher({ teacherId, classId, subjectId }) {
  const u = actor();
  requireDirector(u);

  await assertTeacherInSchool(teacherId, u.schoolId);

  return assignTeacherToClass({
    teacherId,
    classId,
    subjectId,
    schoolId: u.schoolId,
  });
}

/**
 * Remove o vínculo professor–turma. Valida escola antes de remover.
 */
export async function unlinkTeacher(assignmentId) {
  const u = actor();
  requireDirector(u);

  await assertAssignmentInSchool(assignmentId, u.schoolId);
  return removeAssignment(assignmentId);
}
