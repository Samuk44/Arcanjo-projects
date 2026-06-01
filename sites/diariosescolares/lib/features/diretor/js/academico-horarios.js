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

// ─── Firebase Init ────────────────────────────────────────────────────────────
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
const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
const DIA_LABEL = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
};

const TIME_SLOTS = [
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

const DISC_CLASSES = {
  Matemática: "disc-mat",
  Português: "disc-port",
  Ciências: "disc-cie",
  História: "disc-his",
  Geografia: "disc-geo",
  "Educação Física": "disc-ed",
  Artes: "disc-art",
  Inglês: "disc-ing",
  Física: "disc-fis",
  Química: "disc-qui",
  Biologia: "disc-bio",
  Filosofia: "disc-fil",
};

const MOCK_DISCIPLINAS = [
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Educação Física",
  "Artes",
  "Inglês",
  "Física",
  "Química",
  "Biologia",
  "Filosofia",
];

const MOCK_SALAS = [
  "Sala 101",
  "Sala 102",
  "Sala 103",
  "Sala 104",
  "Sala 201",
  "Sala 202",
  "Sala 203",
  "Lab. Ciências",
  "Lab. Informática",
  "Ginásio",
];

// ─── State ────────────────────────────────────────────────────────────────────
let allHorarios = {};
let turmas = {};
let professores = {};
let currentTurmaId = "";
let currentUser = null;
let unsubHorarios = null;
let filterProfessorId = "";
let filterSala = "";

// ─── Auth Guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) return redirectLogin();
  try {
    const snap = await get(ref(db, `usuarios/${user.uid}`));
    const data = snap.val();
    if (!data || data.role !== "diretor" || data.status !== "ativo")
      return redirectLogin();
    currentUser = { uid: user.uid, ...data };
    const initial = data.nome?.split(" ")[0] || "D";
    document.getElementById("topbar-greeting").textContent =
      `Olá, ${data.nome?.split(" ")[0] || "Diretor"}`;
    document.getElementById("topbar-avatar").textContent = initial
      .charAt(0)
      .toUpperCase();
    init();
  } catch {
    redirectLogin();
  }
});

function redirectLogin() {
  window.location.href = "../auth/login.html";
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await Promise.all([loadTurmas(), loadProfessores()]);
  populateSelects();
  buildSkeletonRows();
  setupEventListeners();
  showState("empty");
}

async function loadTurmas() {
  const snap = await get(ref(db, "turmas"));
  turmas = snap.val() || generateMockTurmas();
}

async function loadProfessores() {
  const snap = await get(ref(db, "usuarios"));
  const all = snap.val() || {};
  professores = {};
  Object.entries(all).forEach(([id, u]) => {
    if (u.role === "professor" && u.status === "ativo") professores[id] = u;
  });
  if (!Object.keys(professores).length) professores = generateMockProfessores();
}

// ─── Mock data fallbacks ──────────────────────────────────────────────────────
function generateMockTurmas() {
  return {
    turma_6A: { nome: "6º Ano A" },
    turma_6B: { nome: "6º Ano B" },
    turma_7A: { nome: "7º Ano A" },
    turma_7B: { nome: "7º Ano B" },
    turma_8A: { nome: "8º Ano A" },
    turma_9A: { nome: "9º Ano A" },
  };
}

function generateMockProfessores() {
  return {
    prof_1: { nome: "Ana Silva", disciplina: "Matemática" },
    prof_2: { nome: "Carlos Mendes", disciplina: "Português" },
    prof_3: { nome: "Beatriz Costa", disciplina: "Ciências" },
    prof_4: { nome: "Rafael Souza", disciplina: "História" },
    prof_5: { nome: "Mariana Lima", disciplina: "Inglês" },
    prof_6: { nome: "João Ferreira", disciplina: "Educação Física" },
  };
}

// ─── Populate selects ─────────────────────────────────────────────────────────
function populateSelects() {
  const turmaOpts = Object.entries(turmas)
    .map(([id, t]) => `<option value="${id}">${t.nome}</option>`)
    .join("");

  ["select-turma", "modal-turma", "dup-turma"].forEach((elId) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<option value="">Selecione...</option>${turmaOpts}`;
  });

  const profOpts = Object.entries(professores)
    .map(([id, p]) => `<option value="${id}">${p.nome}</option>`)
    .join("");

  document.getElementById("filter-professor").innerHTML =
    `<option value="">Todos</option>${profOpts}`;
  document.getElementById("modal-professor").innerHTML =
    `<option value="">Selecionar professor</option>${profOpts}`;

  const discOpts = MOCK_DISCIPLINAS.map(
    (d) => `<option value="${d}">${d}</option>`,
  ).join("");
  document.getElementById("modal-disciplina").innerHTML =
    `<option value="">Selecionar</option>${discOpts}`;

  const salaOpts = MOCK_SALAS.map(
    (s) => `<option value="${s}">${s}</option>`,
  ).join("");
  document.getElementById("filter-sala").innerHTML =
    `<option value="">Todas</option>${salaOpts}`;
  document.getElementById("modal-sala").innerHTML =
    `<option value="">Selecionar sala</option>${salaOpts}`;
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function setupEventListeners() {
  document.getElementById("select-turma").addEventListener("change", (e) => {
    currentTurmaId = e.target.value;
    filterProfessorId = "";
    filterSala = "";
    document.getElementById("filter-professor").value = "";
    document.getElementById("filter-sala").value = "";
    if (currentTurmaId) subscribeHorarios();
    else showState("empty");
  });

  document
    .getElementById("filter-professor")
    .addEventListener("change", (e) => {
      filterProfessorId = e.target.value;
      renderGrid();
    });

  document.getElementById("filter-sala").addEventListener("change", (e) => {
    filterSala = e.target.value;
    renderGrid();
  });

  document
    .getElementById("btn-novo")
    .addEventListener("click", () => openModal());
  document
    .getElementById("btn-novo-empty")
    ?.addEventListener("click", () => openModal());
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document
    .getElementById("modal-cancelar")
    .addEventListener("click", closeModal);
  document.getElementById("modal-salvar").addEventListener("click", handleSave);
  document
    .getElementById("modal-delete")
    .addEventListener("click", handleDelete);

  document.getElementById("modal-horario").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  [
    "modal-dia",
    "modal-inicio",
    "modal-fim",
    "modal-professor",
    "modal-sala",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", checkConflicts);
  });

  document.getElementById("btn-exportar").addEventListener("click", exportCSV);
  document
    .getElementById("btn-imprimir")
    .addEventListener("click", () => window.print());
  document
    .getElementById("btn-duplicar")
    .addEventListener("click", openDuplicar);
  document.getElementById("btn-limpar").addEventListener("click", openLimpar);

  document
    .getElementById("dup-cancelar")
    .addEventListener("click", () => toggleModal("modal-duplicar", false));
  document
    .getElementById("dup-confirmar")
    .addEventListener("click", handleDuplicar);

  document
    .getElementById("limpar-cancelar")
    .addEventListener("click", () => toggleModal("modal-limpar", false));
  document
    .getElementById("limpar-confirmar")
    .addEventListener("click", handleLimpar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      toggleModal("modal-duplicar", false);
      toggleModal("modal-limpar", false);
    }
  });
}

// ─── Firebase Subscription ────────────────────────────────────────────────────
function subscribeHorarios() {
  if (unsubHorarios) unsubHorarios();
  showState("skeleton");
  const horariosRef = ref(db, "horarios");
  unsubHorarios = onValue(horariosRef, (snap) => {
    const all = snap.val() || {};
    allHorarios = {};
    Object.entries(all).forEach(([id, h]) => {
      if (h.turmaId === currentTurmaId) allHorarios[id] = h;
    });
    if (!Object.keys(allHorarios).length) {
      showState("no-schedules");
    } else {
      showState("grid");
      renderGrid();
    }
  });
}

// ─── UI State ─────────────────────────────────────────────────────────────────
function showState(state) {
  document
    .getElementById("empty-state")
    .classList.toggle("hidden", state !== "empty");
  document
    .getElementById("empty-state")
    .classList.toggle("flex", state === "empty");
  document
    .getElementById("no-schedules-state")
    .classList.toggle("hidden", state !== "no-schedules");
  document
    .getElementById("no-schedules-state")
    .classList.toggle("flex", state === "no-schedules");
  document
    .getElementById("skeleton-grid")
    .classList.toggle("hidden", state !== "skeleton");
  document
    .getElementById("schedule-grid-container")
    .classList.toggle("hidden", state !== "grid");
}

function buildSkeletonRows() {
  const container = document.getElementById("skeleton-rows");
  const rows = Array.from(
    { length: 6 },
    () =>
      `<div class="grid grid-cols-6 min-w-[640px] border-b border-border last:border-0">
      <div class="p-3 border-r border-border bg-slate-50 skeleton rounded-lg m-2 h-8"></div>
      ${Array.from({ length: 5 }, () => `<div class="p-2 border-r border-border last:border-0"><div class="skeleton rounded-xl h-14 w-full"></div></div>`).join("")}
    </div>`,
  ).join("");
  container.innerHTML = rows;
}

// ─── Grid Rendering ───────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById("schedule-grid");
  const filtered = getFilteredHorarios();
  const byDayTime = groupByDayTime(filtered);

  let html = `<div class="grid min-w-[700px]" style="grid-template-columns: 96px repeat(5,1fr);">`;

  // Header row
  html += `<div class="p-3 bg-slate-50 border-b border-r border-border"></div>`;
  DIAS.forEach((d) => {
    html += `<div class="p-3 bg-slate-50 border-b border-r border-border last:border-r-0 text-center">
      <span class="text-xs font-bold text-text uppercase tracking-wider">${DIA_LABEL[d]}</span>
    </div>`;
  });

  // Time slot rows
  TIME_SLOTS.slice(0, -1).forEach((slot, i) => {
    const nextSlot = TIME_SLOTS[i + 1];
    html += `<div class="p-2 border-b border-r border-border bg-slate-50 flex items-start justify-end pr-3 pt-3">
      <span class="time-label text-xs text-muted font-medium">${slot}</span>
    </div>`;
    DIAS.forEach((dia) => {
      const key = `${dia}_${slot}`;
      const cards = byDayTime[key] || [];
      html += `<div class="schedule-cell p-1.5 border-b border-r border-border last:border-r-0 relative" data-dia="${dia}" data-slot="${slot}" data-next="${nextSlot}">`;
      cards.forEach((h) => {
        const discClass = DISC_CLASSES[h.disciplina] || "disc-def";
        const profNome =
          professores[h.professorId]?.nome || h.professorNome || "—";
        html += `<div
          class="horario-card ${discClass} border rounded-xl px-2 py-1.5 mb-1 text-xs leading-tight"
          data-id="${h._id}"
          role="button"
          tabindex="0"
          aria-label="${h.disciplina} com ${profNome} — ${h.horarioInicio} às ${h.horarioFim}"
          title="${h.disciplina} · ${profNome} · ${h.sala}"
        >
          <div class="font-semibold truncate">${h.disciplina}</div>
          <div class="truncate opacity-80">${profNome}</div>
          <div class="truncate opacity-60">${h.sala}</div>
          <div class="opacity-50 text-[10px]">${h.horarioInicio}–${h.horarioFim}</div>
        </div>`;
      });
      html += `</div>`;
    });
  });

  html += `</div>`;
  grid.innerHTML = html;

  // Card click → open edit modal
  grid.querySelectorAll(".horario-card").forEach((card) => {
    const openEdit = () => openModal(card.dataset.id);
    card.addEventListener("click", openEdit);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openEdit();
    });
  });

  // Cell click → open new with prefilled day/slot
  grid.querySelectorAll(".schedule-cell").forEach((cell) => {
    cell.addEventListener("click", (e) => {
      if (e.target.closest(".horario-card")) return;
      openModal(null, {
        dia: cell.dataset.dia,
        inicio: cell.dataset.slot,
        fim: cell.dataset.next,
      });
    });
  });
}

function groupByDayTime(horarios) {
  const map = {};
  Object.entries(horarios).forEach(([id, h]) => {
    const startIdx = TIME_SLOTS.indexOf(h.horarioInicio);
    if (startIdx === -1) return;
    const key = `${h.diaSemana}_${h.horarioInicio}`;
    if (!map[key]) map[key] = [];
    map[key].push({ _id: id, ...h });
  });
  return map;
}

function getFilteredHorarios() {
  let result = { ...allHorarios };
  if (filterProfessorId) {
    result = Object.fromEntries(
      Object.entries(result).filter(
        ([, h]) => h.professorId === filterProfessorId,
      ),
    );
  }
  if (filterSala) {
    result = Object.fromEntries(
      Object.entries(result).filter(([, h]) => h.sala === filterSala),
    );
  }
  return result;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id = null, prefill = {}) {
  const isEdit = !!id;
  document.getElementById("modal-horario-title").textContent = isEdit
    ? "Editar Horário"
    : "Novo Horário";
  document.getElementById("modal-delete").classList.toggle("hidden", !isEdit);
  document.getElementById("edit-id").value = id || "";
  clearConflictWarning();

  const h = id ? allHorarios[id] : null;
  document.getElementById("modal-turma").value =
    h?.turmaId || currentTurmaId || "";
  document.getElementById("modal-dia").value =
    h?.diaSemana || prefill.dia || "";
  document.getElementById("modal-inicio").value =
    h?.horarioInicio || prefill.inicio || "";
  document.getElementById("modal-fim").value =
    h?.horarioFim || prefill.fim || "";
  document.getElementById("modal-disciplina").value = h?.disciplina || "";
  document.getElementById("modal-professor").value = h?.professorId || "";
  document.getElementById("modal-sala").value = h?.sala || "";

  toggleModal("modal-horario", true);
  document.getElementById("modal-turma").focus();
}

function closeModal() {
  toggleModal("modal-horario", false);
  clearConflictWarning();
}

function toggleModal(id, open) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden", !open);
  if (open) el.removeAttribute("aria-hidden");
  else el.setAttribute("aria-hidden", "true");
}

// ─── Conflict Detection ───────────────────────────────────────────────────────
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function intervalsOverlap(s1, e1, s2, e2) {
  return (
    timeToMinutes(s1) < timeToMinutes(e2) &&
    timeToMinutes(s2) < timeToMinutes(e1)
  );
}

function checkConflicts() {
  const dia = document.getElementById("modal-dia").value;
  const inicio = document.getElementById("modal-inicio").value;
  const fim = document.getElementById("modal-fim").value;
  const professorId = document.getElementById("modal-professor").value;
  const sala = document.getElementById("modal-sala").value;
  const editId = document.getElementById("edit-id").value;

  clearConflictWarning();
  if (!dia || !inicio || !fim || !professorId || !sala)
    return { hasConflict: false };
  if (timeToMinutes(fim) <= timeToMinutes(inicio)) {
    showConflictWarning([
      "O horário de fim deve ser depois do horário de início.",
    ]);
    return { hasConflict: true };
  }

  const conflicts = [];

  // Check ALL horarios in Firebase for professor/sala conflicts, not just current turma
  // We need access to all horarios — stored separately below
  Object.entries(window._allHorariosGlobal || {}).forEach(([id, h]) => {
    if (id === editId) return;
    if (h.diaSemana !== dia) return;
    if (!intervalsOverlap(inicio, fim, h.horarioInicio, h.horarioFim)) return;

    if (h.professorId === professorId) {
      const pNome = professores[professorId]?.nome || "Professor";
      conflicts.push(
        `${pNome} já tem aula em ${h.turmaNome || h.turmaId} (${h.horarioInicio}–${h.horarioFim})`,
      );
    }
    if (h.sala === sala && h.turmaId !== currentTurmaId) {
      conflicts.push(
        `${sala} está ocupada por ${h.turmaNome || h.turmaId} (${h.horarioInicio}–${h.horarioFim})`,
      );
    }
    if (h.sala === sala && h.turmaId === currentTurmaId && id !== editId) {
      conflicts.push(`${sala} já está em uso neste horário.`);
    }
  });

  if (conflicts.length) {
    showConflictWarning([...new Set(conflicts)]);
    return { hasConflict: true };
  }
  return { hasConflict: false };
}

function showConflictWarning(messages) {
  const warn = document.getElementById("conflict-warning");
  const list = document.getElementById("conflict-list");
  list.innerHTML = messages.map((m) => `<li>${m}</li>`).join("");
  warn.classList.remove("hidden");
  document.getElementById("modal-salvar").disabled = true;
  document
    .getElementById("modal-salvar")
    .classList.add("opacity-50", "cursor-not-allowed");
}

function clearConflictWarning() {
  document.getElementById("conflict-warning").classList.add("hidden");
  document.getElementById("conflict-list").innerHTML = "";
  document.getElementById("modal-salvar").disabled = false;
  document
    .getElementById("modal-salvar")
    .classList.remove("opacity-50", "cursor-not-allowed");
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
async function handleSave() {
  const turmaId = document.getElementById("modal-turma").value;
  const diaSemana = document.getElementById("modal-dia").value;
  const horarioInicio = document.getElementById("modal-inicio").value;
  const horarioFim = document.getElementById("modal-fim").value;
  const disciplina = document.getElementById("modal-disciplina").value;
  const professorId = document.getElementById("modal-professor").value;
  const sala = document.getElementById("modal-sala").value;
  const editId = document.getElementById("edit-id").value;

  if (
    !turmaId ||
    !diaSemana ||
    !horarioInicio ||
    !horarioFim ||
    !disciplina ||
    !professorId ||
    !sala
  ) {
    showToast("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  const { hasConflict } = checkConflicts();
  if (hasConflict) {
    showToast("Corrija os conflitos antes de salvar.", "error");
    return;
  }

  const payload = {
    turmaId,
    turmaNome: turmas[turmaId]?.nome || turmaId,
    diaSemana,
    horarioInicio,
    horarioFim,
    disciplina,
    professorId,
    professorNome: professores[professorId]?.nome || "",
    sala,
    criadoEm: editId ? allHorarios[editId]?.criadoEm || Date.now() : Date.now(),
  };

  try {
    setModalLoading(true);
    if (editId) {
      await update(ref(db, `horarios/${editId}`), payload);
      showToast("Horário atualizado com sucesso!", "success");
    } else {
      await push(ref(db, "horarios"), payload);
      showToast("Horário criado com sucesso!", "success");
    }
    closeModal();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar. Tente novamente.", "error");
  } finally {
    setModalLoading(false);
  }
}

async function handleDelete() {
  const id = document.getElementById("edit-id").value;
  if (!id) return;
  try {
    setModalLoading(true);
    await remove(ref(db, `horarios/${id}`));
    showToast("Horário removido.", "success");
    closeModal();
  } catch {
    showToast("Erro ao excluir.", "error");
  } finally {
    setModalLoading(false);
  }
}

function setModalLoading(loading) {
  const btn = document.getElementById("modal-salvar");
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Salvando...`
    : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Salvar`;
}

// ─── Duplicar ─────────────────────────────────────────────────────────────────
function openDuplicar() {
  if (!currentTurmaId) {
    showToast("Selecione uma turma primeiro.", "error");
    return;
  }
  if (!Object.keys(allHorarios).length) {
    showToast("A grade atual está vazia.", "error");
    return;
  }
  const dupSel = document.getElementById("dup-turma");
  dupSel.value = "";
  // Remove current turma from options
  Array.from(dupSel.options).forEach((opt) => {
    opt.disabled = opt.value === currentTurmaId;
  });
  toggleModal("modal-duplicar", true);
}

async function handleDuplicar() {
  const destId = document.getElementById("dup-turma").value;
  if (!destId) {
    showToast("Selecione a turma de destino.", "error");
    return;
  }
  const destNome = turmas[destId]?.nome || destId;
  try {
    const writes = Object.values(allHorarios).map((h) => {
      const { _id, ...data } = h;
      return push(ref(db, "horarios"), {
        ...data,
        turmaId: destId,
        turmaNome: destNome,
        criadoEm: Date.now(),
      });
    });
    await Promise.all(writes);
    showToast(`Grade duplicada para ${destNome}!`, "success");
    toggleModal("modal-duplicar", false);
  } catch {
    showToast("Erro ao duplicar. Tente novamente.", "error");
  }
}

// ─── Limpar ───────────────────────────────────────────────────────────────────
function openLimpar() {
  if (!currentTurmaId) {
    showToast("Selecione uma turma primeiro.", "error");
    return;
  }
  if (!Object.keys(allHorarios).length) {
    showToast("A grade já está vazia.", "error");
    return;
  }
  toggleModal("modal-limpar", true);
}

async function handleLimpar() {
  try {
    const deletes = Object.keys(allHorarios).map((id) =>
      remove(ref(db, `horarios/${id}`)),
    );
    await Promise.all(deletes);
    showToast("Grade limpa com sucesso.", "success");
    toggleModal("modal-limpar", false);
  } catch {
    showToast("Erro ao limpar a grade.", "error");
  }
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV() {
  if (!currentTurmaId) {
    showToast("Selecione uma turma primeiro.", "error");
    return;
  }
  const turmaNome = turmas[currentTurmaId]?.nome || currentTurmaId;
  const rows = [
    ["Turma", "Dia", "Início", "Fim", "Disciplina", "Professor", "Sala"],
  ];
  Object.values(allHorarios).forEach((h) => {
    rows.push([
      turmaNome,
      DIA_LABEL[h.diaSemana] || h.diaSemana,
      h.horarioInicio,
      h.horarioFim,
      h.disciplina,
      professores[h.professorId]?.nome || h.professorNome || "—",
      h.sala,
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `horarios_${turmaNome.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exportado com sucesso!", "success");
}

// ─── Global horarios for conflict checking across turmas ─────────────────────
(function subscribeAllHorarios() {
  onValue(ref(db, "horarios"), (snap) => {
    window._allHorariosGlobal = snap.val() || {};
  });
})();

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const id = `toast-${Date.now()}`;
  const isSuccess = type === "success";
  const toast = document.createElement("div");
  toast.id = id;
  toast.className = `toast flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-soft border text-sm font-medium pointer-events-auto ${
    isSuccess
      ? "bg-surface border-border text-text"
      : "bg-red-50 border-red-200 text-red-700"
  }`;
  toast.innerHTML = `
    <span class="w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${isSuccess ? "bg-green-100" : "bg-red-100"}">
      ${
        isSuccess
          ? `<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`
          : `<svg class="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`
      }
    </span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}
