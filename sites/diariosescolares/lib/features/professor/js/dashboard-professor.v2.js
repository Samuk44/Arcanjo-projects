("use strict");
import { auth, db } from "../../../../assets/js/firebase/config.js";
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

const state = { user: null, profile: null, vinculos: [] };
const _unsubs = [];
const addUnsub = (fn) => typeof fn === "function" && _unsubs.push(fn);
const cleanup = () => {
  _unsubs.splice(0).forEach((fn) => {
    try {
      fn();
    } catch {}
  });
};
const setEl = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};
const showToast = (msg, type = "success") => {
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
};
const fmtDate = (val) => {
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
};
const getTodayStr = () => new Date().toISOString().slice(0, 10);
const toValuesArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.values(val).filter(Boolean);
};
window.closeModal = (id) => {
  document.getElementById(id)?.classList.add("hidden");
};

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
});

function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/auth/login.html";
      return;
    }
    try {
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists()) {
        window.location.href = "/auth/complete-profile.html";
        return;
      }
      const profile = snap.val();
      if (profile.role !== "professor") {
        window.location.href = "/auth/unauthorized.html";
        return;
      }
      state.user = user;
      state.profile = profile;

      updateUIProfile();

      setupEventListeners();

      await loadProfessorData();
    } catch (err) {
      console.error("initAuth:", err);
      showToast("Erro ao carregar perfil.", "danger");
    }
  });
}
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
      faltasHoje = 0,
      recents = [];
    if (snap.exists()) {
      snap.forEach((child) => {
        const c = child.val();
        const ts = c.timestamp ?? 0;
        const dataStr = ts ? new Date(ts).toISOString().slice(0, 10) : "";
        const pres = Number(c.presencas ?? 0),
          falt = Number(c.faltas ?? 0),
          total = pres + falt;
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
  if (!container) return;
  if (!items?.length) {
    container.innerHTML =
      '<p class="text-muted" style="padding:.75rem 0">Nenhuma atividade recente.</p>';
    return;
  }
  container.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "aula-card";
    div.style.cursor = "default";
    div.innerHTML = `<div><div class="font-bold">${item.turmaNome ?? item.turmaId ?? "—"}</div><div class="text-sm text-muted">${item.disciplina ?? "—"} · ${fmtDate(item.timestamp ?? item.data)}</div></div><span class="status-pill status-realizada">${item.presencas ?? 0}P / ${item.faltas ?? 0}F</span>`;
    container.appendChild(div);
  });
}

function setupRealtimeMetrics() {
  if (!state.user?.uid) return;
  const bq = query(
    ref(db, "bilhetes"),
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

function renderAulasHoje() {
  const grid = document.getElementById("grid-aulas-dia");
  if (!grid) return;
  if (!state.vinculos?.length) {
    grid.innerHTML =
      '<p class="text-muted" style="padding:.75rem 0">Nenhuma turma vinculada.</p>';
    return;
  }
  grid.innerHTML = "";
  state.vinculos.forEach((v) => {
    const card = document.createElement("div");
    card.className = "aula-card";
    card.innerHTML = `<div><div class="font-bold">${v.turmaNome ?? v.turmaId ?? "—"}</div><div class="text-sm text-muted">${v.disciplina ?? state.profile?.disciplina ?? "—"}</div></div><span class="status-pill status-futura">Registrar</span>`;
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
async function loadProfessorData() {
  try {
    console.log("UID Professor:", state.user.uid);

    const snap = await get(ref(db, "turmas"));

    console.log("Turmas banco:", snap.val());

    state.vinculos = [];

    if (snap.exists()) {
      snap.forEach((child) => {
        const turma = child.val();

        console.log("Comparando:", turma.professorId, "===", state.user.uid);

        if (turma.professorId === state.user.uid) {
          state.vinculos.push({
            turmaId: child.key,
            turmaNome: turma.nome,
            disciplina: turma.disciplina ?? state.profile?.disciplina ?? "",
          });
        }
      });
    }

    console.log("Resultado:", state.vinculos);

    populateTurmaSelectors();
    renderAulasHoje();
    await loadDashboardStats();
    setupRealtimeMetrics();
  } catch (err) {
    console.error(err);
  }
}
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
  console.log("VINCULOS SELECT:", state.vinculos);
  const select = document.getElementById("select-turma-chamada");

  if (!select) return;

  select.innerHTML = '<option value="">Selecione a Turma</option>';

  state.vinculos.forEach((turma) => {
    const option = document.createElement("option");

    option.value = turma.turmaId;
    option.textContent = turma.turmaNome;

    select.appendChild(option);
  });
  console.log("Opções:", select.options.length);
  select.onchange = (e) => {
    const turma = state.vinculos.find((t) => t.turmaId === e.target.value);

    if (!turma) return;

    openChamadaModal({
      turmaId: turma.turmaId,
      turma: turma.turmaNome,
      disciplina: turma.disciplina,
    });
  };
}
async function openChamadaModal(aula) {
  const modal = document.getElementById("modal-chamada");
  if (!modal) return;
  setEl("modal-chamada-titulo", aula.turma);

  setEl("modal-chamada-info", aula.disciplina);

  setEl("chamada-professor", state.profile?.nome || "Professor");

  setEl("chamada-data", new Date().toLocaleDateString("pt-BR"));

  setEl("chamada-ano", new Date().getFullYear());
  modal.dataset.turmaId = aula.turmaId;
  modal.dataset.turma = aula.turma;
  modal.dataset.disciplina = aula.disciplina;
  function getBimestre() {
    const mes = new Date().getMonth() + 1;
    if (mes <= 3) return "1º Bimestre";
    if (mes <= 6) return "2º Bimestre";
    if (mes <= 9) return "3º Bimestre";
    return "4º Bimestre";
  }
  setEl("chamada-bimestre", getBimestre());
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
    const snap = await get(
      query(ref(db, "alunos"), orderByChild("turmaId"), equalTo(aula.turmaId)),
    );
    const alunosArr = snap.exists()
      ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }))
      : [];
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
      row.innerHTML = `<span class="font-medium">${nome ?? id}</span><div class="btn-group-toggle"><button class="btn-toggle active" data-status="P">P</button><button class="btn-toggle" data-status="F">F</button><button class="btn-toggle" data-status="J">J</button></div>`;
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

function setupEventListeners() {
  document
    .getElementById("btn-logout")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      cleanup();
      try {
        await signOut(auth);
      } catch {}
      localStorage.removeItem("sge_v2_prof_auth");
      window.location.href = "../auth/login.html";
    });
  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.remove("-translate-x-full");
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
      const turmaId = modal?.dataset.turmaId ?? "",
        turmaNome = modal?.dataset.turma ?? "",
        disciplina = modal?.dataset.disciplina ?? "";
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
window.addEventListener("beforeunload", cleanup, { once: true });
