import { $ } from "../shared/utils.js";

const CARDS = [
  { id: "card-director", href: "register-director.html" },
  { id: "card-teacher", href: "register-teacher.html" },
  { id: "card-guardian", href: "register-guardian.html" },
];

const init = () => {
  CARDS.forEach(({ id, href }) => {
    const el = $(`#${id}`);
    if (!el) return;

    const go = () => {
      location.href = href;
    };

    el.addEventListener("click", go);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
};

document.addEventListener("DOMContentLoaded", init);
