/**
 * @module utils/chamada-utils
 * @description Funções utilitárias puras para o módulo de chamada.
 *   Sem efeitos colaterais. Sem dependências externas.
 */
"use strict";

// ── Formatação de data ─────────────────────────────────────────────────────────

/** Retorna hoje no formato YYYY-MM-DD (fuso local). */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Formata "2026-03-03" → "03/03/2026".
 * @param {string} iso
 * @returns {string}
 */
export function formatDateBR(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Formata nome do dia da semana em pt-BR para uma data ISO.
 * @param {string} iso YYYY-MM-DD
 * @returns {string}
 */
export function weekdayBR(iso) {
  if (!iso) return "";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    // Cria a data no fuso local (sem conversão UTC)
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  } catch {
    return "";
  }
}

// ── Strings utilitárias ───────────────────────────────────────────────────────

/**
 * Converte string em slug seguro para chave Firebase.
 * Ex: "Matemática" → "matematica", "9º Ano A" → "9_ano_a"
 * @param {string} str
 * @returns {string}
 */
export function toFirebaseKey(str) {
  return (
    String(str ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "sem_nome"
  );
}

/**
 * Escapa caracteres HTML para prevenir XSS em innerHTML.
 * @param {*} s
 * @returns {string}
 */
export function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/**
 * Extrai as iniciais de um nome (até 2 letras).
 * @param {string} nome
 * @returns {string}
 */
export function initials(nome) {
  return (
    String(nome ?? "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?"
  );
}

// ── Array / Object utilitários ────────────────────────────────────────────────

/**
 * Normaliza um campo do Firebase para array de strings.
 * Suporta: string, string[], {uid: true}, {uid: "nome"}.
 * @param {*} val
 * @returns {string[]}
 */
export function normalizeToArray(val) {
  if (!val) return [];
  if (typeof val === "string") return [val];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "object") return Object.keys(val).filter(Boolean);
  return [];
}

/**
 * Calcula estatísticas de uma chamada a partir do map { uid → status }.
 * @param {Record<string,"P"|"F"|"J">} chamadaAtual
 * @param {number} totalAlunos
 * @returns {{ presentes: number, faltas: number, justificadas: number, pendentes: number, pct: number }}
 */
export function calcStats(chamadaAtual, totalAlunos) {
  let presentes = 0,
    faltas = 0,
    justificadas = 0;
  for (const s of Object.values(chamadaAtual)) {
    if (s === "P") presentes++;
    else if (s === "F") faltas++;
    else if (s === "J") justificadas++;
  }
  const registrados = presentes + faltas + justificadas;
  const pendentes = totalAlunos - registrados;
  const pct =
    totalAlunos > 0 ? Math.round((registrados / totalAlunos) * 100) : 0;
  return { presentes, faltas, justificadas, pendentes, pct };
}

/** Formata porcentagem de frequência. Ex: 87.5 → "87,5%" */
export function formatPct(n) {
  return `${String(n).replace(".", ",")}%`;
}
    