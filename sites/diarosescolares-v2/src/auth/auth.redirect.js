const ROLE_ROUTES = Object.freeze({
  teacher: "/app/professor/",
  director: "/app/director/",
  guardian: "/app/guardian/",
});

const STATUS_ROUTES = Object.freeze({
  disabled: "/auth/account-disabled.html",
});

const ALLOWED = new Set([
  ...Object.values(ROLE_ROUTES),
  "/auth/login.html",
  "/auth/register.html",
  "/auth/account-disabled.html",
  "/app/professor/onboarding.html",
]);

export const redirectByRole = (role) => {
  const target = ROLE_ROUTES[role];
  if (!target) {
    console.warn("[Redirect] unknown_role", role);
    return redirectFallback();
  }
  location.replace(target);
};

export const redirectByStatus = (status) => {
  const target = STATUS_ROUTES[status];
  if (target) return location.replace(target);
  return redirectFallback();
};

export const redirectFallback = (path = "/auth/login.html") => {
  if (location.pathname === path) return;
  location.replace(path);
};

export const redirectSafe = (path) => {
  const clean = String(path || "").split("?")[0];
  if (ALLOWED.has(clean)) {
    location.replace(path);
    return;
  }
  console.warn("[Redirect] blocked_path", path);
  redirectFallback();
};
