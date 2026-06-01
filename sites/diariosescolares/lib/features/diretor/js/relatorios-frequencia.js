import app, { auth, firestore } from "../../../../assets/js/firebase/config.js";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

let dadosOriginais = [];

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDocs(
      query(
        collection(firestore, "usuarios"),
        where("uid", "==", user.uid),
        where("role", "==", "diretor"),
      ),
    );
    if (userDoc.empty) {
      window.location.href = "/auth/login.html";
      return;
    }
    init();
  } else {
    window.location.href = "/auth/login.html";
  }
});

function init() {
  const q = query(collection(firestore, "chamadas"));
  onSnapshot(q, (snapshot) => {
    dadosOriginais = snapshot.docs.map((doc) => doc.data());
    render(processar(dadosOriginais));
  });

  document.getElementById("turma").addEventListener("change", filter);
  document.getElementById("disciplina").addEventListener("change", filter);
  document.getElementById("export-csv").addEventListener("click", exportCSV);
  document
    .getElementById("export-pdf")
    .addEventListener("click", () => window.print());
}

function processar(dados) {
  const alunos = {};
  dados.forEach((c) => {
    if (!alunos[c.alunoId])
      alunos[c.alunoId] = {
        nome: c.alunoNome,
        turma: c.turma,
        total: 0,
        pres: 0,
      };
    alunos[c.alunoId].total++;
    if (c.presente) alunos[c.alunoId].pres++;
  });
  return Object.values(alunos).map((a) => ({
    ...a,
    freq: (a.pres / a.total) * 100,
  }));
}

function render(dados) {
  const tbody = document.getElementById("lista-frequencia");
  tbody.innerHTML = dados
    .map(
      (d) => `
        <tr>
            <td>${d.nome}</td>
            <td>${d.turma}</td>
            <td class="mono">${d.total}</td>
            <td class="mono">${d.pres}</td>
            <td class="mono">${d.freq.toFixed(1)}%</td>
            <td><span class="status-badge ${d.freq < 75 ? "risk" : "safe"}">${d.freq < 75 ? "RISCO" : "OK"}</span></td>
        </tr>
    `,
    )
    .join("");
}

function filter() {
  const t = document.getElementById("turma").value;
  const d = document.getElementById("disciplina").value;
  const filtered = dadosOriginais.filter(
    (item) =>
      (t === "all" || item.turma === t) &&
      (d === "all" || item.disciplina === d),
  );
  render(processar(filtered));
}

function exportCSV() {
  const dados = processar(dadosOriginais);
  const csv =
    "Aluno,Turma,Aulas,Presencas,Freq\n" +
    dados
      .map(
        (d) =>
          `${d.nome},${d.turma},${d.total},${d.pres},${d.freq.toFixed(2)}%`,
      )
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "frequencia.csv";
  a.click();
}
