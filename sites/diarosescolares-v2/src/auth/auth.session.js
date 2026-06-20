import { auth } from "../firebase/firebase.config.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  getUserProfile,
  updateLastLogin,
} from "../services/user/user.service.js";
import { redirectByRole, redirectFallback } from "./auth.redirect.js";
import { Logger } from "../assets/js/shared/logger.js";

let unsubscribe = null;
let restored = false;

export const observeAuth = ({ onUser, onNone, onError } = {}) => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
    try {
      if (!fbUser) {
        restored = false;
        if (onNone) return onNone();
        return redirectFallback("/auth/login.html");
      }

      const profile = await getUserProfile(fbUser.uid);
      await updateLastLogin(fbUser.uid);
      restored = true;
      Logger.auth.sessionRestored(fbUser.uid, profile.role);

      if (onUser) return onUser(fbUser, profile);
      return routeByProfile(profile);
    } catch (err) {
      Logger.error("auth.session.error", { msg: err.message });
      if (onError) return onError(err);
      redirectFallback("/auth/login.html");
    }
  });

  return unsubscribe;
};

export const routeByProfile = (profile) => {
  if (!profile) return redirectFallback();
  if (profile.status === "disabled")
    return redirectFallback("/auth/account-disabled.html");
  return redirectByRole(profile.role);
};

export const clearSession = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  restored = false;
};

export const isRestored = () => restored;
