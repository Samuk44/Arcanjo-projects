"use strict";

import { auth, db } from "../../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  onValue,
  update,
  push,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const state = {
  user: null,
  profile: null,
  currentView: "dashboard",
  vinculos: [],
};

const _unsubs = [];
function addUnsub(fn) {
  if (typeof fn === "function") _unsubs.push(fn);
}
function cleanup() {
  _unsubs.splice(0).forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showToast(msg, type = "success") {
  const colors = {
    success: "#22c55e",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;padding:.75rem 1.25rem;border-radius:.5rem;color:#fff;font-size:.875rem;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.3);background:${colors[type] ?? colors.info};animation:fadeIn .3s ease`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmtDate(val) {
  if (!val) return "—";
  try {
    const d =
      typeof val === "number"
        ? new Date(val)
        : new Date(String(val).includes("T") ? val : val + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
  } catch {
    return String(val);
  }
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toValuesArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val).filter(Boolean);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  setupNavigation();
  setupEventListeners();
});

function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    try {
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists()) {
        await signOut(auth);
        location.replace("../../auth/login.html");
        return;
      }
      const profile = snap.val();

      state.user = user;
      state.profile = profile;
      updateUIProfile();
      await loadProfessorData();
    } catch (err) {
      console.error("initAuth:", err);
      showToast("Erro ao carregar perfil.", "danger");
    }
  });
}

// ── Professor Data ────────────────────────────────────────────────────────────

async function loadProfessorData() {
  try {
    const snap = await get(ref(db, `professores/${state.user.uid}/vinculos`));
    state.vinculos = toValuesArray(snap.val());
    populateTurmaSelectors();
    await loadDashboardStats();
    renderAulasHoje();
    setupRealtimeMetrics();
  } catch (err) {
    console.error("loadProfessorData:", err);
    showToast("Erro ao carregar dados do professor.", "danger");
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function loadDashboardStats() {
  if (!state.user?.uid) return;
  try {
    const q = query(
      ref(db, "chamadas"),
      orderByChild("professorId"),
      equalTo(state.user.uid),
    );
    const snap = await get(q);

    const today = getTodayStr();
    let aulasHoje = 0,
      totalPres = 0,
      totalAlunos = 0,
      faltasHoje = 0;
    const recents = [];

    if (snap.exists()) {
      snap.forEach((child) => {
        const c = child.val();
        const ts = c.timestamp ?? 0;
        const dataStr = ts ? new Date(ts).toISOString().slice(0, 10) : "";
        const pres = Number(c.presencas ?? 0);
        const falt = Number(c.faltas ?? 0);
        const total = pres + falt;
        if (total > 0) {
          totalPres += pres;
          totalAlunos += total;
        }
        if (dataStr === today) {
          aulasHoje++;
          faltasHoje += falt;
        }
        recents.push({ id: child.key, ...c, _ts: ts });
      });
    }

    const freqMedia =
      totalAlunos > 0 ? Math.round((totalPres / totalAlunos) * 100) : 0;
    setEl("stat-aulas", String(aulasHoje));
    setEl("stat-freq", `${freqMedia}%`);
    setEl("stat-faltas", String(faltasHoje));

    recents.sort((a, b) => b._ts - a._ts);
    renderRecentActivity(recents.slice(0, 5));
  } catch (err) {
    console.error("loadDashboardStats:", err);
    ["stat-aulas", "stat-freq", "stat-faltas"].forEach((id) => setEl(id, "—"));
  }
}

function renderRecentActivity(items) {
  const container = document.getElementById("recent-activity");
  if (container) return;
  if (!items.length) {
    container.innerHTML =
      '<p class="text-muted" style="padding:.75rem 0">Nenhuma atividade recente.</p>';
    return;
  }
  container.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "aula-card";
    div.style.cursor = "default";
    div.innerHTML = `
      <div>
        <div class="font-bold">${item.turmaNome ?? item.turmaId ?? "—"}</div>
        <div class="text-sm text-muted">${item.disciplina ?? "—"} · ${fmtDate(item.timestamp ?? item.data)}</div>
      </div>
      <span class="status-pill status-realizada">${item.presencas ?? 0}P / ${item.faltas ?? 0}F</span>`;
    container.appendChild(div);
  });
}

// ── Real-time Metrics ─────────────────────────────────────────────────────────

function setupRealtimeMetrics() {
  if (!state.user?.uid) return;

  const bilhetesRef = ref(db, "bilhetes");
  const bq = query(
    bilhetesRef,
    orderByChild("professorId"),
    equalTo(state.user.uid),
  );
  const unsub = onValue(
    bq,
    (snap) => {
      let count = 0;
      if (snap.exists()) snap.forEach(() => count++);
      setEl("stat-bilhetes", String(count));
      const badge = document.getElementById("badge-bilhetes");
      if (badge) {
        badge.textContent = String(count);
        badge.style.display = count > 0 ? "" : "none";
      }
    },
    (err) => console.error("bilhetes onValue:", err),
  );
  addUnsub(unsub);
}

// ── Aulas de Hoje ─────────────────────────────────────────────────────────────

function renderAulasHoje() {
  const grid = document.getElementById("grid-aulas-dia");
  if (!grid) return;

  if (!state.vinculos.length) {
    grid.innerHTML =
      '<p class="text-muted" style="padding:.75rem 0">Nenhuma turma vinculada.</p>';
    return;
  }

  grid.innerHTML = "";
  state.vinculos.forEach((v) => {
    const card = document.createElement("div");
    card.className = "aula-card";
    card.innerHTML = `
      <div>
        <div class="font-bold">${v.turmaNome ?? v.turmaId ?? "—"}</div>
        <div class="text-sm text-muted">${v.disciplina ?? state.profile?.disciplina ?? "—"}</div>
      </div>
      <span class="status-pill status-futura">Registrar</span>`;
    card.addEventListener("click", () =>
      openChamadaModal({
        turmaId: v.turmaId ?? "",
        turma: v.turmaNome ?? v.turmaId ?? "—",
        disciplina: v.disciplina ?? state.profile?.disciplina ?? "—",
      }),
    );
    grid.appendChild(card);
  });
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

function updateUIProfile() {
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const nome = state.profile?.nome ?? "Professor";
  setEl("saudacao-contextual", `${saud}, ${nome.split(" ")[0]}`);
  setEl("user-name", nome);
  setEl("user-discipline", state.profile?.disciplina ?? "Professor");
  const initials = nome
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .substring(0, 2)
    .toUpperCase();
  setEl("user-initials", initials || "P");
}

function populateTurmaSelectors() {
  const select = document.getElementById("select-turma-chamada");
  if (!select) return;
  select.innerHTML = '<option value="">Selecione a Turma</option>';
  state.vinculos.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.turmaId ?? "";
    opt.textContent = v.turmaNome ?? v.turmaId ?? "Turma";
    select.appendChild(opt);
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────

function setupNavigation() {
  document.querySelectorAll(".sidebar-link[data-view]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchView(link.getAttribute("data-view") ?? "dashboard");
    });
  });
}

function switchView(viewId) {
  document
    .querySelectorAll(".sidebar-link")
    .forEach((l) => l.classList.remove("active"));
  document
    .querySelector(`.sidebar-link[data-view="${viewId}"]`)
    ?.classList.add("active");
  document
    .querySelectorAll(".view-section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`view-${viewId}`)?.classList.add("active");
  state.currentView = viewId;
  if (viewId === "chamada") renderAulasHoje();
}

// ── Chamada Modal ─────────────────────────────────────────────────────────────

async function openChamadaModal(aula) {
  const modal = document.getElementById("modal-chamada");
  if (!modal) return;

  setEl("modal-chamada-titulo", `Chamada — ${aula.turma}`);
  setEl(
    "modal-chamada-info",
    `${aula.disciplina} · ${new Date().toLocaleDateString("pt-BR")}`,
  );

  modal.dataset.turmaId = aula.turmaId;
  modal.dataset.turma = aula.turma;
  modal.dataset.disciplina = aula.disciplina;

  modal.classList.remove("hidden");

  const lista = document.getElementById("lista-alunos-chamada");
  if (!lista) return;
  lista.innerHTML =
    '<div class="text-muted" style="padding:.75rem 0">Carregando alunos...</div>';

  if (!aula.turmaId) {
    lista.innerHTML = '<p class="text-muted">Turma não identificada.</p>';
    return;
  }

  try {
    const [snapById, snapByName] = await Promise.all([
      get(
        query(
          ref(db, "alunos"),
          orderByChild("turmaId"),
          equalTo(aula.turmaId),
        ),
      ),
      get(
        query(ref(db, "alunos"), orderByChild("turma"), equalTo(aula.turmaId)),
      ),
    ]);

    const alunosMap = {};
    [snapById, snapByName].forEach((snap) => {
      if (snap.exists())
        snap.forEach((c) => {
          alunosMap[c.key] = { id: c.key, ...c.val() };
        });
    });
    const alunosArr = Object.values(alunosMap);

    if (!alunosArr.length) {
      lista.innerHTML =
        '<p class="text-muted">Nenhum aluno encontrado nesta turma.</p>';
      return;
    }

    lista.innerHTML = "";
    alunosArr.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? ""));
    alunosArr.forEach(({ id, nome }) => {
      const row = document.createElement("div");
      row.className = "aluno-row";
      row.dataset.alunoId = id;
      row.dataset.status = "P";
      row.innerHTML = `
        <span class="font-medium">${nome ?? id}</span>
        <div class="btn-group-toggle">
          <button class="btn-toggle active" data-status="P">P</button>
          <button class="btn-toggle" data-status="F">F</button>
          <button class="btn-toggle" data-status="J">J</button>
        </div>`;
      row.querySelectorAll(".btn-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          row
            .querySelectorAll(".btn-toggle")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          row.dataset.status = btn.dataset.status ?? "P";
        });
      });
      lista.appendChild(row);
    });
  } catch (err) {
    console.error("openChamadaModal load alunos:", err);
    if (lista)
      lista.innerHTML = '<p class="text-muted">Erro ao carregar alunos.</p>';
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

function setupEventListeners() {
  document
    .getElementById("btn-logout")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      cleanup();
      try {
        await signOut(auth);
      } catch {}
      location.replace("../../auth/login.html");
    });

  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("active");
  });

  document.getElementById("btn-marcar-todos")?.addEventListener("click", () => {
    document
      .querySelectorAll("#lista-alunos-chamada .aluno-row")
      .forEach((row) => {
        row
          .querySelectorAll(".btn-toggle")
          .forEach((b) => b.classList.remove("active"));
        const pBtn = row.querySelector('[data-status="P"]');
        if (pBtn) {
          pBtn.classList.add("active");
          row.dataset.status = "P";
        }
      });
  });

  document
    .getElementById("btn-salvar-chamada")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-salvar-chamada");
      if (!btn || !state.user?.uid) return;

      const modal = document.getElementById("modal-chamada");
      const turmaId = modal?.dataset.turmaId ?? "";
      const turmaNome = modal?.dataset.turma ?? "";
      const disciplina = modal?.dataset.disciplina ?? "";

      if (!turmaId) {
        showToast("Selecione uma turma.", "danger");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Salvando...";

      const rows = document.querySelectorAll(
        "#lista-alunos-chamada .aluno-row",
      );
      if (!rows.length) {
        showToast("Nenhum aluno para registrar.", "warning");
        btn.disabled = false;
        btn.textContent = "Finalizar Chamada";
        return;
      }

      const alunos = [];
      let presencas = 0,
        faltas = 0,
        justificadas = 0;
      rows.forEach((row) => {
        const status = row.dataset.status ?? "P";
        alunos.push({
          uid: row.dataset.alunoId ?? "",
          nome: row.querySelector(".font-medium")?.textContent ?? "",
          presente: status === "P",
          status,
        });
        if (status === "P") presencas++;
        else if (status === "J") justificadas++;
        else faltas++;
      });

      const obs = (document.getElementById("chamada-obs")?.value ?? "").trim();

      try {
        const chamadaRef = push(ref(db, "chamadas"));
        await update(chamadaRef, {
          professorId: state.user.uid,
          professorNome: state.profile?.nome ?? "",
          turmaId,
          turmaNome: turmaNome || turmaId,
          disciplina: disciplina || state.profile?.disciplina || "",
          alunos,
          presencas,
          faltas,
          justificadas,
          observacoes: obs,
          timestamp: Date.now(),
          data: new Date().toISOString().slice(0, 10),
        });
        showToast("Chamada salva com sucesso!", "success");
        closeModal("modal-chamada");
        const obsEl = document.getElementById("chamada-obs");
        if (obsEl) obsEl.value = "";
        await loadDashboardStats();
      } catch (err) {
        console.error("salvar chamada:", err);
        showToast("Erro ao salvar chamada.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Finalizar Chamada";
      }
    });
}

window.openModal = (id) =>
  document.getElementById(id)?.classList.remove("hidden");
window.closeModal = (id) =>
  document.getElementById(id)?.classList.add("hidden");

window.addEventListener("beforeunload", cleanup, { once: true });
