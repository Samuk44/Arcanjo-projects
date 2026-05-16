import { auth, db } from "../../assets/js/firebase/config.js";
import { checkAccess } from "../../assets/js/core/rbac.js";
import { show } from "../../assets/js/core/notifications.js";
import {
  ref,
  onValue,
  off,
  update,
} from "https://www.gstatic.com/firebasejs/9/firebase-database.js";

export const initHorarios = async () => {
  if (!checkAccess(auth.currentUser?.uid, "diretor")) return;

  const container = document.getElementById("academico-horarios-container");
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-4">Horários</h2>
    <select id="turma-select" class="p-2 border rounded mb-4"></select>
    <div id="grid" class="grid grid-cols-6 gap-1 text-center bg-white p-4 rounded"></div>
  `;

  // Carregar turmas
  const turmasSnap = await get(ref(db, "turmas"));
  const select = document.getElementById("turma-select");
  if (turmasSnap.exists()) {
    turmasSnap.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = c.val().nome;
      select.appendChild(opt);
    });
  }

  const renderGrid = (turmaId) => {
    const grid = document.getElementById("grid");
    grid.innerHTML =
      '<div class="font-bold">Hora</div><div class="font-bold">Seg</div><div class="font-bold">Ter</div><div class="font-bold">Qua</div><div class="font-bold">Qui</div><div class="font-bold">Sex</div>';
    // Mock de slots
    ["07:00", "08:00", "09:00"].forEach((time) => {
      grid.innerHTML += `<div class="p-2 border">${time}</div>`;
      ["Seg", "Ter", "Qua", "Qui", "Sex"].forEach((day) => {
        grid.innerHTML += `<div class="p-2 border bg-gray-50 cursor-pointer hover:bg-blue-100" data-time="${time}" data-day="${day}" data-turma="${turmaId}">+</div>`;
      });
    });
  };

  select.addEventListener("change", (e) => {
    renderGrid(e.target.value);
  });

  // Evento de clique nas células para atribuir professor (simplificado)
  document.getElementById("grid").addEventListener("click", async (e) => {
    if (e.target.tagName === "DIV" && e.target.textContent === "+") {
      const prof = prompt("ID do Professor:");
      if (prof) {
        await update(
          ref(
            db,
            `horarios/${e.target.dataset.turma}/${e.target.dataset.day}/${e.target.dataset.time}`,
          ),
          { professorId: prof },
        );
        show("success", "Horário atribuído");
      }
    }
  });
};
// SGE v2.0 • Diretor Acadêmico Horários
