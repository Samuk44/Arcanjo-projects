/**
 * SGE v2.0 - Internationalization (i18n) & Strings
 * Gerenciador de idiomas e mensagens do sistema
 */

const CURRENT_LOCALE = "pt-BR";

// ─────────────────────────────────────────────────────────────────────────────
// DICTIONARIES
// ─────────────────────────────────────────────────────────────────────────────

const STRINGS = {
  "pt-BR": {
    errors: {
      network: "Erro de conexão. Verifique sua internet.",
      notFound: "Página não encontrada.",
      unauthorized: "Acesso negado.",
      generic: "Ocorreu um erro inesperado.",
    },
    wizard: {
      step1: "Dados da Escola",
      step2: "Dados do Diretor",
      step3: "Acesso e Plano",
      step4: "Confirmação",
      success: "Cadastro realizado com sucesso!",
      pending: "Aguardando aprovação...",
    },
    buttons: {
      save: "Salvar",
      cancel: "Cancelar",
      next: "Próximo",
      back: "Voltar",
      submit: "Enviar",
    },
  },
  "en-US": {
    errors: {
      network: "Connection error. Check your internet.",
      notFound: "Page not found.",
      unauthorized: "Access denied.",
      generic: "An unexpected error occurred.",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traduz uma chave de texto
 * @param {string} key - Chave no formato 'secao.chave' (ex: 'errors.network')
 * @param {object} params - Parâmetros para interpolação
 * @returns {string} Texto traduzido
 */
export function t(key, params = {}) {
  const [section, k] = key.split(".");
  let text =
    STRINGS[CURRENT_LOCALE]?.[section]?.[k] ||
    STRINGS["pt-BR"][section]?.[k] ||
    key;

  // Interpolação simples: {name} -> valor
  Object.keys(params).forEach((param) => {
    text = text.replace(`{${param}}`, params[param]);
  });

  return text;
}

/**
 * Formata erro para exibição
 * @param {Error|string} error
 */
export function formatError(error) {
  if (typeof error === "string") return error;
  return error.message || t("errors.generic");
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export function setLocale(locale) {
  if (STRINGS[locale]) {
    console.log(`[i18n] Locale changed to ${locale}`);
    // Implementar lógica de recarregamento ou update do DOM
  }
}

export function getLocale() {
  return CURRENT_LOCALE;
}

export function getAvailableLocales() {
  return Object.keys(STRINGS);
}

export function getCurrentLocaleData() {
  return STRINGS[CURRENT_LOCALE];
}

// Formatadores básicos
export const formatNumber = (num) => new Intl.NumberFormat("pt-BR").format(num);
export const formatCurrency = (val) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    val,
  );
export const formatDate = (date) =>
  new Intl.DateTimeFormat("pt-BR").format(new Date(date));

export default {
  t,
  formatError,
  setLocale,
  getLocale,
};
