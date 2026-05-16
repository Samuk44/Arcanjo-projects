import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  update,
  push,
  child,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

let professores = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentDiretor = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = ref(db, `usuarios/${user.uid}`);
    const snap = await get(userRef);
    if (
      snap.exists() &&
      snap.val().role === "diretor" &&
      snap.val().status === "ativo"
    ) {
      currentDiretor = user.uid;
      init();
    } else {
      window.location.replace("/auth/status.html");
    }
  } else {
    window.location.replace("/auth/login.html");
  }
});

async function init() {
  await loadData();
  setupListeners();
  render();
}

async function loadData() {
  try {
    const [usersSnap, profsSnap] = await Promise.all([
      get(ref(db, "usuarios")),
      get(ref(db, "professores")),
    ]);

    const users = usersSnap.val() || {};
    const profsInfo = profsSnap.val() || {};

    professores = Object.keys(users)
      .filter((uid) => users[uid].role === "professor")
      .map((uid) => ({
        uid,
        ...users[uid],
        ...(profsInfo[uid] || {}),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    filteredData = [...professores];
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

function render() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageData = filteredData.slice(start, end);

  pageData.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><input type="checkbox" class="select-prof" data-uid="${p.uid}"></td>
            <td><img src="${p.foto || "../../assets/img/default-avatar.svg"}" class="prof-photo" loading="lazy"></td>
            <td>${p.nome}</td>
            <td class="mono">${p.email}</td>
            <td>${(p.disciplinas || []).join(", ")}</td>
            <td><span class="badge badge-${p.status || "pendente"}">${p.status || "pendente"}</span></td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" onclick="verDetalhes('${p.uid}')">👁</button>
                    <button class="btn btn-secondary btn-sm" onclick="toggleStatus('${p.uid}', '${p.status}')">${p.status === "desativado" ? "✅" : "🚫"}</button>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });

  document.getElementById("pagination-info").textContent =
    `${start + 1}-${Math.min(end, filteredData.length)} de ${filteredData.length} professores`;
}

window.verDetalhes = (uid) => {
  const p = professores.find((x) => x.uid === uid);
  const modal = document.getElementById("modal-detalhes");
  const infoGeral = document.getElementById("info-geral");

  infoGeral.innerHTML = `
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 2rem; margin-top: 1rem;">
            <img src="${p.foto || "../../assets/img/default-avatar.svg"}" style="width: 150px; height: 150px; border-radius: 1rem; object-fit: cover;">
            <div>
                <h2 class="Syne">${p.nome}</h2>
                <p class="mono" style="color: var(--text-secondary);">${p.uid}</p>
                <div style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <p><strong>CPF:</strong> ${p.cpf || "---"}</p>
                    <p><strong>Telefone:</strong> ${p.telefone || "---"}</p>
                    <p><strong>Matrícula:</strong> ${p.matricula || "---"}</p>
                    <p><strong>Turnos:</strong> ${(p.turnos || []).join(", ")}</p>
                </div>
            </div>
        </div>
    `;
  modal.classList.add("active");
};

window.toggleStatus = async (uid, currentStatus) => {
  const p = professores.find((x) => x.uid === uid);
  const newStatus = currentStatus === "desativado" ? "ativo" : "desativado";

  if (newStatus === "desativado") {
    const confirmName = prompt(
      `Para desativar, digite o nome do professor: ${p.nome}`,
    );
    if (confirmName !== p.nome) return;
  }

  try {
    const updates = {};
    updates[`usuarios/${uid}/status`] = newStatus;
    updates[`logs/${Date.now()}`] = {
      usuarioId: currentDiretor,
      acao: `professor_${newStatus}`,
      alvo: uid,
      timestamp: Date.now(),
    };

    await update(ref(db), updates);
    await loadData();
    render();
  } catch (err) {
    alert("Erro ao atualizar status.");
  }
};

function setupListeners() {
  document.getElementById("filter-search").oninput = (e) => {
    const val = e.target.value.toLowerCase();
    filteredData = professores.filter(
      (p) =>
        p.nome.toLowerCase().includes(val) ||
        p.email.toLowerCase().includes(val),
    );
    currentPage = 1;
    render();
  };

  document.getElementById("filter-status").onchange = (e) => {
    const val = e.target.value;
    filteredData =
      val === "all"
        ? [...professores]
        : professores.filter((p) => p.status === val);
    currentPage = 1;
    render();
  };

  document.getElementById("btn-export").onclick = () => {
    const csv =
      "Nome,Email,Disciplinas,Status\n" +
      filteredData
        .map(
          (p) =>
            `${p.nome},${p.email},"${(p.disciplinas || []).join(", ")}",${p.status}`,
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `professores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  document.getElementById("close-modal").onclick = () =>
    document.getElementById("modal-detalhes").classList.remove("active");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      document
        .querySelectorAll(".tab-btn, .tab-pane")
        .forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
  });
}

window.addEventListener("pagehide", () => {
  // AbortController logic would go here if implemented
});
