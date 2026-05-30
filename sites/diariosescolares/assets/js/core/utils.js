/* SGE v2.0 • Utility Functions */

// --- Máscaras ---
export const maskCPF = (v) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
export const maskPhone = (v) =>
  v
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .substring(0, 15);
export const maskDate = (v) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .substring(0, 10);

// --- Validações ---
export function validateCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let s = 0,
    d = 0;
  for (let i = 1; i <= 9; i++)
    s += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  d = (s * 10) % 11;
  if (d === 10 || d === 11) d = 0;
  if (d !== parseInt(cpf.substring(9, 10))) return false;
  s = 0;
  for (let i = 1; i <= 10; i++)
    s += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  d = (s * 10) % 11;
  if (d === 10 || d === 11) d = 0;
  return d === parseInt(cpf.substring(10, 11));
}

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function validatePasswordStrength(pass) {
  let score = 0;
  const checks = {
    length: pass.length >= 8,
    uppercase: /[A-Z]/.test(pass),
    number: /[0-9]/.test(pass),
    special: /[^A-Za-z0-9]/.test(pass),
  };
  Object.values(checks).forEach((v) => v && score++);
  return { score, checks };
}

// --- Formatações ---
export const formatDate = (date) =>
  new Intl.DateTimeFormat("pt-BR").format(new Date(date));
export const formatCurrency = (val) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    val,
  );

export function formatRelativeTime(date) {
  if (!date) return "Data inválida";

  const now = Date.now();
  const target = new Date(date).getTime();
  const diff = (now - target) / 1000; // segundos

  // Datas futuras
  if (diff < 0) return "em breve";

  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;

  // Fallback para datas muito antigas
  return formatDate(date);
}
// --- Utilitários ---
export const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

export const sanitizeHTML = (str) => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

export const generateUID = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
// --- Storage Helpers com TTL ---
export const storage = {
  set: (key, value, ttlMinutes = null) => {
    const item = {
      value,
      expiry: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : null,
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  get: (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (item.expiry && Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  },
};

// --- Throttle (complemento do debounce) ---
export const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// --- Deep Clone (para evitar mutações acidentais) ---
export const deepClone = (obj) =>
  structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
export const createRateLimiter = (maxRequests = 5, windowMs = 60000) => {
  const requests = [];
  return {
    canRequest: () => {
      const now = Date.now();
      while (requests.length > 0 && requests[0] <= now - windowMs) {
        requests.shift();
      }
      if (requests.length < maxRequests) {
        requests.push(now);
        return true;
      }
      return false;
    },
  };
};

// Uso em formulários de login/cadastro
const loginRateLimiter = createRateLimiter(3, 900000);
