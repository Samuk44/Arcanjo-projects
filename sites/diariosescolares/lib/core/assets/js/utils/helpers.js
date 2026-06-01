/**
 * SGE v2.0 - Utilities & Helpers
 * Funções utilitárias gerais
 */

// ─────────────────────────────────────────────────────────────────────────────
// STRING MANIPULATION
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeInput(value, options = {}) {
  if (!value) return "";
  let clean = String(value).trim();
  if (options.maxLength) clean = clean.slice(0, options.maxLength);
  if (options.escapeHtml) {
    const div = document.createElement("div");
    div.textContent = clean;
    clean = div.innerHTML;
  }
  return clean;
}

export function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m];
  });
}

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE CHECKING & VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export const isEmpty = (val) =>
  val == null || !(Object.keys(val) || val).length;

export const isObject = (val) => typeof val === "object" && val !== null;

export const isArray = (val) => Array.isArray(val);

export const isString = (val) => typeof val === "string";

export const isNumber = (val) => typeof val === "number" && !isNaN(val);

export const isFunction = (val) => typeof val === "function";

// ─────────────────────────────────────────────────────────────────────────────
// OBJECT MANIPULATION
// ─────────────────────────────────────────────────────────────────────────────

export function deepClone(obj) {
  if (!isObject(obj)) return obj;
  return JSON.parse(JSON.stringify(obj));
}

export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

export function flattenObject(ob) {
  const toReturn = {};
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if (typeof ob[i] == "object" && ob[i] !== null) {
      const flatObject = flattenObject(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + "." + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE & TIMING
// ─────────────────────────────────────────────────────────────────────────────

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateShortId(length = 8) {
  return Math.random().toString(36).substr(2, length);
}

export default {
  sanitizeInput,
  deepClone,
  debounce,
  generateUUID,
  isEmpty,
};
