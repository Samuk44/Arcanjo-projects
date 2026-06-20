import { $$, throttle } from "../shared/utils.js";
import { Logger } from "../shared/logger.js";

export const initAnalytics = () => {
  // CTA tracking
  $$('.btn-primary, .nav-cta, [data-analytics="homepage.cta.clicked"]').forEach(
    (btn) => {
      btn.addEventListener("click", () => {
        Logger.cta.demoClicked(btn.dataset.analytics || "button");
      });
    },
  );

  // Login tracking
  $$('[data-analytics="homepage.login.clicked"]').forEach((link) => {
    link.addEventListener("click", () => {
      Logger.cta.loginClicked();
    });
  });

  // Scroll depth tracking
  let maxScroll = 0;
  const depths = [25, 50, 75, 100];
  const reportedDepths = new Set();

  const trackScroll = throttle(() => {
    const scrollTop = window.pageYOffset;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;

      depths.forEach((depth) => {
        if (maxScroll >= depth && !reportedDepths.has(depth)) {
          reportedDepths.add(depth);
          Logger.page.scrollDepth(depth);
        }
      });
    }
  }, 500);

  window.addEventListener("scroll", trackScroll, { passive: true });

  // Page loaded
  window.addEventListener("load", () => {
    Logger.page.loaded();
  });
};

export default { initAnalytics };
