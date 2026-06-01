import {
  login as serviceLogin,
  register as serviceRegister,
  logout as serviceLogout,
  observeAuthState,
} from '../core/services/auth.service.js';
import { authStore } from '../core/store/auth.store.js';

const ROLE_ROUTES = {
  teacher: '/app/professor/',
  director: '/app/director/',
  guardian: '/app/guardian/',
};

const ERROR_MESSAGES = {
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
};

function redirectByRole(role) {
  const path = ROLE_ROUTES[role];
  if (!path) throw new Error(`Role desconhecida: "${role}". Contate o administrador.`);
  window.location.href = path;
}

function formatError(code) {
  return ERROR_MESSAGES[code] ?? 'Erro inesperado. Tente novamente.';
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
    redirectByRole(user.role);
    return true;
  },

  async guardRoute(expectedRole) {
    const user = await this.checkSession();

    if (!user) {
      window.location.href = '/auth/login.html';
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
    redirectByRole(userData.role);
  },

  async register({ name, email, password, role, schoolId }) {
    const userData = await serviceRegister({ name, email, password, role, schoolId });
    authStore.setUser(userData);
    redirectByRole(userData.role);
  },

  async logout() {
    await serviceLogout();
    authStore.clearUser();
    window.location.href = '/auth/login.html';
  },

  bindLoginForm(formEl, errorEl) {
    const btn = formEl.querySelector('button[type="submit"]');

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      try {
        await this.login(formEl.email.value.trim(), formEl.password.value);
      } catch (err) {
        errorEl.textContent = formatError(err.code);
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    });
  },

  bindRegisterForm(formEl, errorEl) {
    const btn = formEl.querySelector('button[type="submit"]');

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Cadastrando...';

      try {
        await this.register({
          name: formEl.fullName.value.trim(),
          email: formEl.email.value.trim(),
          password: formEl.password.value,
          role: formEl.role.value,
          schoolId: formEl.schoolId.value.trim(),
        });
      } catch (err) {
        errorEl.textContent = formatError(err.code);
        btn.disabled = false;
        btn.textContent = 'Cadastrar';
      }
    });
  },
};
