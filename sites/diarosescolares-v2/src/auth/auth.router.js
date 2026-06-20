import { authController } from "./auth.controller.js";

const PUBLIC_PATHS = [
  "/auth/login.html",
  "/auth/register.html",
  "/auth/register-director.html",
  "/auth/register-teacher.html",
  "/auth/register-guardian.html",
  "/auth/register-pending.html",
  "/auth/account-disabled.html",
  "/",
  "/index.html",
];

const PROTECTED_PATHS = {
  "/app/professor/": "teacher",
  "/app/director/": "director",
  "/app/guardian/": "guardian",
};

export async function initRouter() {
  const pathname = window.location.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.endsWith(p),
  );

  if (isPublic) {
    await authController.redirectIfAuthenticated();
    return;
  }

  const requiredRole = Object.entries(PROTECTED_PATHS).find(([path]) =>
    pathname.startsWith(path),
  )?.[1];

  if (requiredRole) {
    await authController.guardRoute(requiredRole);
  }
}
