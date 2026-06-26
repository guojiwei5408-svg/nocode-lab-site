const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelector(".nav__links");
const navItems = [...document.querySelectorAll(".nav__links a")];
const sections = [...document.querySelectorAll("main section[id]")];
const toast = document.getElementById("toast");
const ideaForm = document.getElementById("ideaForm");
const ideaText = document.getElementById("ideaText");
const heroVisual = document.querySelector(".hero__visual");
const heroImage = document.querySelector(".hero__visual img");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
let toastTimer = null;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function closeMobileNav() {
  if (!navLinks || !navToggle) return;

  navLinks.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navItems.forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

if (ideaForm) {
  ideaForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = ideaText?.value.trim();
    if (!value) {
      showToast("先写一句想法，我再帮你记下来。");
      ideaText?.focus();
      return;
    }

    showToast("想法入口已预留。下一步会接邮件或飞书通知。");
    ideaForm.reset();
  });
}

if (sections.length && navItems.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navItems.forEach((item) => {
        item.classList.toggle("is-active", item.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-35% 0px -50% 0px", threshold: [0.2, 0.4, 0.6] }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

if (heroVisual && heroImage && !reduceMotion && !isCoarsePointer) {
  heroVisual.addEventListener("pointermove", (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    heroImage.style.setProperty("--tilt-x", `${x * 10}px`);
    heroImage.style.setProperty("--tilt-y", `${y * 8}px`);
    heroImage.style.setProperty("--tilt-rx", `${y * -2.2}deg`);
    heroImage.style.setProperty("--tilt-ry", `${x * 2.8}deg`);
  });

  heroVisual.addEventListener("pointerleave", () => {
    heroImage.style.removeProperty("--tilt-x");
    heroImage.style.removeProperty("--tilt-y");
    heroImage.style.removeProperty("--tilt-rx");
    heroImage.style.removeProperty("--tilt-ry");
  });
}
