const PREFIX = "[Diários]";
const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "token",
  "pin",
  "cpf",
  "cnpj",
]);

const sanitize = (data) => {
  if (!data || typeof data !== "object") return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
};

const emit = (level, event, data = {}) => {
  const safe = sanitize(data);
  const payload = {
    level,
    event,
    data: safe,
    path: location.pathname,
    ts: new Date().toISOString(),
  };
  console[level === "error" ? "error" : "log"](`${PREFIX} ${event}`, safe);

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/logs", JSON.stringify(payload));
    }
  } catch {
    /* silent */
  }
};

export const Logger = {
  info: (e, d) => emit("info", e, d),
  warn: (e, d) => emit("warn", e, d),
  error: (e, d) => emit("error", e, d),
  auth: {
    loginSuccess: (uid) => Logger.info("auth.login.success", { uid }),
    loginFailed: (code) => Logger.warn("auth.login.failed", { code }),
    registerSuccess: (role, uid) =>
      Logger.info("auth.register.success", { role, uid }),
    registerFailed: (role, code) =>
      Logger.warn("auth.register.failed", { role, code }),
    sessionRestored: (uid, role) =>
      Logger.info("auth.session.restored", { uid, role }),
    permissionDenied: (role, route) =>
      Logger.warn("auth.permission.denied", { role, route }),
    tenantInvalid: (reason) => Logger.warn("auth.tenant.invalid", { reason }),
  },
};
