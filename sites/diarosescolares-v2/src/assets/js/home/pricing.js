import { $, $$, setAttributeSafe } from "../shared/utils.js";
import { Logger } from "../shared/logger.js";

export const initPricing = () => {
  const switchEl = $("#pricing-switch");
  const monthlyLabel = $("#monthly-label");
  const yearlyLabel = $("#yearly-label");
  const priceValues = $$(".price-value");

  if (!switchEl || priceValues.length === 0) return;

  const formatPrice = (value) => {
    return value.toLocaleString("pt-BR");
  };

  const updatePrices = (isYearly) => {
    priceValues.forEach((el) => {
      const pricingEl = el.closest(".pricing-price");
      if (!pricingEl) return;

      const monthly = pricingEl.getAttribute("data-monthly");
      const yearly = pricingEl.getAttribute("data-yearly");

      if (monthly && yearly) {
        el.textContent = formatPrice(
          isYearly ? parseInt(yearly) : parseInt(monthly),
        );
      }
    });

    setAttributeSafe(switchEl, "aria-checked", isYearly.toString());

    if (monthlyLabel) monthlyLabel.classList.toggle("active", !isYearly);
    if (yearlyLabel) yearlyLabel.classList.toggle("active", isYearly);

    Logger.pricing.toggled(isYearly ? "yearly" : "monthly");
  };

  // Toggle click
  switchEl.addEventListener("click", () => {
    const isYearly = switchEl.classList.toggle("active");
    updatePrices(isYearly);
  });

  // Toggle keyboard
  switchEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      switchEl.click();
    }
  });

  // Plan click logging
  $$(".pricing-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".pricing-card");
      if (card) {
        const name =
          card.querySelector(".pricing-name")?.textContent || "unknown";
        Logger.pricing.planClicked(name);
      }
    });
  });
};

export default { initPricing };
