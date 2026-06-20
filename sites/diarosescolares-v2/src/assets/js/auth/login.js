import { authController } from "../../../auth/auth.controller.js";
import {
  setLoading,
  setGeneralError,
  setError,
  bindPasswordToggle,
  bindInputClearErrors,
  getField,
} from "../shared/auth-ui.js";
import { validateLogin } from "../../../auth/auth.validation.js";

const init = () => {
  const form = document.querySelector("form#login-form");
  if (!form) return;

  bindPasswordToggle(
    "#toggle-password",
    "#login-password",
    "#toggle-password-icon",
  );
  bindInputClearErrors("#login-email", "#login-email-error");
  bindInputClearErrors("#login-password", "#login-password-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setGeneralError("#general-error", "");
    setError("#login-email-error", "");
    setError("#login-password-error", "");

    const email = getField("login-email");
    const password = getField("login-password");

    const v = validateLogin(email, password);
    if (!v.ok) {
      if (v.msg.toLowerCase().includes("email")) {
        setError("#login-email-error", v.msg);
      } else {
        setError("#login-password-error", v.msg);
      }
      return;
    }

    setLoading("#submit-btn", true);

    try {
      await authController.login(v.email, v.password);
    } catch (err) {
      setGeneralError(
        "#general-error",
        err.message || "Erro ao entrar. Tente novamente.",
      );
    } finally {
      setLoading("#submit-btn", false);
    }
  });
};

document.addEventListener("DOMContentLoaded", init);
