import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  push,
  set,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const E = {
  status: document.getElementById("statusMessage"),
  grid: document.getElementById("gridTurmas"),
  modal: document.getElementById("modal"),
  openNewBtn: document.getElementById("openNewBtn"),
  closeModal: null,
  form: null,
  inputs: {},
  filterSerie: document.getElementById("filterSerie"),
  filterTurno: document.getElementById("filterTurno"),
  filterStatus: document.getElementById("filterStatus"),
  searchInput: document.getElementById("searchInput"),
  clearFilters: document.getElementById("clearFilters"),
  userGreeting: document.getElementById("userGreeting"),
  userAvatar: document.getElementById("userAvatar"),
};

let state = {
  turmas: {},
  professores: {},
  alunos: {},
  filtered: [],
  editingId: null,
};

const setStatus = (msg, isError = false) => {
  if (!E.status) return;
  E.status.textContent = msg;
  E.status.classList.toggle("bg-red-50", isError);
  E.status.classList.toggle("text-red-700", isError);
};

const badge = (text, bg, color) => `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${bg} ${color}">${text}</span>`;

const renderCard = (id, t) => {
  const alunosCount = Array.isArray(t.alunos) ? t.alunos.length : 0;
  const statusBadge = t.ativa ? badge("Ativa", "bg-green-100", "text-green-700") : badge("Inativa", "bg-red-100", "text-red-700");
  return `
    <div data-id="${id}" class="rounded-2xl border border-[#e2e8f0] bg-white p-4 hover:shadow-lg hover:border-blue-300">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="text-lg font-semibold text-slate-900">${t.nome}</h4>
          <div class="mt-2 flex gap-2 items-center">
            ${badge(t.serie || '-', 'bg-blue-100', 'text-blue-700')}
            ${badge(t.turno || '-', 'bg-purple-100', 'text-purple-700')}
            ${statusBadge}
          </div>
          <p class="mt-3 text-sm text-slate-600">Professor: ${t.professorNome || '—'}</p>
          <p class="mt-1 text-sm text-slate-600">Alunos: ${alunosCount} • Ano: ${t.ano || '—'}</p>
        </div>
        <div class="flex flex-col gap-2">
          <button data-action="view" class="rounded-2xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm">Ver Alunos</button>
          <button data-action="edit" class="rounded-2xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm">Editar</button>
          <button data-action="delete" class="rounded-2xl bg-white border border-[#e2e8f0] px-3 py-2 text-sm text-red-600">Excluir</button>
        </div>
      </div>
    </div>`;
};

const renderTurmas = () => {
  const list = state.filtered.length ? state.filtered : Object.entries(state.turmas);
  if (!list.length) {
    E.grid.innerHTML = `<div class="col-span-full rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center text-slate-600">Nenhuma turma encontrada.</div>`;
    return;
  }
  E.grid.innerHTML = list
    .map(([id, t]) => renderCard(id, t))
    .join("");
  E.grid.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onCardAction));
};

const onCardAction = (ev) => {
  const btn = ev.currentTarget;
  const action = btn.getAttribute("data-action");
  const card = btn.closest("[data-id]");
  const id = card?.getAttribute("data-id");
  if (!id) return;
  const turma = state.turmas[id];
  if (action === "edit") openModal("edit", id, turma);
  if (action === "delete") removeTurma(id);
  if (action === "view") viewAlunos(id, turma);
};

const viewAlunos = (id, turma) => {
  const alunos = (turma.alunos || []).map((a) => state.alunos[a]?.nome || a).join(', ') || 'Nenhum';
  alert(`Alunos da turma ${turma.nome}: ${alunos}`);
};

const openModal = (mode = 'new', id = null, turma = null) => {
  state.editingId = id;
  E.modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = mode === 'new' ? 'Nova Turma' : 'Editar Turma';
  E.form.nome.value = turma?.nome || '';
  E.form.serie.value = turma?.serie || '';
  E.form.turno.value = turma?.turno || '';
  E.form.professor.value = turma?.professorId || '';
  E.form.ano.value = turma?.ano || new Date().getFullYear();
  // alunos checkboxes
  const selected = new Set(turma?.alunos || []);
  const container = document.getElementById('alunosList');
  container.querySelectorAll('input[type=checkbox]').forEach((cb) => cb.checked = selected.has(cb.value));
};

const closeModal = () => { E.modal.classList.add('hidden'); state.editingId = null; E.form.reset(); };

const saveTurma = async (ev) => {
  ev.preventDefault();
  const data = {
    nome: E.form.nome.value.trim(),
    serie: E.form.serie.value,
    turno: E.form.turno.value,
    professorId: E.form.professor.value || null,
    professorNome: state.professores[E.form.professor.value]?.nome || null,
    ano: Number(E.form.ano.value) || new Date().getFullYear(),
    ativa: true,
    alunos: Array.from(document.querySelectorAll('#alunosList input[type=checkbox]:checked')).map(i => i.value),
  };
  try {
    if (state.editingId) {
      await update(ref(db, `turmas/${state.editingId}`), data);
      setStatus('Turma atualizada');
    } else {
      const newRef = push(ref(db, 'turmas'));
      await set(newRef, data);
      setStatus('Turma criada');
    }
    await loadTurmas();
    closeModal();
  } catch (err) {
    console.error(err); setStatus('Erro ao salvar turma', true);
  }
};

const removeTurma = async (id) => {
  if (!confirm('Confirma exclusão desta turma?')) return;
  try { await remove(ref(db, `turmas/${id}`)); setStatus('Turma excluída'); await loadTurmas(); } catch (e) { console.error(e); setStatus('Erro ao excluir', true); }
};

const populateSelects = () => {
  const series = new Set();
  Object.values(state.turmas).forEach(t => t.serie && series.add(t.serie));
  const sel = E.filterSerie; sel.innerHTML = '<option value="">Todas as Séries</option>' + [...series].map(s => `<option>${s}</option>`).join('');
  const profSelect = document.getElementById('professor');
  profSelect.innerHTML = '<option value="">Sem professor</option>' + Object.entries(state.professores).map(([id,p])=>`<option value="${id}">${p.nome}</option>`).join('');
  const alunosContainer = document.getElementById('alunosList');
  alunosContainer.innerHTML = Object.entries(state.alunos).map(([id,a])=>`<label class="flex items-center gap-2"><input type="checkbox" value="${id}"/> <span class="text-sm">${a.nome}</span></label>`).join('');
};

const applyFiltersAndSearch = () => {
  const q = (E.searchInput.value || '').toLowerCase();
  const s = E.filterSerie.value;
  const t = E.filterTurno.value;
  const status = E.filterStatus.value;
  state.filtered = Object.entries(state.turmas).filter(([id, turma]) => {
    if (s && turma.serie !== s) return false;
    if (t && turma.turno !== t) return false;
    if (status) { const act = String(!!turma.ativa); if (status !== act) return false; }
    if (!q) return true;
    if ((turma.nome || '').toLowerCase().includes(q)) return true;
    if ((turma.professorNome || '').toLowerCase().includes(q)) return true;
    return false;
  });
  renderTurmas();
};

const loadProfessores = async () => {
  const snap = await get(ref(db, 'usuarios'));
  const map = {};
  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([id,u]) => { if (u.role === 'professor') map[id] = { nome: u.nome || u.nomeCompleto || '—' }; });
  }
  state.professores = map;
};

const loadAlunos = async () => {
  const snap = await get(ref(db, 'alunos'));
  const map = {};
  if (snap.exists()) Object.entries(snap.val()).forEach(([id,a]) => map[id] = { nome: a.nome || a.nomeCompleto || '—' });
  state.alunos = map;
};

const loadTurmas = async () => {
  setStatus('Carregando turmas...');
  const snap = await get(ref(db, 'turmas'));
  state.turmas = snap.exists() ? snap.val() : {};
  populateSelects();
  applyFiltersAndSearch();
  setStatus('');
};

const init = () => {
  E.form = document.getElementById('turmaForm');
  E.closeModal = document.getElementById('closeModal');
  E.openNewBtn?.addEventListener('click', () => openModal('new'));
  E.closeModal?.addEventListener('click', closeModal);
  E.form?.addEventListener('submit', saveTurma);
  [E.filterSerie, E.filterTurno, E.filterStatus].forEach(el => el?.addEventListener('change', applyFiltersAndSearch));
  E.searchInput?.addEventListener('input', applyFiltersAndSearch);
  E.clearFilters?.addEventListener('click', () => { E.filterSerie.value=''; E.filterTurno.value=''; E.filterStatus.value=''; E.searchInput.value=''; applyFiltersAndSearch(); });
};

onAuthStateChanged(auth, async (user) => {
  if (!user) { if (E.status) E.status.innerHTML = 'Você não está logado. <a href="../auth/login.html" class="font-semibold text-blue-700 underline">Entrar</a>'; return; }
  try {
    const snap = await get(ref(db, `usuarios/${user.uid}`));
    if (!snap.exists()) { await signOut(auth); location.replace('../auth/login.html'); return; }
    const u = snap.val();
    if (u.role !== 'diretor' || u.status !== 'ativo') { await signOut(auth); location.replace('../auth/login.html'); return; }
    E.userGreeting.textContent = u.nome || 'Diretor';
    E.userAvatar.textContent = (u.nome || 'D').split(' ')[0].slice(0,2).toUpperCase();
    init();
    await Promise.all([loadProfessores(), loadAlunos()]);
    await loadTurmas();
  } catch (err) { console.error(err); setStatus('Erro ao carregar dados', true); }
});
