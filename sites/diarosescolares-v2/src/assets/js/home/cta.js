import { $, $$ } from "../shared/utils.js";
import { Logger } from "../shared/logger.js";

export const initCta = () => {
  // Main CTA buttons
  $$(".btn-primary, .nav-cta").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const href = btn.getAttribute("href");
      if (href === "#cta") {
        e.preventDefault();
        const target = $("#cta");
        if (target) {
          const offset = 80;
          const top =
            target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
      Logger.cta.demoClicked("cta-section");
    });
  });

  // Secondary CTA
  $$(".hero-btn-secondary").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const href = btn.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const offset = 80;
          const top =
            target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    });
  });
};

export default { initCta };
