import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  off,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── Firebase config ──────────────────────────────────────────────────────────
// Replace with your project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ── State ────────────────────────────────────────────────────────────────────
let currentUser = null;
let allItems = []; // raw Firebase items [{id, ...data}]
let filtered = []; // after filters applied
let selected = new Set();
let dbListener = null;
let editingId = null;
let debounceTimer = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const grid = document.getElementById("grid-comunicados");
const searchInput = document.getElementById("search-input");
const filterStatus = document.getElementById("filter-status");
const filterPublico = document.getElementById("filter-publico");
const selectAll = document.getElementById("select-all");
const bulkBar = document.getElementById("bulk-bar");
const bulkCount = document.getElementById("bulk-count");
const btnNovo = document.getElementById("btn-novo");
const btnBulkPub = document.getElementById("btn-bulk-publish");
const btnBulkArc = document.getElementById("btn-bulk-archive");
const btnBulkCan = document.getElementById("btn-bulk-cancel");
const btnLogout = document.getElementById("btn-logout");
const btnMenu = document.getElementById("btn-menu");
const sidebarEl = document.getElementById("sidebar");
const sidebarOvl = document.getElementById("sidebar-overlay");

// Modal form
const modalForm = document.getElementById("modal-form");
const modalTitle = document.getElementById("modal-title");
const modalSubmit = document.getElementById("modal-submit");
const modalLabel = document.getElementById("modal-submit-label");
const modalSpinner = document.getElementById("modal-spinner");
const fTitulo = document.getElementById("f-titulo");
const fConteudo = document.getElementById("f-conteudo");
const fPublico = document.getElementById("f-publico");
const fStatus = document.getElementById("f-status");
const fAgendamento = document.getElementById("f-agendamento");
const fAgGroup = document.getElementById("f-agendamento-group");
const cntTitulo = document.getElementById("count-titulo");
const cntConteudo = document.getElementById("count-conteudo");

// Modal preview
const modalPreview = document.getElementById("modal-preview");
const pvTitle = document.getElementById("preview-title");
const pvMeta = document.getElementById("preview-meta");
const pvBody = document.getElementById("preview-body");
const pvBadges = document.getElementById("preview-badges");

// ── Auth guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  const snap = await fetchUserData(user.uid);
  if (!snap || snap.role !== "diretor" || snap.status !== "ativo") {
    showToast("Acesso não autorizado.", "error");
    await signOut(auth);
    window.location.href = "/login.html";
    return;
  }

  currentUser = {
    uid: user.uid,
    nome: snap.nome || user.displayName || "Diretor",
  };
  renderSidebarUser();
  bindDataListener();
});

async function fetchUserData(uid) {
  return new Promise((resolve) => {
    const r = ref(db, `usuarios/${uid}`);
    onValue(
      r,
      (snap) => {
        off(r);
        resolve(snap.val());
      },
      { onlyOnce: true },
    );
  });
}

function renderSidebarUser() {
  const el = document.getElementById("sidebar-name");
  const av = document.getElementById("sidebar-avatar");
  if (el) el.textContent = currentUser.nome;
  if (av) av.textContent = currentUser.nome[0].toUpperCase();
}

// ── Firebase listener ────────────────────────────────────────────────────────
function bindDataListener() {
  renderSkeletons();
  const r = ref(db, "comunicados");
  dbListener = onValue(
    r,
    (snap) => {
      allItems = [];
      snap.forEach((child) => {
        allItems.push({ id: child.key, ...child.val() });
      });
      allItems.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      applyFilters();
    },
    (err) => {
      console.error(err);
      showToast("Erro ao carregar comunicados.", "error");
      renderEmpty("Não foi possível carregar os dados.");
    },
  );
}

// ── Filters ──────────────────────────────────────────────────────────────────
function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const st = filterStatus.value;
  const pub = filterPublico.value;

  filtered = allItems.filter((item) => {
    const matchQ = !q || item.titulo?.toLowerCase().includes(q);
    const matchSt = !st || item.status === st;
    const matchPub = !pub || item.publicoAlvo === pub;
    return matchQ && matchSt && matchPub;
  });

  selected.clear();
  updateBulkBar();
  selectAll.checked = false;
  renderGrid();
}

function debounceFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 280);
}

searchInput.addEventListener("input", debounceFilter);
filterStatus.addEventListener("change", applyFilters);
filterPublico.addEventListener("change", applyFilters);

// ── Render ───────────────────────────────────────────────────────────────────
function renderSkeletons() {
  grid.innerHTML = Array.from(
    { length: 6 },
    () => `
    <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-card space-y-3">
      <div class="skeleton h-4 w-1/3 rounded"></div>
      <div class="skeleton h-5 w-3/4 rounded"></div>
      <div class="skeleton h-4 w-full rounded"></div>
      <div class="skeleton h-4 w-5/6 rounded"></div>
      <div class="flex gap-2 pt-2">
        <div class="skeleton h-8 w-16 rounded-lg"></div>
        <div class="skeleton h-8 w-16 rounded-lg"></div>
      </div>
    </div>
  `,
  ).join("");
}

function renderGrid() {
  if (!filtered.length) {
    renderEmpty();
    return;
  }
  grid.innerHTML = filtered.map(renderCard).join("");

  // Bind per-card events
  grid.querySelectorAll("[data-check]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.check;
      cb.checked ? selected.add(id) : selected.delete(id);
      updateBulkBar();
      updateSelectAllState();
    });
  });
  grid.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", handleCardAction);
  });
}

function renderEmpty(msg = "Nenhum comunicado encontrado.") {
  grid.innerHTML = `
    <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <p class="font-display text-lg font-semibold text-slate-700">${msg}</p>
      <p class="mt-1 text-sm text-slate-400">Crie um novo comunicado clicando no botão acima.</p>
    </div>`;
}

function renderCard(item) {
  const {
    id,
    titulo,
    conteudo,
    status,
    publicoAlvo,
    criadoEm,
    agendadoPara,
    autorNome,
    visualizacoes,
  } = item;
  const isChecked = selected.has(id);
  const statusCfg = statusConfig(status);
  const publicoCfg = publicoConfig(publicoAlvo);
  const dateStr = criadoEm ? fmtDate(criadoEm) : "–";
  const preview =
    (conteudo || "").replace(/\n/g, " ").slice(0, 120) +
    (conteudo?.length > 120 ? "…" : "");

  return `
    <article class="comm-card rounded-3xl border border-slate-100 bg-white p-5 shadow-card hover:shadow-card-hover hover:border-blue-200 flex flex-col gap-4"
             aria-label="Comunicado: ${escHtml(titulo || "")}">
      <!-- Top row -->
      <div class="flex items-start justify-between gap-3">
        <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
          <input type="checkbox" data-check="${id}" class="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400 shrink-0 ${isChecked ? "checked" : ""}" ${isChecked ? "checked" : ""} aria-label="Selecionar comunicado"/>
          <div class="min-w-0">
            <div class="flex flex-wrap gap-1.5 mb-1.5">
              <span class="${statusCfg.cls} inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">${statusCfg.label}</span>
              <span class="${publicoCfg.cls} inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">${publicoCfg.label}</span>
            </div>
            <h3 class="font-display text-base font-semibold text-slate-800 leading-snug truncate">${escHtml(titulo || "Sem título")}</h3>
          </div>
        </label>

        <!-- Actions menu -->
        <div class="relative shrink-0">
          <button data-action="menu" data-id="${id}"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label="Ações para ${escHtml(titulo || "")}">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          <div id="menu-${id}" class="action-menu hidden absolute right-0 top-8 z-20 w-44 rounded-2xl border border-slate-100 bg-white py-1 shadow-lg" role="menu">
            <button data-action="edit"      data-id="${id}" class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" role="menuitem">
              <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
            <button data-action="preview"   data-id="${id}" class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" role="menuitem">
              <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Prévia
            </button>
            <button data-action="duplicate" data-id="${id}" class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" role="menuitem">
              <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Duplicar
            </button>
            ${
              status !== "publicado"
                ? `
            <button data-action="publish"   data-id="${id}" class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors" role="menuitem">
              <svg class="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 6 9 17 4 12"/></svg>
              Publicar
            </button>`
                : ""
            }
            ${
              status !== "arquivado"
                ? `
            <button data-action="archive"   data-id="${id}" class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors" role="menuitem">
              <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              Arquivar
            </button>`
                : ""
            }
            <hr class="my-1 border-slate-100"/>
            <button data-action="delete"    data-id="${id}" class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors" role="menuitem">
              <svg class="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Excluir
            </button>
          </div>
        </div>
      </div>

      <!-- Preview text -->
      <p class="text-sm text-slate-500 leading-relaxed flex-1">${escHtml(preview || "Sem conteúdo.")}</p>

      <!-- Footer -->
      <footer class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400 font-mono">
        <span>${dateStr}</span>
        <div class="flex items-center gap-3">
          ${agendadoPara ? `<span class="text-brand-500">📅 ${fmtDate(agendadoPara)}</span>` : ""}
          <span class="flex items-center gap-1">
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${visualizacoes ?? 0}
          </span>
          <span>${escHtml(autorNome || "–")}</span>
        </div>
      </footer>
    </article>`;
}

// ── Card action handler ───────────────────────────────────────────────────────
function handleCardAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const item = allItems.find((i) => i.id === id);

  if (action === "menu") {
    closeAllMenus();
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.toggle("hidden");
    return;
  }

  closeAllMenus();

  switch (action) {
    case "edit":
      openFormModal(item);
      break;
    case "preview":
      openPreview(item);
      break;
    case "duplicate":
      duplicateItem(item);
      break;
    case "publish":
      changeStatus(id, "publicado");
      break;
    case "archive":
      changeStatus(id, "arquivado");
      break;
    case "delete":
      deleteItem(id, item.titulo);
      break;
  }
}

function closeAllMenus() {
  document
    .querySelectorAll(".action-menu")
    .forEach((m) => m.classList.add("hidden"));
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-action='menu']")) closeAllMenus();
});

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function saveItem() {
  if (!validateForm()) return;

  setModalLoading(true);
  const payload = {
    titulo: fTitulo.value.trim(),
    conteudo: fConteudo.value.trim(),
    publicoAlvo: fPublico.value,
    status: fStatus.value,
    agendadoPara:
      fStatus.value === "agendado" && fAgendamento.value
        ? new Date(fAgendamento.value).getTime()
        : null,
    autorId: currentUser.uid,
    autorNome: currentUser.nome,
    visualizacoes: editingId
      ? (allItems.find((i) => i.id === editingId)?.visualizacoes ?? 0)
      : 0,
  };

  try {
    if (editingId) {
      await update(ref(db, `comunicados/${editingId}`), payload);
      showToast("Comunicado atualizado com sucesso.", "success");
    } else {
      payload.criadoEm = serverTimestamp();
      await push(ref(db, "comunicados"), payload);
      showToast("Comunicado criado com sucesso.", "success");
    }
    closeFormModal();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar comunicado.", "error");
  } finally {
    setModalLoading(false);
  }
}

async function changeStatus(id, status) {
  const updates = { status };
  if (status === "publicado") updates.publicadoEm = serverTimestamp();
  try {
    await update(ref(db, `comunicados/${id}`), updates);
    showToast(
      `Comunicado ${status === "publicado" ? "publicado" : "arquivado"}.`,
      "success",
    );
  } catch {
    showToast("Erro ao atualizar status.", "error");
  }
}

async function deleteItem(id, titulo) {
  const confirmed = confirm(
    `Excluir "${titulo || "este comunicado"}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmed) return;
  try {
    await remove(ref(db, `comunicados/${id}`));
    showToast("Comunicado excluído.", "success");
  } catch {
    showToast("Erro ao excluir comunicado.", "error");
  }
}

async function duplicateItem(item) {
  const payload = {
    titulo: `Cópia de ${item.titulo || "comunicado"}`,
    conteudo: item.conteudo || "",
    publicoAlvo: item.publicoAlvo || "todos",
    status: "rascunho",
    agendadoPara: null,
    publicadoEm: null,
    autorId: currentUser.uid,
    autorNome: currentUser.nome,
    criadoEm: serverTimestamp(),
    visualizacoes: 0,
  };
  try {
    await push(ref(db, "comunicados"), payload);
    showToast("Comunicado duplicado como rascunho.", "success");
  } catch {
    showToast("Erro ao duplicar comunicado.", "error");
  }
}

// ── Bulk actions ──────────────────────────────────────────────────────────────
selectAll.addEventListener("change", () => {
  if (selectAll.checked) {
    filtered.forEach((i) => selected.add(i.id));
  } else {
    selected.clear();
  }
  updateBulkBar();
  renderGrid();
});

btnBulkPub.addEventListener("click", async () => {
  await batchUpdate([...selected], "publicado");
});

btnBulkArc.addEventListener("click", async () => {
  await batchUpdate([...selected], "arquivado");
});

btnBulkCan.addEventListener("click", () => {
  selected.clear();
  selectAll.checked = false;
  updateBulkBar();
  renderGrid();
});

async function batchUpdate(ids, status) {
  if (!ids.length) return;
  const updates = {};
  const extra = status === "publicado" ? { publicadoEm: Date.now() } : {};
  ids.forEach((id) => {
    updates[`comunicados/${id}/status`] = status;
    if (extra.publicadoEm)
      updates[`comunicados/${id}/publicadoEm`] = extra.publicadoEm;
  });
  try {
    const { update: dbUpdate } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js");
    await dbUpdate(ref(db, "/"), updates);
    selected.clear();
    selectAll.checked = false;
    updateBulkBar();
    showToast(
      `${ids.length} comunicado(s) ${status === "publicado" ? "publicado(s)" : "arquivado(s)"}.`,
      "success",
    );
  } catch {
    showToast("Erro na operação em lote.", "error");
  }
}

function updateBulkBar() {
  const count = selected.size;
  if (count > 0) {
    bulkCount.textContent = count;
    bulkBar.classList.remove("hidden");
  } else {
    bulkBar.classList.add("hidden");
  }
}

function updateSelectAllState() {
  const total = filtered.length;
  selectAll.checked = total > 0 && selected.size === total;
  selectAll.indeterminate = selected.size > 0 && selected.size < total;
}

// ── Modal form ────────────────────────────────────────────────────────────────
btnNovo.addEventListener("click", () => openFormModal(null));

document
  .getElementById("modal-close")
  .addEventListener("click", closeFormModal);
document
  .getElementById("modal-cancel")
  .addEventListener("click", closeFormModal);
document
  .getElementById("modal-backdrop")
  .addEventListener("click", closeFormModal);
modalSubmit.addEventListener("click", saveItem);

fStatus.addEventListener("change", () => {
  fAgGroup.classList.toggle("hidden", fStatus.value !== "agendado");
});

fTitulo.addEventListener("input", () => {
  cntTitulo.textContent = fTitulo.value.length;
  if (fTitulo.value.trim()) clearErr("f-titulo-err");
});

fConteudo.addEventListener("input", () => {
  cntConteudo.textContent = fConteudo.value.length;
  if (fConteudo.value.trim()) clearErr("f-conteudo-err");
});

fPublico.addEventListener("change", () => {
  if (fPublico.value) clearErr("f-publico-err");
});

function openFormModal(item) {
  editingId = item?.id ?? null;
  modalTitle.textContent = editingId ? "Editar Comunicado" : "Novo Comunicado";
  modalLabel.textContent = editingId
    ? "Salvar Alterações"
    : "Salvar Comunicado";

  fTitulo.value = item?.titulo ?? "";
  fConteudo.value = item?.conteudo ?? "";
  fPublico.value = item?.publicoAlvo ?? "";
  fStatus.value = item?.status ?? "rascunho";
  cntTitulo.textContent = fTitulo.value.length;
  cntConteudo.textContent = fConteudo.value.length;
  fAgGroup.classList.toggle("hidden", fStatus.value !== "agendado");

  if (item?.agendadoPara) {
    const d = new Date(item.agendadoPara);
    fAgendamento.value = d.toISOString().slice(0, 16);
  } else {
    fAgendamento.value = "";
  }

  clearAllErrs();
  modalForm.classList.replace("hidden", "flex");
  fTitulo.focus();
}

function closeFormModal() {
  modalForm.classList.replace("flex", "hidden");
  editingId = null;
}

function validateForm() {
  let ok = true;
  if (!fTitulo.value.trim()) {
    showErr("f-titulo-err");
    ok = false;
  }
  if (!fConteudo.value.trim()) {
    showErr("f-conteudo-err");
    ok = false;
  }
  if (!fPublico.value) {
    showErr("f-publico-err");
    ok = false;
  }
  if (fStatus.value === "agendado" && !fAgendamento.value) {
    showErr("f-agendamento-err");
    ok = false;
  }
  return ok;
}

function showErr(id) {
  document.getElementById(id)?.classList.remove("hidden");
}
function clearErr(id) {
  document.getElementById(id)?.classList.add("hidden");
}
function clearAllErrs() {
  [
    "f-titulo-err",
    "f-conteudo-err",
    "f-publico-err",
    "f-agendamento-err",
  ].forEach(clearErr);
}

function setModalLoading(loading) {
  modalSubmit.disabled = loading;
  modalSpinner.classList.toggle("hidden", !loading);
}

// Keyboard: Escape closes modals
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modalForm.classList.contains("hidden")) closeFormModal();
  if (!modalPreview.classList.contains("hidden")) closePreview();
});

// ── Modal preview ─────────────────────────────────────────────────────────────
function openPreview(item) {
  pvTitle.textContent = item.titulo || "Sem título";
  pvBody.textContent = item.conteudo || "Sem conteúdo.";

  const sc = statusConfig(item.status);
  const pc = publicoConfig(item.publicoAlvo);
  pvBadges.innerHTML = `
    <span class="${sc.cls} inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">${sc.label}</span>
    <span class="${pc.cls} inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">${pc.label}</span>
  `;
  pvMeta.textContent = `Por ${item.autorNome || "–"} · ${item.criadoEm ? fmtDate(item.criadoEm) : "–"}`;

  modalPreview.classList.replace("hidden", "flex");
}

function closePreview() {
  modalPreview.classList.replace("flex", "hidden");
}

document
  .getElementById("preview-close")
  .addEventListener("click", closePreview);
document
  .getElementById("preview-close-btn")
  .addEventListener("click", closePreview);
document
  .getElementById("preview-backdrop")
  .addEventListener("click", closePreview);

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  const icons = {
    success: `<svg class="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg class="h-5 w-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg class="h-5 w-5 text-brand-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const div = document.createElement("div");
  div.className =
    "toast-enter pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg";
  div.setAttribute("role", "alert");
  div.innerHTML = `${icons[type] ?? icons.info}<p class="text-sm font-medium text-slate-700">${escHtml(msg)}</p>`;
  container.appendChild(div);

  setTimeout(() => {
    div.classList.replace("toast-enter", "toast-exit");
    div.addEventListener("animationend", () => div.remove(), { once: true });
  }, 3800);
}

// ── Sidebar mobile toggle ─────────────────────────────────────────────────────
btnMenu?.addEventListener("click", () => {
  sidebarEl.classList.toggle("-translate-x-full");
  sidebarOvl.classList.toggle("hidden");
});

sidebarOvl?.addEventListener("click", () => {
  sidebarEl.classList.add("-translate-x-full");
  sidebarOvl.classList.add("hidden");
});

// ── Logout ────────────────────────────────────────────────────────────────────
btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/login.html";
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(ts) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function statusConfig(status) {
  const map = {
    rascunho: { label: "Rascunho", cls: "bg-slate-100 text-slate-600" },
    publicado: { label: "Publicado", cls: "bg-emerald-100 text-emerald-700" },
    agendado: { label: "Agendado", cls: "bg-blue-100 text-blue-700" },
    arquivado: { label: "Arquivado", cls: "bg-red-100 text-red-600" },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
}

function publicoConfig(pub) {
  const map = {
    todos: { label: "Toda a Escola", cls: "bg-violet-100 text-violet-700" },
    professores: { label: "Professores", cls: "bg-amber-100 text-amber-700" },
    pais: { label: "Pais / Responsáveis", cls: "bg-sky-100 text-sky-700" },
    alunos: { label: "Alunos", cls: "bg-pink-100 text-pink-700" },
  };
  return map[pub] ?? { label: pub || "–", cls: "bg-slate-100 text-slate-500" };
}
