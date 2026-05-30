import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  databaseURL: "__FIREBASE_DATABASE_URL__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// ─── State ────────────────────────────────────────────────────────────────────
let allAlunos = [];
let editingId = null;
let pendingDeleteId = null;
let turmasMap = {};
let responsaveisMap = {};

// ─── Auth guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.replace("../auth/login.html");
    return;
  }
  const snap = await get(ref(db, `usuarios/${user.uid}`));
  if (
    !snap.exists() ||
    snap.val().role !== "diretor" ||
    snap.val().status !== "ativo"
  ) {
    location.replace("../auth/login.html");
    return;
  }
  const data = snap.val();
  const nome = data.nome || "Diretor";
  document.getElementById("topbar-greeting").textContent =
    `Olá, ${nome.split(" ")[0]}`;
  if (data.avatarUrl) {
    const av = document.getElementById("topbar-avatar");
    av.style.cssText = `background-image:url(${data.avatarUrl});background-size:cover;background-position:center;`;
    av.textContent = "";
  }
  await loadReferenceData();
  await loadAlunos();
  initUI();
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  const cls =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-red-50 border-red-200 text-red-800";
  const icon =
    type === "success"
      ? `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
      : `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
  t.className = `toast flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-soft text-sm font-medium pointer-events-auto ${cls}`;
  t.setAttribute("role", "status");
  t.innerHTML = icon + `<span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => t.remove(), 320);
  }, 3400);
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function showSkeleton() {
  const tbody = document.getElementById("alunos-tbody");
  tbody.innerHTML = Array.from({ length: 5 })
    .map(
      () => `
    <tr class="border-b border-border">
      <td class="px-5 py-4"><div class="flex items-center gap-3">
        <div class="skeleton w-8 h-8 rounded-full"></div>
        <div class="skeleton h-3.5 w-32 rounded-full"></div>
      </div></td>
      <td class="px-5 py-4"><div class="skeleton h-3 w-20 rounded-full"></div></td>
      <td class="px-5 py-4 hidden md:table-cell"><div class="skeleton h-3 w-24 rounded-full"></div></td>
      <td class="px-5 py-4 hidden lg:table-cell"><div class="skeleton h-3 w-28 rounded-full"></div></td>
      <td class="px-5 py-4"><div class="skeleton h-5 w-14 rounded-full"></div></td>
      <td class="px-5 py-4"></td>
    </tr>`,
    )
    .join("");
}

// ─── Reference data ───────────────────────────────────────────────────────────
async function loadReferenceData() {
  const [turmasSnap, respSnap] = await Promise.all([
    get(ref(db, "turmas")),
    get(ref(db, "usuarios")),
  ]);

  if (turmasSnap.exists()) {
    turmasMap = {};
    turmasSnap.forEach((c) => {
      turmasMap[c.key] = c.val().nome || c.key;
    });
  }

  if (respSnap.exists()) {
    responsaveisMap = {};
    respSnap.forEach((c) => {
      const u = c.val();
      if (u.role === "responsavel" && u.status === "ativo") {
        responsaveisMap[c.key] = u.nome || u.email || c.key;
      }
    });
  }

  populateFilterTurmas();
  populateModalSelects();
}

function populateFilterTurmas() {
  const sel = document.getElementById("filter-turma");
  Object.entries(turmasMap).forEach(([id, nome]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = nome;
    sel.appendChild(opt);
  });
}

function populateModalSelects() {
  const selTurma = document.getElementById("aluno-turma");
  const selResp = document.getElementById("aluno-responsavel");
  selTurma.innerHTML = `<option value="">Selecionar turma</option>`;
  selResp.innerHTML = `<option value="">Selecionar responsável</option>`;
  Object.entries(turmasMap).forEach(([id, nome]) => {
    selTurma.innerHTML += `<option value="${id}">${nome}</option>`;
  });
  Object.entries(responsaveisMap).forEach(([id, nome]) => {
    selResp.innerHTML += `<option value="${id}">${escapeHtml(nome)}</option>`;
  });
}

// ─── Load alunos ──────────────────────────────────────────────────────────────
async function loadAlunos() {
  showSkeleton();
  const snap = await get(ref(db, "alunos"));
  allAlunos = [];
  if (snap.exists()) {
    snap.forEach((c) => allAlunos.push({ id: c.key, ...c.val() }));
  }
  allAlunos.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  renderTable(allAlunos);
}

// ─── Render table ─────────────────────────────────────────────────────────────
function renderTable(list) {
  const tbody = document.getElementById("alunos-tbody");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("alunos-count");

  count.textContent = `${list.length} aluno${list.length !== 1 ? "s" : ""} encontrado${list.length !== 1 ? "s" : ""}`;

  if (!list.length) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }
  empty.classList.add("hidden");
  empty.classList.remove("flex");

  tbody.innerHTML = list
    .map((a) => {
      const initials = (a.nome || "?")
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      const avatarHtml = a.fotoUrl
        ? `<img src="${escapeHtml(a.fotoUrl)}" alt="${escapeHtml(a.nome)}" class="w-8 h-8 rounded-full object-cover" />`
        : `<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-primary">${initials}</div>`;
      return `
    <tr class="row-item border-b border-border last:border-0" data-id="${a.id}">
      <td class="px-5 py-3.5">
        <div class="flex items-center gap-3">
          ${avatarHtml}
          <span class="font-medium text-text text-sm">${escapeHtml(a.nome || "—")}</span>
        </div>
      </td>
      <td class="px-5 py-3.5 text-sm text-muted font-mono">${escapeHtml(a.matricula || "—")}</td>
      <td class="px-5 py-3.5 hidden md:table-cell">
        ${a.turmaNome ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">${escapeHtml(a.turmaNome)}</span>` : `<span class="text-muted text-sm">—</span>`}
      </td>
      <td class="px-5 py-3.5 text-sm text-muted hidden lg:table-cell">${escapeHtml(a.responsavelNome || "—")}</td>
      <td class="px-5 py-3.5">${statusBadge(a.status)}</td>
      <td class="px-5 py-3.5">
        <div class="flex items-center justify-end gap-1">
          <button class="btn-ficha w-8 h-8 rounded-xl hover:bg-blue-50 flex items-center justify-center transition-colors" data-id="${a.id}" aria-label="Ver ficha de ${escapeHtml(a.nome)}">
            <svg class="w-4 h-4 text-muted hover:text-primary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          <button class="btn-editar w-8 h-8 rounded-xl hover:bg-blue-50 flex items-center justify-center transition-colors" data-id="${a.id}" aria-label="Editar ${escapeHtml(a.nome)}">
            <svg class="w-4 h-4 text-muted hover:text-primary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn-excluir w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center transition-colors" data-id="${a.id}" aria-label="Excluir ${escapeHtml(a.nome)}">
            <svg class="w-4 h-4 text-muted hover:text-red-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
    })
    .join("");
}

function statusBadge(status) {
  const map = {
    ativo: "bg-emerald-100 text-emerald-700",
    inativo: "bg-red-100 text-red-600",
    transferido: "bg-amber-100 text-amber-700",
  };
  const label = {
    ativo: "Ativo",
    inativo: "Inativo",
    transferido: "Transferido",
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}">${label[status] || status}</span>`;
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function getFilteredList() {
  const q = document.getElementById("filter-search").value.toLowerCase().trim();
  const turma = document.getElementById("filter-turma").value;
  const status = document.getElementById("filter-status").value;
  return allAlunos.filter((a) => {
    const matchQ =
      !q ||
      (a.nome || "").toLowerCase().includes(q) ||
      (a.matricula || "").toLowerCase().includes(q);
    const matchT = !turma || a.turmaId === turma;
    const matchS = !status || a.status === status;
    return matchQ && matchT && matchS;
  });
}

function applyFilters() {
  renderTable(getFilteredList());
}

// ─── Modal Aluno ──────────────────────────────────────────────────────────────
function openModalAluno(aluno = null) {
  editingId = aluno ? aluno.id : null;
  document.getElementById("modal-aluno-title").textContent = aluno
    ? "Editar Aluno"
    : "Novo Aluno";
  document.getElementById("aluno-nome").value = aluno?.nome || "";
  document.getElementById("aluno-cpf").value = aluno?.cpf || "";
  document.getElementById("aluno-nascimento").value =
    aluno?.dataNascimento || "";
  document.getElementById("aluno-matricula").value = aluno?.matricula || "";
  document.getElementById("aluno-status").value = aluno?.status || "ativo";
  document.getElementById("aluno-turma").value = aluno?.turmaId || "";
  document.getElementById("aluno-responsavel").value =
    aluno?.responsavelId || "";
  clearErrors();

  const fp = document.getElementById("foto-preview");
  fp.textContent = "";
  fp.style.backgroundImage = "";
  if (aluno?.fotoUrl) {
    fp.style.cssText = `background-image:url(${aluno.fotoUrl});background-size:cover;background-position:center;`;
  } else {
    fp.textContent = "👤";
  }
  document.getElementById("foto-upload").value = "";
  document.getElementById("modal-aluno").classList.remove("hidden");
  setTimeout(() => document.getElementById("aluno-nome").focus(), 80);
}

function closeModalAluno() {
  document.getElementById("modal-aluno").classList.add("hidden");
  editingId = null;
}

function clearErrors() {
  ["err-nome", "err-matricula", "err-turma"].forEach((id) => {
    const el = document.getElementById(id);
    el.textContent = "";
    el.classList.add("hidden");
  });
}

function setError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}

function validateForm() {
  clearErrors();
  let ok = true;
  const nome = document.getElementById("aluno-nome").value.trim();
  const matricula = document.getElementById("aluno-matricula").value.trim();
  const turmaId = document.getElementById("aluno-turma").value;
  if (!nome) {
    setError("err-nome", "Nome é obrigatório.");
    ok = false;
  }
  if (!matricula) {
    setError("err-matricula", "Matrícula é obrigatória.");
    ok = false;
  }
  if (!turmaId) {
    setError("err-turma", "Selecione uma turma.");
    ok = false;
  }
  return ok;
}

async function saveAluno() {
  if (!validateForm()) return;

  const btn = document.getElementById("modal-aluno-save");
  btn.disabled = true;
  btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Salvando...`;

  const turmaId = document.getElementById("aluno-turma").value;
  const responsavelId = document.getElementById("aluno-responsavel").value;

  const payload = {
    nome: document.getElementById("aluno-nome").value.trim(),
    cpf: document.getElementById("aluno-cpf").value.trim(),
    dataNascimento: document.getElementById("aluno-nascimento").value,
    matricula: document.getElementById("aluno-matricula").value.trim(),
    turmaId,
    turmaNome: turmasMap[turmaId] || "",
    responsavelId,
    responsavelNome: responsavelId ? responsaveisMap[responsavelId] || "" : "",
    status: document.getElementById("aluno-status").value,
  };

  const fotoFile = document.getElementById("foto-upload").files[0];
  if (fotoFile) {
    try {
      const fileRef = storageRef(
        storage,
        `fotos-alunos/${editingId || Date.now()}.${fotoFile.name.split(".").pop()}`,
      );
      await uploadBytes(fileRef, fotoFile);
      payload.fotoUrl = await getDownloadURL(fileRef);
    } catch {
      showToast("Erro ao enviar foto.", "error");
      resetSaveBtn(btn);
      return;
    }
  }

  try {
    if (editingId) {
      await update(ref(db, `alunos/${editingId}`), payload);
      const idx = allAlunos.findIndex((a) => a.id === editingId);
      if (idx !== -1)
        allAlunos[idx] = {
          id: editingId,
          ...payload,
          ...(allAlunos[idx].fotoUrl && !payload.fotoUrl
            ? { fotoUrl: allAlunos[idx].fotoUrl }
            : {}),
        };
      showToast("Aluno atualizado com sucesso!");
    } else {
      payload.criadoEm = Date.now();
      const newRef = push(ref(db, "alunos"));
      await set(newRef, payload);
      allAlunos.push({ id: newRef.key, ...payload });
      allAlunos.sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR"),
      );
      showToast("Aluno cadastrado com sucesso!");
    }
    closeModalAluno();
    applyFilters();
    document.getElementById("alunos-count").textContent =
      `${allAlunos.length} aluno${allAlunos.length !== 1 ? "s" : ""} encontrado${allAlunos.length !== 1 ? "s" : ""}`;
  } catch {
    showToast("Erro ao salvar aluno.", "error");
  }

  resetSaveBtn(btn);
}

function resetSaveBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar`;
}

// ─── Modal Ficha ──────────────────────────────────────────────────────────────
function openFicha(id) {
  const a = allAlunos.find((x) => x.id === id);
  if (!a) return;
  const fields = [
    ["Nome", a.nome],
    ["Matrícula", a.matricula],
    ["CPF / RG", a.cpf || "—"],
    [
      "Data de nascimento",
      a.dataNascimento
        ? new Date(a.dataNascimento + "T12:00:00").toLocaleDateString("pt-BR")
        : "—",
    ],
    ["Turma", a.turmaNome || "—"],
    ["Responsável", a.responsavelNome || "—"],
    ["Status", a.status],
    [
      "Cadastrado em",
      a.criadoEm ? new Date(a.criadoEm).toLocaleDateString("pt-BR") : "—",
    ],
  ];
  document.getElementById("ficha-title").textContent = `Ficha — ${a.nome}`;
  document.getElementById("ficha-content").innerHTML = `
    ${a.fotoUrl ? `<img src="${escapeHtml(a.fotoUrl)}" alt="${escapeHtml(a.nome)}" class="w-16 h-16 rounded-2xl object-cover border border-border mb-2" />` : ""}
    <dl class="grid grid-cols-2 gap-x-6 gap-y-3">
      ${fields
        .map(
          ([label, val]) => `
        <div>
          <dt class="text-xs font-semibold text-muted uppercase tracking-wider mb-0.5">${label}</dt>
          <dd class="text-sm font-medium text-text">${escapeHtml(String(val ?? "—"))}</dd>
        </div>`,
        )
        .join("")}
    </dl>`;
  document.getElementById("modal-ficha").classList.remove("hidden");
}

// ─── Modal Excluir ────────────────────────────────────────────────────────────
function openModalExcluir(id) {
  const a = allAlunos.find((x) => x.id === id);
  if (!a) return;
  pendingDeleteId = id;
  document.getElementById("excluir-nome").textContent = a.nome || "este aluno";
  document.getElementById("modal-excluir").classList.remove("hidden");
}

async function confirmarExcluir() {
  if (!pendingDeleteId) return;
  try {
    await remove(ref(db, `alunos/${pendingDeleteId}`));
    allAlunos = allAlunos.filter((a) => a.id !== pendingDeleteId);
    document.getElementById("modal-excluir").classList.add("hidden");
    pendingDeleteId = null;
    applyFilters();
    showToast("Aluno removido.");
  } catch {
    showToast("Erro ao excluir aluno.", "error");
  }
}

// ─── Foto upload preview ──────────────────────────────────────────────────────
document.getElementById("foto-upload").addEventListener("change", () => {
  const file = document.getElementById("foto-upload").files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("Foto muito grande. Máx. 2MB.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const fp = document.getElementById("foto-preview");
    fp.textContent = "";
    fp.style.cssText = `background-image:url(${e.target.result});background-size:cover;background-position:center;`;
  };
  reader.readAsDataURL(file);
});

// ─── Init UI (event delegation) ───────────────────────────────────────────────
function initUI() {
  document
    .getElementById("btn-novo-aluno")
    .addEventListener("click", () => openModalAluno());
  document
    .getElementById("modal-aluno-close")
    .addEventListener("click", closeModalAluno);
  document
    .getElementById("modal-aluno-cancel")
    .addEventListener("click", closeModalAluno);
  document
    .getElementById("modal-aluno-save")
    .addEventListener("click", saveAluno);
  document.getElementById("modal-aluno").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModalAluno();
  });

  document
    .getElementById("modal-ficha-close")
    .addEventListener("click", () =>
      document.getElementById("modal-ficha").classList.add("hidden"),
    );
  document.getElementById("modal-ficha").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
  });

  document.getElementById("excluir-cancelar").addEventListener("click", () => {
    document.getElementById("modal-excluir").classList.add("hidden");
    pendingDeleteId = null;
  });
  document
    .getElementById("excluir-confirmar")
    .addEventListener("click", confirmarExcluir);
  document.getElementById("modal-excluir").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add("hidden");
      pendingDeleteId = null;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    document.getElementById("modal-aluno").classList.add("hidden");
    document.getElementById("modal-ficha").classList.add("hidden");
    document.getElementById("modal-excluir").classList.add("hidden");
  });

  document.getElementById("alunos-tbody").addEventListener("click", (e) => {
    const id = e.target.closest("[data-id]")?.dataset.id;
    if (!id) return;
    if (e.target.closest(".btn-editar")) {
      const a = allAlunos.find((x) => x.id === id);
      openModalAluno(a);
    } else if (e.target.closest(".btn-excluir")) {
      openModalExcluir(id);
    } else if (e.target.closest(".btn-ficha")) {
      openFicha(id);
    }
  });

  let filterTimer;
  const debounceFilter = () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilters, 220);
  };
  document
    .getElementById("filter-search")
    .addEventListener("input", debounceFilter);
  document
    .getElementById("filter-turma")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filter-status")
    .addEventListener("change", applyFilters);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
