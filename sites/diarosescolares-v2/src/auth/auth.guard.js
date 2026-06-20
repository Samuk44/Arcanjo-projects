import { auth } from "../firebase/firebase.config.js";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "../services/user/user.service.js";
import { redirectByRole, redirectFallback } from "./auth.redirect.js";
import { Logger } from "../assets/js/shared/logger.js";

export const requireAuth = (allowedRoles = []) =>
  new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        Logger.auth.permissionDenied("anonymous", location.pathname);
        redirectFallback("/auth/login.html");
        return reject(new Error("AUTH_REQUIRED"));
      }
      try {
        const profile = await getUserProfile(user.uid);
        if (profile.status === "disabled") {
          redirectFallback("/auth/account-disabled.html");
          return reject(new Error("DISABLED"));
        }
        if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
          Logger.auth.permissionDenied(profile.role, allowedRoles);
          redirectByRole(profile.role);
          return reject(new Error("FORBIDDEN"));
        }
        resolve({ user, profile });
      } catch (e) {
        Logger.error("auth.guard.error", { msg: e.message });
        redirectFallback("/auth/login.html");
        reject(e);
      }
    });
  });

export const initGuard = (allowedRoles = []) => {
  requireAuth(allowedRoles).catch(() => {});
};
