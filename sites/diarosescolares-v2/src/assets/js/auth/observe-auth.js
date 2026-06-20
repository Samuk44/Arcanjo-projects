import { authController } from "../../../auth/auth.controller.js";

export function initAuthObserver() {
  authController.redirectIfAuthenticated().catch(() => {});
}
