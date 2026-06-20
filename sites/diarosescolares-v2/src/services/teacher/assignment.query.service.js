import { ref, get } from "firebase/database";
import { db } from "../../firebase.js";
import { authStore } from "../../store/auth.store.js";
import {
  getTeacherAssignments,
  getClassAssignments,
} from "./assignment.service.js";

const err = (msg, code = "query-error") =>
  Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err("Sessão inativa.", "unauthenticated");
  return u;
}

async function fetchIds(path) {
  const snap = await get(ref(db, path));
  return Object.keys(snap.val() || {});
}

/**
 * Retorna os vínculos do usuário autenticado.
 * - Teacher: os próprios vínculos.
 * - Director: todos os vínculos da escola.
 */
export async function getMyAssignments() {
  const u = actor();

  if (u.role === "teacher") {
    return getTeacherAssignments(u.uid);
  }

  if (u.role === "director") {
    const ids = await fetchIds(`indexes/assignmentsBySchool/${u.schoolId}`);

    const items = await Promise.all(
      ids.map(async (id) => {
        const snap = await get(ref(db, `teacherAssignments/${id}`));
        return snap.exists() ? { id, ...snap.val() } : null;
      }),
    );

    return items
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  throw err("Responsáveis não têm acesso a vínculos de professores.");
}

/**
 * Retorna os vínculos de uma turma específica.
 * - Teacher: apenas se estiver vinculado à turma.
 * - Director: qualquer turma da escola.
 */
export async function getAssignmentsByClass(classId) {
  const u = actor();

  if (u.role === "guardian") throw err("Acesso negado.");

  const classSnap = await get(ref(db, `schools/${u.schoolId}/classes/${classId}`));
  if (!classSnap.exists()) throw err("Turma não encontrada.");
  if (classSnap.val().schoolId !== u.schoolId)
    throw err("Acesso negado. Escola incompatível.");

  if (u.role === "teacher") {
    const assigned = await get(
      ref(db, `indexes/teacherClasses/${u.uid}/${classId}`),
    );
    if (!assigned.exists()) throw err("Você não está vinculado a esta turma.");
  }

  return getClassAssignments(classId);
}

/**
 * Diretor busca todos os vínculos de um professor específico da escola.
 */
export async function getTeacherAssignmentsByDirector(teacherId) {
  const u = actor();
  if (u.role !== "director")
    throw err(
      "Apenas diretores podem consultar vínculos de outros professores.",
    );

  const teacherSnap = await get(ref(db, `users/${teacherId}`));
  if (!teacherSnap.exists()) throw err("Professor não encontrado.");
  if (teacherSnap.val().schoolId !== u.schoolId)
    throw err("Este professor não pertence à sua escola.");

  return getTeacherAssignments(teacherId);
}
