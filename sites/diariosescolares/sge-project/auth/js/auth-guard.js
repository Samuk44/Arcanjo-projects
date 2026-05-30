"use strict";

import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const ROLE_REDIRECTS = {
  professor:   "../professor/index.html",
  diretor:     "../diretor/index.html",
  responsavel: "../pai/pai_index.html",
  pai:         "../pai/pai_index.html",
  admin:       "../admin/index.html",
};

const LOGIN_URL = "../auth/login.html";
const REGISTER_URL = "../cadastro/index.html";

function normalizeData(raw) {
  if (!raw) return null;
  const { profileType, isComplete, pendingFields, simpleData, completeData, ...clean } = raw;
  return clean;
}

export function guardRoute(allowedRoles) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        location.replace(LOGIN_URL);
        resolve(null);
        return;
      }

      try {
        const snap = await get(ref(db, `usuarios/${user.uid}`));

        if (!snap.exists()) {
          location.replace(REGISTER_URL);
          resolve(null);
          return;
        }

        const userData = normalizeData(snap.val());

        if (!userData.role || !userData.status) {
          await signOut(auth);
          location.replace(LOGIN_URL);
          resolve(null);
          return;
        }

        if (allowedRoles && !allowedRoles.includes(userData.role)) {
          const dest = ROLE_REDIRECTS[userData.role];
          if (dest) { location.replace(dest); } else { await signOut(auth); location.replace(LOGIN_URL); }
          resolve(null);
          return;
        }

        if (userData.status === "desativado") {
          await signOut(auth);
          location.replace(LOGIN_URL + "?msg=desativado");
          resolve(null);
          return;
        }

        resolve({ uid: user.uid, userData, user });
      } catch {
        location.replace(LOGIN_URL);
        resolve(null);
      }
    });
  });
}

export function guardRoleStrict(allowedRoles) {
  return guardRoute(allowedRoles);
}

export async function requireAuth() {
  return guardRoute(null);
}

export function setupLogout(redirectUrl) {
  const dest = redirectUrl ?? LOGIN_URL;
  document.querySelectorAll("[data-logout], #logoutButton, #sidebarLogout").forEach((btn) =>
    btn?.addEventListener("click", async () => {
      try { await signOut(auth); } catch { }
      finally { location.replace(dest); }
    })
  );
}

export function updateHeaderUser(userData) {
  const g = document.getElementById("userGreeting");
  const av = document.getElementById("userAvatar");
  const nome = userData?.nome ?? userData?.displayName ?? "Usuário";
  if (g) g.textContent = nome.split(" ")[0];
  if (av) av.textContent = nome[0]?.toUpperCase() ?? "U";
}
