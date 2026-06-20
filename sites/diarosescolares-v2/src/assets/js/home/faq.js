import { $$, setAttributeSafe } from "../shared/utils.js";
import { Logger } from "../shared/logger.js";

export const initFaq = () => {
  const faqItems = $$(".faq-item");

  faqItems.forEach((item) => {
    const toggle = item.querySelector(".faq-toggle");
    const answer = item.querySelector(".faq-answer");

    if (!toggle || !answer) return;

    toggle.addEventListener("click", () => {
      const isOpen = answer.classList.contains("open");
      const question = toggle.textContent.trim();

      // Close all other items
      faqItems.forEach((otherItem) => {
        if (otherItem === item) return;
        const otherAnswer = otherItem.querySelector(".faq-answer");
        const otherToggle = otherItem.querySelector(".faq-toggle");
        if (otherAnswer) otherAnswer.classList.remove("open");
        if (otherToggle)
          setAttributeSafe(otherToggle, "aria-expanded", "false");
      });

      // Toggle current
      if (isOpen) {
        answer.classList.remove("open");
        setAttributeSafe(toggle, "aria-expanded", "false");
        Logger.faq.collapsed(question);
      } else {
        answer.classList.add("open");
        setAttributeSafe(toggle, "aria-expanded", "true");
        Logger.faq.expanded(question);
      }
    });

    // Keyboard accessibility
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle.click();
      }
    });
  });
};

export default { initFaq };
