import { auth, db } from "../../assets/js/firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  limit,
  startAfter,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let lastDoc = null;
let isLoading = false;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userSnap = await getDocs(
      query(
        collection(db, "usuarios"),
        where("uid", "==", user.uid),
        where("role", "==", "diretor"),
      ),
    );
    if (userSnap.empty) window.location.replace("/errors/sem-permissao.html");
    else init();
  } else window.location.replace("/auth/login.html");
});

function init() {
  loadUsuarios();
  setupListeners();
}

async function loadUsuarios(append = false) {
  if (isLoading) return;
  isLoading = true;

  try {
    let q = query(
      collection(db, "usuarios"),
      where("role", "==", "pai"),
      orderBy("nome"),
      limit(20),
    );

    if (append && lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    lastDoc = snap.docs[snap.docs.length - 1];
    renderTable(
      snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      append,
    );
  } catch (err) {
    console.error("Erro ao carregar pais:", err);
  } finally {
    isLoading = false;
  }
}

function renderTable(usuarios, append) {
  const tbody = document.getElementById("table-body");
  if (!append) tbody.innerHTML = "";

  usuarios.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${u.nome}</td>
            <td class="mono">${u.cpf || "---"}</td>
            <td>${u.filhos ? u.filhos.length : 0}</td>
            <td><span class="status-badge ${u.status === "ativo" ? "status-ativo" : "status-inativo"}">${u.status || "ativo"}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="toggleStatus('${u.id}', '${u.status}')">
                    ${u.status === "inativo" ? "Ativar" : "Desativar"}
                </button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

window.toggleStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === "inativo" ? "ativo" : "inativo";
  try {
    await updateDoc(doc(db, "usuarios", id), { status: newStatus });
    loadUsuarios();
  } catch (err) {
    alert("Erro ao alterar status.");
  }
};

function setupListeners() {
  let timeout;
  document.getElementById("filter-search").oninput = (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => loadUsuarios(), 300);
  };
  document.getElementById("filter-status").onchange = () => loadUsuarios();
}
