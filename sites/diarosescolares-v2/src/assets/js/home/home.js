import { initNavbar } from "./navbar.js";
import { initFaq } from "./faq.js";
import { initPricing } from "./pricing.js";
import { initAnalytics } from "./analytics.js";
import { initAnimations } from "./animations.js";
import { initCta } from "./cta.js";

// Tab switching for dashboard preview
const initTabs = () => {
  const tabs = document.querySelectorAll(".preview-tab");
  const views = document.querySelectorAll(".preview-view");

  if (tabs.length === 0 || views.length === 0) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetView = tab.getAttribute("data-view");

      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      views.forEach((view) => {
        view.classList.remove("active");
        if (view.id === `view-${targetView}`) {
          view.classList.add("active");
        }
      });
    });

    // Keyboard support
    tab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tab.click();
      }
    });
  });
};

// Initialize everything
const init = () => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initNavbar();
      initFaq();
      initPricing();
      initAnalytics();
      initAnimations();
      initCta();
      initTabs();
    });
  } else {
    initNavbar();
    initFaq();
    initPricing();
    initAnalytics();
    initAnimations();
    initCta();
    initTabs();
  }
};

init();

export default { init };
