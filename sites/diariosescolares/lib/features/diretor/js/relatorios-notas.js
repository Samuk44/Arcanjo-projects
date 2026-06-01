import app, { firestore } from "../../../../assets/js/firebase/config.js";
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const formatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function init() {
  const q = query(collection(firestore, "notas"));
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
