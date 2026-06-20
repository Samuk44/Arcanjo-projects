export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = (fn, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const $ = (selector, context = document) =>
  context.querySelector(selector);
export const $$ = (selector, context = document) => [
  ...context.querySelectorAll(selector),
];

export const safeQuery = (selector, context = document) => {
  try {
    return $(selector, context);
  } catch {
    return null;
  }
};

export const safeQueryAll = (selector, context = document) => {
  try {
    return $$(selector, context);
  } catch {
    return [];
  }
};

export const isElementInViewport = (el) => {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.top <=
      (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
    rect.bottom >= 0
  );
};

export const toggleClass = (el, className) => {
  if (!el) return;
  el.classList.toggle(className);
};

export const addClass = (el, className) => {
  if (!el) return;
  el.classList.add(className);
};

export const removeClass = (el, className) => {
  if (!el) return;
  el.classList.remove(className);
};

export const setAttributeSafe = (el, attr, value) => {
  if (!el) return;
  el.setAttribute(attr, value);
};

export const prefersReducedMotion = () => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const safeString = (v) => String(v == null ? "" : v).trim();

export const safeLog = (event, data = {}) => {
  try {
    console.info(`[DiáriosEscolares] ${event}`, {
      event,
      data,
      ts: new Date().toISOString(),
    });
  } catch {
    // fail-safe
  }
};
