import { auth, rtdb } from "../../../assets/js/firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
  query,
  orderByChild,
  limitToLast,
  equalTo,
  off,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
console.log("professorId:", professorId);
let professorId = null;
let vinculos = [];
let lastKey = null;
let isLoading = false;

const elements = {
  tableBody: document.getElementById("table-body"),
  filterTurma: document.getElementById("filter-turma"),
  filterInicio: document.getElementById("filter-inicio"),
  filterFim: document.getElementById("filter-fim"),
  btnExport: document.getElementById("btn-export"),
  modal: document.getElementById("modal-detalhes"),
  modalBody: document.getElementById("modal-body"),
  closeModal: document.getElementById("close-modal"),
  offlineBanner: document.getElementById("offline-banner"),
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    professorId = user.uid;
    await carregarVinculos();
    init();
  } else {
    window.location.replace("/auth/login.html");
  }
});

async function carregarVinculos() {
  try {
    const snapshot = await get(ref(rtdb, "turmas"));

    vinculos = [];

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const turma = child.val();

        if (turma.professorId === professorId) {
          vinculos.push({
            turmaId: child.key,
            turmaNome: turma.nome,
          });
        }
      });
    }

    elements.filterTurma.innerHTML =
      '<option value="">Selecione a turma</option>';

    vinculos.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.turmaId;
      opt.textContent = v.turmaNome;
      elements.filterTurma.appendChild(opt);
    });

    console.log("Vinculos carregados:", vinculos);
  } catch (err) {
    console.error("Erro ao carregar vínculos:", err);
  }
}
function init() {
  window.addEventListener(
    "online",
    () => (elements.offlineBanner.style.display = "none"),
  );
  window.addEventListener(
    "offline",
    () => (elements.offlineBanner.style.display = "block"),
  );

  carregarChamadas();
  setupListeners();
  setupIntersectionObserver();
}

async function carregarChamadas(append = false) {
  if (isLoading) return;
  isLoading = true;

  try {
    const chamadasRef = ref(rtdb, "chamadas");
    let q = query(
      chamadasRef,
      orderByChild("professorId"),
      equalTo(professorId),
      limitToLast(20),
    );

    const snapshot = await get(q);
    if (snapshot.exists()) {
      const data = [];
      snapshot.forEach((child) => {
        data.unshift({ id: child.key, ...child.val() });
      });
      renderTable(data, append);
    } else if (!append) {
      elements.tableBody.innerHTML =
        '<tr><td colspan="7" style="text-align:center">Nenhuma chamada encontrada.</td></tr>';
    }
  } catch (err) {
    console.error("Erro ao carregar chamadas:", err);
  } finally {
    isLoading = false;
  }
}

function renderTable(chamadas, append) {
  if (!append) elements.tableBody.innerHTML = "";

  chamadas.forEach((c) => {
    const tr = document.createElement("tr");
    const perc = (c.presencas / (c.presencas + c.faltas)) * 100 || 0;

    const tdData = document.createElement("td");
    tdData.className = "mono";
    tdData.textContent = new Date(c.timestamp).toLocaleDateString();

    const tdTurma = document.createElement("td");
    tdTurma.textContent = c.turmaNome;

    const tdDisc = document.createElement("td");
    tdDisc.textContent = c.disciplina;

    const tdPres = document.createElement("td");
    tdPres.textContent = c.presencas;

    const tdFaltas = document.createElement("td");
    tdFaltas.textContent = c.faltas;

    const tdPerc = document.createElement("td");
    tdPerc.className = "mono";
    tdPerc.textContent = `${perc.toFixed(1)}%`;

    const tdAcoes = document.createElement("td");
    const btnVer = document.createElement("button");
    btnVer.className = "btn btn-secondary";
    btnVer.textContent = "👁 Ver";
    btnVer.onclick = () => abrirDetalhes(c);
    tdAcoes.appendChild(btnVer);

    tr.append(tdData, tdTurma, tdDisc, tdPres, tdFaltas, tdPerc, tdAcoes);
    elements.tableBody.appendChild(tr);
  });
}

async function abrirDetalhes(chamada) {
  elements.modalBody.innerHTML = "<p>Carregando detalhes...</p>";
  elements.modal.classList.add("active");

  const html = `
        <div style="margin-bottom: 1.5rem;">
            <p><strong>Data:</strong> <span class="mono">${new Date(chamada.timestamp).toLocaleString()}</span></p>
            <p><strong>Turma:</strong> ${chamada.turmaNome}</p>
            <p><strong>Disciplina:</strong> ${chamada.disciplina}</p>
        </div>
        <table class="history-table">
            <thead>
                <tr><th>Aluno</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${chamada.alunos
                  .map(
                    (a) => `
                    <tr>
                        <td>${a.nome}</td>
                        <td><span class="status-pill ${a.presente ? "pill-success" : "pill-danger"}">${a.presente ? "P" : "F"}</span></td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>
    `;
  elements.modalBody.innerHTML = html;
}

function setupListeners() {
  elements.closeModal.onclick = () => elements.modal.classList.remove("active");
  elements.btnExport.onclick = () => window.print();

  const filterHandler = () => carregarChamadas();
  elements.filterTurma.onchange = filterHandler;
  elements.filterInicio.onchange = filterHandler;
  elements.filterFim.onchange = filterHandler;
}

function setupIntersectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoading) {
        // Lógica de paginação real usaria o lastKey
      }
    },
    { threshold: 1.0 },
  );
  observer.observe(document.getElementById("sentinel"));
}

window.addEventListener("pagehide", () => {
  off(ref(rtdb, "chamadas"));
});

[
  document.getElementById("filter-inicio"),
  document.getElementById("filter-fim"),
].forEach(function (el) {
  if (!el) return;
  el.addEventListener("keydown", function (e) {
    if (
      ![
        "Tab",
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(e.key) &&
      !/\d/.test(e.key)
    )
      e.preventDefault();
  });
  el.addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5);
    this.value = v;
  });
  el.addEventListener("blur", function () {
    this.classList.toggle(
      "border-red-500",
      !!this.value && !/^\d{2}\/\d{2}\/\d{4}$/.test(this.value),
    );
  });
});
