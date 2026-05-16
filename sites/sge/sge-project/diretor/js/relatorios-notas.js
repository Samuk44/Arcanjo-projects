import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOug2MkZHwH5rzGXxzlPpVZEu4IHbt0Ck",
  authDomain: "farolescolar.firebaseapp.com",
  databaseURL: "https://farolescolar-default-rtdb.firebaseio.com",
  projectId: "farolescolar",
  storageBucket: "farolescolar.firebasestorage.app",
  messagingSenderId: "31040592917",
  appId: "1:31040592917:web:f90e2f0441c35ed92b421c",
  measurementId: "G-1B6HPZNFFJ",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const formatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function init() {
  const q = query(collection(db, "notas"));
  onSnapshot(q, (snapshot) => {
    const notas = snapshot.docs.map((doc) => doc.data());
    render(processar(notas));
  });

  document.getElementById("export-csv").addEventListener("click", exportCSV);
}

function processar(notas) {
  const alunos = notas.reduce((acc, curr) => {
    if (!acc[curr.alunoId])
      acc[curr.alunoId] = {
        nome: curr.alunoNome,
        turma: curr.turma,
        soma: 0,
        pesos: 0,
      };
    const peso = curr.peso || 1;
    acc[curr.alunoId].soma += curr.valor * peso;
    acc[curr.alunoId].pesos += peso;
    return acc;
  }, {});
  return Object.values(alunos).map((a) => ({ ...a, media: a.soma / a.pesos }));
}

function render(dados) {
  const tbody = document.getElementById("lista-notas");
  tbody.innerHTML = dados
    .map(
      (d) => `
        <tr>
            <td>${d.nome}</td>
            <td>${d.turma}</td>
            <td class="mono">${formatter.format(d.media)}</td>
            <td><span class="status-badge ${d.media < 6 ? "rec" : "ok"}">${d.media < 6 ? "RECUPERAÇÃO" : "APROVADO"}</span></td>
        </tr>
    `,
    )
    .join("");
}

function exportCSV() {
  const rows = Array.from(document.querySelectorAll("#lista-notas tr")).map(
    (tr) =>
      Array.from(tr.querySelectorAll("td"))
        .map((td) => td.textContent)
        .join(","),
  );
  const csv = "Aluno,Turma,Media,Status\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "notas.csv";
  a.click();
}

init();
