import { auth, db } from "../../assets/js/firebase/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let _logoutSetup = false;
const selectors = {
  greeting: document.getElementById("userGreeting"),
  avatar: document.getElementById("userAvatar"),
  statusMessage: document.getElementById("statusMessage"),
  kpiContainer: document.getElementById("kpi-container"),
  quickActions: document.getElementById("quick-actions"),
  recentList: document.getElementById("recent-list"),
  logoutButtons: Array.from(
    document.querySelectorAll("#logoutButton, #sidebarLogout"),
  ),
};

const setStatusMessage = (message, isError = false) => {
  if (!selectors.statusMessage) return;
  selectors.statusMessage.textContent = message;
  selectors.statusMessage.classList.toggle("bg-red-50", isError);
  selectors.statusMessage.classList.toggle("border-red-100", isError);
  selectors.statusMessage.classList.toggle("text-red-700", isError);
  selectors.statusMessage.classList.toggle("bg-blue-50", !isError);
  selectors.statusMessage.classList.toggle("border-blue-100", !isError);
  selectors.statusMessage.classList.toggle("text-blue-700", !isError);
};

const formatDate = (value) => {
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const createCard = (title, value, icon) => {
  return `<div class="rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-soft">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-slate-500">${title}</p>
          <p class="mt-3 text-3xl font-semibold text-slate-900">${value}</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">
          ${icon}
        </div>
      </div>
    </div>`;
};

const renderKpis = ({ professores, pais, alunos, turmas }) => {
  const cards = [
    createCard(
      "Total Professores",
      professores,
      "<span class='text-xl'>👩‍🏫</span>",
    ),
    createCard("Total Pais", pais, "<span class='text-xl'>🧑‍👩‍👦</span>"),
    createCard("Total Alunos", alunos, "<span class='text-xl'>🎒</span>"),
    createCard("Turmas Ativas", turmas, "<span class='text-xl'>🏫</span>"),
  ];
  if (selectors.kpiContainer) selectors.kpiContainer.innerHTML = cards.join("");
};

const renderQuickActions = () => {
  if (!selectors.quickActions) return;
  selectors.quickActions.innerHTML = `
    <a href="../cadastro/professor.html" class="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-blue-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition-fast hover:from-blue-500 hover:to-blue-700">
      + Cadastrar Professor
    </a>
    <a href="../cadastro/pai.html" class="inline-flex items-center justify-center rounded-3xl bg-white border border-[#e2e8f0] px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-fast hover:bg-blue-50">
      + Cadastrar Pai
    </a>
    <a href="turmas.html" class="inline-flex items-center justify-center rounded-3xl bg-white border border-[#e2e8f0] px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-fast hover:bg-blue-50">
      + Criar Turma
    </a>
    <a href="comunicados.html" class="inline-flex items-center justify-center rounded-3xl bg-white border border-[#e2e8f0] px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-fast hover:bg-blue-50">
      📣 Novo Comunicado
    </a>
  `;
};

const renderRecentList = (items) => {
  if (!selectors.recentList) return;
  if (items.length === 0) {
    selectors.recentList.innerHTML = `
      <tr class="bg-white">
        <td colspan="4" class="px-4 py-5 text-sm text-slate-500">Nenhum cadastro recente encontrado.</td>
      </tr>`;
    return;
  }
  selectors.recentList.innerHTML = items
    .map(
      (item) => `
      <tr class="bg-white hover:bg-blue-50 transition-fast">
        <td class="px-4 py-4 text-sm text-slate-800 font-medium">${item.nome}</td>
        <td class="px-4 py-4 text-sm text-slate-600">${item.tipo}</td>
        <td class="px-4 py-4 text-sm text-slate-600">${item.data}</td>
        <td class="px-4 py-4">
          <span class="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">${item.status}</span>
        </td>
      </tr>`,
    )
    .join("");
};

const buildRecentItems = (users) => {
  return users
    .map((user) => ({
      nome: user.nome || user.nomeCompleto || "Sem Nome",
      tipo: user.role === "professor" ? "Professor" : "responsavel",
      data: formatDate(user.criadoEm),
      status: user.status || "ativo",
      criadoEm:
        typeof user.criadoEm === "number"
          ? user.criadoEm
          : Date.parse(user.criadoEm || ""),
    }))
    .sort((a, b) => b.criadoEm - a.criadoEm)
    .slice(0, 6);
};

const setupLogout = () => {
  selectors.logoutButtons.forEach((button) => {
    button?.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error(error);
      } finally {
        location.replace("../auth/login.html");
      }
    });
  });
};

const updateUserProfile = (userData) => {
  const fullName = userData.nome || "Diretor";
  const firstName = fullName.split(" ")[0];
  if (selectors.greeting) selectors.greeting.textContent = fullName;
  if (selectors.avatar)
    selectors.avatar.textContent = firstName.slice(0, 2).toUpperCase();
};

const loadDashboardData = async (diretorData) => {
  const cnpj = diretorData.instituicao?.cnpj || "";
  const usuariosRef = query(
    ref(db, "usuarios"),
    orderByChild("instituicao/cnpj"),
    equalTo(cnpj),
  );
  const usuariosSnap = await get(usuariosRef);
  const usuarios = usuariosSnap.exists() ? Object.values(usuariosSnap.val()) : [];

  const professores = usuarios.filter(
    (user) => user.role === "professor" && user.status === "ativo",
  ).length;
  const pais = usuarios.filter(
    (user) => user.role === "responsavel" && user.status === "ativo",
  ).length;

  const alunosSnap = await get(ref(db, "alunos"));
  const alunos = alunosSnap.exists() ? Object.keys(alunosSnap.val()).length : 0;

  const turmasSnap = await get(ref(db, "turmas"));
  const turmas = turmasSnap.exists()
    ? Object.values(turmasSnap.val()).filter((item) => item?.ativa !== false)
        .length
    : 0;

  renderKpis({ professores, pais, alunos, turmas });
  renderQuickActions();
  renderRecentList(
    buildRecentItems(
      usuarios.filter(
        (user) => user.role === "professor" || user.role === "responsavel",
      ),
    ),
  );
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (selectors.statusMessage) {
      selectors.statusMessage.innerHTML = `Você não está logado. <a href="../auth/login.html" class="font-semibold text-blue-700 underline">Entrar</a>`;
      selectors.statusMessage.classList.add(
        "bg-yellow-50",
        "border-yellow-100",
        "text-yellow-700",
      );
      selectors.statusMessage.classList.remove(
        "bg-blue-50",
        "border-blue-100",
        "text-blue-700",
      );
    }
    return;
  }

  setStatusMessage("Carregando painel...");

  try {
    const diretorRef = ref(db, `usuarios/${user.uid}`);
    const snapshot = await get(diretorRef);

    if (!snapshot.exists()) {
      await signOut(auth);
      location.replace("../auth/login.html");
      return;
    }

    const diretorData = snapshot.val();
    if (diretorData.role !== "diretor" || diretorData.status !== "ativo") {
      await signOut(auth);
      location.replace("../auth/login.html");
      return;
    }

    updateUserProfile(diretorData);
    if (!_logoutSetup) {
      setupLogout();
      _logoutSetup = true;
    }
    await loadDashboardData(diretorData);
    if (selectors.statusMessage) selectors.statusMessage.style.display = "none";
  } catch (error) {
    console.error("Falha ao carregar painel:", error);
    setStatusMessage("Erro ao carregar dados. Recarregue a página.", true);
  }
});
