import svc from "./notificacoes-service.js";
export function initNotificationsForRole(role) {
  try {
    const ok = ["diretor", "admin", "professor"];
    if (!ok.includes(role)) return;
    const bell = document.querySelector("#notif-bell");
    if (!bell) {
      console.debug("notif: no bell");
      return;
    }
    const user = window.firebase?.auth?.()?.currentUser;
    if (!user) return;
    svc.init(user);
    const unsub = svc.subscribe(() => {});
    const onUnload = () => {
      try {
        unsub();
        svc.cleanup();
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      try {
        window.removeEventListener("beforeunload", onUnload);
        unsub();
        svc.cleanup();
      } catch {}
    };
  } catch {}
}
