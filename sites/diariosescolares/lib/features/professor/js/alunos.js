"use strict";

import { auth, db } from "../../../../assets/js/firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref, get,
  query, orderByChild, equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _authUnsub = null;

const state = {
  professor: { uid: null, nome: null, disciplina: null, role: null, status: null },
  turmas: [],   // [{ id, nome }]
  alunos: [],   // [{ uid, nome, frequencia, ultimaFalta, media }]
  turmaId: "",
  isLoading: false,
  sortConfig: { key: "nome", direction: "asc" },
  debounceTimeout: null,
};

// ── UI helpers ─────────────────────────────────────────────────────────────────

const UI = {
  showToast: (message, type = "success") => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${type === "success" ? "✅" : "⚠️"}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },

  sanitize: (text) => {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
  },

  renderAlunos: () => {
    const tbody = document.getElementById("tabela-alunos");
    if (!tbody) return;
    const search = (document.getElementById("search-alunos")?.value ?? "").toLowerCase();
    let filtered = state.alunos.filter((a) => a.nome.toLowerCase().includes(search));

    filtered.sort((a, b) => {
      const vA = a[state.sortConfig.key] ?? "";
      const vB = b[state.sortConfig.key] ?? "";
      if (vA < vB) return state.sortConfig.direction === "asc" ? -1 : 1;
      if (vA > vB) return state.sortConfig.direction === "asc" ?  1 : -1;
      return 0;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem">Nenhum aluno encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((aluno) => {
      const freq = aluno.frequencia ?? 0;
      const freqClass  = freq > 75 ? "" : freq > 60 ? "warning" : "danger";
      const statusClass = freq > 75 ? "status-ok" : freq > 60 ? "status-atencao" : "status-critico";
      const statusText  = freq > 75 ? "Regular" : freq > 60 ? "Atenção" : "Risco";
      return `
        <tr>
          <td><span class="aluno-nome" onclick="verDetalhes('${aluno.uid}')">${UI.sanitize(aluno.nome)}</span></td>
          <td>
            <div class="freq-bar-container">
              <div class="freq-bar">
                <div class="freq-bar-fill ${freqClass}" style="width:${freq}%"></div>
              </div>
              <span class="freq-percent">${freq}%</span>
            </div>
          </td>
          <td style="font-family:'DM Mono',monospace">${UI.sanitize(aluno.ultimaFalta || "—")}</td>
          <td style="font-family:'DM Mono',monospace;font-weight:700">${Number(aluno.media ?? 0).toFixed(1)}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>
            <button class="action-btn" onclick="prepararBilhete('${aluno.uid}')" title="Enviar bilhete">📩</button>
          </td>
        </tr>`;
    }).join("");
  },

  updateHeader: () => {
    const el = (id) => document.getElementById(id);
    if (el("user-name"))       el("user-name").textContent       = state.professor.nome ?? "Professor";
    if (el("user-discipline")) el("user-discipline").textContent = state.professor.disciplina ?? "Professor";
    if (el("user-initials")) {
      const initials = (state.professor.nome ?? "P")
        .split(" ").map((n) => n[0] ?? "").join("").substring(0, 2).toUpperCase();
      el("user-initials").textContent = initials || "P";
    }
  },
};

// ── Firebase ───────────────────────────────────────────────────────────────────

const FirebaseService = {
  // Busca turmas reais do professor no banco
  loadTurmas: async () => {
    const snap = await get(ref(db, "turmas"));
    state.turmas = [];
    if (snap.exists()) {
      snap.forEach((child) => {
        const turma = child.val();
        if (turma.professorId === state.professor.uid) {
          state.turmas.push({ id: child.key, nome: turma.nome ?? child.key });
        }
      });
    }
    const select = document.getElementById("select-turma");
    if (!select) return;
    select.innerHTML =
      '<option value="">Selecione a turma</option>' +
      state.turmas.map((t) => `<option value="${t.id}">${t.nome}</option>`).join("");
  },

  // Carrega alunos da turma e calcula frequência real e média real de notas
  loadDadosTurma: async (turmaId) => {
    if (state.isLoading) return;
    state.isLoading = true;

    try {
      // 1. Alunos da turma
      const alunosSnap = await get(
        query(ref(db, "alunos"), orderByChild("turmaId"), equalTo(turmaId)),
      );
      const alunosBase = [];
      if (alunosSnap.exists()) {
        alunosSnap.forEach((child) => {
          alunosBase.push({ uid: child.key, nome: child.val().nome ?? child.key, matricula: child.val().matricula });
        });
      }

      if (!alunosBase.length) {
        state.alunos = [];
        UI.renderAlunos();
        return;
      }

      // 2. Chamadas deste professor nesta turma (para calcular frequência real)
      const chamadasSnap = await get(
        query(ref(db, "chamadas"), orderByChild("turmaId"), equalTo(turmaId)),
      );

      // presencas[uid] = { total, presentes, ultimaFaltaISO, ultimaFaltaFmt }
      const presencas = {};
      if (chamadasSnap.exists()) {
        chamadasSnap.forEach((child) => {
          const c = child.val();
          if (c.professorId !== state.professor.uid) return; // só deste professor
          if (!Array.isArray(c.alunos)) return;
          c.alunos.forEach((a) => {
            if (!presencas[a.uid]) presencas[a.uid] = { total: 0, presentes: 0, ultimaFaltaISO: "", ultimaFaltaFmt: "" };
            presencas[a.uid].total++;
            if (a.presente || a.status === "P") {
              presencas[a.uid].presentes++;
            } else {
              const iso = c.data ?? "";
              if (iso > presencas[a.uid].ultimaFaltaISO) {
                presencas[a.uid].ultimaFaltaISO = iso;
                presencas[a.uid].ultimaFaltaFmt = iso
                  ? new Intl.DateTimeFormat("pt-BR").format(new Date(iso + "T12:00:00"))
                  : "";
              }
            }
          });
        });
      }

      // 3. Notas desta turma (para calcular média real)
      const notasSnap = await get(
        query(ref(db, "notas"), orderByChild("turmaId"), equalTo(turmaId)),
      );
      // medias[uid] = { soma, count }
      const medias = {};
      if (notasSnap.exists()) {
        notasSnap.forEach((child) => {
          const n = child.val();
          if (!n.alunoId) return;
          if (!medias[n.alunoId]) medias[n.alunoId] = { soma: 0, count: 0 };
          medias[n.alunoId].soma += Number(n.valor ?? 0);
          medias[n.alunoId].count++;
        });
      }

      // 4. Merge
      state.alunos = alunosBase.map((aluno) => {
        const p = presencas[aluno.uid] ?? { total: 0, presentes: 0, ultimaFaltaFmt: "" };
        const m = medias[aluno.uid]    ?? { soma: 0, count: 0 };
        const freq  = p.total > 0 ? Math.round((p.presentes / p.total) * 100) : 100;
        const media = m.count  > 0 ? m.soma / m.count : 0;
        return {
          ...aluno,
          frequencia:   freq,
          ultimaFalta:  p.ultimaFaltaFmt || "—",
          media,
        };
      });

      state.alunos.sort((a, b) => a.nome.localeCompare(b.nome));
      UI.renderAlunos();
    } catch (error) {
      console.error("loadDadosTurma:", error);
      UI.showToast("Erro ao carregar dados dos alunos.", "error");
    } finally {
      state.isLoading = false;
    }
  },
};

// ── Globals expostos para onclick inline ───────────────────────────────────────

window.sortTable = (key) => {
  if (state.sortConfig.key === key) {
    state.sortConfig.direction = state.sortConfig.direction === "asc" ? "desc" : "asc";
  } else {
    state.sortConfig.key = key;
    state.sortConfig.direction = "asc";
  }
  document.querySelectorAll("th").forEach((th) => th.setAttribute("aria-sort", "none"));
  const currentTh = Array.from(document.querySelectorAll("th")).find((th) =>
    th.textContent.toLowerCase().includes(key),
  );
  if (currentTh) currentTh.setAttribute("aria-sort", state.sortConfig.direction === "asc" ? "ascending" : "descending");
  UI.renderAlunos();
};

window.verDetalhes = (uid) => {
  const aluno = state.alunos.find((a) => a.uid === uid);
  if (!aluno) return;
  const el = (id) => document.getElementById(id);
  if (el("modal-nome")) el("modal-nome").textContent = aluno.nome;
  const conteudo = el("modal-conteudo");
  if (conteudo) {
    conteudo.innerHTML = `
      <div class="detail-section">
        <div class="detail-title">Métricas de Desempenho</div>
        <div class="detail-item">
          <span class="detail-label">Frequência Geral</span>
          <span class="detail-value" style="color:${aluno.frequencia > 75 ? "var(--success)" : "var(--danger)"}">${aluno.frequencia}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Média das Notas</span>
          <span class="detail-value">${Number(aluno.media ?? 0).toFixed(1)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Última Falta</span>
          <span class="detail-value">${aluno.ultimaFalta || "—"}</span>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-title">Informações Acadêmicas</div>
        <div class="detail-item">
          <span class="detail-label">Matrícula</span>
          <span class="detail-value">${aluno.matricula || aluno.uid}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Turma</span>
          <span class="detail-value">${state.turmaId}</span>
        </div>
      </div>`;
  }
  const btnBilhete = el("btn-enviar-bilhete");
  if (btnBilhete) btnBilhete.onclick = () => prepararBilhete(uid);
  openModal("modal-detalhes");
};

window.prepararBilhete = (uid) => {
  const aluno = state.alunos.find((a) => a.uid === uid);
  if (!aluno) return;
  UI.showToast(`Preparando bilhete para ${aluno.nome}...`, "success");
  setTimeout(() => { window.location.href = `bilhetes.html?aluno=${uid}`; }, 1000);
};

// ── Event listeners ────────────────────────────────────────────────────────────

document.getElementById("select-turma")?.addEventListener("change", (e) => {
  state.turmaId = e.target.value;
  if (state.turmaId) FirebaseService.loadDadosTurma(state.turmaId);
});

document.getElementById("search-alunos")?.addEventListener("input", (e) => {
  clearTimeout(state.debounceTimeout);
  state.debounceTimeout = setTimeout(() => UI.renderAlunos(), 300);
});

function openModal(id) {
  document.getElementById(id)?.classList.add("active");
  document.body.style.overflow = "hidden";
}

window.closeModal = (id) => {
  document.getElementById(id)?.classList.remove("active");
  document.body.style.overflow = "";
};

// ── Init ───────────────────────────────────────────────────────────────────────

async function onReady() {
  UI.updateHeader();
  await FirebaseService.loadTurmas();
}

function init() {
  _authUnsub = onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.replace("/auth/login.html"); return; }
    try {
      const snap = await get(ref(db, `usuarios/${user.uid}`));
      if (!snap.exists() || snap.val().role !== "professor") {
        window.location.replace("/auth/login.html"); return;
      }
      const data = snap.val();
      state.professor.uid        = user.uid;
      state.professor.nome       = data.nome       ?? "Professor";
      state.professor.disciplina = data.disciplina ?? "";
      state.professor.role       = data.role;
      state.professor.status     = data.status;
      document.getElementById("btn-logout")?.addEventListener("click", async () => {
        try { await signOut(auth); } catch {}
        window.location.replace("/auth/login.html");
      }, { once: true });
      await onReady();
    } catch (err) {
      console.error("alunos init:", err);
    }
  });
}

window.addEventListener("pagehide", () => { if (_authUnsub) { _authUnsub(); _authUnsub = null; } }, { once: true });
document.addEventListener("DOMContentLoaded", init);
