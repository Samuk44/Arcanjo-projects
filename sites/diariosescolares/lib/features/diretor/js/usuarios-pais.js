import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  update,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "__YOUR_API_KEY__",
  authDomain: "__YOUR_AUTH_DOMAIN__",
  databaseURL: "__YOUR_DATABASE_URL__",
  projectId: "__YOUR_PROJECT_ID__",
  storageBucket: "__YOUR_STORAGE_BUCKET__",
  messagingSenderId: "__YOUR_MESSAGING_SENDER_ID__",
  appId: "__YOUR_APP_ID__",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ─── Constants ────────────────────────────────────────────────────────────────
const VINCULO_BADGE = {
  pai: "bg-blue-100 text-blue-700",
  mãe: "bg-pink-100 text-pink-700",
  tutor: "bg-gray-100 text-gray-600",
  avô: "bg-amber-100 text-amber-700",
  avó: "bg-purple-100 text-purple-700",
  outro: "bg-slate-100 text-slate-600",
};

// ─── State ────────────────────────────────────────────────────────────────────
let allResponsaveis = {};
let allAlunos = {};
let filteredList = [];
let deleteTargetId = null;
let alunoSearchQuery = "";
let selectedAlunoIds = new Set();

// ─── Auth Guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) return goLogin();
  try {
    const snap = await get(ref(db, `usuarios/${user.uid}`));
    const data = snap.val();
    if (!data || data.role !== "diretor" || data.status !== "ativo")
      return goLogin();
    const first = data.nome?.split(" ")[0] || "Diretor";
    el("topbar-greeting").textContent = `Olá, ${first}`;
    el("topbar-avatar").textContent = first.charAt(0).toUpperCase();
    init();
  } catch {
    goLogin();
  }
});

function goLogin() {
  window.location.href = "../auth/login.html";
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadAlunos();
  subscribeResponsaveis();
  setupListeners();
}

async function loadAlunos() {
  const snap = await get(ref(db, "alunos"));
  allAlunos = snap.val() || generateMockAlunos();
}

function generateMockAlunos() {
  return {
    aluno_1: { nome: "Lucas Silva", turma: "9º Ano A" },
    aluno_2: { nome: "Ana Oliveira", turma: "8º Ano B" },
    aluno_3: { nome: "Pedro Costa", turma: "7º Ano A" },
    aluno_4: { nome: "Beatriz Mendes", turma: "6º Ano C" },
    aluno_5: { nome: "Gabriel Souza", turma: "9º Ano B" },
    aluno_6: { nome: "Isabela Lima", turma: "8º Ano A" },
  };
}

// ─── Firebase Subscription ────────────────────────────────────────────────────
function subscribeResponsaveis() {
  onValue(ref(db, "responsaveis"), (snap) => {
    allResponsaveis = {};
    const raw = snap.val() || generateMockResponsaveis();
    Object.entries(raw).forEach(([id, r]) => {
      allResponsaveis[id] = { _id: id, ...r };
    });
    applyFilters();
  });
}

function generateMockResponsaveis() {
  return {
    resp_1: {
      nome: "Maria Silva",
      cpf: "123.456.789-00",
      telefone: "(11) 99999-1111",
      email: "maria@email.com",
      parentesco: "mãe",
      alunoIds: ["aluno_1", "aluno_2"],
      status: "ativo",
      criadoEm: Date.now() - 86400000,
    },
    resp_2: {
      nome: "João Oliveira",
      cpf: "987.654.321-00",
      telefone: "(11) 98888-2222",
      email: "joao@email.com",
      parentesco: "pai",
      alunoIds: ["aluno_2"],
      status: "ativo",
      criadoEm: Date.now() - 172800000,
    },
    resp_3: {
      nome: "Carla Mendes",
      cpf: "111.222.333-44",
      telefone: "(21) 97777-3333",
      email: "carla@email.com",
      parentesco: "tutor",
      alunoIds: ["aluno_3"],
      status: "inativo",
      criadoEm: Date.now() - 259200000,
    },
    resp_4: {
      nome: "Roberto Costa",
      cpf: "555.666.777-88",
      telefone: "(31) 96666-4444",
      email: "roberto@email.com",
      parentesco: "avô",
      alunoIds: ["aluno_4", "aluno_5"],
      status: "ativo",
      criadoEm: Date.now() - 345600000,
    },
  };
}

// ─── Filters ─────────────────────────────────────────────────────────────────
function applyFilters() {
  const q = el("search-input").value.toLowerCase().trim();
  const vinculo = el("filter-vinculo").value;
  const status = el("filter-status").value;

  filteredList = Object.values(allResponsaveis).filter((r) => {
    const matchQ =
      !q || r.nome?.toLowerCase().includes(q) || r.cpf?.includes(q);
    const matchV = !vinculo || r.parentesco === vinculo;
    const matchS = !status || r.status === status;
    return matchQ && matchV && matchS;
  });

  filteredList.sort((a, b) => a.nome?.localeCompare(b.nome));
  renderTable();
}

// ─── Render Table ─────────────────────────────────────────────────────────────
function renderTable() {
  el("skeleton").classList.add("hidden");
  const total = Object.keys(allResponsaveis).length;
  const shown = filteredList.length;

  if (total === 0) {
    showState("empty");
    el("empty-title").textContent = "Nenhum responsável cadastrado";
    el("empty-desc").textContent =
      "Cadastre o primeiro responsável clicando no botão abaixo.";
    return;
  }

  el("count-label").textContent =
    `${shown} de ${total} responsável${total !== 1 ? "is" : ""}`;

  if (shown === 0) {
    showState("no-results");
    return;
  }

  showState("table");
  const tbody = el("table-body");
  tbody.innerHTML = filteredList.map((r) => buildRow(r)).join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.edit));
  });
  tbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteConfirm(btn.dataset.del));
  });
}

function buildRow(r) {
  const badgeClass = VINCULO_BADGE[r.parentesco] || VINCULO_BADGE.outro;
  const statusBadge =
    r.status === "ativo"
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>Ativo</span>`
      : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500"><span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>Inativo</span>`;

  const alunosNomes =
    (r.alunoIds || []).map((id) => allAlunos[id]?.nome || id).join(", ") || "—";

  const tel = r.telefone?.replace(/\D/g, "");
  const telIntl = tel ? (tel.startsWith("55") ? tel : `55${tel}`) : "";

  return `<tr class="data-row border-b border-border last:border-0" role="row">
    <td class="px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">${(r.nome || "?").charAt(0).toUpperCase()}</div>
        <div>
          <p class="text-sm font-semibold text-text leading-tight">${esc(r.nome)}</p>
          <p class="text-xs text-muted mt-0.5 md:hidden">${esc(r.email || "")}</p>
        </div>
      </div>
    </td>
    <td class="px-4 py-3 hide-mobile">
      <span class="text-sm text-text font-mono tracking-wider">${esc(r.cpf || "—")}</span>
    </td>
    <td class="px-4 py-3 hide-mobile">
      <div class="flex flex-col gap-1">
        <a href="tel:${tel}" class="text-xs text-primary hover:underline font-medium">${esc(r.telefone || "—")}</a>
        <a href="mailto:${esc(r.email)}" class="text-xs text-muted hover:text-primary transition truncate max-w-[160px]">${esc(r.email || "—")}</a>
      </div>
    </td>
    <td class="px-4 py-3">
      <span class="px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${badgeClass}">${esc(r.parentesco)}</span>
    </td>
    <td class="px-4 py-3 hide-mobile">
      <p class="text-xs text-text leading-relaxed max-w-[180px]">${esc(alunosNomes)}</p>
    </td>
    <td class="px-4 py-3">${statusBadge}</td>
    <td class="px-4 py-3 actions-cell">
      <div class="flex items-center justify-end gap-1 flex-wrap">
        ${
          telIntl
            ? `<a href="tel:+${telIntl}" class="action-btn w-8 h-8 rounded-xl flex items-center justify-center text-muted" title="Ligar" aria-label="Ligar para ${esc(r.nome)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        </a>`
            : ""
        }
        ${
          telIntl
            ? `<a href="https://wa.me/${telIntl}" target="_blank" rel="noopener" class="action-btn w-8 h-8 rounded-xl flex items-center justify-center text-muted" title="WhatsApp" aria-label="WhatsApp de ${esc(r.nome)}">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.855L.057 23.5l5.783-1.517A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.5-5.197-1.375l-.373-.22-3.432.9.917-3.349-.242-.385A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </a>`
            : ""
        }
        ${
          r.email
            ? `<a href="mailto:${esc(r.email)}" class="action-btn w-8 h-8 rounded-xl flex items-center justify-center text-muted" title="Enviar e-mail" aria-label="Email para ${esc(r.nome)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </a>`
            : ""
        }
        <button data-edit="${r._id}" class="action-btn w-8 h-8 rounded-xl flex items-center justify-center text-muted" title="Editar" aria-label="Editar ${esc(r.nome)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button data-del="${r._id}" class="action-btn w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600" title="Excluir" aria-label="Excluir ${esc(r.nome)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </td>
  </tr>`;
}

// ─── State display ────────────────────────────────────────────────────────────
function showState(state) {
  ["skeleton", "empty-state", "no-results", "table-container"].forEach((id) => {
    const elmt = el(id);
    const show =
      id.replace("-state", "").replace("-container", "") === state ||
      id === state;
    elmt.classList.toggle("hidden", !show);
    if (elmt.classList.contains("flex")) elmt.classList.toggle("flex", show);
  });
  if (state === "empty" || state === "no-results") {
    el("empty-state").classList.toggle("hidden", state !== "empty");
    el("empty-state").classList.toggle("flex", state === "empty");
    el("no-results").classList.toggle("hidden", state !== "no-results");
    el("no-results").classList.toggle(
      "flex",
      state !== "empty" && state === "no-results",
    );
    el("table-container").classList.add("hidden");
  } else if (state === "table") {
    el("empty-state").classList.add("hidden");
    el("no-results").classList.add("hidden");
    el("table-container").classList.remove("hidden");
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id = null) {
  const isEdit = !!id;
  el("modal-resp-title").textContent = isEdit
    ? "Editar Responsável"
    : "Novo Responsável";
  el("modal-delete").classList.toggle("hidden", !isEdit);
  el("edit-id").value = id || "";
  clearErrors();
  el("cpf-warning").classList.add("hidden");

  const r = id ? allResponsaveis[id] : null;
  el("f-nome").value = r?.nome || "";
  el("f-cpf").value = r?.cpf || "";
  el("f-telefone").value = r?.telefone || "";
  el("f-email").value = r?.email || "";
  el("f-parentesco").value = r?.parentesco || "";
  el("f-status").value = r?.status || "ativo";

  selectedAlunoIds = new Set(r?.alunoIds || []);
  alunoSearchQuery = "";
  el("aluno-search").value = "";
  renderAlunoList();

  toggleModal("modal-resp", true);
  el("f-nome").focus();
}

function closeModal() {
  toggleModal("modal-resp", false);
  clearErrors();
}

function toggleModal(id, open) {
  el(id).classList.toggle("hidden", !open);
}

// ─── Aluno multi-select ───────────────────────────────────────────────────────
function renderAlunoList() {
  const q = alunoSearchQuery.toLowerCase();
  const entries = Object.entries(allAlunos)
    .filter(([, a]) => !q || a.nome?.toLowerCase().includes(q))
    .sort(([, a], [, b]) => a.nome?.localeCompare(b.nome));

  if (!entries.length) {
    el("aluno-list").innerHTML =
      `<p class="text-xs text-muted p-3 text-center">Nenhum aluno encontrado.</p>`;
    return;
  }

  el("aluno-list").innerHTML = entries
    .map(([id, a]) => {
      const checked = selectedAlunoIds.has(id);
      return `<label class="multiselect-item flex items-center gap-3 px-3 py-2.5 ${checked ? "selected" : ""}" data-aluno-id="${id}">
      <input type="checkbox" class="custom-cb" ${checked ? "checked" : ""} data-aluno-id="${id}" />
      <span class="text-sm text-text font-medium flex-1">${esc(a.nome)}</span>
      ${a.turma ? `<span class="text-xs text-muted">${esc(a.turma)}</span>` : ""}
    </label>`;
    })
    .join("");

  el("aluno-list")
    .querySelectorAll("input[type=checkbox]")
    .forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const aId = e.target.dataset.alunoId;
        if (e.target.checked) selectedAlunoIds.add(aId);
        else selectedAlunoIds.delete(aId);
        const label = e.target.closest("label");
        label?.classList.toggle("selected", e.target.checked);
      });
    });
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateCPF(cpf) {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validatePhone(v) {
  return v.replace(/\D/g, "").length >= 10;
}

function setError(field, msg) {
  const input = el(`f-${field}`);
  const errEl = el(`err-${field}`);
  if (!input || !errEl) return;
  input.classList.add("field-error");
  errEl.textContent = msg;
  errEl.classList.add("show");
}

function clearErrors() {
  ["nome", "cpf", "telefone", "email", "parentesco"].forEach((f) => {
    el(`f-${f}`)?.classList.remove("field-error");
    const e = el(`err-${f}`);
    if (e) {
      e.textContent = "";
      e.classList.remove("show");
    }
  });
}

function runValidation(payload, editId) {
  clearErrors();
  let valid = true;

  if (!payload.nome.trim()) {
    setError("nome", "Campo obrigatório.");
    valid = false;
  }
  if (!validateCPF(payload.cpf)) {
    setError("cpf", "CPF inválido.");
    valid = false;
  }
  if (!validatePhone(payload.telefone)) {
    setError("telefone", "Telefone inválido.");
    valid = false;
  }
  if (!validateEmail(payload.email)) {
    setError("email", "E-mail inválido.");
    valid = false;
  }
  if (!payload.parentesco) {
    setError("parentesco", "Selecione um vínculo.");
    valid = false;
  }

  if (valid) {
    const cpfDup = Object.entries(allResponsaveis).find(
      ([id, r]) => r.cpf === payload.cpf && id !== editId,
    );
    if (cpfDup) {
      setError("cpf", "CPF já cadastrado para outro responsável.");
      el("cpf-warning").classList.remove("hidden");
      valid = false;
    }
  }

  return valid;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
async function handleSave() {
  const editId = el("edit-id").value;
  const payload = {
    nome: el("f-nome").value.trim(),
    cpf: el("f-cpf").value.trim(),
    telefone: el("f-telefone").value.trim(),
    email: el("f-email").value.trim().toLowerCase(),
    parentesco: el("f-parentesco").value,
    status: el("f-status").value,
    alunoIds: [...selectedAlunoIds],
    criadoEm: editId
      ? allResponsaveis[editId]?.criadoEm || Date.now()
      : Date.now(),
  };

  if (!runValidation(payload, editId)) return;

  setModalBusy(true);
  try {
    if (editId) {
      await update(ref(db, `responsaveis/${editId}`), payload);
      showToast("Responsável atualizado!", "success");
    } else {
      await push(ref(db, "responsaveis"), payload);
      showToast("Responsável cadastrado!", "success");
    }
    closeModal();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar. Tente novamente.", "error");
  } finally {
    setModalBusy(false);
  }
}

function setModalBusy(busy) {
  const btn = el("modal-salvar");
  btn.disabled = busy;
  btn.innerHTML = busy
    ? `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Salvando...`
    : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar`;
}

function openDeleteConfirm(id) {
  deleteTargetId = id;
  toggleModal("modal-del-confirm", true);
}

async function handleDelete() {
  if (!deleteTargetId) return;
  try {
    await remove(ref(db, `responsaveis/${deleteTargetId}`));
    showToast("Responsável removido.", "success");
  } catch {
    showToast("Erro ao excluir.", "error");
  } finally {
    deleteTargetId = null;
    toggleModal("modal-del-confirm", false);
    closeModal();
  }
}

// ─── Input Masks ──────────────────────────────────────────────────────────────
function maskCPF(v) {
  return v
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
}

function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function setupListeners() {
  el("search-input").addEventListener("input", applyFilters);
  el("filter-vinculo").addEventListener("change", applyFilters);
  el("filter-status").addEventListener("change", applyFilters);

  el("btn-novo").addEventListener("click", () => openModal());
  el("btn-novo-empty").addEventListener("click", () => openModal());

  el("modal-close").addEventListener("click", closeModal);
  el("modal-cancelar").addEventListener("click", closeModal);
  el("modal-salvar").addEventListener("click", handleSave);

  el("modal-delete").addEventListener("click", () => {
    const id = el("edit-id").value;
    if (id) openDeleteConfirm(id);
  });

  el("modal-resp").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  el("del-cancelar").addEventListener("click", () =>
    toggleModal("modal-del-confirm", false),
  );
  el("del-confirmar").addEventListener("click", handleDelete);

  el("modal-del-confirm").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) toggleModal("modal-del-confirm", false);
  });

  el("f-cpf").addEventListener("input", (e) => {
    e.target.value = maskCPF(e.target.value);
    el("cpf-warning").classList.add("hidden");
  });

  el("f-telefone").addEventListener("input", (e) => {
    e.target.value = maskPhone(e.target.value);
  });

  el("aluno-search").addEventListener("input", (e) => {
    alunoSearchQuery = e.target.value;
    renderAlunoList();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el("modal-del-confirm").classList.contains("hidden")) {
        toggleModal("modal-del-confirm", false);
      } else {
        closeModal();
      }
    }
    if (e.key === "Enter" && !el("modal-resp").classList.contains("hidden")) {
      if (document.activeElement.tagName !== "BUTTON") handleSave();
    }
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const container = el("toast-container");
  const isOk = type === "success";
  const toast = document.createElement("div");
  toast.className = `toast flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-soft border text-sm font-medium pointer-events-auto ${
    isOk
      ? "bg-surface border-border text-text"
      : "bg-red-50 border-red-200 text-red-700"
  }`;
  toast.innerHTML = `
    <span class="w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isOk ? "bg-green-100" : "bg-red-100"}">
      ${
        isOk
          ? `<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`
          : `<svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`
      }
    </span>
    <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function el(id) {
  return document.getElementById(id);
}
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
