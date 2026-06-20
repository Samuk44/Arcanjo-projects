import {
  getField,
  setLoading,
  setGeneralError,
  setError,
  bindPasswordToggle,
  bindInputClearErrors,
} from "../shared/auth-ui.js";
import { showToast } from "../shared/toast.js";
import { validateGuardianForm } from "../../../auth/auth.validation.js";
import { registerWithInvite } from "../../../auth/auth.service.js";
import { Logger } from "../shared/logger.js";

const DEBOUNCE_MS = 2500;

const $ = (s) => document.querySelector(s);

const init = () => {
  const form = $("#register-guardian-form");
  if (!form) return;

  let lastSubmit = 0;

  bindPasswordToggle(
    "#toggle-password",
    "#reg-password",
    "#toggle-password-icon",
  );

  [
    "#reg-name",
    "#reg-email",
    "#reg-password",
    "#reg-invite-code",
  ].forEach((sel) => bindInputClearErrors(sel, sel + "-error"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmit < DEBOUNCE_MS) return;
    lastSubmit = now;

    setGeneralError("#general-error", "");

    const v = validateGuardianForm({
      name: getField("reg-name"),
      email: getField("reg-email"),
      phone: getField("reg-phone"),
      password: getField("reg-password"),
      inviteCode: getField("reg-invite-code"),
    });

    if (!v.ok) {
      setGeneralError("#general-error", v.msg);
      return;
    }

    setLoading("#submit-btn", true);

    try {
      // O registerWithInvite lida com a criação da conta e vínculo
      const profile = await registerWithInvite({
        name: v.data.name,
        email: v.data.email,
        password: v.data.password,
        inviteCode: v.data.inviteCode,
        role: "guardian",
      });

      Logger.info("auth.register.success", {
        uid: profile.uid,
        role: "guardian",
      });
      showToast("Conta criada com sucesso!", "success");

      setTimeout(() => {
        location.replace("/app/guardian/");
      }, 1500);
    } catch (err) {
      console.error("[RegisterGuardian]", err);
      setGeneralError("#general-error", err.message);
      showToast(err.message, "error");
    } finally {
      setLoading("#submit-btn", false);
    }
  });
};

document.addEventListener("DOMContentLoaded", init);
