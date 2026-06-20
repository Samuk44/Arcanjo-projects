import { ref, get } from "firebase/database";
import { db } from "../../firebase.js";
import { authStore } from "../../store/auth.store.js";
import { getClassById, getClassesBySchool } from "./class.service.js";

const err = (msg, code = "query-error") =>
  Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err("Sessão inativa.", "unauthenticated");
  return u;
}

/**
 * Retorna as turmas acessíveis ao usuário autenticado.
 * - Director: todas as turmas da escola.
 * - Teacher: apenas as turmas vinculadas via teacherClasses.
 */
export async function getMyClasses() {
  const u = actor();

  if (u.role === "director") {
    return getClassesBySchool(u.schoolId);
  }

  if (u.role === "teacher") {
    const snap = await get(ref(db, `indexes/teacherClasses/${u.uid}`));
    const classIds = Object.keys(snap.val() || {});

    const classes = await Promise.all(classIds.map(getClass));

    return classes
      .filter((c) => c && c.schoolId === u.schoolId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  throw err("Responsáveis não têm acesso direto à lista de turmas.");
}

/**
 * Busca uma turma por ID.
 * Valida que o usuário tem acesso a ela (escola + vínculo para professores).
 */
export async function getClassById(classId) {
  const u = actor();

  const klass = await getClassById(u.schoolId, classId);
  if (!klass) throw err("Turma não encontrada.");
  if (klass.schoolId !== u.schoolId) throw err("Acesso negado.");

  if (u.role === "teacher") {
    const snap = await get(
      ref(db, `indexes/teacherClasses/${u.uid}/${classId}`),
    );
    if (!snap.exists()) throw err("Você não está vinculado a esta turma.");
  }

  if (u.role === "guardian") {
    throw err("Responsáveis não têm acesso a dados de turmas.");
  }

  return klass;
}
