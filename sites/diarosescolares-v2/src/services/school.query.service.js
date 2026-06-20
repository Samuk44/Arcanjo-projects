// src/services/school.query.service.js
import { authStore } from "../store/auth.store.js";
import { getSchool } from "./tenant/tenant.service.js";
import {
  getSchoolUsers as _getSchoolUsers,
  getUsersByRole,
} from "./school/school-user.query.service.js";

const err = (msg, code = "query-error") =>
  Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err("Sessão inativa.", "unauthenticated");
  return u;
}

/**
 * Qualquer usuário autenticado consulta os dados da própria escola.
 */
export async function getMySchool() {
  const u = actor();
  const school = await getSchool(u.schoolId);
  if (!school) throw err("Escola não encontrada.");
  return school;
}

/**
 * Diretor lista usuários da escola.
 * @param {string} [role] - opcional: filtrar por teacher | director | guardian
 */
export async function getSchoolUsers(role) {
  const u = actor();
  if (u.role !== "director")
    throw err("Apenas diretores podem listar usuários da escola.");

  if (role) {
    return getUsersByRole(u.schoolId, role);
  }

  return _getSchoolUsers(u.schoolId);
}

/**
 * Diretor lista professores da escola.
 */
export async function getSchoolTeachers() {
  return getSchoolUsers("teacher");
}

/**
 * Diretor lista responsáveis da escola.
 */
export async function getSchoolGuardians() {
  return getSchoolUsers("guardian");
}
