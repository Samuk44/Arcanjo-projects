"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const openBtn = document.getElementById("sidebar-toggle");
  const closeBtn = document.getElementById("sidebar-close");

  openBtn?.addEventListener("click", () => {
    sidebar?.classList.remove("-translate-x-full");
  });

  closeBtn?.addEventListener("click", () => {
    sidebar?.classList.add("-translate-x-full");
  });

  // Active link by current file name
  const current = (
    location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    const href = (link.getAttribute("href") || "").toLowerCase();
    const isActive =
      href === current ||
      (current === "" && href === "index.html") ||
      (current === "index.html" && href === "index.html");
    if (isActive) {
      link.classList.add("active", "bg-accent/10", "text-accent");
      link.classList.remove("text-secondary");
    }
  });

  // Global modal helper used by inline onclicks
  window.closeModal = (id) => {
    document.getElementById(id)?.classList.add("hidden");
  };
});
