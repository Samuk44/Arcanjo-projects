/**
 * announcement.section.js
 * Módulo visual para a Central de Avisos.
 * Responsável pela interatividade do formulário, validações visuais e atualização da pré-visualização.
 */

export function initAnnouncementSection() {
  const els = {
    targetType: document.getElementById("announcement-target-type"),
    targetSelectorContainer: document.getElementById("announcement-target-selector-container"),
    targetSelector: document.getElementById("announcement-target-selector"),
    titleInput: document.getElementById("announcement-title"),
    messageInput: document.getElementById("announcement-message"),
    charCount: document.getElementById("announcement-char-count"),
    prioritySelect: document.getElementById("announcement-priority"),
    scheduleCheckbox: document.getElementById("announcement-schedule-checkbox"),
    scheduleContainer: document.getElementById("announcement-schedule-container"),
    btnPreview: document.getElementById("btn-preview-announcement"),
    btnSend: document.getElementById("btn-send-announcement"),

    // Preview
    previewPriority: document.getElementById("preview-priority"),
    previewTarget: document.getElementById("preview-target"),
    previewTitle: document.getElementById("preview-title"),
    previewMessage: document.getElementById("preview-message"),

    // Histórico
    historyBody: document.getElementById("announcement-history-body"),
  };

  if (!els.targetType) return; // Segurança caso não exista na DOM

  // 1. Controle do Seletor de Destinatários Específicos
  els.targetType.addEventListener("change", (e) => {
    const val = e.target.value;
    const isSpecific = val.startsWith("specific-");

    if (isSpecific) {
      els.targetSelectorContainer.style.display = "flex";
      // Simulação de preenchimento de opções
      els.targetSelector.innerHTML = "";
      let mockOptions = [];
      if (val === "specific-classes") mockOptions = ["6º Ano A", "7º Ano B", "8º Ano C", "1ª Série", "2ª Série"];
      else if (val === "specific-teachers") mockOptions = ["Carlos Eduardo", "Mariana Silva", "Roberto Alves"];
      else if (val === "specific-guardians") mockOptions = ["Marcos Almeida", "Patrícia Gomes", "João Souza"];
      else if (val === "specific-students") mockOptions = ["Ana Paula", "Pedro Henrique", "Lucas Silva"];

      mockOptions.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        els.targetSelector.appendChild(option);
      });
    } else {
      els.targetSelectorContainer.style.display = "none";
      els.targetSelector.innerHTML = "";
    }
    updatePreviewTarget();
  });

  // 2. Controle de Agendamento
  els.scheduleCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      els.scheduleContainer.style.display = "grid";
    } else {
      els.scheduleContainer.style.display = "none";
      document.getElementById("announcement-schedule-date").value = "";
      document.getElementById("announcement-schedule-time").value = "";
    }
  });

  // 3. Contador de Caracteres da Mensagem
  els.messageInput.addEventListener("input", (e) => {
    const len = e.target.value.length;
    els.charCount.textContent = `${len} / 1000`;
    if (len >= 1000) {
      els.charCount.style.color = "#ef4444";
      els.charCount.style.fontWeight = "bold";
    } else {
      els.charCount.style.color = "#94a3b8";
      els.charCount.style.fontWeight = "normal";
    }
    updatePreviewMessage();
  });

  // 4. Atualizações de Pré-visualização Dinâmica
  els.titleInput.addEventListener("input", () => {
    els.previewTitle.textContent = els.titleInput.value.trim() || "Título do Aviso";
  });

  els.prioritySelect.addEventListener("change", () => {
    const val = els.prioritySelect.value;
    const labels = { low: "Baixa", normal: "Normal", important: "Importante", urgent: "Urgente" };
    els.previewPriority.textContent = labels[val] || "Normal";
    
    // Atualiza classes do badge visualmente
    els.previewPriority.className = "";
    els.previewPriority.style = "padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; ";
    if (val === "low") els.previewPriority.style.cssText += "background: rgba(71, 85, 105, 0.2); color: #94a3b8; border: 1px solid rgba(71, 85, 105, 0.3);";
    if (val === "normal") els.previewPriority.style.cssText += "background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3);";
    if (val === "important") els.previewPriority.style.cssText += "background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.3);";
    if (val === "urgent") els.previewPriority.style.cssText += "background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3);";
  });

  function updatePreviewMessage() {
    els.previewMessage.textContent = els.messageInput.value || "Sua mensagem aparecerá aqui...";
  }

  function updatePreviewTarget() {
    const val = els.targetType.value;
    const text = els.targetType.options[els.targetType.selectedIndex].text;
    const icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.25rem;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    els.previewTarget.innerHTML = `${icon}${text}`;
  }

  // 5. Botões de Ação
  els.btnPreview.addEventListener("click", () => {
    // Scroll para a preview
    document.getElementById("announcement-preview").scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Flash sutil para dar feedback visual
    els.previewMessage.parentElement.style.transition = "background-color 0.3s";
    els.previewMessage.parentElement.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
    setTimeout(() => {
      els.previewMessage.parentElement.style.backgroundColor = "rgba(30, 41, 59, 0.5)";
    }, 400);
  });

  els.btnSend.addEventListener("click", () => {
    const title = els.titleInput.value.trim();
    const msg = els.messageInput.value.trim();

    if (!title || !msg) {
      alert("Por favor, preencha o título e a mensagem do aviso.");
      return;
    }

    // Lógica visual simulada (Histórico)
    const isScheduled = els.scheduleCheckbox.checked;
    let dateStr = "Agora";
    
    if (isScheduled) {
      const d = document.getElementById("announcement-schedule-date").value;
      const t = document.getElementById("announcement-schedule-time").value;
      if (!d || !t) {
        alert("Preencha a data e o horário para o envio agendado.");
        return;
      }
      dateStr = `${d.split("-").reverse().join("/")} às ${t}`;
    } else {
      const hoje = new Date();
      dateStr = hoje.toLocaleDateString("pt-BR") + " " + hoje.toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
    }

    const tr = document.createElement("tr");
    
    const prioVal = els.prioritySelect.value;
    const prioLabels = { low: "Baixa", normal: "Normal", important: "Importante", urgent: "Urgente" };
    let prioColor = "#93c5fd";
    if (prioVal === "low") prioColor = "#94a3b8";
    if (prioVal === "important") prioColor = "#fcd34d";
    if (prioVal === "urgent") prioColor = "#fca5a5";

    const statusBadge = isScheduled 
      ? `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: rgba(245, 158, 11, 0.2); color: #fcd34d; font-weight: 600;">Agendado</span>`
      : `<span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: rgba(34, 197, 94, 0.2); color: #86efac; font-weight: 600;">Enviado</span>`;

    tr.innerHTML = `
      <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1;">${dateStr}</td>
      <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #f8fafc; font-weight: 500;">${title}</td>
      <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1;">${els.targetType.options[els.targetType.selectedIndex].text}</td>
      <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${prioColor};">${prioLabels[prioVal]}</td>
      <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">${statusBadge}</td>
    `;

    // Remove empty state se existir
    const emptyState = els.historyBody.querySelector(".announcement-empty-state");
    if (emptyState) emptyState.remove();

    els.historyBody.prepend(tr);

    // Limpar form
    els.titleInput.value = "";
    els.messageInput.value = "";
    els.charCount.textContent = "0 / 1000";
    els.scheduleCheckbox.checked = false;
    els.scheduleContainer.style.display = "none";
    document.getElementById("announcement-schedule-date").value = "";
    document.getElementById("announcement-schedule-time").value = "";
    
    // Atualizar preview para zerado
    els.previewTitle.textContent = "Título do Aviso";
    els.previewMessage.textContent = "Sua mensagem aparecerá aqui...";

    alert(isScheduled ? "Aviso agendado com sucesso!" : "Aviso enviado com sucesso!");
  });
}
