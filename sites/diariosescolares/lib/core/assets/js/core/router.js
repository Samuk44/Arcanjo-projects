/* SGE v2.0 • Core Router & Navigation Interceptor */
import { auth, db } from "../firebase/config.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { checkAccess } from "./rbac.js";
import { showToast } from "./notifications.js";

/**
 * Navega para um caminho específico validando permissões e planos
 * @param {string} path - Ex: 'diretor/relatorios'
 */
export async function navigateTo(path) {
  const module = path.split("/")[0]; // Pega o primeiro segmento como módulo
  const user = auth.currentUser;

  if (!user) {
    window.location.replace("../auth/login.html");
    return;
  }

  try {
    // Busca dados do usuário (preferencialmente do cache/session primeiro)
    const userRef = ref(db, `usuarios/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      showToast("Perfil não encontrado.", "error");
      return;
    }

    const userData = snapshot.val();

    // Validação de RBAC e Plano
    const hasAccess = checkAccess(userData.role, module, userData.plano);

    if (hasAccess) {
      window.location.href = `../${path}/`;
    }
  } catch (error) {
    console.error("Erro na navegação:", error);
    showToast("Erro ao validar acesso.", "error");
  }
}

/**
 * Inicializa os listeners de navegação global
 */
export function initRouter() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-navigate]");
    if (target) {
      e.preventDefault();
      const path = target.getAttribute("data-navigate");
      navigateTo(path);
    }
  });
}

/**
 * Retorna o módulo atual baseado na URL
 * @returns {string}
 */
export function getCurrentModule() {
  const path = window.location.pathname;
  return path.split("/")[1] || "dashboard";
}

// Inicialização automática se estiver no contexto de browser
if (typeof window !== "undefined") {
  window.navigateTo = navigateTo;
}
