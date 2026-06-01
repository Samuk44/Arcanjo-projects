/**
 * @module utils/helpers
 * @description Funções utilitárias puras, sem efeitos colaterais externos.
 */

/** Atalho para document.getElementById */
export const el = (id) => document.getElementById(id);

/** Arredonda para 1 casa decimal */
export const round1 = (n) => Math.round(n * 10) / 10;

/** Timestamp atual em ms */
export const nowMs = () => Date.now();

/** Data de hoje no formato YYYY-MM-DD */
export const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Escapa caracteres HTML especiais para evitar XSS.
 * @param {*} s
 * @returns {string}
 */
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/**
 * Normaliza um valor do Firebase em array.
 * @param {*} val
 * @returns {Array}
 */
export const normalizeList = (val) =>
  !val ? [] : Array.isArray(val) ? val : Object.values(val);
