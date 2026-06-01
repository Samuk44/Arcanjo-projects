import { auth, db } from "../../../../assets/js/firebase/config.js";
import { checkAccess } from "../../../../assets/js/core/rbac.js";
import { show } from "../../../../assets/js/core/notifications.js";
import {
  ref,
  onValue,
  off,
  push,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/9/firebase-database.js";

export const initTurmas = async () => {
  if (!checkAccess(auth.currentUser?.uid, "diretor")) return;

  const container = document.getElementById("academico-turmas-container");
  container.innerHTML = `
    <button id="add-btn" class="bg-blue-600 text-white p-2 rounded mb-4">Nova Turma</button>
    <div id="grid" class="grid grid-cols-3 gap-4"></div>
  `;

  const grid = document.getElementById("grid");
  const unsub = onValue(ref(db, "turmas"), (snap) => {
    grid.innerHTML = "";
    if (snap.exists()) {
      snap.forEach((c) => {
        const t = { id: c.key, ...c.val() };
        if (t.ativa === false) return;
        grid.innerHTML += `
          <div class="bg-white p-4 shadow rounded">
            <h3 class="font-bold">${t.nome}</h3>
            <p>${t.segmento} - ${t.turno}</p>
            <button class="archive-btn text-red-500 mt-2" data-id="${t.id}">Arquivar</button>
          </div>`;
      });
    }
  });

  document.getElementById("add-btn").addEventListener("click", async () => {
    const nome = prompt("Nome da turma (Ex: 7A)");
    if (nome) {
      const newRef = push(ref(db, "turmas"));
      await set(newRef, {
        nome,
        segmento: "Fundamental",
        turno: "Manhã",
        ativa: true,
      });
      show("success", "Turma criada");
    }
  });

  grid.addEventListener("click", async (e) => {
    if (e.target.classList.contains("archive-btn")) {
      await update(ref(db, `turmas/${e.target.dataset.id}`), { ativa: false });
      show("success", "Turma arquivada");
    }
  });
  window.addEventListener("pagehide", () => off(unsub));
};
// SGE v2.0 • Diretor Acadêmico Turmas
