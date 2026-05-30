import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBkR0V-3mfPQ_5x7K9R0V-3mfPQ_5x7K9",
  authDomain: "sge-2024.firebaseapp.com",
  databaseURL: "https://sge-2024-default-rtdb.firebaseio.com",
  projectId: "sge-2024",
  storageBucket: "sge-2024.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const state = {
  uid: null,
  responsavel: null,
  filhos: [],
  filhoSelecionado: null,
  notificacoes: 0,
};

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast px-5 py-3 rounded-2xl text-sm font-medium pointer-events-auto shadow-lg text-white ${
    type === "success"
      ? "bg-emerald-500"
      : type === "error"
        ? "bg-red-500"
        : "bg-blue-500"
  }`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function authGuard() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "../auth/login.html";
        resolve(false);
        return;
      }

      try {
        const responsavelRef = ref(db, `responsaveis/${user.uid}`);
        const snapshot = await get(responsavelRef);

        if (!snapshot.exists()) {
          showToast("Dados do responsável não encontrados", "error");
          setTimeout(() => (window.location.href = "../auth/login.html"), 2000);
          resolve(false);
          return;
        }

        const data = snapshot.val();
        if (data.role !== "pai" && data.role !== "responsavel") {
          showToast("Acesso restrito a responsáveis", "error");
          setTimeout(() => (window.location.href = "../auth/login.html"), 2000);
          resolve(false);
          return;
        }

        if (data.status !== "ativo") {
          showToast("Sua conta está inativa", "error");
          setTimeout(() => (window.location.href = "../auth/login.html"), 2000);
          resolve(false);
          return;
        }

        state.uid = user.uid;
        state.responsavel = data;
        state.filhos = data.filhos || [];

        document.getElementById("topbar-greeting").textContent = `Olá, ${data.nome?.split(" ")[0] || "Responsável"}`;

        resolve(true);
      } catch (error) {
        console.error("Auth error:", error);
        showToast("Erro na autenticação", "error");
        resolve(false);
      }
    });
  });
}

async function loadFilhos() {
  if (!state.filhos.length) {
    document.getElementById("empty-state").classList.remove("hidden");
    document.getElementById("kpis-container").innerHTML = "";
    document.getElementById("acoes-container").innerHTML = "";
    document.getElementById("feed-container").innerHTML = "";
    return;
  }

  const selectElement = document.getElementById("select-filho");
  selectElement.innerHTML = "";

  for (const filhoId of state.filhos) {
    try {
      const alunoRef = ref(db, `alunos/${filhoId}`);
      const snapshot = await get(alunoRef);

      if (snapshot.exists()) {
        const aluno = snapshot.val();
        const option = document.createElement("option");
        option.value = filhoId;
        option.textContent = aluno.nome || `Aluno ${filhoId}`;
        selectElement.appendChild(option);
      }
    } catch (error) {
      console.error(`Erro ao carregar aluno ${filhoId}:`, error);
    }
  }

  if (selectElement.options.length > 0) {
    selectElement.value = selectElement.options[0].value;
    state.filhoSelecionado = selectElement.value;
    await loadFilhoData();
  }
}

async function loadFilhoData() {
  if (!state.filhoSelecionado) return;

  try {
    const alunoRef = ref(db, `alunos/${state.filhoSelecionado}`);
    const snapshot = await get(alunoRef);

    if (!snapshot.exists()) {
      showToast("Dados do aluno não encontrados", "error");
      return;
    }

    const aluno = snapshot.val();
    renderKPIs(aluno);
    renderAcoes(aluno);
    await renderFeed(aluno);
  } catch (error) {
    console.error("Erro ao carregar dados do filho:", error);
    showToast("Erro ao carregar dados", "error");
  }
}

function renderKPIs(aluno) {
  const container = document.getElementById("kpis-container");
  container.innerHTML = "";

  const kpis = [
    {
      label: "Frequência",
      valor: `${aluno.frequencia || 0}%`,
      badge:
        (aluno.frequencia || 0) >= 80
          ? "badge-success"
          : (aluno.frequencia || 0) >= 70
            ? "badge-warning"
            : "badge-error",
      icon: "📊",
    },
    {
      label: "Média Geral",
      valor: (aluno.mediaGeral || 0).toFixed(1),
      badge:
        (aluno.mediaGeral || 0) >= 7
          ? "badge-success"
          : (aluno.mediaGeral || 0) >= 5
            ? "badge-warning"
            : "badge-error",
      icon: "📈",
    },
    {
      label: "Turma",
      valor: aluno.turma || "—",
      badge: "badge-info",
      icon: "👥",
    },
    {
      label: "Comunicados",
      valor: aluno.comunicadosNaoLidos || "0",
      badge: (aluno.comunicadosNaoLidos || 0) > 0 ? "badge-warning" : "badge-info",
      icon: "💌",
    },
  ];

  kpis.forEach((kpi) => {
    const card = document.createElement("div");
    card.className =
      "bg-surface rounded-2xl border border-border shadow-card p-5 hover:shadow-lg hover:border-blue-200 transition-all";
    card.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <span class="text-2xl">${kpi.icon}</span>
        <span class="px-2 py-1 rounded-lg text-xs font-bold ${kpi.badge}">${kpi.label}</span>
      </div>
      <p class="text-3xl font-bold text-text">${kpi.valor}</p>
    `;
    container.appendChild(card);
  });
}

function renderAcoes(aluno) {
  const container = document.getElementById("acoes-container");
  container.innerHTML = "";

  const acoes = [
    {
      label: "Ver Boletim",
      icon: "📋",
      href: "boletim.html",
      color: "text-blue-500",
    },
    {
      label: "Consultar Horário",
      icon: "🕒",
      href: "horario.html",
      color: "text-purple-500",
    },
    {
      label: "Falar com Professor",
      icon: "💬",
      href: "comunicados.html",
      color: "text-green-500",
    },
    {
      label: "2ª Via Boleto",
      icon: "🧾",
      href: "financeiro.html",
      color: "text-orange-500",
    },
  ];

  acoes.forEach((acao) => {
    const btn = document.createElement("a");
    btn.href = acao.href;
    btn.className =
      "bg-surface rounded-2xl border border-border shadow-card p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer text-center";
    btn.innerHTML = `
      <div class="text-3xl mb-2">${acao.icon}</div>
      <p class="text-sm font-medium text-text">${acao.label}</p>
    `;
    container.appendChild(btn);
  });
}

async function renderFeed(aluno) {
  const container = document.getElementById("feed-container");
  container.innerHTML = "";

  const feedItems = [];

  if (aluno.ultimasNotas && aluno.ultimasNotas.length > 0) {
    aluno.ultimasNotas.slice(0, 2).forEach((nota) => {
      feedItems.push({
        tipo: "nota",
        titulo: `Nova nota em ${nota.materia}`,
        descricao: `Nota: ${nota.valor} - ${nota.data}`,
        icon: "📝",
        badge: "badge-info",
      });
    });
  }

  if (aluno.faltasRecentes && aluno.faltasRecentes.length > 0) {
    aluno.faltasRecentes.slice(0, 1).forEach((falta) => {
      feedItems.push({
        tipo: "falta",
        titulo: `Falta registrada em ${falta.materia}`,
        descricao: `Data: ${falta.data}`,
        icon: "❌",
        badge: "badge-warning",
      });
    });
  }

  if (aluno.comunicadosNaoLidos && aluno.comunicadosNaoLidos > 0) {
    feedItems.push({
      tipo: "comunicado",
      titulo: "Novos comunicados da escola",
      descricao: `Você tem ${aluno.comunicadosNaoLidos} comunicados não lidos`,
      icon: "📢",
      badge: "badge-warning",
    });
  }

  if (aluno.proximasAvaliacoes && aluno.proximasAvaliacoes.length > 0) {
    aluno.proximasAvaliacoes.slice(0, 1).forEach((av) => {
      feedItems.push({
        tipo: "avaliacao",
        titulo: `Próxima avaliação: ${av.materia}`,
        descricao: `Data: ${av.data}`,
        icon: "📅",
        badge: "badge-info",
      });
    });
  }

  if (feedItems.length === 0) {
    container.innerHTML =
      '<div class="p-6 text-center text-sm text-muted">Nenhuma atualização recente</div>';
    return;
  }

  feedItems.forEach((item) => {
    const feedItem = document.createElement("div");
    feedItem.className =
      "feed-item flex items-start gap-4 p-4 border-b border-border last:border-0 hover:bg-blue-50 transition-colors";
    feedItem.innerHTML = `
      <div class="text-2xl">${item.icon}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-text">${item.titulo}</p>
        <p class="text-xs text-muted mt-1">${item.descricao}</p>
      </div>
      <span class="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${item.badge}">${item.tipo === "nota" ? "Nota" : item.tipo === "falta" ? "Falta" : item.tipo === "comunicado" ? "Comunicado" : "Avaliação"}</span>
    `;
    container.appendChild(feedItem);
  });
}

async function initApp() {
  const isAuth = await authGuard();
  if (!isAuth) return;

  await loadFilhos();

  document
    .getElementById("select-filho")
    .addEventListener("change", async (e) => {
      state.filhoSelecionado = e.target.value;
      if (state.filhoSelecionado) {
        await loadFilhoData();
      }
    });

  document.getElementById("btn-notificacoes").addEventListener("click", () => {
    showToast("Você não possui notificações pendentes", "info");
  });
}

initApp();
