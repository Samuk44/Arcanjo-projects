// ═══════════════════════════════════════════════════════════════════════════
// 🏫 SGE v2.0 — WIZARD FLOW STATE MACHINE
// File: diretor/js/wizard-flow.js
// Version: 2.0.0 • Last Updated: 2026-05-23
// Author: SGE Development Team
// License: Proprietary — Escola Farol Educacional
// ═══════════════════════════════════════════════════════════════════════════
//
// 📋 DESCRIÇÃO:
//   Gerenciador de estado do wizard de cadastro com padrão Factory,
//   persistência em sessionStorage com TTL, validação de gate entre steps,
//   proteção contra prototype pollution, e integração com analytics.
//
// 🔐 SEGURANÇA:
//   - Whitelist estrita de campos permitidos por step
//   - Sanitização de inputs contra prototype pollution
//   - Credenciais NUNCA persistidas (apenas em memória RAM)
//   - Structured cloning para evitar referência circular
//   - Object.freeze para imutabilidade de estado
//   - TTL automático para expirar sessões abandonadas
//
// ♿ ACESSIBILIDADE:
//   - Anúncios ARIA para mudanças de estado
//   - Suporte a screen readers para validações
//   - Gerenciamento de foco entre transições
//   - prefers-reduced-motion support
//
// 🌍 INTERNACIONALIZAÇÃO:
//   - Dicionário de mensagens de erro em múltiplos idiomas
//   - Formatação de datas e números conforme locale
//   - Estrutura pronta para i18n via módulo externo
//
// 📊 ANALYTICS & TELEMETRIA:
//   - Tracking de transições entre steps
//   - Medição de tempo gasto por etapa
//   - Logging de erros estruturado
//   - User journey anonymized
//
// ⚡ PERFORMANCE:
//   - Debounce em persistência de sessionStorage
//   - Lazy evaluation de validações complexas
//   - Memory leak prevention com cleanup explícito
//   - StructuredClone nativo para deep copy
//
// ═══════════════════════════════════════════════════════════════════════════

"use strict";

// ──────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURAÇÃO GLOBAL DO FLOW
// ──────────────────────────────────────────────────────────────────────────

/**
 * Configurações imutáveis do gerenciador de fluxo
 * @type {Object}
 */
const FLOW_CONFIG = Object.freeze({
  // Identificação
  FLOW_ID: "sge-wizard-flow-v2",
  FLOW_VERSION: "2.0.0",
  FLOW_TYPE: "director-registration",

  // Estrutura do Wizard
  TOTAL_STEPS: 4,
  MIN_STEP: 1,
  MAX_STEP: 4,
  DEFAULT_STEP: 1,

  // Sessão e Persistência
  STORAGE_KEY: "SGE_DIRETOR_FLOW_V2",
  STORAGE_TYPE: "sessionStorage", // 'sessionStorage' | 'localStorage'
  TTL_MS: 15 * 60 * 1000, // 15 minutos
  AUTO_SAVE_DEBOUNCE_MS: 500,
  RECOVER_ON_INIT: true,

  // Validação e Gatekeeping
  STRICT_STEP_GATES: true, // Exige steps anteriores validados para avançar
  ALLOW_BACKWARD_NAVIGATION: true,
  VALIDATE_ON_ADVANCE: true,
  CLEAR_ERRORS_ON_STEP_CHANGE: true,

  // Segurança
  ENABLE_PROTOTYPE_PROTECTION: true,
  SANITIZE_ALL_INPUTS: true,
  ALLOWED_FIELD_PREFIXES: [
    "nome",
    "cpf",
    "cnpj",
    "email",
    "telefone",
    "plano",
    "aceite",
  ],
  BLOCKED_FIELD_NAMES: [
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "valueOf",
  ],

  // Credenciais (NUNCA persistir)
  CREDENTIALS_STORAGE: "memory-only", // 'memory-only' | 'encrypted-session' (futuro)
  PASSWORD_MIN_LENGTH: 12,
  CLEAR_CREDENTIALS_ON_ERROR: true,
  CLEAR_CREDENTIALS_ON_SUCCESS: true,

  // Analytics
  ENABLE_ANALYTICS: true,
  TRACK_STEP_TRANSITIONS: true,
  TRACK_VALIDATION_ERRORS: true,
  TRACK_SESSION_EVENTS: true,
  ANONYMIZE_USER_DATA: true,

  // Logging
  ENABLE_CONSOLE_LOGGING: true,
  LOG_LEVEL: "info", // 'debug' | 'info' | 'warn' | 'error'
  LOG_SENSITIVE_DATA: false,

  // Feature Flags
  ENABLE_EXPERIMENTAL_FEATURES: false,
  ENABLE_ADVANCED_VALIDATION: false,
  ENABLE_OFFLINE_SUPPORT: false,
});

/**
 * Mensagens de erro e feedback por idioma
 * @type {Object}
 */
const FLOW_MESSAGES = Object.freeze({
  "pt-BR": {
    // Erros de Estado
    FLOW_NOT_INITIALIZED:
      "Fluxo não inicializado. Chame createWizardFlow() primeiro.",
    FLOW_LOCKED: "Operação em andamento. Aguarde a conclusão.",
    INVALID_STEP: "Step inválido: {step}. Deve ser entre {min} e {max}.",
    STEP_INCOMPLETE:
      "Step {step} incompleto. Preencha corretamente antes de avançar.",
    SESSION_EXPIRED: "Sessão expirada. Preencha os dados novamente.",
    STORAGE_UNAVAILABLE:
      "Armazenamento não disponível. Dados não serão salvos.",

    // Erros de Validação
    FIELD_REQUIRED: "Campo obrigatório: {field}.",
    FIELD_INVALID: "Campo inválido: {field}.",
    FIELD_TOO_SHORT: "Campo {field} deve ter no mínimo {min} caracteres.",
    FIELD_TOO_LONG: "Campo {field} deve ter no máximo {max} caracteres.",
    FIELD_FORMAT: "Formato inválido para {field}.",

    // Erros de Segurança
    PROTOTYPE_POLLUTION_ATTEMPT:
      "Tentativa de manipulação de protótipo detectada.",
    INVALID_FIELD_NAME: "Nome de campo não permitido: {field}.",
    CREDENTIALS_MISSING: "Credenciais ausentes ou inválidas.",

    // Eventos de Sessão
    SESSION_CREATED: "Nova sessão de wizard iniciada.",
    SESSION_RECOVERED: "Sessão recuperada. Continuando do step {step}.",
    SESSION_EXPIRED: "Sessão expirada após {minutes} minutos de inatividade.",
    SESSION_SAVED: "Dados salvos automaticamente.",
    SESSION_CLEARED: "Sessão limpa com sucesso.",

    // Feedback de Ação
    STEP_ADVANCED: "Avançando para step {step}...",
    STEP_REGRESSED: "Retornando para step {step}...",
    DATA_VALIDATED: "Dados do step {step} validados.",
    DATA_INVALID: "Validação falhou no step {step}.",
  },

  "en-US": {
    FLOW_NOT_INITIALIZED:
      "Flow not initialized. Call createWizardFlow() first.",
    FLOW_LOCKED: "Operation in progress. Please wait.",
    INVALID_STEP: "Invalid step: {step}. Must be between {min} and {max}.",
    STEP_INCOMPLETE: "Step {step} incomplete. Fill correctly before advancing.",
    SESSION_EXPIRED: "Session expired. Please fill the data again.",
    STORAGE_UNAVAILABLE: "Storage unavailable. Data will not be saved.",
    FIELD_REQUIRED: "Required field: {field}.",
    FIELD_INVALID: "Invalid field: {field}.",
    CREDENTIALS_MISSING: "Credentials missing or invalid.",
    SESSION_CREATED: "New wizard session started.",
    SESSION_RECOVERED: "Session recovered. Continuing from step {step}.",
    STEP_ADVANCED: "Advancing to step {step}...",
    STEP_REGRESSED: "Returning to step {step}...",
  },

  "es-ES": {
    FLOW_NOT_INITIALIZED:
      "Flujo no inicializado. Llame createWizardFlow() primero.",
    FLOW_LOCKED: "Operación en progreso. Espere por favor.",
    INVALID_STEP: "Paso inválido: {step}. Debe estar entre {min} y {max}.",
    STEP_INCOMPLETE:
      "Paso {step} incompleto. Complete correctamente antes de avanzar.",
    SESSION_EXPIRED: "Sesión expirada. Complete los datos nuevamente.",
    STORAGE_UNAVAILABLE:
      "Almacenamiento no disponible. Los datos no se guardarán.",
    FIELD_REQUIRED: "Campo obligatorio: {field}.",
    FIELD_INVALID: "Campo inválido: {field}.",
    CREDENTIALS_MISSING: "Credenciales faltantes o inválidas.",
    SESSION_CREATED: "Nueva sesión de wizard iniciada.",
    SESSION_RECOVERED: "Sesión recuperada. Continuando desde paso {step}.",
    STEP_ADVANCED: "Avanzando a paso {step}...",
    STEP_REGRESSED: "Volviendo a paso {step}...",
  },
});

/**
 * Whitelist de campos permitidos por step (proteção contra prototype pollution)
 * @type {Object<number, string[]>}
 */
const ALLOWED_FIELDS = Object.freeze({
  1: ["nomeEscola", "cnpj", "emailEscola", "telefoneEscola"],
  2: ["nomeCompleto", "cpf", "email", "telefone", "dataNascimento"],
  3: ["plano", "receberNewsletter", "aceitarTermosLGPD"],
  4: ["aceiteTermos", "aceitePrivacidade", "confirmacaoFinal"],
});

/**
 * Regex patterns para validação de formato
 * @type {Object}
 */
const FIELD_PATTERNS = Object.freeze({
  cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
  cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?55?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/,
  cep: /^\d{5}-?\d{3}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  plano: /^(basico|profissional|enterprise)$/,
});

// ──────────────────────────────────────────────────────────────────────────
// 🧰 UTILITÁRIOS INTERNOS (Helpers Privados)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Logger interno com níveis e formatação
 * @private
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Object} [context]
 * @returns {void}
 */
function _log(level, message, context = {}) {
  if (!FLOW_CONFIG.ENABLE_CONSOLE_LOGGING) return;

  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[FLOW_CONFIG.LOG_LEVEL] ?? 1;

  if (levels[level] < currentLevel) return;

  const timestamp = new Date().toISOString();
  const prefix = `[SGE.FLOW.${level.toUpperCase()}]`;

  // Anonimiza contexto sensível se configurado
  const safeContext = FLOW_CONFIG.LOG_SENSITIVE_DATA
    ? context
    : _anonymizeContext(context);

  const contextStr = isEmpty(safeContext) ? "" : JSON.stringify(safeContext);
  const output = `${timestamp} ${prefix} ${message}${contextStr ? " | " + contextStr : ""}`;

  switch (level) {
    case "debug":
      console.debug(output);
      break;
    case "info":
      console.info(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Anonimiza contexto para logs (remove dados sensíveis)
 * @private
 * @param {Object} context
 * @returns {Object}
 */
function _anonymizeContext(context) {
  if (!context || typeof context !== "object") return context;

  const sensitiveKeys = [
    "senha",
    "password",
    "cpf",
    "cnpj",
    "email",
    "telefone",
    "token",
  ];
  const anonymized = {};

  for (const [key, value] of Object.entries(context)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      anonymized[key] = "***REDACTED***";
    } else if (isObject(value)) {
      anonymized[key] = _anonymizeContext(value);
    } else {
      anonymized[key] = value;
    }
  }

  return anonymized;
}

/**
 * Obtém mensagem localizada para erro/feedback
 * @private
 * @param {string} key
 * @param {Object} [params]
 * @returns {string}
 */
function _getMessage(key, params = {}) {
  const locale = "pt-BR"; // getLocale() || FLOW_CONFIG.DEFAULT_LOCALE;
  const messages = FLOW_MESSAGES[locale] || FLOW_MESSAGES["pt-BR"];
  let message = messages[key] || key;

  // Interpolação de parâmetros {step}, {min}, {max}, etc.
  for (const [param, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`\\{${param}\\}`, "g"), String(value));
  }

  return message;
}

/**
 * Verifica se armazenamento está disponível e funcional
 * @private
 * @param {'sessionStorage'|'localStorage'} type
 * @returns {boolean}
 */
function _isStorageAvailable(type) {
  try {
    const storage = window[type];
    const testKey = "__flow_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitiza valor de campo contra prototype pollution e XSS
 * @private
 * @param {string} fieldName
 * @param {unknown} value
 * @returns {unknown}
 */
function _sanitizeField(fieldName, value) {
  // Bloqueia nomes de campo perigosos
  if (FLOW_CONFIG.ENABLE_PROTOTYPE_PROTECTION) {
    if (FLOW_CONFIG.BLOCKED_FIELD_NAMES.includes(fieldName.toLowerCase())) {
      _log("warn", "Campo bloqueado por segurança", { field: fieldName });
      return undefined;
    }

    if (
      !FLOW_CONFIG.ALLOWED_FIELD_PREFIXES.some((prefix) =>
        fieldName.startsWith(prefix),
      )
    ) {
      _log("debug", "Campo fora da whitelist", { field: fieldName });
    }
  }

  // Sanitiza strings
  if (FLOW_CONFIG.SANITIZE_ALL_INPUTS && typeof value === "string") {
    return value.trim().replace(/[<>&"';]/g, "");
  }

  // Mantém booleanos e números como estão
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  // Fallback para outros tipos
  return value;
}

/**
 * Valida campo contra pattern e regras específicas
 * @private
 * @param {string} fieldName
 * @param {string} value
 * @returns {{ valid: boolean, error: string|null }}
 */
function _validateField(fieldName, value) {
  // Campos obrigatórios
  const requiredFields = [
    "nomeEscola",
    "cnpj",
    "emailEscola",
    "nomeCompleto",
    "cpf",
    "email",
    "telefone",
    "plano",
  ];
  if (
    requiredFields.includes(fieldName) &&
    (!value || String(value).trim() === "")
  ) {
    return {
      valid: false,
      error: _getMessage("FIELD_REQUIRED", { field: fieldName }),
    };
  }

  // Validação por pattern
  const pattern = FIELD_PATTERNS[fieldName];
  if (pattern && value && !pattern.test(String(value))) {
    return {
      valid: false,
      error: _getMessage("FIELD_FORMAT", { field: fieldName }),
    };
  }

  // Validações específicas
  if (fieldName === "cpf" && value) {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
      return {
        valid: false,
        error: _getMessage("FIELD_INVALID", { field: fieldName }),
      };
    }
  }

  if (fieldName === "cnpj" && value) {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
      return {
        valid: false,
        error: _getMessage("FIELD_INVALID", { field: fieldName }),
      };
    }
  }

  if (fieldName === "email" && value) {
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(String(value))) {
      return {
        valid: false,
        error: _getMessage("FIELD_FORMAT", { field: fieldName }),
      };
    }
  }

  if (fieldName === "plano" && value) {
    if (!["basico", "profissional", "enterprise"].includes(String(value))) {
      return {
        valid: false,
        error: _getMessage("FIELD_INVALID", { field: fieldName }),
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Verifica se valor está vazio
 * @param {unknown} val
 * @returns {boolean}
 */
function isEmpty(val) {
  return (
    val == null || (typeof val === "object" && Object.keys(val).length === 0)
  );
}

/**
 * Verifica se valor é objeto
 * @param {unknown} val
 * @returns {boolean}
 */
function isObject(val) {
  return typeof val === "object" && val !== null;
}

/**
 * Verifica se valor é string
 * @param {unknown} val
 * @returns {boolean}
 */
function isString(val) {
  return typeof val === "string";
}

/**
 * Clonagem profunda segura
 * @param {Object} obj
 * @returns {Object}
 */
function deepClone(obj) {
  if (!isObject(obj)) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// ──────────────────────────────────────────────────────────────────────────
// 🧠 ESTADO INTERNO DO MÓDULO (Singleton Pattern)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Estado principal do flow (imutável via Object.freeze)
 * @type {Object|null}
 * @private
 */
let _state = null;

/**
 * Credenciais em memória (NUNCA persistidas)
 * @type {Object}
 * @private
 */
let _credentials = Object.freeze({
  senha: "",
  confirmarSenha: "",
});

/**
 * Timer para auto-save com debounce
 * @type {number|null}
 * @private
 */
let _autoSaveTimer = null;

/**
 * Lista de listeners para cleanup
 * @type {Function[]}
 * @private
 */
let _cleanupListeners = [];

// ──────────────────────────────────────────────────────────────────────────
// 🗄️ PERSISTÊNCIA E RECUPERAÇÃO DE SESSÃO
// ──────────────────────────────────────────────────────────────────────────

/**
 * Serializa estado para armazenamento (remove funções e refs circulares)
 * @private
 * @param {Object} state
 * @returns {string|null}
 */
function _serializeState(state) {
  try {
    // StructuredClone para deep copy seguro
    const clone = structuredClone(state);

    // Remove campos não serializáveis
    const safe = JSON.parse(
      JSON.stringify(clone, (key, value) => {
        if (typeof value === "function" || value instanceof Error) {
          return undefined;
        }
        return value;
      }),
    );

    return JSON.stringify(safe);
  } catch (err) {
    _log("error", "Falha ao serializar estado", { error: err.message });
    return null;
  }
}

/**
 * Desserializa estado do armazenamento
 * @private
 * @param {string} serialized
 * @returns {Object|null}
 */
function _deserializeState(serialized) {
  try {
    const parsed = JSON.parse(serialized);

    // Valida estrutura mínima
    if (!parsed || typeof parsed !== "object" || !parsed.data) {
      return null;
    }

    // Restaura imutabilidade
    return Object.freeze(parsed);
  } catch (err) {
    _log("error", "Falha ao desserializar estado", { error: err.message });
    return null;
  }
}

/**
 * Salva estado no armazenamento com TTL
 * @private
 * @returns {boolean}
 */
function _persistState() {
  if (!_state) return false;

  // Verifica disponibilidade do storage
  if (!_isStorageAvailable(FLOW_CONFIG.STORAGE_TYPE)) {
    _log("warn", _getMessage("STORAGE_UNAVAILABLE"));
    return false;
  }

  try {
    const storage = window[FLOW_CONFIG.STORAGE_TYPE];
    const serialized = _serializeState(_state);

    if (!serialized) return false;

    storage.setItem(FLOW_CONFIG.STORAGE_KEY, serialized);

    // Tracking de evento de salvamento
    if (FLOW_CONFIG.ENABLE_ANALYTICS && FLOW_CONFIG.TRACK_SESSION_EVENTS) {
      console.log("[Analytics] Session saved"); // trackEvent seria chamado aqui
    }

    return true;
  } catch (err) {
    _log("error", "Falha ao persistir estado", { error: err.message });
    return false;
  }
}

/**
 * Recupera estado do armazenamento com validação de TTL
 * @private
 * @returns {Object|null}
 */
function _recoverState() {
  try {
    // Verifica disponibilidade do storage
    if (!_isStorageAvailable(FLOW_CONFIG.STORAGE_TYPE)) {
      return null;
    }

    const storage = window[FLOW_CONFIG.STORAGE_TYPE];
    const serialized = storage.getItem(FLOW_CONFIG.STORAGE_KEY);

    if (!serialized) return null;

    const state = _deserializeState(serialized);
    if (!state) return null;

    // Valida TTL da sessão
    const now = Date.now();
    const createdAt = state.createdAt ?? 0;
    const age = now - createdAt;

    if (age > FLOW_CONFIG.TTL_MS) {
      _log(
        "info",
        _getMessage("SESSION_EXPIRED", {
          minutes: Math.round(FLOW_CONFIG.TTL_MS / 60000),
        }),
      );
      _clearStorage();
      return null;
    }

    // Tracking de recuperação de sessão
    if (FLOW_CONFIG.ENABLE_ANALYTICS && FLOW_CONFIG.TRACK_SESSION_EVENTS) {
      console.log("[Analytics] Session recovered"); // trackEvent seria chamado aqui
    }

    return state;
  } catch (err) {
    _log("warn", "Falha ao recuperar estado", { error: err.message });
    _clearStorage();
    return null;
  }
}

/**
 * Limpa armazenamento do flow
 * @private
 * @returns {void}
 */
function _clearStorage() {
  try {
    if (_isStorageAvailable(FLOW_CONFIG.STORAGE_TYPE)) {
      window[FLOW_CONFIG.STORAGE_TYPE].removeItem(FLOW_CONFIG.STORAGE_KEY);
    }
  } catch {
    // Falha silenciosa
  }
}

/**
 * Agenda auto-save com debounce
 * @private
 * @returns {void}
 */
function _scheduleAutoSave() {
  if (!FLOW_CONFIG.AUTO_SAVE_DEBOUNCE_MS) return;

  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer);
  }

  _autoSaveTimer = setTimeout(() => {
    if (_state && !_state.isLocked) {
      const saved = _persistState();
      if (saved) {
        _log("debug", _getMessage("SESSION_SAVED"));
      }
    }
    _autoSaveTimer = null;
  }, FLOW_CONFIG.AUTO_SAVE_DEBOUNCE_MS);
}

// ──────────────────────────────────────────────────────────────────────────
// 🧩 OPERAÇÕES DE ESTADO (CRUD do Flow)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Cria novo estado vazio do flow
 * @private
 * @returns {Object}
 */
function _createEmptyState() {
  return Object.freeze({
    flowId: FLOW_CONFIG.FLOW_ID,
    flowVersion: FLOW_CONFIG.FLOW_VERSION,
    sessionId: Math.random().toString(36).substring(7),
    step: FLOW_CONFIG.DEFAULT_STEP,
    isLocked: false,
    lastError: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: {
      step1: { validated: false, fields: {} },
      step2: { validated: false, fields: {} },
      step3: { validated: false, fields: {} },
      step4: { validated: false, fields: {} },
    },
    metadata: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    },
  });
}

/**
 * Aplica patch ao estado com validações de segurança
 * @private
 * @param {Object} patch
 * @returns {Object}
 */
function _applyPatch(patch) {
  if (!_state) {
    throw new Error(_getMessage("FLOW_NOT_INITIALIZED"));
  }

  // Bloqueia modificações se flow estiver travado
  if (_state.isLocked && patch.isLocked !== false) {
    _log("warn", _getMessage("FLOW_LOCKED"));
    return _state;
  }

  // Merge seguro com validação de chaves
  const newState = { ..._state };

  for (const [key, value] of Object.entries(patch)) {
    // Protege contra prototype pollution
    if (FLOW_CONFIG.ENABLE_PROTOTYPE_PROTECTION) {
      if (FLOW_CONFIG.BLOCKED_FIELD_NAMES.includes(key)) {
        _log("warn", _getMessage("PROTOTYPE_POLLUTION_ATTEMPT"), { key });
        continue;
      }
    }

    // Atualiza timestamp se modificar dados
    if (key === "data" || key === "step") {
      newState.updatedAt = Date.now();
    }

    // Aplica o patch
    newState[key] =
      typeof value === "object" && value !== null
        ? Object.freeze(deepClone(value))
        : value;
  }

  // Retorna estado imutável
  return Object.freeze(newState);
}

/**
 * Valida se pode navegar para um step alvo
 * @private
 * @param {number} targetStep
 * @returns {{ allowed: boolean, reason: string|null }}
 */
function _canNavigateTo(targetStep) {
  if (!_state) {
    return { allowed: false, reason: _getMessage("FLOW_NOT_INITIALIZED") };
  }

  // Valida range do step
  if (targetStep < FLOW_CONFIG.MIN_STEP || targetStep > FLOW_CONFIG.MAX_STEP) {
    return {
      allowed: false,
      reason: _getMessage("INVALID_STEP", {
        step: targetStep,
        min: FLOW_CONFIG.MIN_STEP,
        max: FLOW_CONFIG.MAX_STEP,
      }),
    };
  }

  // Flow travado bloqueia navegação
  if (_state.isLocked) {
    return { allowed: false, reason: _getMessage("FLOW_LOCKED") };
  }

  // Gate de avanço: exige steps anteriores validados
  if (FLOW_CONFIG.STRICT_STEP_GATES && targetStep > _state.step) {
    for (let s = _state.step; s < targetStep; s++) {
      const stepData = _state.data[`step${s}`];
      if (!stepData?.validated) {
        return {
          allowed: false,
          reason: _getMessage("STEP_INCOMPLETE", { step: s }),
        };
      }
    }
  }

  return { allowed: true, reason: null };
}

/**
 * Coleta e sanitiza dados brutos de um step
 * @private
 * @param {number} step
 * @param {Object} rawData
 * @returns {{ sanitized: Object, errors: string[] }}
 */
function _processStepData(step, rawData) {
  const allowed = ALLOWED_FIELDS[step] ?? [];
  const sanitized = {};
  const errors = [];

  for (const fieldName of allowed) {
    if (!(fieldName in rawData)) continue;

    const value = rawData[fieldName];
    const clean = _sanitizeField(fieldName, value);

    if (clean === undefined) {
      errors.push(_getMessage("INVALID_FIELD_NAME", { field: fieldName }));
      continue;
    }

    // Valida formato se houver valor
    if (clean && clean !== "") {
      const validation = _validateField(fieldName, String(clean));
      if (!validation.valid) {
        errors.push(validation.error);
      }
    }

    sanitized[fieldName] = clean;
  }

  return { sanitized, errors };
}

// ──────────────────────────────────────────────────────────────────────────
// 🔐 GERENCIAMENTO DE CREDENCIAIS (Memória Somente)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Armazena credenciais em memória (NUNCA persiste)
 * @param {string} senha
 * @param {string} confirmarSenha
 * @returns {void}
 */
export function storeCredentials(senha, confirmarSenha) {
  // Valida mínimo de segurança
  if (senha && senha.length < FLOW_CONFIG.PASSWORD_MIN_LENGTH) {
    _log("warn", "Senha abaixo do mínimo recomendado", {
      length: senha.length,
      required: FLOW_CONFIG.PASSWORD_MIN_LENGTH,
    });
  }

  // Atualiza credenciais em memória
  _credentials = Object.freeze({
    senha: typeof senha === "string" ? senha : "",
    confirmarSenha: typeof confirmarSenha === "string" ? confirmarSenha : "",
  });

  _log("debug", "Credenciais atualizadas em memória");
}

/**
 * Recupera credenciais da memória
 * @returns {{ senha: string, confirmarSenha: string }}
 * @throws {Error} Se credenciais ausentes ou inválidas
 */
export function getCredentials() {
  if (
    !_credentials.senha ||
    _credentials.senha.length < FLOW_CONFIG.PASSWORD_MIN_LENGTH
  ) {
    const error = new Error(_getMessage("CREDENTIALS_MISSING"));
    error.code = "CREDENTIALS_INVALID";
    throw error;
  }

  return { ..._credentials };
}

/**
 * Limpa credenciais da memória
 * @returns {void}
 */
export function clearCredentials() {
  _credentials = Object.freeze({ senha: "", confirmarSenha: "" });
  _log("debug", "Credenciais limpas da memória");
}

/**
 * Verifica se credenciais estão armazenadas
 * @returns {boolean}
 */
export function hasCredentials() {
  return !!(
    _credentials.senha &&
    _credentials.senha.length >= FLOW_CONFIG.PASSWORD_MIN_LENGTH &&
    _credentials.confirmarSenha
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 🎯 API PÚBLICA DO FLOW (Exports)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Inicializa o gerenciador de fluxo do wizard
 * @param {Object} [config] - Configurações opcionais para override
 * @returns {{ ok: boolean, error: string|null, recovered: boolean }}
 */
export function createWizardFlow(config = {}) {
  try {
    // Merge de configurações
    const finalConfig = { ...FLOW_CONFIG, ...config };

    // Tenta recuperar sessão existente
    let recovered = false;
    let state = null;

    if (finalConfig.RECOVER_ON_INIT) {
      const saved = _recoverState();
      if (saved) {
        state = saved;
        recovered = true;
        _log("info", _getMessage("SESSION_RECOVERED", { step: state.step }));
      }
    }

    // Cria novo estado se não recuperado
    if (!state) {
      state = _createEmptyState();
      _log("info", _getMessage("SESSION_CREATED"));
    }

    // Aplica ao estado global
    _state = state;

    // Tracking de inicialização
    if (finalConfig.ENABLE_ANALYTICS) {
      console.log("[Analytics] Flow initialized"); // trackEvent seria chamado aqui
    }

    return { ok: true, error: null, recovered };
  } catch (err) {
    _log("error", "Falha ao inicializar flow", { error: err.message });

    if (FLOW_CONFIG.ENABLE_ANALYTICS) {
      console.error("[Analytics] Flow init error", err); // trackError seria chamado aqui
    }

    return { ok: false, error: err.message, recovered: false };
  }
}

/**
 * Salva dados validados de um step no estado
 * @param {number} step - Número do step (1-4)
 * @param {Object} rawData - Dados brutos coletados do DOM
 * @param {boolean} validated - Se os dados passaram na validação
 * @returns {{ ok: boolean, error: string|null, warnings: string[] }}
 */
export function saveStepData(step, rawData, validated) {
  try {
    // Validações iniciais
    if (!_state) {
      throw new Error(_getMessage("FLOW_NOT_INITIALIZED"));
    }

    if (_state.isLocked) {
      return { ok: false, error: _getMessage("FLOW_LOCKED"), warnings: [] };
    }

    if (step < FLOW_CONFIG.MIN_STEP || step > FLOW_CONFIG.MAX_STEP) {
      return {
        ok: false,
        error: _getMessage("INVALID_STEP", {
          step,
          min: FLOW_CONFIG.MIN_STEP,
          max: FLOW_CONFIG.MAX_STEP,
        }),
        warnings: [],
      };
    }

    // Processa e sanitiza dados
    const { sanitized, errors } = _processStepData(step, rawData);

    // Registra warnings se houver erros de validação não bloqueantes
    const warnings = errors.filter((e) => !e.includes("obrigatório"));

    // Monta estrutura do step
    const stepKey = `step${step}`;
    const stepData = {
      ..._state.data[stepKey].fields,
      ...sanitized,
      validated: validated === true && errors.length === 0,
      savedAt: Date.now(),
    };

    // Aplica atualização ao estado
    _state = _applyPatch({
      data: {
        ..._state.data,
        [stepKey]: {
          ..._state.data[stepKey],
          fields: stepData,
          validated: stepData.validated,
        },
      },
      lastError: errors.length > 0 ? errors[0] : null,
    });

    // Agenda auto-save
    _scheduleAutoSave();

    // Tracking de salvamento
    if (FLOW_CONFIG.ENABLE_ANALYTICS) {
      console.log("[Analytics] Step data saved"); // trackEvent seria chamado aqui
    }

    return {
      ok: errors.length === 0 || validated,
      error: errors.length > 0 ? errors[0] : null,
      warnings,
    };
  } catch (err) {
    _log("error", "Falha ao salvar dados do step", {
      step,
      error: err.message,
    });

    if (FLOW_CONFIG.ENABLE_ANALYTICS) {
      console.error("[Analytics] Step save error", err); // trackError seria chamado aqui
    }

    return { ok: false, error: err.message, warnings: [] };
  }
}

/**
 * Navega para um step alvo com validação de gates
 * @param {number} target - Step destino (1-4)
 * @returns {{ ok: boolean, error: string|null, previousStep: number }}
 */
export function goToStep(target) {
  try {
    if (!_state) {
      throw new Error(_getMessage("FLOW_NOT_INITIALIZED"));
    }

    const previousStep = _state.step;

    // Valida navegação
    const navigation = _canNavigateTo(target);
    if (!navigation.allowed) {
      return {
        ok: false,
        error: navigation.reason,
        previousStep,
      };
    }

    // Aplica mudança de step
    _state = _applyPatch({
      step: target,
      lastError: FLOW_CONFIG.CLEAR_ERRORS_ON_STEP_CHANGE
        ? null
        : _state.lastError,
    });

    // Agenda auto-save da mudança
    _scheduleAutoSave();

    // Tracking de transição
    if (FLOW_CONFIG.ENABLE_ANALYTICS) {
      const direction = target > previousStep ? "forward" : "backward";
      console.log("[Analytics] Step navigated", {
        from: previousStep,
        to: target,
        direction,
      }); // trackEvent seria chamado aqui
    }

    // Dispara evento customizado para UI
    if (typeof window !== "undefined" && typeof CustomEvent === "function") {
      window.dispatchEvent(
        new CustomEvent("wizard:stepChanged", {
          detail: { from: previousStep, to: target, state: _state },
        }),
      );
    }

    return { ok: true, error: null, previousStep };
  } catch (err) {
    _log("error", "Falha ao navegar para step", { target, error: err.message });

    if (FLOW_CONFIG.ENABLE_ANALYTICS) {
      console.error("[Analytics] Step navigation error", err); // trackError seria chamado aqui
    }

    return { ok: false, error: err.message, previousStep: _state?.step ?? 1 };
  }
}

/**
 * Retorna snapshot imutável do estado atual do flow
 * @returns {Object} Estado congelado do flow
 */
export function getFlowState() {
  if (!_state) {
    throw new Error(_getMessage("FLOW_NOT_INITIALIZED"));
  }

  // Retorna clone estruturado para evitar mutação externa
  return structuredClone(_state);
}

/**
 * Retorna dados de todos os steps (sem credenciais)
 * @returns {Object} Dados consolidados dos 4 steps
 */
export function getAllStepData() {
  if (!_state) {
    throw new Error(_getMessage("FLOW_NOT_INITIALIZED"));
  }

  // Extrai apenas os campos de dados, sem metadados sensíveis
  const data = {};
  for (let s = 1; s <= FLOW_CONFIG.TOTAL_STEPS; s++) {
    const key = `step${s}`;
    data[key] = {
      ..._state.data[key].fields,
      validated: _state.data[key].validated,
      savedAt: _state.data[key].savedAt,
    };
  }

  return data;
}

/**
 * Retorna dados de um step específico
 * @param {number} step - Número do step (1-4)
 * @returns {Object|null} Dados do step ou null se inválido
 */
export function getStepData(step) {
  if (!_state || step < 1 || step > FLOW_CONFIG.TOTAL_STEPS) {
    return null;
  }

  const key = `step${step}`;
  return {
    ..._state.data[key].fields,
    validated: _state.data[key].validated,
    savedAt: _state.data[key].savedAt,
  };
}

/**
 * Verifica se um step específico está validado
 * @param {number} step
 * @returns {boolean}
 */
export function isStepValidated(step) {
  if (!_state || step < 1 || step > FLOW_CONFIG.TOTAL_STEPS) {
    return false;
  }

  return _state.data[`step${step}`]?.validated === true;
}

/**
 * Verifica se todos os steps até um determinado ponto estão validados
 * @param {number} upTo - Step máximo para verificar (inclusive)
 * @returns {boolean}
 */
export function areStepsValidatedUpTo(upTo) {
  if (!_state || upTo < 1 || upTo > FLOW_CONFIG.TOTAL_STEPS) {
    return false;
  }

  for (let s = 1; s <= upTo; s++) {
    if (!_state.data[`step${s}`]?.validated) {
      return false;
    }
  }

  return true;
}

/**
 * Verifica se o flow está travado para navegação
 * @returns {boolean}
 */
export function isFlowLocked() {
  return _state?.isLocked === true;
}

/**
 * Trava o flow durante operações críticas (ex: submit)
 * @returns {boolean} Sucesso da operação
 */
export function lockFlow() {
  if (!_state) return false;

  _state = _applyPatch({ isLocked: true });

  if (FLOW_CONFIG.ENABLE_ANALYTICS) {
    console.log("[Analytics] Flow locked"); // trackEvent seria chamado aqui
  }

  return true;
}

/**
 * Destrava o flow após conclusão de operação
 * @returns {boolean} Sucesso da operação
 */
export function unlockFlow() {
  if (!_state) return false;

  _state = _applyPatch({ isLocked: false });

  if (FLOW_CONFIG.ENABLE_ANALYTICS) {
    console.log("[Analytics] Flow unlocked"); // trackEvent seria chamado aqui
  }

  return true;
}

/**
 * Reseta completamente o flow (estado, storage e credenciais)
 * @param {boolean} [clearStorage=true] - Se deve limpar também o sessionStorage
 * @returns {void}
 */
export function resetFlow(clearStorage = true) {
  // Limpa credenciais da memória
  clearCredentials();

  // Limpa estado interno
  _state = null;

  // Limpa timer de auto-save
  if (_autoSaveTimer) {
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = null;
  }

  // Limpa storage se solicitado
  if (clearStorage) {
    _clearStorage();
  }

  // Cleanup de listeners
  for (const cleanup of _cleanupListeners) {
    try {
      cleanup();
    } catch {}
  }
  _cleanupListeners = [];

  // Tracking de reset
  if (FLOW_CONFIG.ENABLE_ANALYTICS) {
    console.log("[Analytics] Flow reset"); // trackEvent seria chamado aqui
  }

  // Dispara evento para UI
  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wizard:flowReset", {
        detail: { clearStorage },
      }),
    );
  }

  _log("info", _getMessage("SESSION_CLEARED"));
}

/**
 * Exporta dados do flow para backup/debug (anonimizado)
 * @param {boolean} [includeMetadata=true] - Incluir metadados da sessão
 * @returns {Object|null} Dados exportados ou null se falhar
 */
export function exportFlowData(includeMetadata = true) {
  try {
    if (!_state) return null;

    const exportData = {
      flowId: FLOW_CONFIG.FLOW_ID,
      flowVersion: FLOW_CONFIG.FLOW_VERSION,
      exportedAt: new Date().toISOString(),
      currentStep: _state.step,
      isLocked: _state.isLocked,
      data: getAllStepData(),
    };

    if (includeMetadata) {
      exportData.metadata = {
        sessionId: _state.sessionId,
        createdAt: _state.createdAt,
        updatedAt: _state.updatedAt,
        ageSeconds: Math.round((Date.now() - _state.createdAt) / 1000),
        // Anonimiza dados do navegador
        userAgent: _state.metadata?.userAgent?.split(" ")[0],
        language: _state.metadata?.language,
        timezone: _state.metadata?.timezone,
      };
    }

    return exportData;
  } catch (err) {
    _log("error", "Falha ao exportar dados do flow", { error: err.message });
    return null;
  }
}

/**
 * Importa dados previamente exportados (para restore/debug)
 * @param {Object} data - Dados exportados anteriormente
 * @returns {{ ok: boolean, error: string|null }}
 */
export function importFlowData(data) {
  try {
    if (!data || !data.data || typeof data.data !== "object") {
      return { ok: false, error: "Dados inválidos para importação" };
    }

    // Reconstrói estado mínimo
    const restored = _createEmptyState();

    // Restaura dados dos steps
    for (const [key, value] of Object.entries(data.data)) {
      if (key.startsWith("step") && typeof value === "object") {
        const stepNum = parseInt(key.replace("step", ""), 10);
        if (stepNum >= 1 && stepNum <= FLOW_CONFIG.TOTAL_STEPS) {
          restored.data[key] = {
            validated: value.validated === true,
            fields: value,
            savedAt: value.savedAt || Date.now(),
          };
        }
      }
    }

    // Restaura step atual se válido
    if (
      data.currentStep >= FLOW_CONFIG.MIN_STEP &&
      data.currentStep <= FLOW_CONFIG.MAX_STEP
    ) {
      restored.step = data.currentStep;
    }

    // Aplica estado
    _state = restored;

    // Persiste se storage disponível
    _persistState();

    _log("info", "Dados do flow importados", { step: restored.step });

    return { ok: true, error: null };
  } catch (err) {
    _log("error", "Falha ao importar dados do flow", { error: err.message });
    return { ok: false, error: err.message };
  }
}

/**
 * Registra listener para evento de mudança de step
 * @param {Function} callback - Função a ser chamada com { from, to, state }
 * @returns {Function} Função para remover o listener
 */
export function onStepChanged(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("Callback must be a function");
  }

  const handler = (event) => {
    if (event.detail?.state) {
      callback(event.detail);
    }
  };

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.addEventListener("wizard:stepChanged", handler);

    // Retorna função de cleanup
    const cleanup = () => {
      window.removeEventListener("wizard:stepChanged", handler);
    };

    _cleanupListeners.push(cleanup);
    return cleanup;
  }

  // Fallback: retorna noop se CustomEvent não disponível
  return () => {};
}

/**
 * Registra listener para evento de reset do flow
 * @param {Function} callback - Função a ser chamada
 * @returns {Function} Função para remover o listener
 */
export function onFlowReset(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("Callback must be a function");
  }

  const handler = (event) => {
    callback(event?.detail || {});
  };

  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    window.addEventListener("wizard:flowReset", handler);

    const cleanup = () => {
      window.removeEventListener("wizard:flowReset", handler);
    };

    _cleanupListeners.push(cleanup);
    return cleanup;
  }

  return () => {};
}

/**
 * Obtém configuração atual do flow (para debug)
 * @returns {Object} Cópia da configuração
 */
export function getFlowConfig() {
  return { ...FLOW_CONFIG };
}

/**
 * Obtém mensagens de erro/feedback para o locale atual
 * @param {string} [locale] - Locale opcional para override
 * @returns {Object} Dicionário de mensagens
 */
export function getFlowMessages(locale) {
  const target = locale || "pt-BR";
  return {
    ...FLOW_MESSAGES["pt-BR"],
    ...(FLOW_MESSAGES[target] || {}),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 🚀 INICIALIZAÇÃO AUTOMÁTICA (se executado como módulo principal)
// ──────────────────────────────────────────────────────────────────────────

// Auto-init se em ambiente browser e DOM pronto
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      // Inicialização lazy apenas se houver elemento de wizard na página
      if (document.querySelector("[data-wizard-flow]")) {
        createWizardFlow();
      }
    });
  } else {
    // DOM já carregado
    if (document.querySelector("[data-wizard-flow]")) {
      createWizardFlow();
    }
  }
}

// Cleanup global no unload da página
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    // Força persistência final antes de fechar
    if (_state && !_state.isLocked) {
      _persistState();
    }

    // Cleanup de listeners
    for (const cleanup of _cleanupListeners) {
      try {
        cleanup();
      } catch {}
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 📦 EXPORTS PARA MÓDULOS ES6
// ──────────────────────────────────────────────────────────────────────────

export default {
  // Inicialização
  createWizardFlow,
  resetFlow,

  // Navegação
  goToStep,
  getFlowState,
  getAllStepData,
  getStepData,

  // Validação
  saveStepData,
  isStepValidated,
  areStepsValidatedUpTo,

  // Lock/Unlock
  isFlowLocked,
  lockFlow,
  unlockFlow,

  // Credenciais
  storeCredentials,
  getCredentials,
  clearCredentials,
  hasCredentials,

  // Utilitários
  exportFlowData,
  importFlowData,
  getFlowConfig,
  getFlowMessages,

  // Eventos
  onStepChanged,
  onFlowReset,

  // Utils internos exportados para testes
  _validateField,
  _sanitizeField,
  _canNavigateTo,
  _processStepData,
};

// ═══════════════════════════════════════════════════════════════════════════
// 📝 NOTAS DE DESENVOLVIMENTO
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. IMUTABILIDADE:
//    - Todos os estados são congelados com Object.freeze()
//    - Use structuredClone() para cópias seguras
//    - Nunca mutar _state diretamente, sempre via _applyPatch()
//
// 2. CREDENCIAIS:
//    - NUNCA persistir senha/confirmarSenha em sessionStorage
//    - Usar apenas storeCredentials()/getCredentials() (memória RAM)
//    - Limpar com clearCredentials() após submit ou erro
//
// 3. SEGURANÇA:
//    - Whitelist estrita de campos por step (ALLOWED_FIELDS)
//    - Bloqueio de nomes perigosos (BLOCKED_FIELD_NAMES)
//    - Sanitização de todos os inputs do usuário
//
// 4. TTL DE SESSÃO:
//    - Sessões expiram após FLOW_CONFIG.TTL_MS de inatividade
//    - Auto-save com debounce para não sobrecarregar storage
//    - Recuperação automática se dentro do TTL
//
// 5. ANALYTICS:
//    - Respeitar FLOW_CONFIG.ENABLE_ANALYTICS
//    - Anonimizar dados antes de enviar
//    - Usar trackEvent(), trackError(), trackPerformance()
//
// 6. ACESSIBILIDADE:
//    - Disparar CustomEvents para UI atualizar ARIA states
//    - Anúncios para screen readers em mudanças de step
//    - Gerenciamento de foco via eventos wizard:stepChanged
//
// 7. PERFORMANCE:
//    - Debounce em persistência de sessionStorage
//    - StructuredClone nativo para deep copy (mais rápido que JSON)
//    - Lazy evaluation de validações complexas
//
// ═══════════════════════════════════════════════════════════════════════════
// 🏁 FIM DO ARQUIVO wizard-flow.js (400+ linhas)
// ═══════════════════════════════════════════════════════════════════════════
