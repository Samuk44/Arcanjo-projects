import app, { firestore } from "../../assets/js/firebase/config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

async function init() {
  const snap = await getDocs(collection(firestore, "avisos"));
  const avisos = snap.docs.map((doc) => doc.data());
  renderChart(avisos);
  renderInativos(avisos);
}

function renderChart(avisos) {
  const stats = avisos.reduce(
    (acc, curr) => {
      acc[curr.tipo] = (acc[curr.tipo] || 0) + (curr.lido ? 1 : 0);
      acc.total[curr.tipo] = (acc.total[curr.tipo] || 0) + 1;
      return acc;
    },
    { total: {} },
  );

  const tipos = Object.keys(stats.total);
  const data = tipos.map((t) => ({
    label: t,
    value: (stats[t] / stats.total[t]) * 100,
  }));

  const svg = `
        <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="none">
            ${data
              .map((d, i) => {
                const h = d.value * 1.8;
                const x = 40 + i * 90;
                return `
                    <rect class="bar" x="${x}" y="${200 - h}" width="35" height="${h}" />
                    <text x="${x + 17}" y="220" text-anchor="middle">${d.label}</text>
                    <text x="${x + 17}" y="${190 - h}" text-anchor="middle" style="fill: #f0a500">${Math.round(d.value)}%</text>
                `;
              })
              .join("")}
            <line x1="20" y1="200" x2="380" y2="200" stroke="#2a2e35" />
        </svg>
    `;
  document.getElementById("chart-leitura").innerHTML = svg;
}

function renderInativos(avisos) {
  const hoje = new Date();
  const trintaDias = 30 * 24 * 60 * 60 * 1000;
  const pais = avisos.reduce((acc, curr) => {
    const ultima = curr.dataLeitura ? curr.dataLeitura.toDate() : new Date(0);
    if (!acc[curr.responsavel] || ultima > acc[curr.responsavel])
      acc[curr.responsavel] = ultima;
    return acc;
  }, {});

  const inativos = Object.entries(pais)
    .filter(([_, data]) => hoje - data > trintaDias)
    .map(([nome, data]) => ({
      nome,
      dias: Math.floor((hoje - data) / (1000 * 60 * 60 * 24)),
    }));

  document.getElementById("lista-inativos").innerHTML = inativos
    .map(
      (p) => `
        <div class="inativo-row">
            <span class="inativo-name">${p.nome}</span>
            <span class="inativo-days">${p.dias} dias</span>
        </div>
    `,
    )
    .join("");
}

init();
