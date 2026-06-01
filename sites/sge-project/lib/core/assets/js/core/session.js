/* SGE v2.0 • Session Management */

const SESSION_KEY = "sge_session";
const TTL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Salva os dados do usuário na sessão
 * @param {Object} userData
 */
export function saveSession(userData) {
  const sessionData = {
    ...userData,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Recupera os dados da sessão atual
 * @returns {Object|null}
 */
export function getSession() {
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;

  const session = JSON.parse(data);
  const isExpired = Date.now() - session.timestamp > TTL;

  if (isExpired) {
    clearSession();
    return null;
  }

  return session;
}

/**
 * Limpa a sessão atual
 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.clear();
}

/**
 * Verifica se a sessão é válida
 * @returns {boolean}
 */
export function isSessionValid() {
  return getSession() !== null;
}

/**
 * Atualiza um campo específico na sessão
 * @param {string} key
 * @param {any} value
 */
export function updateSessionField(key, value) {
  const session = getSession();
  if (session) {
    session[key] = value;
    session.timestamp = Date.now(); // Renova o timestamp no update
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export const generateCSRFToken = () => {
  const token = btoa(`${Date.now()}-${Math.random().toString(36).substr(2)}`);
  sessionStorage.setItem("csrfToken", token);
  return token;
};

export const validateCSRFToken = (token) => {
  return sessionStorage.getItem("csrfToken") === token;
};

export const setupSessionTimeout = (timeoutMs = 1800000) => {
  // 30 minutos
  let timeout;

  const resetTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        const { auth } = await import("../firebase/config.js");
        const { signOut } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js");
        await signOut(auth);
      } catch {}
      window.location.replace("../auth/login.html");
    }, timeoutMs);
  };

  ["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
    window.addEventListener(event, resetTimeout);
  });

  resetTimeout();
};
