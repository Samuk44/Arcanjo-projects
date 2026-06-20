const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCHOOL_CODE_RE = /^[a-zA-Z0-9_-]{4,32}$/;
const LINK_TOKEN_RE = /^[a-zA-Z0-9]{6,16}$/;

const err = (msg) => ({ ok: false, msg });
const ok = (value) => ({ ok: true, value });

export const validateEmail = (v) => {
  const s = String(v || "")
    .trim()
    .toLowerCase();
  if (!s) return err("Email é obrigatório.");
  if (s.length > 254) return err("Email muito longo.");
  if (!EMAIL_RE.test(s)) return err("Formato de email inválido.");
  return ok(s);
};

export const validatePassword = (v) => {
  if (!v) return err("Senha é obrigatória.");
  if (v.length < 6) return err("Senha deve ter pelo menos 6 caracteres.");
  if (v.length > 128) return err("Senha muito longa.");
  return ok(v);
};

export const validatePin = (v) => {
  const s = String(v || "").trim();
  if (!s) return err("PIN é obrigatório.");
  if (!/^\d{4,8}$/.test(s)) return err("PIN deve ter entre 4 e 8 dígitos.");
  return ok(s);
};

export const validateDisplayName = (v) => {
  const s = String(v || "").trim();
  if (!s) return err("Nome é obrigatório.");
  if (s.length < 2) return err("Nome muito curto.");
  if (s.length > 100) return err("Nome muito longo.");
  if (!/^[a-zA-ZÀ-ÿ0-9\s.'-]+$/.test(s))
    return err("Nome contém caracteres inválidos.");
  return ok(s);
};

export const validateSchoolCode = (v) => {
  const s = String(v || "").trim();
  if (!s) return err("Código da escola é obrigatório.");
  if (!SCHOOL_CODE_RE.test(s))
    return err("Código da escola inválido (4 a 32 caracteres alfanuméricos).");
  return ok(s);
};

export const validateInviteCode = (v) => {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return err("Código de convite é obrigatório.");
  if (!/^[A-Z0-9_-]+:[A-Z]+:[A-Z0-9_-]+$/.test(s))
    return err("Formato de código de convite inválido. Ex: ESCOLA:TEACHER:TOKEN");
  return ok(s);
};

export const validateSchoolName = (v) => {
  const s = String(v || "").trim();
  if (!s) return err("Nome da escola é obrigatório.");
  if (s.length < 3) return err("Nome muito curto.");
  if (s.length > 120) return err("Nome muito longo.");
  return ok(s);
};

export const validateCity = (v) => {
  const s = String(v || "").trim();
  if (!s) return err("Cidade é obrigatória.");
  if (s.length > 80) return err("Cidade muito longa.");
  return ok(s);
};

export const validateState = (v) => {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (!s) return err("Estado é obrigatório.");
  if (!/^[A-Z]{2}$/.test(s)) return err("Estado deve ter 2 letras (UF).");
  return ok(s);
};

export const validateCnpj = (v) => {
  const s = String(v || "").trim();
  if (!s) return { ok: true, value: "" }; // optional
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 14) return err("CNPJ deve ter 14 dígitos.");
  return ok(digits);
};

export const validatePhone = (v) => {
  const s = String(v || "").trim();
  if (!s) return { ok: true, value: "" }; // optional
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11)
    return err("Telefone inválido.");
  return ok(digits);
};

export const validateLinkToken = (v) => {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (!s) return err("Código de vínculo é obrigatório.");
  if (!LINK_TOKEN_RE.test(s))
    return err("Código de vínculo inválido (6 a 16 caracteres).");
  return ok(s);
};

export const validateChildName = (v) => validateDisplayName(v);

export const validateLogin = (email, password) => {
  const e = validateEmail(email);
  if (!e.ok) return e;
  const p = validatePassword(password);
  if (!p.ok) return p;
  return { ok: true, email: e.value, password: p.value };
};

export const validateDirectorForm = (f) => {
  const name = validateDisplayName(f.name);
  if (!name.ok) return name;
  const email = validateEmail(f.email);
  if (!email.ok) return email;
  const password = validatePassword(f.password);
  if (!password.ok) return password;
  const schoolName = validateSchoolName(f.schoolName);
  if (!schoolName.ok) return schoolName;
  const city = validateCity(f.city);
  if (!city.ok) return city;
  const state = validateState(f.state);
  if (!state.ok) return state;
  const phone = validatePhone(f.phone);
  if (!phone.ok) return phone;
  const cnpj = validateCnpj(f.cnpj);
  if (!cnpj.ok) return cnpj;
  return {
    ok: true,
    data: {
      name: name.value,
      email: email.value,
      password: password.value,
      schoolName: schoolName.value,
      city: city.value,
      state: state.value,
      phone: phone.value,
      cnpj: cnpj.value,
    },
  };
};

export const validateTeacherForm = (f) => {
  const name = validateDisplayName(f.name);
  if (!name.ok) return name;
  const email = validateEmail(f.email);
  if (!email.ok) return email;
  const password = validatePassword(f.password);
  if (!password.ok) return password;
  const inviteCode = validateInviteCode(f.inviteCode);
  if (!inviteCode.ok) return inviteCode;
  return {
    ok: true,
    data: {
      name: name.value,
      email: email.value,
      password: password.value,
      inviteCode: inviteCode.value,
    },
  };
};

export const validateGuardianForm = (f) => {
  const name = validateDisplayName(f.name);
  if (!name.ok) return name;
  const inviteCode = validateInviteCode(f.inviteCode);
  if (!inviteCode.ok) return inviteCode;

  let email, password, phone;
  if (f.email) {
    email = validateEmail(f.email);
    if (!email.ok) return email;
  }
  if (f.password) {
    password = validatePassword(f.password);
    if (!password.ok) return password;
  }
  if (f.phone) {
    phone = validatePhone(f.phone);
    if (!phone.ok) return phone;
  }

  if (!email?.value && !phone?.value) {
    return err("Informe email ou telefone.");
  }
  if (!password?.value) {
    return err("Informe uma senha.");
  }

  return {
    ok: true,
    data: {
      name: name.value,
      email: email?.value || "",
      password: password.value,
      phone: phone?.value || "",
      inviteCode: inviteCode.value,
    },
  };
};
