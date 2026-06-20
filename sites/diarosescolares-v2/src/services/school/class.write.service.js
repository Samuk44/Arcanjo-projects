// src/services/school/class.write.service.js
import { authStore } from "../../store/auth.store.js";
import { createClass, getClassById, updateClass } from "./class.service.js";

const err = (msg, code = "write-forbidden") =>
  Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err("Sessão inativa.", "unauthenticated");
  return u;
}

function requireDirector(u) {
  if (u.role !== "director")
    throw err("Apenas diretores podem gerenciar turmas.");
}

async function fetchOwnClass(u, classId) {
  const klass = await getClassById(u.schoolId, classId).catch(() => null);
  if (!klass) throw err("Turma não encontrada.");
  if (klass.schoolId !== u.schoolId)
    throw err("Acesso negado. Esta turma não pertence à sua escola.");
  return klass;
}

/**
 * Cria uma turma na escola do diretor autenticado.
 * schoolId vem do auth — nunca do cliente.
 */
export async function addClass({ name, grade, shift }) {
  const u = actor();
  requireDirector(u);
  return createClass({ name, grade, shift, schoolId: u.schoolId });
}

/**
 * Atualiza uma turma. Valida pertencimento à escola antes de alterar.
 */
export async function editClass(classId, data) {
  const u = actor();
  requireDirector(u);
  await fetchOwnClass(u, classId);
  // updateClass(classId, schoolId, data) — assinatura correta do class.service.js
  return updateClass(classId, u.schoolId, data);
}
