"use strict";
/**
 * @file professor/js/bilhetes.js
 * @description Envio e listagem de bilhetes com fan-out via notifications.js.
 */

import { auth, db } from "../../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  set,
  push,
  update,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import {
  showToast,
  sanitizeHTML,
  fmtDate,
  setBtnLoading,
  handleFirebaseError,
  sessionCache,
  skeletonHTML,
  emptyStateHTML,
} from "../../../assets/js/utils.js";
import {
  notificarBilhete,
  getResponsaveisUids,
} from "../../../assets/js/notifications.js";

let _authUnsub = null;
let _isMounted = false;

const state = {
  professor: { uid: null, nome: null, disciplina: null },
  vinculos: [],
  bilhetes: new Map(),
  isLoading: false,
  filters: { turma: "", status: "", search: "" },
  currentAnexo: null,
};

// ── UI ────────────────────────────────────────────────────────────────────────

const UI = {
  el: (id) => document.getElementById(id),

  formatDate: (ts) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts)),

  renderBilhetes() {
    const container = this.el("lista-bilhetes");
    if (!container) return;
    const filtered = Array.from(state.bilhetes.values())
      .filter((b) => {
        const matchTurma =
          !state.filters.turma || b.turmaId === state.filters.turma;
        const matchStatus =
          !state.filters.status || b.status === state.filters.status;
        const matchSearch =
          !state.filters.search ||
          (b.assunto ?? "")
            .toLowerCase()
            .includes(state.filters.search.toLowerCase()) ||
          (b.mensagem ?? "")
            .toLowerCase()
            .includes(state.filters.search.toLowerCase());
        return matchTurma && matchStatus && matchSearch;
      })
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    if (!filtered.length) {
      container.innerHTML = emptyStateHTML(
        "Nenhum bilhete encontrado",
        "Envie um novo bilhete aos responsáveis.",
        "ph-envelope-simple",
        "Novo Bilhete",
      );
      return;
    }

    container.innerHTML = "";
    filtered.forEach((b) => {
      const card = document.createElement("article");
      card.className = `bilhete-card ${b.status === "lido" ? "lido" : ""}`;
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.onclick = () => window.verBilhete(b.id);
      card.onkeydown = (e) => e.key === "Enter" && window.verBilhete(b.id);
      card.innerHTML = `
        <div class="bilhete-header">
          <div class="bilhete-info">
            <div class="bilhete-remetente">De: ${sanitizeHTML(b.remetenteNome ?? state.professor.nome)}</div>
            <h3 class="bilhete-assunto">${sanitizeHTML(b.assunto)}</h3>
          </div>
          <div style="display:flex;gap:.5rem">
            ${b.urgente ? '<span class="badge badge-urgente">Urgente</span>' : ""}
            <span class="badge badge-${b.status}">${b.status}</span>
          </div>
        </div>
        <div class="bilhete-preview">${sanitizeHTML(b.mensagem)}</div>
        <div class="bilhete-footer">
          <div class="bilhete-meta">
            <span class="bilhete-data">${this.formatDate(b.timestamp)}</span>
            ${b.anexo ? '<span style="font-size:.8rem">📎 Com anexo</span>' : ""}
          </div>
          <div class="bilhete-actions"><button class="btn-small" tabindex="-1">Ver Detalhes</button></div>
        </div>`;
      container.appendChild(card);
    });
  },

  updateHeader() {
    const { nome, disciplina } = state.professor;
    if (this.el("user-name"))
      this.el("user-name").textContent = nome ?? "Professor";
    if (this.el("user-discipline"))
      this.el("user-discipline").textContent = disciplina ?? "";
    if (this.el("user-initials")) {
      const ini = (nome ?? "P")
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .substring(0, 2)
        .toUpperCase();
      this.el("user-initials").textContent = ini || "P";
    }
  },
};

// ── Firebase ──────────────────────────────────────────────────────────────────

const FirebaseService = {
  async loadVinculos() {
    if (!_isMounted) return;
    const cacheKey = `sge_vinculos_bil_${state.professor.uid}`;
    const cached = sessionCache.get(cacheKey);
    if (cached) {
      state.vinculos = cached;
    } else {
      try {
        const snap = await get(ref(db, "turmas"));
        state.vinculos = [];
        if (snap.exists()) {
          snap.forEach((child) => {
            const t = child.val();
            if (t.professorId === state.professor.uid)
              state.vinculos.push({ id: child.key, nome: t.nome ?? child.key });
          });
        }
        sessionCache.set(cacheKey, state.vinculos, 10);
      } catch (err) {
        handleFirebaseError(err, "Erro ao carregar turmas.");
        return;
      }
    }

    ["filter-turma", "input-turma"].forEach((selectId) => {
      const el = UI.el(selectId);
      if (!el) return;
      const ph = el.querySelector('option[value=""]');
      el.innerHTML = "";
      if (ph) el.appendChild(ph);
      state.vinculos.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.nome;
        el.appendChild(opt);
      });
    });
  },

  async loadBilhetes() {
    if (!_isMounted || state.isLoading) return;
    state.isLoading = true;
    const container = UI.el("lista-bilhetes");
    if (container) container.innerHTML = skeletonHTML(4);
    try {
      const snap = await get(
        query(
          ref(db, "bilhetes"),
          orderByChild("professorId"),
          equalTo(state.professor.uid),
        ),
      );
      state.bilhetes.clear();
      if (snap.exists()) {
        snap.forEach((child) =>
          state.bilhetes.set(child.key, { id: child.key, ...child.val() }),
        );
      }
      UI.renderBilhetes();
    } catch (err) {
      handleFirebaseError(err, "Erro ao carregar bilhetes.");
    } finally {
      state.isLoading = false;
    }
  },

  async enviarBilhete(payload) {
    if (!_isMounted || state.isLoading) return;
    state.isLoading = true;
    const btn = UI.el("btn-enviar-bilhete");
    setBtnLoading(btn, true, "Enviar Bilhete");
    try {
      const bilheteRef = push(ref(db, "bilhetes"));
      const bilhete = {
        ...payload,
        professorId: state.professor.uid,
        remetenteUid: state.professor.uid,
        remetenteNome: state.professor.nome ?? "Professor",
        timestamp: Date.now(),
        status: "enviado",
      };
      await set(bilheteRef, bilhete);

      // Fan-out via notifications.js
      if (payload.destinatario === "turma" && payload.turmaId) {
        const alunosSnap = await get(
          query(
            ref(db, "alunos"),
            orderByChild("turmaId"),
            equalTo(payload.turmaId),
          ),
        );
        if (alunosSnap.exists()) {
          const alunoIds = Object.keys(alunosSnap.val());
          const responsaveis = await getResponsaveisUids(alunoIds);
          if (responsaveis.length) {
            await notificarBilhete({
              destinatarios: responsaveis,
              titulo: payload.assunto,
              conteudo: payload.mensagem,
            });
          }
        }
      }

      state.bilhetes.set(bilheteRef.key, { id: bilheteRef.key, ...bilhete });
      showToast("Bilhete enviado com sucesso!", "success");
      window.closeModal("modal-novo");
      UI.renderBilhetes();
    } catch (err) {
      handleFirebaseError(err, "Erro ao enviar bilhete.");
    } finally {
      state.isLoading = false;
      setBtnLoading(btn, false, "Enviar Bilhete");
    }
  },

  async marcarLido(bilheteId) {
    try {
      await update(ref(db, `bilhetes/${bilheteId}`), { status: "lido" });
    } catch {
      /* silencioso */
    }
  },
};

// ── Globals ───────────────────────────────────────────────────────────────────

window.verBilhete = async (id) => {
  const b = state.bilhetes.get(id);
  if (!b) return;
  if (UI.el("modal-assunto")) UI.el("modal-assunto").textContent = b.assunto;
  const conteudo = UI.el("modal-conteudo");
  if (conteudo) {
    conteudo.innerHTML = `
      <div style="margin-bottom:1.5rem;font-size:.85rem;color:var(--text-tertiary)">
        <div><strong>Para:</strong> ${sanitizeHTML(b.turmaId || "Aluno")}</div>
        <div><strong>Data:</strong> ${UI.formatDate(b.timestamp)}</div>
      </div>
      <div style="font-size:1rem;line-height:1.6;white-space:pre-wrap">${sanitizeHTML(b.mensagem)}</div>
      ${b.anexo ? `<div style="margin-top:1.5rem;padding:1rem;background:#0f172a;border-radius:.5rem;border:1px solid #334155">📎 Anexo: ${sanitizeHTML(b.anexo)}</div>` : ""}`;
  }
  document.getElementById("modal-visualizar")?.classList.add("active");
  document.body.style.overflow = "hidden";
  if (b.status !== "lido") {
    b.status = "lido";
    await FirebaseService.marcarLido(id);
    UI.renderBilhetes();
  }
};

window.closeModal = (id) => {
  document.getElementById(id)?.classList.remove("active");
  document.body.style.overflow = "";
};

// ── Listeners ─────────────────────────────────────────────────────────────────

UI.el("btn-novo-bilhete")?.addEventListener("click", () => {
  ["input-assunto", "input-mensagem"].forEach((id) => {
    if (UI.el(id)) UI.el(id).value = "";
  });
  if (UI.el("input-urgente")) UI.el("input-urgente").checked = false;
  if (UI.el("file-preview")) UI.el("file-preview").innerHTML = "";
  state.currentAnexo = null;
  document.getElementById("modal-novo")?.classList.add("active");
  document.body.style.overflow = "hidden";
});

UI.el("input-mensagem")?.addEventListener("input", (e) => {
  const el = UI.el("char-count");
  if (el) el.textContent = e.target.value.length;
});

UI.el("input-destinatario")?.addEventListener("change", (e) => {
  const grp = UI.el("turma-select-group");
  if (grp) grp.style.display = e.target.value === "turma" ? "block" : "none";
});

UI.el("input-anexo")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const preview = UI.el("file-preview");
  if (preview)
    preview.innerHTML = `<div style="font-size:.8rem;margin-top:.5rem">📎 ${sanitizeHTML(file.name)} (${(file.size / 1024).toFixed(1)} KB)</div>`;
  state.currentAnexo = file.name;
});

UI.el("btn-enviar-bilhete")?.addEventListener("click", () => {
  const assunto = UI.el("input-assunto")?.value.trim() ?? "";
  const mensagem = UI.el("input-mensagem")?.value.trim() ?? "";
  const destinatario = UI.el("input-destinatario")?.value ?? "";
  const turmaId = UI.el("input-turma")?.value ?? "";
  const urgente = UI.el("input-urgente")?.checked ?? false;
  if (!assunto || !mensagem || !destinatario) {
    showToast("Preencha todos os campos obrigatórios.", "error");
    return;
  }
  FirebaseService.enviarBilhete({
    assunto,
    mensagem,
    destinatario,
    turmaId: destinatario === "turma" ? turmaId : null,
    urgente,
    anexo: state.currentAnexo,
  });
});

["filter-turma", "filter-status"].forEach((id) => {
  UI.el(id)?.addEventListener("change", (e) => {
    state.filters[id.replace("filter-", "")] = e.target.value;
    UI.renderBilhetes();
  });
});

UI.el("search-bilhetes")?.addEventListener("input", (e) => {
  state.filters.search = e.target.value;
  UI.renderBilhetes();
});

// ESC fecha modais
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["modal-novo", "modal-visualizar"].forEach((id) => {
    if (document.getElementById(id)?.classList.contains("active"))
      window.closeModal(id);
  });
});

// ── Init ───────────────────────────────────────────────────────────────────────

function init() {
  _isMounted = true;
  _authUnsub = onAuthStateChanged(auth, async (user) => {
    if (!_isMounted) return;
    if (!user) {
      window.location.replace("/auth/login.html");
      return;
    }
    try {
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists() || snap.val().role !== "professor") {
        window.location.replace("/auth/login.html");
        return;
      }
      const data = snap.val();
      state.professor.uid = user.uid;
      state.professor.nome = data.nome ?? "Professor";
      state.professor.disciplina = data.disciplina ?? "";
      UI.el("btn-logout")?.addEventListener(
        "click",
        async () => {
          try {
            await signOut(auth);
          } catch {}
          window.location.replace("/auth/login.html");
        },
        { once: true },
      );
      UI.updateHeader();
      await FirebaseService.loadVinculos();
      await FirebaseService.loadBilhetes();
    } catch (err) {
      console.error("bilhetes init:", err?.code ?? err?.message);
    }
  });
}

window.addEventListener(
  "pagehide",
  () => {
    _isMounted = false;
    if (_authUnsub) {
      _authUnsub();
      _authUnsub = null;
    }
  },
  { once: true },
);

document.addEventListener("DOMContentLoaded", init);
