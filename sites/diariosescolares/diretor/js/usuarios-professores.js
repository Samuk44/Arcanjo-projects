import {
  initializeApp,
  deleteApp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import { app, auth, db } from "../../assets/js/firebase/config.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const DISCIPLINAS = [
  "Matemática",
  "Língua Portuguesa",
  "História",
  "Geografia",
  "Ciências",
  "Física",
  "Química",
  "Biologia",
  "Inglês",
  "Educação Física",
  "Artes",
  "Filosofia",
  "Sociologia",
  "Redação",
  "Literatura",
];

const BADGE_COLORS = {
  Matemática: "bg-blue-100 text-blue-700",
  "Língua Portuguesa": "bg-green-100 text-green-700",
  História: "bg-amber-100 text-amber-700",
  Geografia: "bg-emerald-100 text-emerald-700",
  Ciências: "bg-cyan-100 text-cyan-700",
  Física: "bg-violet-100 text-violet-700",
  Química: "bg-orange-100 text-orange-700",
  Biologia: "bg-lime-100 text-lime-700",
  Inglês: "bg-red-100 text-red-700",
  "Educação Física": "bg-indigo-100 text-indigo-700",
  Artes: "bg-pink-100 text-pink-700",
  Filosofia: "bg-slate-100 text-slate-600",
  Sociologia: "bg-teal-100 text-teal-700",
  Redação: "bg-rose-100 text-rose-700",
  Literatura: "bg-fuchsia-100 text-fuchsia-700",
};

// ─── State ───────────────────────────────────────────────────────────────────

let todos = [];
let filtrados = [];
let editingId = null;
let deletingId = null;
let selectedDisciplinas = new Set();

// ─── DOM helpers ─────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Auth guard ──────────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  if (!user) return redirect();
  try {
    const snap = await get(ref(db, `usuarios/${user.uid}`));
    if (!snap.exists()) return redirect();
    const data = snap.val();
    if (data.role !== "diretor" || data.status !== "ativo") return redirect();
    const nome = data.nome?.split(" ")[0] || "Diretor";
    $("topbar-greeting").textContent = `Olá, ${nome}`;
    $("topbar-avatar").textContent = (
      data.nome?.charAt(0) || "D"
    ).toUpperCase();
    await loadProfessores();
  } catch {
    redirect();
  }
});

function redirect() {
  location.replace("../../auth/login.html");
}

// ─── Data loading ────────────────────────────────────────────────────────────

async function loadProfessores() {
  try {
    const q = query(
      ref(db, "usuarios"),
      orderByChild("role"),
      equalTo("professor"),
    );
    const snap = await get(q);
    todos = [];
    snap.forEach((child) => todos.push({ id: child.key, ...child.val() }));
    applyFilters();
  } catch {
    toast("Erro ao carregar professores.", "error");
  } finally {
    $("skeleton").classList.add("hidden");
  }
}

// ─── Filter & render ─────────────────────────────────────────────────────────

function applyFilters() {
  const s = $("search-input").value.trim().toLowerCase();
  const disc = $("filter-disciplina").value;
  const st = $("filter-status").value;

  filtrados = todos.filter((p) => {
    const rawCpf = (p.cpf || "").replace(/\D/g, "");
    const searchRaw = s.replace(/\D/g, "");
    const matchSearch =
      !s ||
      p.nome?.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s) ||
      (searchRaw ? rawCpf.includes(searchRaw) : false);
    const matchDisc = !disc || (p.disciplinas || []).includes(disc);
    const matchStatus = !st || p.status === st;
    return matchSearch && matchDisc && matchStatus;
  });

  render();
}

function render() {
  const skeleton = $("skeleton");
  const empty = $("empty-state");
  const noResults = $("no-results");
  const tableWrap = $("table-container");
  const body = $("table-body");
  const countLabel = $("count-label");

  skeleton.classList.add("hidden");

  if (todos.length === 0) {
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    noResults.classList.add("hidden");
    noResults.classList.remove("flex");
    tableWrap.classList.add("hidden");
    countLabel.textContent = "";
    return;
  }

  empty.classList.add("hidden");
  empty.classList.remove("flex");

  if (filtrados.length === 0) {
    noResults.classList.remove("hidden");
    noResults.classList.add("flex");
    tableWrap.classList.add("hidden");
    countLabel.textContent = "0 resultados";
    return;
  }

  noResults.classList.add("hidden");
  noResults.classList.remove("flex");
  tableWrap.classList.remove("hidden");
  countLabel.textContent = `${filtrados.length} professor${filtrados.length !== 1 ? "es" : ""}`;

  body.innerHTML = filtrados.map(renderRow).join("");

  body.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.edit));
  });
  body.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteConfirm(btn.dataset.delete));
  });
}

function renderRow(p) {
  const discs = p.disciplinas || [];
  const visibleDiscs = discs.slice(0, 2);
  const extra = discs.length - 2;

  const badges = visibleDiscs
    .map((d) => {
      const cls = BADGE_COLORS[d] || "bg-slate-100 text-slate-600";
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}">${escHtml(d)}</span>`;
    })
    .join("");

  const moreBadge =
    extra > 0
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">+${extra}</span>`
      : "";

  const statusBadge =
    p.status === "ativo"
      ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>Ativo
         </span>`
      : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
           <span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>Inativo
         </span>`;

  const initials = (p.nome || "?").charAt(0).toUpperCase();

  return `
    <tr class="data-row border-b border-border last:border-0" role="row">
      <td class="px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">${escHtml(initials)}</div>
          <span class="font-medium text-sm text-text">${escHtml(p.nome || "—")}</span>
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-muted hide-mobile">${escHtml(p.cpf || "—")}</td>
      <td class="px-4 py-3 text-sm text-muted hide-mobile">${escHtml(p.email || "—")}</td>
      <td class="px-4 py-3">
        <div class="flex flex-wrap gap-1">${badges}${moreBadge}${discs.length === 0 ? '<span class="text-xs text-muted">—</span>' : ""}</div>
      </td>
      <td class="px-4 py-3">${statusBadge}</td>
      <td class="px-4 py-3 actions-cell">
        <div class="flex items-center justify-end gap-1">
          <button data-edit="${escHtml(p.id)}" class="action-btn p-2 rounded-lg text-muted" title="Editar" aria-label="Editar professor">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button data-delete="${escHtml(p.id)}" class="action-btn p-2 rounded-lg text-muted hover:!bg-red-50 hover:!text-red-500" title="Excluir" aria-label="Excluir professor">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ─── Disciplinas multiselect ─────────────────────────────────────────────────

function renderDiscList(filter = "") {
  const list = $("disc-list");
  const fl = filter.toLowerCase();
  const visible = DISCIPLINAS.filter(
    (d) => !fl || d.toLowerCase().includes(fl),
  );

  if (visible.length === 0) {
    list.innerHTML = `<p class="text-xs text-muted text-center py-4">Nenhuma disciplina encontrada.</p>`;
    return;
  }

  list.innerHTML = visible
    .map((d) => {
      const selected = selectedDisciplinas.has(d);
      return `
        <div class="multiselect-item flex items-center gap-3 px-3 py-2.5 ${selected ? "selected" : ""}" data-disc="${escHtml(d)}" role="option" aria-selected="${selected}">
          <input type="checkbox" class="custom-cb shrink-0" ${selected ? "checked" : ""} tabindex="-1" aria-hidden="true"/>
          <span class="text-sm text-text flex-1">${escHtml(d)}</span>
          ${selected ? `<svg class="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>` : ""}
        </div>
      `;
    })
    .join("");

  list.querySelectorAll(".multiselect-item").forEach((item) => {
    item.addEventListener("click", () => {
      const d = item.dataset.disc;
      if (selectedDisciplinas.has(d)) selectedDisciplinas.delete(d);
      else selectedDisciplinas.add(d);
      renderDiscList($("disc-search").value);
    });
  });
}

// ─── Modal open/close ────────────────────────────────────────────────────────

function openNew() {
  editingId = null;
  resetForm();
  $("modal-prof-title").textContent = "Novo Professor";
  $("modal-delete").classList.add("hidden");
  $("senha-wrap").classList.remove("hidden");
  $("modal-prof").classList.remove("hidden");
  $("f-nome").focus();
}

async function openEdit(id) {
  const prof = todos.find((p) => p.id === id);
  if (!prof) return;
  editingId = id;
  resetForm();
  $("modal-prof-title").textContent = "Editar Professor";
  $("modal-delete").classList.remove("hidden");
  $("senha-wrap").classList.add("hidden");
  $("edit-id").value = id;
  $("f-nome").value = prof.nome || "";
  $("f-cpf").value = prof.cpf || "";
  $("f-email").value = prof.email || "";
  $("f-status").value = prof.status || "ativo";
  selectedDisciplinas = new Set(prof.disciplinas || []);
  renderDiscList();
  $("modal-prof").classList.remove("hidden");
  $("f-nome").focus();
}

function closeModal() {
  $("modal-prof").classList.add("hidden");
  editingId = null;
  resetForm();
}

function resetForm() {
  ["edit-id", "f-nome", "f-cpf", "f-email", "f-senha"].forEach((id) => {
    const el = $(id);
    if (el) el.value = "";
  });
  $("f-status").value = "ativo";
  selectedDisciplinas = new Set();
  $("disc-search").value = "";
  renderDiscList();
  clearErrors();
  $("cpf-warning").classList.add("hidden");
  $("email-warning").classList.add("hidden");
}

// ─── Validation ──────────────────────────────────────────────────────────────

function clearErrors() {
  ["nome", "cpf", "email", "senha", "disciplinas"].forEach((f) => {
    $(`f-${f}`)?.classList.remove("field-error");
    $(`err-${f}`)?.classList.remove("show");
  });
}

function showError(field, msg) {
  const el = $(`f-${field}`);
  if (el) el.classList.add("field-error");
  const err = $(`err-${field}`);
  if (err) {
    err.textContent = msg;
    err.classList.add("show");
  }
}

function validateCPF(cpf) {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r >= 10) r = 0;
  if (r !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r >= 10) r = 0;
  return r === parseInt(c[10]);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Masks ───────────────────────────────────────────────────────────────────

function maskCPF(val) {
  return val
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function handleSave() {
  clearErrors();
  $("cpf-warning").classList.add("hidden");
  $("email-warning").classList.add("hidden");

  const nome = $("f-nome").value.trim();
  const cpf = $("f-cpf").value.trim();
  const email = $("f-email").value.trim().toLowerCase();
  const senha = $("f-senha").value;
  const status = $("f-status").value;
  const disciplinas = [...selectedDisciplinas];

  let valid = true;
  if (!nome) {
    showError("nome", "Campo obrigatório.");
    valid = false;
  }
  if (!cpf || !validateCPF(cpf)) {
    showError("cpf", "CPF inválido.");
    valid = false;
  }
  if (!email || !validateEmail(email)) {
    showError("email", "E-mail inválido.");
    valid = false;
  }
  if (!editingId) {
    if (!senha) {
      showError("senha", "Campo obrigatório.");
      valid = false;
    } else if (senha.length < 6) {
      showError("senha", "Mínimo 6 caracteres.");
      valid = false;
    }
  }
  if (disciplinas.length === 0) {
    showError("disciplinas", "Selecione ao menos uma disciplina.");
    valid = false;
  }
  if (!valid) return;

  const cpfDup = todos.find((p) => p.cpf === cpf && p.id !== editingId);
  if (cpfDup) {
    $("cpf-warning").classList.remove("hidden");
    showError("cpf", "CPF já cadastrado.");
    return;
  }

  const emailDup = todos.find((p) => p.email === email && p.id !== editingId);
  if (emailDup) {
    $("email-warning").classList.remove("hidden");
    showError("email", "E-mail já cadastrado.");
    return;
  }

  const btn = $("modal-salvar");
  setSaveLoading(btn, true);

  try {
    if (editingId) {
      await update(ref(db, `usuarios/${editingId}`), {
        nome,
        cpf,
        email,
        disciplinas,
        status,
      });
      const idx = todos.findIndex((p) => p.id === editingId);
      if (idx !== -1)
        todos[idx] = { ...todos[idx], nome, cpf, email, disciplinas, status };
      toast("Professor atualizado com sucesso!", "success");
    } else {
      const uid = await createProfessorAuth(email, senha);
      const data = {
        nome,
        cpf,
        email,
        disciplinas,
        status,
        role: "professor",
        criadoEm: Date.now(),
      };
      await set(ref(db, `usuarios/${uid}`), data);
      todos.push({ id: uid, ...data });
      toast("Professor cadastrado com sucesso!", "success");
    }
    applyFilters();
    closeModal();
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      $("email-warning").classList.remove("hidden");
      showError("email", "E-mail já em uso no Firebase Auth.");
    } else {
      toast("Erro ao salvar. Tente novamente.", "error");
      console.error(e);
    }
  } finally {
    setSaveLoading(btn, false);
  }
}

/**
 * Creates a Firebase Auth user via a secondary app instance so the
 * director session is not interrupted.
 * Returns the new user's UID.
 */
async function createProfessorAuth(email, senha) {
  const secApp = initializeApp(app.options, `sec-${Date.now()}`);
  const secAuth = getAuth(secApp);
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, email, senha);
    return cred.user.uid;
  } finally {
    await deleteApp(secApp);
  }
}

function setSaveLoading(btn, loading) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> Salvando…`
    : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar`;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function openDeleteConfirm(id) {
  deletingId = id;
  $("modal-del-confirm").classList.remove("hidden");
}

function closeDeleteConfirm() {
  deletingId = null;
  $("modal-del-confirm").classList.add("hidden");
}

async function handleDelete() {
  if (!deletingId) return;
  const btn = $("del-confirmar");
  btn.disabled = true;
  btn.textContent = "Excluindo…";

  try {
    await remove(ref(db, `usuarios/${deletingId}`));
    todos = todos.filter((p) => p.id !== deletingId);
    applyFilters();
    toast("Professor excluído com sucesso!", "success");
    closeDeleteConfirm();
    if (editingId === deletingId) closeModal();
  } catch {
    toast("Erro ao excluir. Tente novamente.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Excluir";
    deletingId = null;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, type = "success") {
  const container = $("toast-container");
  const el = document.createElement("div");
  const ok = type === "success";
  el.className = `toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium ${
    ok
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-700"
  }`;
  el.innerHTML = `
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${
        ok
          ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>`
          : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>`
      }
    </svg>
    ${escHtml(msg)}
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function setupEvents() {
  // Filters
  $("search-input").addEventListener("input", applyFilters);
  $("filter-disciplina").addEventListener("change", applyFilters);
  $("filter-status").addEventListener("change", applyFilters);

  // Open modal buttons
  $("btn-novo").addEventListener("click", openNew);
  $("btn-novo-empty")?.addEventListener("click", openNew);

  // Modal controls
  $("modal-close").addEventListener("click", closeModal);
  $("modal-cancelar").addEventListener("click", closeModal);
  $("modal-salvar").addEventListener("click", handleSave);
  $("modal-delete").addEventListener("click", () => {
    if (editingId) openDeleteConfirm(editingId);
  });

  // Backdrop close
  $("modal-prof").addEventListener("click", (e) => {
    if (e.target === $("modal-prof")) closeModal();
  });
  $("modal-del-confirm").addEventListener("click", (e) => {
    if (e.target === $("modal-del-confirm")) closeDeleteConfirm();
  });

  // Delete confirm
  $("del-cancelar").addEventListener("click", closeDeleteConfirm);
  $("del-confirmar").addEventListener("click", handleDelete);

  // CPF mask
  $("f-cpf").addEventListener("input", (e) => {
    e.target.value = maskCPF(e.target.value);
  });

  // Disciplinas search filter
  $("disc-search").addEventListener("input", (e) => {
    renderDiscList(e.target.value);
  });

  // Toggle password visibility
  $("toggle-senha").addEventListener("click", () => {
    const input = $("f-senha");
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    $("eye-icon").innerHTML = isPassword
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("modal-del-confirm").classList.contains("hidden"))
        closeDeleteConfirm();
      else if (!$("modal-prof").classList.contains("hidden")) closeModal();
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

setupEvents();
renderDiscList();
