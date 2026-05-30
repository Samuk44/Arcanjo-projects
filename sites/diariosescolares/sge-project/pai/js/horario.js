"use strict";

import {
  db,
  initPage,
  loadFilhoSelect,
  setAlunoAtivo,
} from "./app-shared.js";
import {
  ref,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
const DIAS_LABEL = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };

let _unsubHorario = null;
let _turmaId = null;

function skeleton() {
  const g = document.getElementById("schedule-grid");
  if (g) g.innerHTML = Array(5).fill('<div class="skeleton h-32 rounded-2xl"></div>').join("");
  const u = document.getElementById("upcoming-classes");
  if (u) u.innerHTML = Array(2).fill('<div class="skeleton h-16 rounded-xl"></div>').join("");
}

function getTodayDia() {
  const d = new Date().getDay();
  return [null, "segunda", "terca", "quarta", "quinta", "sexta"][d] ?? null;
}

function getCurrentSlot() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseHora(h) {
  if (!h) return 0;
  const [hh, mm] = String(h).split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

function normalizeHorario(data) {
  if (!data) return {};
  if (typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data);
    const hasDays = keys.some((k) => DIAS.includes(k));
    if (hasDays) return data;
    const byDay = {};
    Object.values(data).forEach((item) => {
      if (!item || !item.dia) return;
      const dia = item.dia.toLowerCase();
      if (!byDay[dia]) byDay[dia] = [];
      byDay[dia].push(item);
    });
    return byDay;
  }
  if (Array.isArray(data)) {
    const byDay = {};
    data.forEach((item) => {
      if (!item?.dia) return;
      const dia = item.dia.toLowerCase();
      if (!byDay[dia]) byDay[dia] = [];
      byDay[dia].push(item);
    });
    return byDay;
  }
  return {};
}

function renderGrid(byDay) {
  const grid = document.getElementById("schedule-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const today = getTodayDia();
  const nowMin = getCurrentSlot();

  DIAS.forEach((dia) => {
    const aulas = byDay[dia] ?? [];
    const isToday = dia === today;
    const col = document.createElement("div");
    col.className = `rounded-2xl border ${isToday ? "border-blue-500/40 bg-blue-600/10" : "border-border bg-surface"} p-4`;

    const header = document.createElement("p");
    header.className = `text-sm font-semibold mb-3 ${isToday ? "text-blue-400" : "text-muted"}`;
    header.textContent = DIAS_LABEL[dia] + (isToday ? " (hoje)" : "");
    col.appendChild(header);

    if (!aulas.length) {
      const empty = document.createElement("p");
      empty.className = "text-xs text-muted italic";
      empty.textContent = "Sem aulas";
      col.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "space-y-2";
      const sorted = [...aulas].sort((a, b) => parseHora(a.hora ?? a.horario) - parseHora(b.hora ?? b.horario));
      sorted.forEach((aula) => {
        const hora = aula.hora ?? aula.horario ?? "";
        const materia = aula.materia ?? aula.disciplina ?? aula.nome ?? "Aula";
        const prof = aula.professor ?? "";
        const horaMin = parseHora(hora);
        const isNow = isToday && nowMin >= horaMin && nowMin < horaMin + 50;
        const item = document.createElement("div");
        item.className = `rounded-xl px-3 py-2 text-xs ${isNow ? "bg-blue-500/20 border border-blue-500/40" : "bg-[#0f172a]"}`;
        item.innerHTML = `<p class="font-semibold text-text">${materia}</p>${hora ? `<p class="text-muted">${hora}${prof ? ` · ${prof}` : ""}</p>` : ""}`;
        list.appendChild(item);
      });
      col.appendChild(list);
    }
    grid.appendChild(col);
  });
}

function renderUpcoming(byDay) {
  const container = document.getElementById("upcoming-classes");
  if (!container) return;
  const today = getTodayDia();
  const nowMin = getCurrentSlot();
  const upcoming = [];

  if (today) {
    const aulas = byDay[today] ?? [];
    aulas
      .filter((a) => parseHora(a.hora ?? a.horario) > nowMin)
      .sort((a, b) => parseHora(a.hora ?? a.horario) - parseHora(b.hora ?? b.horario))
      .slice(0, 3)
      .forEach((a) => upcoming.push({ dia: "Hoje", ...a }));
  }

  const todayIdx = DIAS.indexOf(today ?? "");
  for (let i = todayIdx + 1; i < DIAS.length && upcoming.length < 3; i++) {
    (byDay[DIAS[i]] ?? []).slice(0, 1).forEach((a) => upcoming.push({ dia: DIAS_LABEL[DIAS[i]], ...a }));
  }

  if (!upcoming.length) {
    container.innerHTML = '<p class="text-sm text-muted">Nenhuma aula próxima encontrada.</p>';
    return;
  }

  container.innerHTML = "";
  upcoming.forEach((a) => {
    const div = document.createElement("div");
    div.className = "flex items-center gap-4 bg-surface rounded-xl border border-border px-4 py-3";
    div.innerHTML = `
      <span class="text-2xl">📚</span>
      <div>
        <p class="text-sm font-medium text-text">${a.materia ?? a.disciplina ?? "Aula"}</p>
        <p class="text-xs text-muted">${a.dia}${a.hora ? ` · ${a.hora}` : ""}${a.professor ? ` · ${a.professor}` : ""}</p>
      </div>`;
    container.appendChild(div);
  });
}

async function loadHorario(alunoId) {
  skeleton();
  try {
    const alunoSnap = await get(ref(db, `alunos/${alunoId}`));
    if (!alunoSnap.exists()) { renderEmpty(); return; }
    const aluno = alunoSnap.val();
    _turmaId = aluno.turmaId ?? aluno.turma ?? alunoId;

    const lbl = document.getElementById("turma-label");
    if (lbl) lbl.textContent = aluno.turma ?? _turmaId;

    if (_unsubHorario) _unsubHorario();

    const hRef = ref(db, `horarios/${_turmaId}`);
    _unsubHorario = onValue(hRef, (snap) => {
      if (!snap.exists()) { renderEmpty(); return; }
      const byDay = normalizeHorario(snap.val());
      renderGrid(byDay);
      renderUpcoming(byDay);
    });
  } catch {
    renderEmpty();
  }
}

function renderEmpty() {
  const g = document.getElementById("schedule-grid");
  if (g) g.innerHTML = '<div class="col-span-5 text-center text-sm text-muted py-8">Nenhum horário cadastrado para esta turma.</div>';
  const u = document.getElementById("upcoming-classes");
  if (u) u.innerHTML = '<p class="text-sm text-muted">Sem dados disponíveis.</p>';
}

async function init() {
  const ctx = await initPage();
  if (!ctx) return;

  const { alunoAtivo } = await loadFilhoSelect(ctx.uid, ctx.userData);
  if (!alunoAtivo) { renderEmpty(); return; }

  await loadHorario(alunoAtivo);

  document.getElementById("selectFilho")?.addEventListener("change", async (e) => {
    setAlunoAtivo(e.target.value);
    if (_unsubHorario) { _unsubHorario(); _unsubHorario = null; }
    await loadHorario(e.target.value);
  });
}

window.addEventListener("beforeunload", () => { if (_unsubHorario) _unsubHorario(); }, { once: true });

init();
