import {
  $,
  $$,
  throttle,
  addClass,
  removeClass,
  setAttributeSafe,
} from "../shared/utils.js";
import { Logger } from "../shared/logger.js";

const SCROLL_THRESHOLD = 50;

export const initNavbar = () => {
  const navbar = $("#navbar");
  const mobileBtn = $("#mobile-menu-btn");
  const mobileMenu = $("#mobile-menu");
  const menuIcon = $("#menu-icon");
  const closeIcon = $("#close-icon");

  if (!navbar) return;

  // Sticky navbar on scroll
  const handleScroll = throttle(() => {
    const scrollY = window.pageYOffset;
    if (scrollY > SCROLL_THRESHOLD) {
      addClass(navbar, "scrolled");
    } else {
      removeClass(navbar, "scrolled");
    }
  }, 50);

  window.addEventListener("scroll", handleScroll, { passive: true });

  // Mobile menu toggle
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.contains("open");

      if (isOpen) {
        mobileMenu.classList.remove("open");
        setAttributeSafe(mobileBtn, "aria-expanded", "false");
        menuIcon.style.display = "";
        closeIcon.style.display = "none";
        Logger.nav.closed();
      } else {
        mobileMenu.classList.add("open");
        setAttributeSafe(mobileBtn, "aria-expanded", "true");
        menuIcon.style.display = "none";
        closeIcon.style.display = "";
        Logger.nav.opened();
      }
    });

    // Close on link click
    $$(".nav-mobile-menu a", mobileMenu).forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        setAttributeSafe(mobileBtn, "aria-expanded", "false");
        menuIcon.style.display = "";
        closeIcon.style.display = "none";
        Logger.nav.linkClicked(link.textContent.trim());
      });
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("open")) {
        mobileMenu.classList.remove("open");
        setAttributeSafe(mobileBtn, "aria-expanded", "false");
        menuIcon.style.display = "";
        closeIcon.style.display = "none";
        mobileBtn.focus();
      }
    });
  }

  // Active nav link on scroll
  const sections = $$("section[id]");
  const navLinks = $$(".nav-links a");

  const updateActiveLink = throttle(() => {
    const scrollY = window.pageYOffset + 100;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");

      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach((link) => {
          link.style.color = "";
          link.style.background = "";
          if (link.getAttribute("href") === `#${id}`) {
            link.style.color = "var(--text-primary)";
            link.style.background = "rgba(255, 255, 255, 0.05)";
          }
        });
      }
    });
  }, 100);

  window.addEventListener("scroll", updateActiveLink, { passive: true });

  Logger.init();
};

export default { initNavbar };
