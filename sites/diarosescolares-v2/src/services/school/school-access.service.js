import { authStore } from "../../store/auth.store.js";

const err = (msg, code = "query-error") =>
  Object.assign(new Error(msg), { code });

export function actor() {
  const u = authStore.getUser();
  if (!u) throw err("Sessão inativa.", "unauthenticated");
  return u;
}

export function requireSchoolMember() {
  const u = actor();
  if (!u.schoolId) throw err("Usuário não pertence a uma escola.");
  return u;
}

export function requireDirector() {
  const u = actor();
  if (u.role !== "director")
    throw err("Apenas diretores podem realizar esta ação.");
  return u;
}
