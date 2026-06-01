import svc from "../firebase/notificacoes-service.js";
import { renderNotificationsList } from "./viewer.js";
const containerId = "notif-page-list";
const allowed = ["diretor", "admin", "professor"];
try {
  window.firebase?.auth()?.onAuthStateChanged(async (u) => {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = '<div class="p-4">Carregando...</div>';
    if (!u) {
      c.innerHTML =
        '<div class="p-4 text-sm text-gray-500">Acesso negado</div>';
      return;
    }
    const roleSnap = await window.firebase
      ?.database?.()
      .ref("roles/" + u.uid)
      ?.once("value");
    const role = roleSnap?.val() ?? null;
    if (!allowed.includes(role)) {
      c.innerHTML =
        '<div class="p-4 text-sm text-gray-500">Sem permissão</div>';
      return;
    }
    svc.init(u);
    svc.subscribe((s) => {
      const arr = s?.lista ?? [];
      renderNotificationsList(containerId, arr);
    });
    window.addEventListener("beforeunload", () => {
      try {
        svc.cleanup();
      } catch {}
    });
  });
} catch {}
