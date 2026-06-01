"use strict";
/**
 * @file utils.js
 * @description Utilitários compartilhados do SGE v2. Importar com caminho ../../assets/js/utils.js
 */

// ── Formatação ────────────────────────────────────────────────────────────────

/**
 * Formata uma data para pt-BR (DD/MM/AAAA).
 * @param {string|number|Date} date
 * @returns {string}
 */
export const fmtDate = (date) => {
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  } catch {
    return "—";
  }
};

/**
 * Formata moeda BRL.
 * @param {number} val
 * @returns {string}
 */
export const fmtCurrency = (val) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    val,
  );

// ── Validação ─────────────────────────────────────────────────────────────────

/**
 * Valida se um valor está no range de notas (0.0–10.0, 1 casa decimal).
 * @param {string|number} valor
 * @returns {{ valid: boolean, value: number|null, error: string }}
 */
export function validateRange(valor) {
  if (valor === "" || valor === null || valor === undefined)
    return { valid: false, value: null, error: "Campo obrigatório" };
  const s = String(valor).trim();
  if (!/^\d{1,2}(\.\d)?$/.test(s))
    return { valid: false, value: null, error: "Use formato 0.0 a 10.0" };
  const n = parseFloat(s);
  if (isNaN(n) || n < 0 || n > 10)
    return {
      valid: false,
      value: null,
      error: "Nota deve ser entre 0.0 e 10.0",
    };
  return { valid: true, value: n, error: "" };
}

// ── UI ────────────────────────────────────────────────────────────────────────

/**
 * Exibe toast de feedback.
 * @param {string} message
 * @param {"success"|"error"|"warning"} type
 * @param {string} [containerId="toast-container"]
 */
export function showToast(
  message,
  type = "success",
  containerId = "toast-container",
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const icons = { success: "✅", error: "❌", warning: "⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `<span style="font-size:1.2rem">${icons[type] ?? "ℹ️"}</span>
    <div><div style="font-weight:700;font-size:.9rem">${type.toUpperCase()}</div>
    <div style="font-size:.85rem;opacity:.8">${message}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

/**
 * Retorna HTML de skeleton loader animado (Tailwind animate-pulse).
 * @param {number} [rows=5]
 * @returns {string}
 */
export function skeletonHTML(rows = 5) {
  return Array.from(
    { length: rows },
    () => `
    <div class="animate-pulse flex items-center gap-3 py-3 border-b border-gray-100">
      <div class="rounded-full bg-gray-200 h-9 w-9 flex-shrink-0"></div>
      <div class="flex-1 space-y-2">
        <div class="h-3 bg-gray-200 rounded w-3/4"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div class="h-8 bg-gray-200 rounded w-28"></div>
    </div>`,
  ).join("");
}

/**
 * Retorna HTML de empty state padronizado.
 * @param {string} titulo
 * @param {string} descricao
 * @param {string} [icon="ph-users"]
 * @param {string} [actionLabel=""] - se fornecido, renderiza botão com sendPrompt
 * @returns {string}
 */
export function emptyStateHTML(
  titulo,
  descricao,
  icon = "ph-users",
  actionLabel = "",
) {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center gap-2">
      <i class="${icon} text-4xl text-gray-300" aria-hidden="true"></i>
      <p class="font-semibold text-gray-500">${titulo}</p>
      <p class="text-sm text-gray-400">${descricao}</p>
      ${actionLabel ? `<button class="mt-2 px-4 py-2 text-sm bg-primary text-white rounded-lg">${actionLabel}</button>` : ""}
    </div>`;
}

// ── Debounce ──────────────────────────────────────────────────────────────────

/**
 * Debounce genérico.
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
export const debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// ── Sanitização ───────────────────────────────────────────────────────────────

/**
 * Escapa HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
export const sanitizeHTML = (str) => {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
};

// ── sessionStorage cache ──────────────────────────────────────────────────────

/**
 * Cache em sessionStorage com TTL opcional.
 */
export const sessionCache = {
  /** @param {string} key @param {*} value @param {number} [ttlMin] */
  set(key, value, ttlMin) {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        v: value,
        exp: ttlMin ? Date.now() + ttlMin * 60_000 : null,
      }),
    );
  },
  /** @param {string} key @returns {*} */
  get(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { v, exp } = JSON.parse(raw);
      if (exp && Date.now() > exp) {
        sessionStorage.removeItem(key);
        return null;
      }
      return v;
    } catch {
      return null;
    }
  },
  /** @param {string} key */
  del(key) {
    sessionStorage.removeItem(key);
  },
};

// ── Offline queue ─────────────────────────────────────────────────────────────

const OFFLINE_KEY = "sge_offline_queue";

/**
 * Enfileira operação para sincronização quando online.
 * @param {{ path: string, data: object, operation: "set"|"push"|"update" }} op
 */
export function enqueueOffline(op) {
  const q = JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? "[]");
  q.push({ ...op, ts: Date.now() });
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
}

/**
 * Retorna fila offline e limpa.
 * @returns {Array}
 */
export function flushOfflineQueue() {
  const q = JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? "[]");
  localStorage.setItem(OFFLINE_KEY, "[]");
  return q;
}

// ── Acessibilidade / Modal ────────────────────────────────────────────────────

/**
 * Configura fechar modal com ESC e retorno de foco.
 * @param {string} modalId
 * @param {Element} [triggerEl]
 */
export function setupModalEsc(modalId, triggerEl) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const handler = (e) => {
    if (e.key === "Escape") {
      modal.classList.remove("active");
      document.removeEventListener("keydown", handler);
      triggerEl?.focus();
    }
  };
  document.addEventListener("keydown", handler);
}

// ── Spinner no botão ──────────────────────────────────────────────────────────

/**
 * Seta estado loading no botão.
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 * @param {string} [label]
 */
export function setBtnLoading(btn, loading, label = "Salvar") {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<svg class="animate-spin h-4 w-4 mr-2 inline" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
       </svg>Salvando...`
    : label;
}

// ── Erro padronizado ──────────────────────────────────────────────────────────

/**
 * Cria objeto de erro padronizado.
 * @param {string} code
 * @param {string} message
 * @param {boolean} [recoverable=true]
 * @returns {{ code: string, message: string, recoverable: boolean }}
 */
export function makeError(code, message, recoverable = true) {
  return { code, message, recoverable };
}

/**
 * Trata erros Firebase com toast apropriado.
 * @param {Error} err
 * @param {string} [fallback]
 */
export function handleFirebaseError(err, fallback = "Erro inesperado.") {
  const code = err?.code ?? "";
  let msg = fallback;
  if (code === "PERMISSION_DENIED" || code === "permission-denied")
    msg = "Sem permissão para realizar esta operação.";
  else if (code === "network-request-failed")
    msg = "Sem conexão com a internet.";
  showToast(msg, "error");
  if (code === "PERMISSION_DENIED" || code === "permission-denied") {
    setTimeout(() => window.location.replace("/auth/login.html"), 2000);
  }
}
