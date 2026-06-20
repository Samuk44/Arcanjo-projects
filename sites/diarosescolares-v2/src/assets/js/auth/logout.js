import { authController } from "../../../auth/auth.controller.js";

export function bindLogoutButton(btnEl) {
  if (!btnEl) return;
  btnEl.addEventListener("click", async () => {
    try {
      await authController.logout();
    } catch {
      window.location.href = "/auth/login.html";
    }
  });
}

export async function logout() {
  await authController.logout();
}
