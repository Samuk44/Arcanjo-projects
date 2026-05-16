/* SGE v2.0 • Notifications & Toasts */

/**
 * Exibe um toast na tela
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration
 */
export function showToast(message, type = "info", duration = 5000) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span>${icons[type] || "•"}</span>
            <span>${message}</span>
        </div>
        <button style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.2rem; margin-left:1rem;">&times;</button>
    `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector("button");
  const dismiss = () => {
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn.onclick = dismiss;

  const timeout = setTimeout(dismiss, duration);

  toast.onmouseenter = () => clearTimeout(timeout);
  toast.onmouseleave = () => setTimeout(dismiss, duration);
}

/**
 * Simula uma notificação push (FCM)
 * @param {Object} data
 */
export function showFCMNotification(data) {
  console.log("FCM simulado:", data);
  showToast(data.body || "Nova notificação", "info");

  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }

  playNotificationSound();
}

/**
 * Toca o som de notificação
 */
export function playNotificationSound() {
  const audio = new Audio("/assets/audio/notification.mp3");
  audio.play().catch(() => {
    // Silencioso se o navegador bloquear autoplay sem interação
  });
}

/**
 * Remove todos os toasts ativos
 */
export function clearToasts() {
  const container = document.querySelector(".toast-container");
  if (container) container.innerHTML = "";
}
