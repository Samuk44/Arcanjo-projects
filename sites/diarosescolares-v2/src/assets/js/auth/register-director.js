import {
  getField,
  setLoading,
  setGeneralError,
  setError,
  bindPasswordToggle,
  bindInputClearErrors,
} from "../shared/auth-ui.js";
import { showToast } from "../shared/toast.js";
import { validateDirectorForm } from "../../../auth/auth.validation.js";
import { registerDirector } from "../../../auth/auth.service.js";
import { Logger } from "../shared/logger.js";

const DEBOUNCE_MS = 2500;

const $ = (s) => document.querySelector(s);

const init = () => {
  const form = $("#register-director-form");
  if (!form) return;

  let lastSubmit = 0;

  bindPasswordToggle(
    "#toggle-password",
    "#reg-password",
    "#toggle-password-icon",
  );

  // Lista de seletores para limpar erros ao digitar
  [
    "#reg-name",
    "#reg-email",
    "#reg-password",
    "#reg-school-name",
    "#reg-city",
    "#reg-state",
  ].forEach((sel) => bindInputClearErrors(sel, sel + "-error"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const now = Date.now();
    if (now - lastSubmit < DEBOUNCE_MS) return;
    lastSubmit = now;

    setGeneralError("#general-error", "");

    // Coleta os dados usando os IDs corretos do HTML
    const formData = {
      name: getField("reg-name"),
      email: getField("reg-email"),
      password: getField("reg-password"),
      schoolName: getField("reg-school-name"),
      city: getField("reg-city"),
      state: getField("reg-state"),
      phone: getField("reg-phone"),
      cnpj: getField("reg-cnpj"),
    };

    const v = validateDirectorForm(formData);

    if (!v.ok) {
      setGeneralError("#general-error", v.msg);
      // Focar no primeiro campo com erro (opcional)
      return;
    }

    setLoading("#submit-btn", true);

    try {
      // O auth.service.js já lida com a criação da escola e do perfil internamente
      const profile = await registerDirector({
        name: v.data.name,
        email: v.data.email,
        password: v.data.password,
        schoolName: v.data.schoolName,
        city: v.data.city,
        state: v.data.state,
        phone: v.data.phone,
        cnpj: v.data.cnpj,
      });

      Logger.info("auth.register.success", {
        uid: profile.uid,
        role: "director",
      });
      showToast("Conta e escola criadas com sucesso!", "success");

      // Redireciona após um pequeno delay para o usuário ver o feedback
      setTimeout(() => {
        location.replace("/app/director/");
      }, 1500);
    } catch (err) {
      console.error("[RegisterDirector]", err);
      setGeneralError("#general-error", err.message);
      showToast(err.message, "error");
    } finally {
      setLoading("#submit-btn", false);
    }
  });
};

document.addEventListener("DOMContentLoaded", init);
