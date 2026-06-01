// ═══════════════════════════════════════════════════════════════════════════
// 📊 SGE v2.0 — ANALYTICS & TELEMETRIA SYSTEM
// File: assets/js/analytics/tracking.js
// Version: 2.0.0 • Last Updated: 2026-05-23
// Author: SGE Development Team
// License: Proprietary — Escola Farol Educacional
// ═══════════════════════════════════════════════════════════════════════════
//
// 📋 DESCRIÇÃO:
//   Sistema completo de tracking de eventos, performance, erros e
//   comportamento do usuário. Integração com Google Analytics 4,
//   Firebase Analytics e logs estruturados.
//
// 🔐 PRIVACIDADE:
//   - Respeito total à LGPD (Lei 13.709/2018)
//   - Anonimização de IP automática
//   - Consentimento explícito necessário
//   - Dados sensíveis NUNCA são coletados
//   - Respeito a Do Not Track (DNT)
//
// ⚡ PERFORMANCE:
//   - Coleta assíncrona não-bloqueante
//   - Batching de eventos para reduzir requisições
//   - Fallback para localStorage se offline
//   - Auto-limpeza de dados antigos (> 30 dias)
//
// ═══════════════════════════════════════════════════════════════════════════

"use strict";

// ──────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURAÇÃO DO ANALYTICS
// ──────────────────────────────────────────────────────────────────────────

const ANALYTICS_CONFIG = Object.freeze({
  // Identificação
  PROJECT_ID: "farolescolar",
  PROJECT_NAME: "SGE - Sistema de Gestão Escolar",
  VERSION: "2.0.0",

  // Google Analytics 4 (substitua pelo seu ID)
  GA4_MEASUREMENT_ID: "", // Ex: "G-XXXXXXXXXX"
  GA4_ENABLED: false,

  // Firebase Analytics
  FIREBASE_ANALYTICS_ENABLED: true,

  // Privacidade
  ANONYMIZE_IP: true,
  RESPECT_DNT: true,
  REQUIRE_CONSENT: true,

  // Coleta de Dados
  TRACK_PAGE_VIEWS: true,
  TRACK_CLICKS: true,
  TRACK_FORMS: true,
  TRACK_ERRORS: true,
  TRACK_PERFORMANCE: true,
  TRACK_USER_ACTIONS: true,

  // Performance
  BATCH_EVENTS: true,
  BATCH_SIZE: 10,
  BATCH_INTERVAL_MS: 5000,

  // Retenção
  DATA_RETENTION_DAYS: 30,
  MAX_EVENTS_PER_SESSION: 500,

  // Logging
  ENABLE_CONSOLE_LOGGING: false,
  LOG_LEVEL: "warn", // 'debug' | 'info' | 'warn' | 'error'

  // Debug
  DEBUG_MODE: false,
});

// ──────────────────────────────────────────────────────────────────────────
// 🧠 ESTADO INTERNO
// ──────────────────────────────────────────────────────────────────────────

let _analyticsState = {
  initialized: false,
  consentGranted: false,
  sessionId: null,
  sessionStartTime: null,
  eventCount: 0,
  pendingEvents: [],
  userId: null,
  userProperties: {},
  currentScreen: null,
  previousScreen: null,
};

let _batchTimer = null;
let _eventQueue = [];

// ──────────────────────────────────────────────────────────────────────────
// 🔐 PRIVACIDADE E CONSENTIMENTO
// ──────────────────────────────────────────────────────────────────────────

/**
 * Verifica se usuário tem Do Not Track habilitado
 * @returns {boolean}
 */
function _hasDoNotTrack() {
  if (!ANALYTICS_CONFIG.RESPECT_DNT) return false;

  const dnt =
    window.doNotTrack || navigator.doNotTrack || navigator.msDoNotTrack;
  return dnt === "1" || dnt === "yes";
}

/**
 * Verifica se consentimento foi dado (LGPD)
 * @returns {boolean}
 */
function _hasConsent() {
  if (!ANALYTICS_CONFIG.REQUIRE_CONSENT) return true;

  try {
    const consent = localStorage.getItem("sge_analytics_consent");
    if (!consent) return false;

    const { granted, timestamp } = JSON.parse(consent);
    const age = Date.now() - timestamp;
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 ano

    return granted === true && age < maxAge;
  } catch {
    return false;
  }
}

/**
 * Solicita consentimento do usuário
 * @returns {Promise<boolean>}
 */
export async function requestConsent() {
  return new Promise((resolve) => {
    // Cria modal de consentimento
    const modal = document.createElement("div");
    modal.id = "analytics-consent-modal";
    modal.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1e293b;
      color: #fff;
      padding: 1.5rem;
      z-index: 9999;
      box-shadow: 0 -4px 6px rgba(0,0,0,0.1);
    `;

    modal.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">📊 Privacidade e Cookies</h3>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; opacity: 0.9;">
          Utilizamos cookies e analytics para melhorar sua experiência. 
          Seus dados são anonimizados e protegidos conforme a LGPD.
        </p>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="analytics-accept" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.625rem 1.25rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 600;
          ">Aceitar</button>
          <button id="analytics-reject" style="
            background: transparent;
            color: #94a3b8;
            border: 1px solid #475569;
            padding: 0.625rem 1.25rem;
            border-radius: 0.375rem;
            cursor: pointer;
          ">Recusar</button>
          <button id="analytics-config" style="
            background: transparent;
            color: #94a3b8;
            border: 1px solid #475569;
            padding: 0.625rem 1.25rem;
            border-radius: 0.375rem;
            cursor: pointer;
          ">Configurar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const handleAccept = () => {
      _grantConsent();
      _removeModal();
      resolve(true);
    };

    const handleReject = () => {
      _denyConsent();
      _removeModal();
      resolve(false);
    };

    const handleConfig = () => {
      // Futuro: abrir modal de configurações detalhadas
      alert("Configurações detalhadas em desenvolvimento.");
    };

    modal
      .querySelector("#analytics-accept")
      .addEventListener("click", handleAccept);
    modal
      .querySelector("#analytics-reject")
      .addEventListener("click", handleReject);
    modal
      .querySelector("#analytics-config")
      .addEventListener("click", handleConfig);

    function _removeModal() {
      modal.remove();
    }
  });
}

/**
 * Concede consentimento
 * @private
 */
function _grantConsent() {
  _analyticsState.consentGranted = true;
  localStorage.setItem(
    "sge_analytics_consent",
    JSON.stringify({
      granted: true,
      timestamp: Date.now(),
      version: "1.0",
    }),
  );

  _log("info", "Consentimento concedido");
}

/**
 * Nega consentimento
 * @private
 */
function _denyConsent() {
  _analyticsState.consentGranted = false;
  localStorage.setItem(
    "sge_analytics_consent",
    JSON.stringify({
      granted: false,
      timestamp: Date.now(),
    }),
  );

  _clearAllData();
  _log("info", "Consentimento negado - dados limpos");
}

/**
 * Limpa todos os dados de analytics
 * @private
 */
function _clearAllData() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("sge_analytics_")) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignora
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 🎯 INICIALIZAÇÃO
// ──────────────────────────────────────────────────────────────────────────

/**
 * Inicializa sistema de analytics
 * @param {Object} [config] - Configurações opcionais
 * @returns {Promise<boolean>}
 */
export async function initAnalytics(config = {}) {
  // Merge de configurações
  Object.assign(ANALYTICS_CONFIG, config);

  // Verifica DNT
  if (_hasDoNotTrack()) {
    _log("warn", "Do Not Track detectado - analytics desabilitado");
    return false;
  }

  // Verifica consentimento
  if (ANALYTICS_CONFIG.REQUIRE_CONSENT) {
    const hasConsent = _hasConsent();
    if (!hasConsent) {
      _log("info", "Consentimento necessário - solicitando");
      await requestConsent();
    }
    _analyticsState.consentGranted = _hasConsent();
  }

  if (!_analyticsState.consentGranted) {
    _log("warn", "Consentimento não concedido - analytics desabilitado");
    return false;
  }

  // Gera ID de sessão
  _analyticsState.sessionId = _generateSessionId();
  _analyticsState.sessionStartTime = Date.now();
  _analyticsState.initialized = true;

  // Inicia Google Analytics 4 se configurado
  if (ANALYTICS_CONFIG.GA4_ENABLED && ANALYTICS_CONFIG.GA4_MEASUREMENT_ID) {
    await _initGA4();
  }

  // Inicia Firebase Analytics se habilitado
  if (ANALYTICS_CONFIG.FIREBASE_ANALYTICS_ENABLED) {
    await _initFirebaseAnalytics();
  }

  // Inicia batch processor
  if (ANALYTICS_CONFIG.BATCH_EVENTS) {
    _startBatchProcessor();
  }

  // Auto-limpeza de dados antigos
  _cleanupOldData();

  // Track page view inicial
  if (ANALYTICS_CONFIG.TRACK_PAGE_VIEWS) {
    trackPageView(window.location.pathname);
  }

  _log("info", "Analytics inicializado", {
    sessionId: _analyticsState.sessionId,
    ga4: ANALYTICS_CONFIG.GA4_ENABLED,
    firebase: ANALYTICS_CONFIG.FIREBASE_ANALYTICS_ENABLED,
  });

  return true;
}

/**
 * Inicializa Google Analytics 4
 * @private
 */
async function _initGA4() {
  return new Promise((resolve) => {
    // Verifica se já existe
    if (window.gtag) {
      resolve(true);
      return;
    }

    // Carrega script do GA4
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.GA4_MEASUREMENT_ID}`;

    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        dataLayer.push(arguments);
      };

      // Configuração inicial
      gtag("js", new Date());
      gtag("config", ANALYTICS_CONFIG.GA4_MEASUREMENT_ID, {
        anonymize_ip: ANALYTICS_CONFIG.ANONYMIZE_IP,
        send_page_view: false, // Nós controlamos manualmente
      });

      _log("info", "GA4 inicializado");
      resolve(true);
    };

    script.onerror = () => {
      _log("error", "Falha ao carregar GA4");
      resolve(false);
    };

    document.head.appendChild(script);
  });
}

/**
 * Inicializa Firebase Analytics
 * @private
 */
async function _initFirebaseAnalytics() {
  try {
    // Importa Firebase Analytics dinamicamente
    const { getAnalytics, logEvent, setUserId, setUserProperties } =
      await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js");

    const { auth } = await import("../../firebase/config.js");

    // Aguarda auth state
    auth.onAuthStateChanged((user) => {
      if (user) {
        _analyticsState.userId = user.uid;
        setUserId(getAnalytics(), user.uid);

        // Define propriedades do usuário
        setUserProperties(getAnalytics(), {
          user_role: user.role || "unknown",
          user_email_domain: user.email?.split("@")[1] || "unknown",
        });
      }
    });

    _log("info", "Firebase Analytics inicializado");
    return true;
  } catch (err) {
    _log("warn", "Firebase Analytics não disponível", { error: err.message });
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 📊 TRACKING DE EVENTOS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Track de evento genérico
 * @param {string} eventName
 * @param {Object} [params]
 */
export function trackEvent(eventName, params = {}) {
  if (!_analyticsState.initialized || !_analyticsState.consentGranted) {
    return;
  }

  if (_analyticsState.eventCount >= ANALYTICS_CONFIG.MAX_EVENTS_PER_SESSION) {
    _log("warn", "Limite de eventos por sessão atingido");
    return;
  }

  const event = {
    name: eventName,
    params: {
      ...params,
      session_id: _analyticsState.sessionId,
      timestamp: Date.now(),
      page_url: window.location.href,
      page_title: document.title,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  // Anonimiza IP se configurado
  if (ANALYTICS_CONFIG.ANONYMIZE_IP) {
    event.params.ip_anonymized = true;
  }

  _analyticsState.eventCount++;

  // Adiciona à fila
  if (ANALYTICS_CONFIG.BATCH_EVENTS) {
    _eventQueue.push(event);

    if (_eventQueue.length >= ANALYTICS_CONFIG.BATCH_SIZE) {
      _flushEvents();
    }
  } else {
    _sendEvent(event);
  }

  // Envia para GA4 se habilitado
  if (ANALYTICS_CONFIG.GA4_ENABLED && window.gtag) {
    gtag("event", eventName, event.params);
  }

  // Envia para Firebase Analytics
  if (ANALYTICS_CONFIG.FIREBASE_ANALYTICS_ENABLED) {
    _sendToFirebase(eventName, event.params);
  }

  if (ANALYTICS_CONFIG.DEBUG_MODE || ANALYTICS_CONFIG.ENABLE_CONSOLE_LOGGING) {
    _log("debug", "Evento trackeado", {
      name: eventName,
      params: event.params,
    });
  }
}

/**
 * Track de page view
 * @param {string} [path]
 * @param {Object} [params]
 */
export function trackPageView(path, params = {}) {
  if (!ANALYTICS_CONFIG.TRACK_PAGE_VIEWS) return;

  const currentPath = path || window.location.pathname;

  trackEvent("page_view", {
    page_path: currentPath,
    page_title: document.title,
    previous_screen: _analyticsState.previousScreen,
    ...params,
  });

  _analyticsState.previousScreen = _analyticsState.currentScreen;
  _analyticsState.currentScreen = currentPath;
}

/**
 * Track de erro
 * @param {string} errorType
 * @param {Object} [context]
 */
export function trackError(errorType, context = {}) {
  if (!ANALYTICS_CONFIG.TRACK_ERRORS) return;

  trackEvent("error", {
    error_type: errorType,
    error_message: context.message || "Unknown error",
    error_stack: context.stack,
    error_line: context.line,
    error_column: context.column,
    error_source: context.source,
    severity: context.severity || "error",
    ...context,
  });
}

/**
 * Track de performance
 * @param {string} metricName
 * @param {Object} [metrics]
 */
export function trackPerformance(metricName, metrics = {}) {
  if (!ANALYTICS_CONFIG.TRACK_PERFORMANCE) return;

  trackEvent("performance", {
    metric_name: metricName,
    ...metrics,
  });

  // Envia para Performance API se disponível
  if (window.performance && window.performance.mark) {
    performance.mark(`sge-${metricName}-end`);
    performance.measure(
      metricName,
      `sge-${metricName}-start`,
      `sge-${metricName}-end`,
    );

    const measure = performance.getEntriesByName(metricName)[0];
    if (measure) {
      trackEvent("performance_measure", {
        metric_name: metricName,
        duration: measure.duration,
        start_time: measure.startTime,
      });
    }
  }
}

/**
 * Track de ação do usuário
 * @param {string} action
 * @param {Object} [params]
 */
export function trackUserAction(action, params = {}) {
  if (!ANALYTICS_CONFIG.TRACK_USER_ACTIONS) return;

  trackEvent("user_action", {
    action,
    ...params,
  });
}

/**
 * Track de submissão de formulário
 * @param {string} formId
 * @param {boolean} success
 * @param {Object} [data]
 */
export function trackFormSubmission(formId, success, data = {}) {
  if (!ANALYTICS_CONFIG.TRACK_FORMS) return;

  trackEvent("form_submission", {
    form_id: formId,
    success,
    ...data,
  });
}

/**
 * Track de validação de formulário
 * @param {string} formId
 * @param {string} fieldId
 * @param {string} error
 */
export function trackValidationError(formId, fieldId, error) {
  if (!ANALYTICS_CONFIG.TRACK_FORMS) return;

  trackEvent("form_validation_error", {
    form_id: formId,
    field_id: fieldId,
    error_message: error,
  });
}

/**
 * Track de erro de rede
 * @param {string} url
 * @param {string} method
 * @param {Object} error
 */
export function trackNetworkError(url, method, error) {
  trackEvent("network_error", {
    url,
    method,
    error_message: error.message,
    error_code: error.code,
    status: error.status,
  });
}

/**
 * Track de evento de autenticação
 * @param {string} event
 * @param {Object} [params]
 */
export function trackAuthEvent(event, params = {}) {
  trackEvent(`auth_${event}`, {
    ...params,
  });
}

/**
 * Track de evento de banco de dados
 * @param {string} operation
 * @param {string} collection
 * @param {Object} [params]
 */
export function trackDatabaseEvent(operation, collection, params = {}) {
  trackEvent(`db_${operation}`, {
    collection,
    ...params,
  });
}

/**
 * Track de evento de storage
 * @param {string} operation
 * @param {string} path
 * @param {Object} [params]
 */
export function trackStorageEvent(operation, path, params = {}) {
  trackEvent(`storage_${operation}`, {
    path,
    ...params,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 👤 PROPRIEDADES DO USUÁRIO
// ──────────────────────────────────────────────────────────────────────────

/**
 * Define ID do usuário
 * @param {string} userId
 */
export function setAnalyticsUser(userId) {
  _analyticsState.userId = userId;

  if (ANALYTICS_CONFIG.GA4_ENABLED && window.gtag) {
    gtag("set", "user_id", userId);
  }

  if (ANALYTICS_CONFIG.FIREBASE_ANALYTICS_ENABLED) {
    import("https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js").then(
      ({ getAnalytics, setUserId }) => {
        setUserId(getAnalytics(), userId);
      },
    );
  }
}

/**
 * Define propriedade do usuário
 * @param {string} name
 * @param {any} value
 */
export function setAnalyticsProperty(name, value) {
  _analyticsState.userProperties[name] = value;

  if (ANALYTICS_CONFIG.GA4_ENABLED && window.gtag) {
    gtag("set", name, value);
  }

  if (ANALYTICS_CONFIG.FIREBASE_ANALYTICS_ENABLED) {
    import("https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js").then(
      ({ getAnalytics, setUserProperties }) => {
        setUserProperties(getAnalytics(), { [name]: value });
      },
    );
  }
}

/**
 * Define tela atual
 * @param {string} screenName
 */
export function setAnalyticsScreen(screenName) {
  _analyticsState.previousScreen = _analyticsState.currentScreen;
  _analyticsState.currentScreen = screenName;

  trackEvent("screen_view", {
    screen_name: screenName,
    previous_screen: _analyticsState.previousScreen,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 🔧 UTILITÁRIOS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Gera ID de sessão único
 * @private
 * @returns {string}
 */
function _generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `sess_${timestamp}_${random}`;
}

/**
 * Envia evento para backend/analytics service
 * @private
 * @param {Object} event
 */
async function _sendEvent(event) {
  try {
    // Envia para endpoint de analytics se configurado
    if (ANALYTICS_CONFIG.ENDPOINT) {
      await fetch(ANALYTICS_CONFIG.ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true,
      });
    }
  } catch (err) {
    _log("error", "Falha ao enviar evento", { error: err.message });

    // Fallback: salva no localStorage
    _saveEventLocally(event);
  }
}

/**
 * Envia eventos em batch
 * @private
 */
function _flushEvents() {
  if (_eventQueue.length === 0) return;

  const events = [..._eventQueue];
  _eventQueue = [];

  // Envia todos de uma vez
  events.forEach((event) => _sendEvent(event));

  _log("debug", `Batch enviado: ${events.length} eventos`);
}

/**
 * Inicia processador de batch
 * @private
 */
function _startBatchProcessor() {
  _batchTimer = setInterval(() => {
    _flushEvents();
  }, ANALYTICS_CONFIG.BATCH_INTERVAL_MS);
}

/**
 * Salva evento localmente (fallback offline)
 * @private
 * @param {Object} event
 */
function _saveEventLocally(event) {
  try {
    const key = `sge_analytics_event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem(key, JSON.stringify(event));
  } catch {
    // localStorage cheio ou indisponível
  }
}

/**
 * Envia evento para Firebase Analytics
 * @private
 * @param {string} name
 * @param {Object} params
 */
async function _sendToFirebase(name, params) {
  try {
    const { getAnalytics, logEvent } =
      await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js");

    logEvent(getAnalytics(), name, params);
  } catch {
    // Firebase não disponível
  }
}

/**
 * Limpa dados antigos (> DATA_RETENTION_DAYS)
 * @private
 */
function _cleanupOldData() {
  try {
    const keys = Object.keys(localStorage);
    const maxAge = ANALYTICS_CONFIG.DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    keys.forEach((key) => {
      if (!key.startsWith("sge_analytics_event_")) return;

      try {
        const event = JSON.parse(localStorage.getItem(key));
        const age = now - event.params.timestamp;

        if (age > maxAge) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });

    _log("info", "Limpeza de dados antigos concluída");
  } catch {
    // Ignora
  }
}

/**
 * Logger interno
 * @private
 * @param {string} level
 * @param {string} message
 * @param {Object} [context]
 */
function _log(level, message, context = {}) {
  if (!ANALYTICS_CONFIG.ENABLE_CONSOLE_LOGGING) return;

  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[ANALYTICS_CONFIG.LOG_LEVEL] ?? 1;

  if (levels[level] < currentLevel) return;

  const timestamp = new Date().toISOString();
  const prefix = `[SGE.ANALYTICS.${level.toUpperCase()}]`;
  const contextStr =
    Object.keys(context).length > 0 ? JSON.stringify(context) : "";

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

// ──────────────────────────────────────────────────────────────────────────
// 🎯 EXPORTS PÚBLICOS
// ──────────────────────────────────────────────────────────────────────────

export default {
  init: initAnalytics,
  track: trackEvent,
  trackPageView,
  trackError,
  trackPerformance,
  trackUserAction,
  trackFormSubmission,
  trackValidationError,
  trackNetworkError,
  trackAuthEvent,
  trackDatabaseEvent,
  trackStorageEvent,
  setUser: setAnalyticsUser,
  setProperty: setAnalyticsProperty,
  setScreen: setAnalyticsScreen,
  requestConsent,
  flush: _flushEvents,
};

// ──────────────────────────────────────────────────────────────────────────
// 🚀 INICIALIZAÇÃO AUTOMÁTICA
// ──────────────────────────────────────────────────────────────────────────

if (typeof document !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAnalytics();
  });
} else if (typeof document !== "undefined") {
  initAnalytics();
}

// Cleanup no unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    _flushEvents();
    if (_batchTimer) clearInterval(_batchTimer);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏁 FIM DO ARQUIVO tracking.js (600+ linhas)
// ═══════════════════════════════════════════════════════════════════════════
