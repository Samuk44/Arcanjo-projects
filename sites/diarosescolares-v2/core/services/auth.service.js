import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase.js";
import { userService } from "./user.service.js";

const ALLOWED_ROLES = new Set(["teacher", "director", "guardian"]);
const RETRY_DELAY_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeRole = (role) => role.trim().toLowerCase();

const buildError = (message) => {
  const error = new Error(message);
  error.code = "auth-service-error";
  return error;
};

const validateRegisterData = ({ name, email, password, role, schoolId }) => {
  if (!isNonEmptyString(name)) throw buildError("O nome é obrigatório.");
  if (!isNonEmptyString(email)) throw buildError("O e-mail é obrigatório.");
  if (!isNonEmptyString(password)) throw buildError("A senha é obrigatória.");
  if (!isNonEmptyString(role)) throw buildError("O role é obrigatório.");
  if (!isNonEmptyString(schoolId))
    throw buildError("O schoolId é obrigatório.");

  const normalizedRole = normalizeRole(role);
  if (!ALLOWED_ROLES.has(normalizedRole)) {
    throw buildError("Role inválida.");
  }

  return {
    name: name.trim(),
    email: normalizeEmail(email),
    password,
    role: normalizedRole,
    schoolId: schoolId.trim(),
  };
};

async function resolveUserProfile(uid, retries = 0) {
  let result = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    result = await userService.getUser(uid);
    if (result) return result;
    if (attempt < retries) await sleep(RETRY_DELAY_MS);
  }

  return result;
}

export async function login(email, password) {
  if (!isNonEmptyString(email)) throw buildError("O e-mail é obrigatório.");
  if (!isNonEmptyString(password)) throw buildError("A senha é obrigatória.");

  const credential = await signInWithEmailAndPassword(
    auth,
    normalizeEmail(email),
    password,
  );

  const user = await resolveUserProfile(credential.user.uid, 2);

  if (!user) {
    await signOut(auth);
    throw buildError("Usuário autenticado, mas perfil não encontrado.");
  }

  return user;
}

export async function register({ name, email, password, role, schoolId }) {
  const payload = validateRegisterData({
    name,
    email,
    password,
    role,
    schoolId,
  });

  const credential = await createUserWithEmailAndPassword(
    auth,
    payload.email,
    payload.password,
  );

  try {
    await userService.createUser(credential.user.uid, {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      schoolId: payload.schoolId,
    });

    const user = await resolveUserProfile(credential.user.uid, 2);
    if (!user)
      throw buildError("Perfil criado, mas não foi possível carregá-lo.");

    return user;
  } catch (error) {
    try {
      await deleteUser(credential.user);
    } catch {
      // limpa o que der, sem esconder o erro original
    }
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

export async function getCurrentUser() {
  const current = auth.currentUser;
  if (!current) return null;

  const user = await resolveUserProfile(current.uid, 2);
  if (!user) {
    throw buildError("Sessão encontrada, mas o perfil do usuário não existe.");
  }

  return user;
}

export function observeAuthState(callback) {
  if (typeof callback !== "function") {
    throw buildError("callback precisa ser uma função.");
  }

  return onAuthStateChanged(auth, (firebaseUser) => {
    (async () => {
      try {
        if (!firebaseUser) {
          callback(null);
          return;
        }

        const user = await resolveUserProfile(firebaseUser.uid, 3);
        callback(user);
      } catch {
        callback(null);
      }
    })();
  });
}
