import { $$, prefersReducedMotion } from "../shared/utils.js";

export const initAnimations = () => {
  if (prefersReducedMotion()) return;

  const revealElements = $$(".reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    },
  );

  revealElements.forEach((el) => observer.observe(el));
};

export default { initAnimations };
