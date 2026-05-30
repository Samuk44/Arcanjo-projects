import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const state = {
  uid: null,
  responsavel: null,
  filhos: [],
  filhoSelecionado: null,
};
const selectors = {
  greeting: document.getElementById("userGreeting"),
  avatar: document.getElementById("userAvatar"),
  statusMessage: document.getElementById("statusMessage"),
  kpiContainer: document.getElementById("kpi-container"),
  quickActions: document.getElementById("quick-actions"),
  recentList: document.getElementById("recent-list"),
  selectFilho: document.getElementById("selectFilho"),
  logoutButtons: Array.from(
    document.querySelectorAll("#logoutButton, #sidebarLogout"),
  ),
};

const toArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
};
const showToast = (msg, type = "success") => {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast px-5 py-3 rounded-2xl text-sm font-medium pointer-events-auto shadow-lg text-white ${type === "success" ? "bg-success" : type === "error" ? "bg-danger" : "bg-primary"}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
};

const authGuard = () =>
  new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "../auth/login.html";
        resolve(false);
        return;
      }
      try {
        const snap = await get(ref(db, `usuarios/${user.uid}`));
        if (
          !snap.exists() ||
          (snap.val().role !== "responsavel" && snap.val().role !== "pai") ||
          snap.val().status !== "ativo"
        ) {
          await signOut(auth);
          window.location.href = "../auth/login.html";
          resolve(false);
          return;
        }
        state.uid = user.uid;
        state.responsavel = snap.val();
        state.filhos = toArray(snap.val().filhos);
        if (selectors.greeting)
          selectors.greeting.textContent =
            state.responsavel.nome?.split(" ")[0] ?? "Responsável";
        if (selectors.avatar)
          selectors.avatar.textContent = (
            state.responsavel.nome?.[0] ?? "R"
          ).toUpperCase();
        resolve(true);
      } catch {
        showToast("Erro na autenticação", "error");
        resolve(false);
      }
    });
  });

const loadFilhos = async () => {
  if (!state.filhos.length) {
    document.getElementById("empty-state")?.classList.remove("hidden");
    return;
  }
  selectors.selectFilho.innerHTML = "";
  for (const id of state.filhos) {
    try {
      const snap = await get(ref(db, `alunos/${id}`));
      if (snap.exists()) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = snap.val().nome ?? `Aluno ${id}`;
        selectors.selectFilho.appendChild(opt);
      }
    } catch {}
  }
  if (selectors.selectFilho.options.length) {
    selectors.selectFilho.value = selectors.selectFilho.options[0].value;
    state.filhoSelecionado = selectors.selectFilho.value;
    await loadFilhoData();
  }
};

const loadFilhoData = async () => {
  if (!state.filhoSelecionado) return;
  try {
    const snap = await get(ref(db, `alunos/${state.filhoSelecionado}`));
    if (!snap.exists()) {
      showToast("Dados não encontrados", "error");
      return;
    }
    const aluno = snap.val();
    renderKPIs(aluno);
    renderAcoes(aluno);
    await renderFeed(aluno);
  } catch {
    showToast("Erro ao carregar", "error");
  }
};

const renderKPIs = (aluno) => {
  selectors.kpiContainer.innerHTML = "";
  const kpis = [
    {
      label: "Frequência",
      valor: `${aluno.frequencia ?? 0}%`,
      badge:
        (aluno.frequencia ?? 0) >= 80
          ? "badge-success"
          : (aluno.frequencia ?? 0) >= 70
            ? "badge-warning"
            : "badge-error",
      icon: "📊",
    },
    {
      label: "Média",
      valor: Number(aluno.mediaGeral ?? 0).toFixed(1),
      badge:
        (aluno.mediaGeral ?? 0) >= 7
          ? "badge-success"
          : (aluno.mediaGeral ?? 0) >= 5
            ? "badge-warning"
            : "badge-error",
      icon: "📈",
    },
    {
      label: "Turma",
      valor: aluno.turma ?? "—",
      badge: "badge-info",
      icon: "👥",
    },
    {
      label: "Avisos",
      valor: aluno.comunicadosNaoLidos ?? "0",
      badge:
        (aluno.comunicadosNaoLidos ?? 0) > 0 ? "badge-warning" : "badge-info",
      icon: "💌",
    },
  ];
  kpis.forEach((k) => {
    const card = document.createElement("div");
    card.className =
      "bg-surface rounded-2xl border border-border shadow-card p-5 hover:shadow-lg hover:border-blue-200 transition-all";
    card.innerHTML = `<div class="flex items-start justify-between mb-3"><span class="text-2xl">${k.icon}</span><span class="px-2 py-1 rounded-lg text-xs font-bold ${k.badge}">${k.label}</span></div><p class="text-3xl font-bold text-text">${k.valor}</p>`;
    selectors.kpiContainer.appendChild(card);
  });
};

const renderAcoes = () => {
  selectors.quickActions.innerHTML = "";
  const acoes = [
    {
      label: "Ver Boletim",
      icon: "📋",
      href: "boletim.html",
      color: "text-blue-400",
    },
    {
      label: "Consultar Horário",
      icon: "🕒",
      href: "horario.html",
      color: "text-purple-400",
    },
    {
      label: "Falar com Professor",
      icon: "💬",
      href: "comunicados.html",
      color: "text-green-400",
    },
    {
      label: "2ª Via Boleto",
      icon: "🧾",
      href: "financeiro.html",
      color: "text-orange-400",
    },
  ];
  acoes.forEach((a) => {
    const btn = document.createElement("a");
    btn.href = a.href;
    btn.className =
      "bg-surface rounded-2xl border border-border shadow-card p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer text-center";
    btn.innerHTML = `<div class="text-3xl mb-2">${a.icon}</div><p class="text-sm font-medium text-text">${a.label}</p>`;
    selectors.quickActions.appendChild(btn);
  });
};

const renderFeed = async (aluno) => {
  selectors.recentList.innerHTML = "";
  const items = [];
  const notas = toArray(aluno.ultimasNotas);
  const faltas = toArray(aluno.faltasRecentes);
  const provas = toArray(aluno.proximasAvaliacoes);
  if (notas.length)
    notas
      .slice(0, 2)
      .forEach((n) =>
        items.push({
          tipo: "Nota",
          titulo: `Nova nota em ${n.materia}`,
          desc: `Nota: ${n.valor}`,
          icon: "📝",
          badge: "badge-info",
        }),
      );
  if (faltas.length)
    faltas
      .slice(0, 1)
      .forEach((f) =>
        items.push({
          tipo: "Falta",
          titulo: `Falta em ${f.materia}`,
          desc: `Data: ${f.data}`,
          icon: "❌",
          badge: "badge-warning",
        }),
      );
  if (aluno.comunicadosNaoLidos > 0)
    items.push({
      tipo: "Comunicado",
      titulo: "Novos comunicados",
      desc: `${aluno.comunicadosNaoLidos} não lidos`,
      icon: "📢",
      badge: "badge-warning",
    });
  if (provas.length)
    provas
      .slice(0, 1)
      .forEach((p) =>
        items.push({
          tipo: "Prova",
          titulo: `Próxima: ${p.materia}`,
          desc: `Data: ${p.data}`,
          icon: "📅",
          badge: "badge-info",
        }),
      );
  if (!items.length) {
    selectors.recentList.innerHTML = `<tr class="bg-[#1e293b]"><td colspan="4" class="px-4 py-5 text-sm text-muted">Nenhuma atualização recente</td></tr>`;
    return;
  }
  items.forEach((i) => {
    const row = document.createElement("tr");
    row.className = "bg-[#1e293b] hover:bg-blue-600/10 transition-fast";
    row.innerHTML = `<td class="px-4 py-4 text-sm text-text font-medium">${i.titulo}</td><td class="px-4 py-4 text-sm text-muted">${i.tipo}</td><td class="px-4 py-4 text-sm text-muted">${i.desc}</td><td class="px-4 py-4"><span class="px-2.5 py-1 rounded-lg text-xs font-bold ${i.badge}">${i.tipo}</span></td>`;
    selectors.recentList.appendChild(row);
  });
};

const setupLogout = () =>
  selectors.logoutButtons.forEach((btn) =>
    btn?.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch {
      } finally {
        location.replace("../auth/login.html");
      }
    }),
  );

const init = async () => {
  if (!(await authGuard())) return;
  await loadFilhos();
  selectors.selectFilho?.addEventListener("change", async (e) => {
    state.filhoSelecionado = e.target.value;
    if (state.filhoSelecionado) await loadFilhoData();
  });
  setupLogout();
  if (selectors.statusMessage) selectors.statusMessage.classList.add("hidden");
};

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", () => {
  /* cleanup listeners if needed */
});
