import { authStore } from '../store/auth.store.js';
import { getUser, updateUser } from './user.service.js';

const err = (msg, code = 'write-forbidden') => Object.assign(new Error(msg), { code });

function actor() {
  const u = authStore.getUser();
  if (!u) throw err('Sessão inativa.', 'unauthenticated');
  return u;
}

const SELF_ALLOWED_FIELDS = new Set(['name']);
const DIRECTOR_ALLOWED_FIELDS = new Set(['name', 'role']);

/**
 * Qualquer usuário atualiza apenas o próprio perfil.
 * Campos permitidos: name.
 * email, role e schoolId não são alteráveis pelo próprio usuário.
 */
export async function updateOwnProfile(data) {
  const u = actor();

  const payload = {};
  for (const key of SELF_ALLOWED_FIELDS) {
    if (key in data) payload[key] = data[key];
  }

  if (Object.keys(payload).length === 0) {
    throw err('Nenhum campo válido para atualizar.');
  }

  return updateUser(u.uid, payload);
}

/**
 * Diretor atualiza dados de um membro da própria escola.
 * Campos permitidos: name, role.
 * Diretor não pode alterar a escola de um usuário.
 */
export async function updateSchoolMember(targetUid, data) {
  const u = actor();

  if (u.role !== 'director') {
    throw err('Apenas diretores podem editar outros usuários.');
  }

  const target = await getUser(targetUid);
  if (!target) throw err('Usuário não encontrado.');
  if (target.schoolId !== u.schoolId) {
    throw err('Acesso negado. Este usuário não pertence à sua escola.');
  }

  const payload = {};
  for (const key of DIRECTOR_ALLOWED_FIELDS) {
    if (key in data) payload[key] = data[key];
  }

  if (Object.keys(payload).length === 0) {
    throw err('Nenhum campo válido para atualizar.');
  }

  return updateUser(targetUid, payload);
}
