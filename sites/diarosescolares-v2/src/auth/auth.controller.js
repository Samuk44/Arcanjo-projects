import {
  login as serviceLogin,
  logout as serviceLogout,
  observeAuthState,
} from "./auth.service.js";
import { authStore } from "../core/store/auth.store.js";

const ROLE_ROUTES = {
  teacher: "/app/professor/",
  director: "/app/director/",
  guardian: "/app/guardian/",
};

const ERROR_MESSAGES = {
  "auth/user-not-found": "Usuário não encontrado.",
  "auth/wrong-password": "Senha incorreta.",
  "auth/invalid-credential": "E-mail ou senha inválidos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
  "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
};

function redirectByRole(role) {
  const path = ROLE_ROUTES[role];
  if (!path)
    throw new Error(`Role desconhecida: "${role}". Contate o administrador.`);
  window.location.href = path;
}

function formatError(code) {
  return ERROR_MESSAGES[code] ?? "Erro inesperado. Tente novamente.";
}

export const authController = {
  checkSession() {
    return new Promise((resolve) => {
      const unsubscribe = observeAuthState((user) => {
        unsubscribe();
        if (user) authStore.setUser(user);
        resolve(user ?? null);
      });
    });
  },

  async redirectIfAuthenticated() {
    const user = await this.checkSession();
    if (!user) return false;

    if (user.status === "disabled") {
      window.location.href = "/auth/account-disabled.html";
      return true;
    }

    redirectByRole(user.role);
    return true;
  },

  async guardRoute(expectedRole) {
    const user = await this.checkSession();

    if (!user) {
      window.location.href = "/auth/login.html";
      return null;
    }

    if (user.status === "disabled") {
      window.location.href = "/auth/account-disabled.html";
      return null;
    }

    if (user.role !== expectedRole) {
      redirectByRole(user.role);
      return null;
    }

    return user;
  },

  async login(email, password) {
    const userData = await serviceLogin(email, password);
    authStore.setUser(userData);

    if (userData.status === "disabled") {
      window.location.href = "/auth/account-disabled.html";
      return;
    }

    redirectByRole(userData.role);
  },

  async logout() {
    await serviceLogout();
    authStore.clearUser();
    window.location.href = "/auth/login.html";
  },
};
