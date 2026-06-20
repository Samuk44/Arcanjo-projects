import { auth } from "../firebase/firebase.config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getUserProfile,
  createDirectorUser,
  createTeacherUser,
  createGuardianUser,
  updateLastLogin,
} from "../services/user/user.service.js";
import {
  validateInviteCode,
  consumeInvite,
} from "../services/invite/invite.service.js";
import { Logger } from "../assets/js/shared/logger.js";

const ERROR_MAP = {
  "auth/invalid-credential": "E-mail ou senha inválidos.",
  "auth/user-not-found": "Usuário não encontrado.",
  "auth/wrong-password": "Senha incorreta.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
  "auth/user-disabled": "Esta conta foi desabilitada pelo administrador.",
  "auth/invalid-email": "E-mail inválido.",
};

function mapFirebaseError(err) {
  const mapped = ERROR_MAP[err?.code];
  if (mapped) {
    const e = new Error(mapped);
    e.code = err.code;
    return e;
  }
  return err?.message ? err : new Error("Erro inesperado. Tente novamente.");
}

export async function login(email, password) {
  if (!email || !password) {
    throw new Error("Preencha e-mail e senha.");
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);
    await updateLastLogin(credential.user.uid);

    Logger.info("auth.login.success", {
      uid: credential.user.uid,
      role: profile.role,
    });
    return { ...profile, uid: credential.user.uid };
  } catch (err) {
    if (err.code === "USER_NOT_FOUND_IN_RTDB") {
      await signOut(auth).catch(() => {});
      throw new Error("Perfil não encontrado no banco de dados.");
    }
    throw mapFirebaseError(err);
  }
}

export async function registerDirector({
  name,
  email,
  password,
  schoolName,
  city,
  state,
  phone,
  cnpj,
}) {
  if (!name || !email || !password || !schoolName || !cnpj) {
    throw new Error("Campos obrigatórios ausentes para registro de diretor.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await updateProfile(credential.user, { name: name.trim() });

  const { createSchoolWithOwner } =
    await import("../services/tenant/tenant.service.js");
  const { schoolId } = await createSchoolWithOwner({
    directorUid: credential.user.uid,
    directorEmail: email,
    schoolName,
    city,
    state,
    phone,
    cnpj,
  });

  const profile = await createDirectorUser({
    uid: credential.user.uid,
    email,
    name,
    schoolId,
    phone,
    cnpj,
  });

  return { ...profile, uid: credential.user.uid };
}

export async function registerWithInvite({
  name,
  email,
  password,
  inviteCode,
  role,
}) {
  if (!name || !email || !password || !inviteCode || !role) {
    throw new Error("Campos obrigatórios ausentes.");
  }

  if (!["teacher", "guardian"].includes(role)) {
    throw new Error("Papel inválido para registro com convite.");
  }

  const invite = await validateInviteCode(inviteCode);
  if (invite.role !== role) {
    throw new Error(`Este convite não é válido para o papel de ${role}.`);
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await updateProfile(credential.user, { name: name.trim() });

  let profile;
  if (role === "teacher") {
    profile = await createTeacherUser({
      uid: credential.user.uid,
      email,
      name: name,
      schoolId: invite.schoolId,
    });
  } else {
    // CORRIGIDO: era createDirectorUser, deve ser createGuardianUser
    profile = await createGuardianUser({
      uid: credential.user.uid,
      email,
      name,
      schoolId: invite.schoolId,
    });
  }

  await consumeInvite(inviteCode, credential.user.uid);

  return { ...profile, uid: credential.user.uid };
}

export async function logout() {
  await signOut(auth);
  Logger.info("auth.logout.success");
}

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      callback({ ...profile, uid: firebaseUser.uid });
    } catch {
      callback(null);
    }
  });
}
