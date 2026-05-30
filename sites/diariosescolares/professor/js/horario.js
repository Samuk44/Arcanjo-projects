// ===== [horarios.js] =====
import { auth, db } from "../../assets/js/firebase/config.js";
import { show } from "../../assets/js/core/notifications.js";
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

export function initHorarios() {
  const user = auth.currentUser;
  if (!user) {
    console.error("Usuário não autenticado.");
    return;
  }

  const professorId = user.uid;
  let horariosListener = null;

  const horariosContainer = document.getElementById("horarios-container");
  if (!horariosContainer) {
    console.error("Container de horários não encontrado.");
    return;
  }

  const renderHorarios = (horariosData) => {
    horariosContainer.innerHTML = ""; // Limpa o container

    const daysOfWeek = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    const timeSlots = Array.from(
      { length: 12 },
      (_, i) => `${(7 + i).toString().padStart(2, "0")}h-50min`,
    ); // 07h-18h em slots de 50min

    const grid = document.createElement("div");
    grid.className = "horarios-grid grid grid-cols-6 gap-1 responsive-grid"; // 6 colunas: 1 para horas, 5 para dias

    // Cabeçalho da grade
    grid.innerHTML += "<div></div>"; // Canto superior esquerdo vazio
    daysOfWeek.forEach((day) => {
      grid.innerHTML += `<div class="text-center font-bold p-2 bg-gray-200">${day}</div>`;
    });

    timeSlots.forEach((slot, slotIndex) => {
      grid.innerHTML += `<div class="font-bold p-2 bg-gray-100 text-sm flex items-center justify-center">${slot.split("-")[0]}</div>`; // Hora
      daysOfWeek.forEach((day, dayIndex) => {
        const cell = document.createElement("div");
        cell.className =
          "horario-cell border p-1 text-xs flex flex-col justify-center items-center relative overflow-hidden";
        cell.dataset.day = dayIndex + 1; // 1 para Segunda, 5 para Sexta
        cell.dataset.slot = slotIndex;

        const aula = horariosData.find(
          (h) =>
            h.diaSemana === dayIndex + 1 &&
            h.horaInicio === parseInt(slot.split("h")[0]),
        );

        if (aula) {
          const now = new Date();
          const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Domingo é 0, queremos 7
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          let statusClass = "";
          let tooltipText = `Turma: ${aula.turma}, Disciplina: ${aula.disciplina}, Sala: ${aula.sala}`;

          const aulaStart = new Date();
          aulaStart.setHours(aula.horaInicio, 0, 0);
          const aulaEnd = new Date(aulaStart.getTime() + 50 * 60 * 1000); // 50 minutos depois

          if (
            currentDay === aula.diaSemana &&
            now >= aulaStart &&
            now < aulaEnd
          ) {
            statusClass = "border-amber-500 border-2 animate-pulse"; // EM_ANDAMENTO
            tooltipText += " (EM ANDAMENTO)";
          } else if (
            currentDay === aula.diaSemana &&
            now < aulaStart &&
            aulaStart.getTime() - now.getTime() < 60 * 60 * 1000
          ) {
            // Próxima hora
            statusClass = "border-green-500 border-2"; // PRÓXIMA
            tooltipText += " (PRÓXIMA)";
          } else if (now > aulaEnd) {
            statusClass = "opacity-50"; // ENCERRADA
            tooltipText += " (ENCERRADA)";
          }

          cell.classList.add(statusClass);
          cell.innerHTML = `
                        <span class="font-semibold">${aula.turma}</span>
                        <span>${aula.disciplina}</span>
                        <span class="text-gray-500">${aula.sala}</span>
                    `;
          cell.title = tooltipText; // Tooltip no hover

          cell.addEventListener("click", () => {
            // router.navigateTo('professor/chamada?aulaId=' + aula.id)
            show(`Navegar para chamada da aula ${aula.id}`, "info");
          });
        }
        grid.appendChild(cell);
      });
    });
    horariosContainer.appendChild(grid);
  };

  const loadHorarios = () => {
    try {
      const horariosRef = query(
        ref(db, "horarios"),
        orderByChild("professorId"),
        equalTo(professorId),
      );

      horariosListener = onValue(
        horariosRef,
        (snapshot) => {
          const horariosData = snapshot.val();
          const horariosList = horariosData
            ? Object.keys(horariosData).map((key) => ({
                id: key,
                ...horariosData[key],
              }))
            : [];
          renderHorarios(horariosList);
        },
        (error) => {
          console.error("Erro ao carregar horários em tempo real:", error);
          show("Erro ao carregar horários.", "error");
        },
      );
    } catch (error) {
      console.error("Erro ao configurar listener de horários:", error);
      show("Erro ao carregar horários.", "error");
    }
  };

  loadHorarios();

  // Cleanup listener on pagehide
  window.addEventListener("pagehide", () => {
    if (horariosListener) {
      off(horariosListener);
      console.log("Horários listener off.");
    }
  });
}

// SGE v2.0 • Professor Horários • 2026-05-15
