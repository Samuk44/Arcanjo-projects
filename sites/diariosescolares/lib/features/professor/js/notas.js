"use strict";

import { auth, db } from "../../../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  update,
  push,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const state = {
  professor: {
    uid: null,
    nome: null,
    disciplina: null,
    role: null,
    status: null,
  },
  vinculos: [],
  turmas: [],
  disciplinas: [],
  alunos: [],
  notas: {},
  turmaId: "",
  disciplinaId: "",
  bimestre: "",
  isLoading: false,
  formulaMedia: "",
  notaMinimaAprovacao: 6,
  modalOrigin: new Map(),
};

let _authUnsub = null;
let _escHandlerBound = false;
const _unsubs = [];

function addUnsub(fn) {
  if (typeof fn === "function") _unsubs.push(fn);
}
function cleanup() {
  while (_unsubs.length) {
    try {
      _unsubs.pop()();
    } catch {}
  }
}
function esc(text) {
  const d = document.createElement("div");
  d.textContent = String(text ?? "");
  return d.innerHTML;
}
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function toast(message, type = "success") {
  const container = document.getElementById("toast-container") || document.body;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.style.cssText =
    "position:fixed;right:1rem;bottom:1rem;z-index:99999;padding:.85rem 1rem;border-radius:.85rem;color:#fff;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.2);max-width:min(92vw,28rem);";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 250);
  }, 2800);
}
function skeletonHTML(lines = 4) {
  return Array.from({ length: lines })
    .map(
      () =>
        '<div class="animate-pulse" style="height:3.5rem;border-radius:1rem;background:rgba(148,163,184,.15);margin-bottom:.75rem"></div>',
    )
    .join("");
}
function emptyStateHTML(title, message, buttonText = "") {
  return `<div style="text-align:center;padding:1.5rem 1rem;color:var(--text-tertiary)"><div style="font-size:2rem;margin-bottom:.5rem">📭</div><div style="font-weight:700;color:var(--text);margin-bottom:.35rem">${esc(title)}</div><div style="margin-bottom:1rem">${esc(message)}</div>${buttonText ? `<button class="btn btn-primary" type="button">${esc(buttonText)}</button>` : ""}</div>`;
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function nowMs() {
  return Date.now();
}
function formatDate(value) {
  try {
    const d =
      typeof value === "number"
        ? new Date(value)
        : new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return String(value || "");
  }
}
function normalizeList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return Object.entries(val).map(([key, item]) =>
    item && typeof item === "object"
      ? { id: item.id ?? key, ...item }
      : { id: key, value: item },
  );
}
function normalizeVinculos(raw) {
  return normalizeList(raw)
    .map((item, idx) => ({
      id: item.id ?? item.turmaId ?? String(idx),
      turmaId: item.turmaId ?? item.id ?? item.turma ?? item.codigo ?? "",
      turmaNome:
        item.turmaNome ??
        item.nome ??
        item.titulo ??
        item.descricao ??
        item.turmaId ??
        item.id ??
        "",
      disciplina:
        item.disciplina ??
        item.disciplinaNome ??
        item.materia ??
        state.professor.disciplina ??
        "",
      raw: item,
    }))
    .filter((v) => v.turmaId);
}
function normalizeStatus(status) {
  const v = String(status ?? "").toUpperCase();
  return ["", "P", "F", "J"].includes(v) ? v || "P" : "P";
}
function round1(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}
function writeBatch() {
  const updates = {};
  return {
    set(path, value) {
      updates[String(path).replace(/^\//, "")] = value;
      return this;
    },
    update(path, value) {
      updates[String(path).replace(/^\//, "")] = value;
      return this;
    },
    async commit() {
      if (!Object.keys(updates).length) return true;
      await update(ref(db), updates);
      return true;
    },
  };
}
function ensureProfessorWrite(payload) {
  if (!payload || payload.professorId !== state.professor.uid)
    throw new Error("Permissão negada");
}
function focusables(modal) {
  return Array.from(
    modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("hidden") && el.offsetParent !== null);
}
function bindModalControls(modal) {
  if (!modal || modal.dataset.bound === "1") return;
  modal.dataset.bound = "1";
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal.id);
  });
}
function ensureEscHandler() {
  if (_escHandlerBound) return;
  _escHandlerBound = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const active = document.querySelector(".modal.active, .modal:not(.hidden)");
    if (active?.id) closeModal(active.id);
  });
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  state.modalOrigin.set(
    id,
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  bindModalControls(modal);
  ensureEscHandler();
  modal.classList.remove("hidden");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  setTimeout(() => focusables(modal)[0]?.focus?.(), 0);
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("active");
  document.body.style.overflow = "";
  const origin = state.modalOrigin.get(id);
  state.modalOrigin.delete(id);
  setTimeout(() => origin?.focus?.(), 0);
}
window.openModal = openModal;
window.closeModal = closeModal;
function updateHeader() {
  const nome = state.professor.nome || "Professor";
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  setEl("saudacao-contextual", `${saud}, ${nome.split(" ")[0] || "Professor"}`);
  setEl("user-name", nome);
  setEl("user-discipline", state.professor.disciplina || "Professor");
  setEl(
    "user-initials",
    nome
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P",
  );
}
function computeMedia(n1, n2, n3) {
  const a = Number(n1),
    b = Number(n2),
    c = Number(n3);
  if (![a, b, c].every(Number.isFinite)) return "";
  if (state.formulaMedia && /N1/i.test(state.formulaMedia)) {
    const match = state.formulaMedia.match(
      /N1\s*\*\s*(\d+(?:\.\d+)?)\s*\+\s*N2\s*\*\s*(\d+(?:\.\d+)?)\s*\+\s*N3\s*\*\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i,
    );
    if (match) {
      const [, w1, w2, w3, d] = match.map(Number);
      return round1((a * w1 + b * w2 + c * w3) / d);
    }
  }
  return round1((a * 2 + b * 3 + c * 5) / 10);
}
function updateMediaTurma() {
  const vals = Object.values(state.notas)
    .map((n) => n.media)
    .filter((v) => v !== "" && v !== null && v !== undefined)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const el = document.getElementById("media-turma");
  if (!el) return;
  el.textContent = vals.length
    ? round1(vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1)
    : "—";
}
function renderTabela() {
  const tbody = document.getElementById("tabela-notas");
  if (!tbody) return;
  const btnSalvar = document.getElementById("btn-salvar-notas");
  if (!state.turmaId || !state.disciplinaId || !state.bimestre) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem">Selecione turma, disciplina e bimestre.</td></tr>`;
    if (btnSalvar) btnSalvar.style.display = "none";
    return;
  }
  if (!state.alunos.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem">Nenhum aluno vinculado a esta turma.</td></tr>`;
    if (btnSalvar) btnSalvar.style.display = "none";
    return;
  }
  if (btnSalvar) btnSalvar.style.display = "block";
  tbody.innerHTML = state.alunos
    .map((aluno) => {
      const nota = state.notas[aluno.uid] || {
        n1: "",
        n2: "",
        n3: "",
        obs: "",
        media: "",
      };
      const media =
        nota.media === "" || nota.media === null || nota.media === undefined
          ? NaN
          : Number(nota.media);
      const statusClass = Number.isFinite(media)
        ? media >= state.notaMinimaAprovacao
          ? "ok"
          : media >= 4
            ? "warning"
            : "error"
        : "";
      return `<tr data-aluno-id="${esc(aluno.uid)}"><td><span class="aluno-nome">${esc(aluno.nome)}</span></td><td><input type="number" step="0.1" min="0" max="10" value="${esc(nota.n1)}" data-grade="n1" oninput="window.atualizarNota('${aluno.uid}', this.value)" aria-label="N1 de ${esc(aluno.nome)}"></td><td><input type="number" step="0.1" min="0" max="10" value="${esc(nota.n2)}" data-grade="n2" oninput="window.atualizarNota('${aluno.uid}', this.value)" aria-label="N2 de ${esc(aluno.nome)}"></td><td><input type="number" step="0.1" min="0" max="10" value="${esc(nota.n3)}" data-grade="n3" oninput="window.atualizarNota('${aluno.uid}', this.value)" aria-label="N3 de ${esc(aluno.nome)}"></td><td><strong class="media-aluno">${Number.isFinite(media) ? media.toFixed(1) : "—"}</strong></td><td><span class="status-indicator ${statusClass}"></span></td><td><textarea data-grade="obs" oninput="window.atualizarObs('${aluno.uid}', this.value)" placeholder="Obs..." aria-label="Observação para ${esc(aluno.nome)}">${esc(nota.obs)}</textarea></td><td><button class="btn-small" type="button" onclick="window.salvarNotaUnica('${aluno.uid}')">💾</button></td></tr>`;
    })
    .join("");
  updateMediaTurma();
}
function syncRow(uid) {
  const row = document.querySelector(
    `#tabela-notas tr[data-aluno-id="${CSS.escape(uid)}"]`,
  );
  if (!row) return;
  const nota = state.notas[uid] || {};
  const media =
    nota.media === "" || nota.media === null || nota.media === undefined
      ? NaN
      : Number(nota.media);
  const mediaEl = row.querySelector(".media-aluno");
  if (mediaEl)
    mediaEl.textContent = Number.isFinite(media) ? media.toFixed(1) : "—";
  const indicator = row.querySelector(".status-indicator");
  if (indicator) {
    indicator.className = `status-indicator ${Number.isFinite(media) ? (media >= state.notaMinimaAprovacao ? "ok" : media >= 4 ? "warning" : "error") : ""}`;
  }
}
function syncNota(uid) {
  if (!state.notas[uid])
    state.notas[uid] = { n1: "", n2: "", n3: "", obs: "", media: "" };
  const n = state.notas[uid];
  n.media = computeMedia(n.n1, n.n2, n.n3);
  syncRow(uid);
  updateMediaTurma();
}
window.atualizarNota = (uid, valor) => {
  const grade = String(globalThis.event?.target?.dataset?.grade || "n1");
  if (!state.notas[uid])
    state.notas[uid] = { n1: "", n2: "", n3: "", obs: "", media: "" };
  state.notas[uid][grade] = valor === "" ? "" : String(round1(valor));
  syncNota(uid);
};
window.atualizarObs = (uid, valor) => {
  if (!state.notas[uid])
    state.notas[uid] = { n1: "", n2: "", n3: "", obs: "", media: "" };
  state.notas[uid].obs = String(valor ?? "").trimStart();
};
async function resolveResponsaveis(alunoUid) {
  try {
    const snap = await get(ref(db, `alunos/${alunoUid}`));
    if (!snap.exists()) return [];
    const data = snap.val() || {};
    const out = [];
    const append = (value) => {
      if (!value) return;
      if (Array.isArray(value)) return value.forEach(append);
      if (typeof value === "object")
        return Object.entries(value).forEach(([k, v]) => {
          if (v) out.push(String(k));
        });
      out.push(String(value));
    };
    append(data.responsavelId);
    append(data.responsavelIds);
    append(data.responsavelUid);
    append(data.responsavelUids);
    append(data.responsaveis);
    append(data.paiId);
    append(data.maeId);
    return [...new Set(out.filter(Boolean))];
  } catch {
    return [];
  }
}
async function loadVinculos() {
  try {
    const snap = await get(
      ref(db, `professores/${state.professor.uid}/vinculos`),
    );
    state.vinculos = normalizeVinculos(snap.val());
    state.turmas = [...state.vinculos];
    const discSet = new Map();
    for (const v of state.vinculos)
      if (v.disciplina) discSet.set(v.disciplina, v.disciplina);
    if (state.professor.disciplina && !discSet.has(state.professor.disciplina))
      discSet.set(state.professor.disciplina, state.professor.disciplina);
    state.disciplinas = [...discSet.entries()].map(([id, nome]) => ({
      id,
      nome,
    }));
    const selTurma = document.getElementById("select-turma");
    if (selTurma)
      selTurma.innerHTML =
        '<option value="">Selecione a turma</option>' +
        state.turmas
          .map(
            (t) =>
              `<option value="${esc(t.turmaId)}">${esc(t.turmaNome)}</option>`,
          )
          .join("");
    const selDisc = document.getElementById("select-disciplina");
    if (selDisc)
      selDisc.innerHTML =
        '<option value="">Selecione a disciplina</option>' +
        state.disciplinas
          .map((d) => `<option value="${esc(d.id)}">${esc(d.nome)}</option>`)
          .join("");
    const cfg = await get(ref(db, "configuracoes/avaliacoes"));
    state.formulaMedia = cfg.exists()
      ? String(cfg.val()?.formulaMedia || "")
      : "";
    state.notaMinimaAprovacao =
      Number(cfg.exists() ? cfg.val()?.notaMinimaAprovacao : 6) || 6;
  } catch (error) {
    console.error(error);
    state.vinculos = [];
  }
}
async function loadAlunos(turmaId) {
  const tbody = document.getElementById("tabela-notas");
  if (tbody) tbody.innerHTML = skeletonHTML(3);
  try {
    const snap = await get(
      query(ref(db, "alunos"), orderByChild("turmaId"), equalTo(turmaId)),
    );
    const alunos = [];
    if (snap.exists())
      snap.forEach((child) => alunos.push({ uid: child.key, ...child.val() }));
    alunos.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || "")),
    );
    state.alunos = alunos;
    state.notas = {};
    if (state.turmaId && state.disciplinaId && state.bimestre)
      await loadNotasExistentes();
    renderTabela();
    return alunos;
  } catch (error) {
    console.error(error);
    if (tbody)
      tbody.innerHTML = emptyStateHTML(
        "Erro ao carregar alunos",
        "Tente novamente.",
      );
    return [];
  }
}
async function loadNotasExistentes() {
  try {
    const snap = await get(
      query(
        ref(
          db,
          `notas/${state.turmaId}/${state.disciplinaId}/${state.bimestre}`,
        ),
        orderByChild("professorId"),
        equalTo(state.professor.uid),
      ),
    );
    state.notas = {};
    if (snap.exists())
      snap.forEach((child) => {
        const n = child.val() || {};
        const uid = n.alunoUid || n.alunoId || child.key;
        state.notas[uid] = {
          n1: n.n1 ?? "",
          n2: n.n2 ?? "",
          n3: n.n3 ?? "",
          obs: n.observacao ?? n.obs ?? "",
          media:
            n.media ?? n.valor ?? computeMedia(n.n1 ?? 0, n.n2 ?? 0, n.n3 ?? 0),
          publishedAt: n.publishedAt ?? n.timestamp ?? 0,
          editableUntil: n.editableUntil ?? 0,
          status: n.status ?? "publicada",
        };
      });
  } catch (error) {
    console.error(error);
    state.notas = {};
  }
}
async function saveNotas(targetIds = null) {
  if (state.isLoading) return;
  state.isLoading = true;
  try {
    if (!state.turmaId || !state.disciplinaId || !state.bimestre)
      throw new Error("Selecione turma, disciplina e bimestre.");
    const ids =
      Array.isArray(targetIds) && targetIds.length
        ? targetIds
        : Object.keys(state.notas);
    if (!ids.length) throw new Error("Nenhuma nota para salvar.");
    const timestamp = nowMs();
    const batch = writeBatch();
    for (const alunoUid of ids) {
      const entry = state.notas[alunoUid];
      if (!entry) continue;
      const n1 = round1(entry.n1);
      const n2 = round1(entry.n2);
      const n3 = round1(entry.n3);
      const hasAny = [n1, n2, n3].some(
        (v) => v !== "" && v !== null && v !== undefined,
      );
      if (!hasAny) continue;
      if (
        ![n1, n2, n3].every(
          (v) =>
            v === "" ||
            (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 10),
        )
      )
        throw new Error("Nota inválida. Use valores de 0.0 a 10.0.");
      if (
        [n1, n2, n3]
          .filter((v) => v !== "")
          .some((v) => String(v).includes(".")) &&
        [n1, n2, n3].some(
          (v) => v !== "" && !/^\d{1,2}(\.\d)?$/.test(String(v)),
        )
      )
        throw new Error("Use no máximo 1 casa decimal.");
      const media = computeMedia(
        n1 === "" ? 0 : n1,
        n2 === "" ? 0 : n2,
        n3 === "" ? 0 : n3,
      );
      const existingPath = `notas/${state.turmaId}/${state.disciplinaId}/${state.bimestre}/${alunoUid}`;
      const existingSnap = await get(ref(db, existingPath));
      const existing = existingSnap.exists() ? existingSnap.val() : null;
      if (existing?.editableUntil && nowMs() > Number(existing.editableUntil))
        throw new Error("Janela de edição encerrada.");
      const payload = {
        professorId: state.professor.uid,
        professorNome: state.professor.nome || "Professor",
        alunoUid,
        alunoNome:
          state.alunos.find((a) => a.uid === alunoUid)?.nome || alunoUid,
        turmaId: state.turmaId,
        turmaNome:
          state.turmas.find((t) => t.turmaId === state.turmaId)?.turmaNome ||
          state.turmaId,
        disciplinaId: state.disciplinaId,
        disciplina:
          state.disciplinas.find((d) => d.id === state.disciplinaId)?.nome ||
          state.disciplinaId,
        bimestre: state.bimestre,
        n1: n1 === "" ? "" : String(n1),
        n2: n2 === "" ? "" : String(n2),
        n3: n3 === "" ? "" : String(n3),
        media,
        valor: media,
        observacao: String(entry.obs || "").trim(),
        status: "publicada",
        timestamp,
        updatedAt: timestamp,
        publishedAt: existing?.publishedAt || timestamp,
        editableUntil:
          existing?.editableUntil || timestamp + 48 * 60 * 60 * 1000,
      };
      ensureProfessorWrite(payload);
      batch.set(existingPath, payload);
      batch.set(`auditoria/notas/${alunoUid}_${timestamp}`, {
        action: existing ? "update" : "publish",
        professorId: state.professor.uid,
        alunoUid,
        turmaId: state.turmaId,
        disciplinaId: state.disciplinaId,
        bimestre: state.bimestre,
        timestamp,
        media,
      });
      if (!existing) {
        const responsaveis = await resolveResponsaveis(alunoUid);
        for (const responsavelUid of responsaveis) {
          batch.set(
            `entregas/${responsavelUid}/${state.turmaId}_${state.disciplinaId}_${state.bimestre}_${alunoUid}`,
            {
              lido: false,
              lidoEm: null,
              tipo: "nota",
              titulo: "Nova nota publicada",
              conteudo: `${payload.alunoNome} recebeu nota ${String(media.toFixed(1))} em ${payload.disciplina}.`,
              alunoId: alunoUid,
              alunoNome: payload.alunoNome,
              professorId: state.professor.uid,
              professorNome: state.professor.nome || "Professor",
              disciplina: payload.disciplina,
              turmaId: payload.turmaId,
              turma: payload.turmaNome,
              bimestre: state.bimestre,
              nota: media,
              media,
              criadoEm: timestamp,
            },
          );
        }
      }
      state.notas[alunoUid] = {
        ...entry,
        n1: payload.n1,
        n2: payload.n2,
        n3: payload.n3,
        media,
        publishedAt: payload.publishedAt,
        editableUntil: payload.editableUntil,
        obs: payload.observacao,
      };
    }
    await batch.commit();
    renderTabela();
    toast("Notas salvas com sucesso!", "success");
  } catch (error) {
    console.error(error);
    toast(error?.message || "Erro ao salvar notas.", "danger");
  } finally {
    state.isLoading = false;
  }
}
async function salvarNotaUnica(alunoUid) {
  return saveNotas([alunoUid]);
}
window.salvarNotaUnica = salvarNotaUnica;
window.atualizarNota = (uid, valor) => {
  const grade = String(globalThis.event?.target?.dataset?.grade || "n1");
  if (!state.notas[uid])
    state.notas[uid] = { n1: "", n2: "", n3: "", obs: "", media: "" };
  state.notas[uid][grade] = valor === "" ? "" : String(round1(valor));
  syncNota(uid);
};
window.atualizarObs = (uid, valor) => {
  if (!state.notas[uid])
    state.notas[uid] = { n1: "", n2: "", n3: "", obs: "", media: "" };
  state.notas[uid].obs = String(valor ?? "").trim();
};
function syncNota(uid) {
  if (!state.notas[uid]) return;
  state.notas[uid].media = computeMedia(
    state.notas[uid].n1 || 0,
    state.notas[uid].n2 || 0,
    state.notas[uid].n3 || 0,
  );
  syncRow(uid);
  updateMediaTurma();
}
function syncRow(uid) {
  const row = document.querySelector(
    `#tabela-notas tr[data-aluno-id="${CSS.escape(uid)}"]`,
  );
  if (!row) return;
  const nota = state.notas[uid] || {};
  const media =
    nota.media === "" || nota.media === null || nota.media === undefined
      ? NaN
      : Number(nota.media);
  const mediaEl = row.querySelector(".media-aluno");
  if (mediaEl)
    mediaEl.textContent = Number.isFinite(media) ? media.toFixed(1) : "—";
  const indicator = row.querySelector(".status-indicator");
  if (indicator)
    indicator.className = `status-indicator ${Number.isFinite(media) ? (media >= state.notaMinimaAprovacao ? "ok" : media >= 4 ? "warning" : "error") : ""}`;
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  state.modalOrigin.set(
    id,
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  bindModalControls(modal);
  ensureEscHandler();
  modal.classList.remove("hidden");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  setTimeout(() => focusables(modal)[0]?.focus?.(), 0);
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("active");
  document.body.style.overflow = "";
  const origin = state.modalOrigin.get(id);
  state.modalOrigin.delete(id);
  setTimeout(() => origin?.focus?.(), 0);
}
function bindModalControls(modal) {
  if (!modal || modal.dataset.bound === "1") return;
  modal.dataset.bound = "1";
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal.id);
  });
}
function ensureEscHandler() {
  if (_escHandlerBound) return;
  _escHandlerBound = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const active = document.querySelector(".modal.active, .modal:not(.hidden)");
    if (active?.id) closeModal(active.id);
  });
}
function focusables(modal) {
  return Array.from(
    modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("hidden") && el.offsetParent !== null);
}
function computeValFromFormula(formula, n1, n2, n3) {
  const a = Number(n1),
    b = Number(n2),
    c = Number(n3);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c))
    return "";
  return computeMedia(a, b, c);
}
function loadInitialState() {
  const tbody = document.getElementById("tabela-notas");
  if (tbody)
    tbody.innerHTML = emptyStateHTML(
      "Selecione os campos acima",
      "Turma, disciplina e bimestre são obrigatórios.",
    );
  const media = document.getElementById("media-turma");
  if (media) media.textContent = "—";
}
function updateHeader() {
  const nome = state.professor.nome || "Professor";
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  setEl("saudacao-contextual", `${saud}, ${nome.split(" ")[0] || "Professor"}`);
  setEl("user-name", nome);
  setEl("user-discipline", state.professor.disciplina || "Professor");
  setEl(
    "user-initials",
    nome
      .split(" ")
      .map((n) => n[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P",
  );
}
async function onReady() {
  updateHeader();
  await loadVinculos();
  loadInitialState();
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
      location.replace("/auth/login.html");
    });
  document
    .getElementById("select-turma")
    ?.addEventListener("change", async (e) => {
      state.turmaId = e.target.value;
      state.notas = {};
      if (state.turmaId) await loadAlunos(state.turmaId);
      else renderTabela();
    });
  document
    .getElementById("select-disciplina")
    ?.addEventListener("change", async (e) => {
      state.disciplinaId = e.target.value;
      if (state.turmaId && state.bimestre) await loadNotasExistentes();
      renderTabela();
    });
  document
    .getElementById("select-bimestre")
    ?.addEventListener("change", async (e) => {
      state.bimestre = e.target.value;
      if (state.turmaId && state.disciplinaId) await loadNotasExistentes();
      renderTabela();
    });
  document
    .getElementById("btn-salvar-notas")
    ?.addEventListener("click", () => saveNotas());
  document
    .getElementById("btn-nova-avaliacao")
    ?.addEventListener("click", () => openModal("modal-nova-avaliacao"));
  document
    .getElementById("btn-criar-avaliacao")
    ?.addEventListener("click", () => {
      const nome =
        document.getElementById("input-nome-avaliacao")?.value?.trim() || "";
      const peso = document.getElementById("input-peso")?.value?.trim() || "";
      const data =
        document.getElementById("input-data-avaliacao")?.value?.trim() || "";
      if (!nome || !peso || !data) {
        toast("Preencha todos os campos da avaliação.", "danger");
        return;
      }
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        toast("Data inválida. Use DD/MM/AAAA.", "danger");
        return;
      }
      toast(`Avaliação ${nome} criada.`, "success");
      closeModal("modal-nova-avaliacao");
    });
}
async function initAuth() {
  _authUnsub = onAuthStateChanged(auth, async (user) => {
    try {
      if (!user) {
        location.replace("/auth/login.html");
        return;
      }
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists() || snap.val()?.role !== "professor") {
        try {
          await signOut(auth);
        } catch {}
        location.replace("/auth/login.html");
        return;
      }
      state.professor.uid = user.uid;
      state.professor.nome = snap.val()?.nome || "Professor";
      state.professor.disciplina = snap.val()?.disciplina || "";
      state.professor.role = snap.val()?.role || "professor";
      state.professor.status = snap.val()?.status || "";
      setupEventListeners();
      updateHeader();
      await onReady();
    } catch (error) {
      console.error(error);
      toast("Erro ao carregar perfil.", "danger");
    }
  });
}
document.addEventListener("DOMContentLoaded", initAuth);
window.addEventListener(
  "pagehide",
  () => {
    cleanup();
    if (_authUnsub)
      try {
        _authUnsub();
      } catch {}
    _authUnsub = null;
  },
  { once: true },
);
