let container = null;

const ensureContainer = () => {
  if (container) return container;
  container = document.createElement("div");
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  Object.assign(container.style, {
    position: "fixed",
    bottom: "1.5rem",
    right: "1.5rem",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: ".5rem",
    maxWidth: "22rem",
    width: "100%",
    pointerEvents: "none",
  });
  document.body.appendChild(container);
  return container;
};

const styles = {
  success: {
    border: "rgba(34,197,94,.35)",
    bg: "rgba(34,197,94,.12)",
    dot: "#22c55e",
  },
  error: {
    border: "rgba(239,68,68,.35)",
    bg: "rgba(239,68,68,.12)",
    dot: "#ef4444",
  },
  warning: {
    border: "rgba(245,158,11,.35)",
    bg: "rgba(245,158,11,.12)",
    dot: "#f59e0b",
  },
  info: {
    border: "rgba(59,130,246,.35)",
    bg: "rgba(59,130,246,.12)",
    dot: "#60a5fa",
  },
};

export const showToast = (message, type = "info", duration = 4000) => {
  const c = ensureContainer();
  const s = styles[type] || styles.info;

  const el = document.createElement("div");
  Object.assign(el.style, {
    padding: ".875rem 1rem",
    background: "rgba(15,23,42,.92)",
    backdropFilter: "blur(20px)",
    border: `1px solid ${s.border}`,
    borderRadius: ".75rem",
    color: "#f8fafc",
    fontSize: ".8125rem",
    boxShadow: "0 10px 30px rgba(0,0,0,.4)",
    transform: "translateX(120%)",
    opacity: "0",
    transition: "all .3s ease",
    pointerEvents: "auto",
  });

  el.innerHTML = `<div style="display:flex;align-items:center;gap:.625rem"><span style="width:.5rem;height:.5rem;border-radius:50%;background:${s.dot};flex-shrink:0"></span><span>${message}</span></div>`;

  c.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = "translateX(0)";
    el.style.opacity = "1";
  });

  const remove = () => {
    el.style.transform = "translateX(120%)";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  };
  setTimeout(remove, duration);
  el.addEventListener("click", remove);
};
