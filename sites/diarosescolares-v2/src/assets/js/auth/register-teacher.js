import {
  getField,
  setLoading,
  setGeneralError,
  setError,
  bindPasswordToggle,
  bindInputClearErrors,
} from "../shared/auth-ui.js";
import { showToast } from "../shared/toast.js";
import { validateTeacherForm } from "../../../auth/auth.validation.js";
import { registerWithInvite } from "../../../auth/auth.service.js";
import { Logger } from "../shared/logger.js";

const DEBOUNCE_MS = 2500;

const $ = (s) => document.querySelector(s);

const init = () => {
  const form = $("#register-teacher-form");
  if (!form) return;

  let lastSubmit = 0;

  bindPasswordToggle(
    "#toggle-password",
    "#reg-password",
    "#toggle-password-icon",
  );

  ["#reg-name", "#reg-email", "#reg-password", "#reg-school-code"].forEach(
    (sel) => bindInputClearErrors(sel, sel + "-error"),
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmit < DEBOUNCE_MS) return;
    lastSubmit = now;

    setGeneralError("#general-error", "");

    const v = validateTeacherForm({
      name: getField("reg-name"),
      email: getField("reg-email"),
      password: getField("reg-password"),
      inviteCode: getField("reg-school-code"),
    });

    if (!v.ok) {
      setGeneralError("#general-error", v.msg);
      return;
    }

    setLoading("#submit-btn", true);

    try {
      // O registerWithInvite já lida com validação e criação do perfil
      const profile = await registerWithInvite({
        name: v.data.name,
        email: v.data.email,
        password: v.data.password,
        inviteCode: v.data.inviteCode,
        role: "teacher",
      });

      Logger.info("auth.register.success", {
        uid: profile.uid,
        role: "teacher",
      });
      showToast(
        "Cadastro realizado! Complete suas turmas e disciplinas.",
        "success",
      );

      setTimeout(() => {
        location.replace("/app/professor/onboarding.html");
      }, 1500);
    } catch (err) {
      console.error("[RegisterTeacher]", err);
      setGeneralError("#general-error", err.message);
      showToast(err.message, "error");
    } finally {
      setLoading("#submit-btn", false);
    }
  });
};

document.addEventListener("DOMContentLoaded", init);
