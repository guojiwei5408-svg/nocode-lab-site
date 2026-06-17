const LAB = {
  aiStart: "2026-05-15",
  works: [],
  masterGoal: 100,
};

const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelector(".nav__links");
const navItems = [...document.querySelectorAll(".nav__links a")];
const sections = [...document.querySelectorAll("main section[id]")];
const toast = document.getElementById("toast");
const submitIdeaBtn = document.getElementById("submitIdeaBtn");
const heroIntro = document.getElementById("heroIntro");
const worksCount = document.getElementById("worksCount");
const masterProgress = document.getElementById("masterProgress");
const masterProgressBar = document.getElementById("masterProgressBar");
const canvas = document.getElementById("signalCanvas");
const ctx = canvas.getContext("2d");
const typeLines = [...document.querySelectorAll("[data-type-text]")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

let toastTimer = null;
let points = [];
let animationFrame = null;
let resizeTimer = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMonthAge(startDate, today = new Date()) {
  const start = new Date(`${startDate}T00:00:00`);

  if (Number.isNaN(start.getTime())) return 1;

  let months = (today.getFullYear() - start.getFullYear()) * 12;
  months += today.getMonth() - start.getMonth();

  if (today.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(1, months);
}

function formatMonthAge(months) {
  if (months < 12) return `${months} 个月`;

  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return `${years} 年 ${restMonths} 个月`;
}

function updateLabStats() {
  const aiAgeText = formatMonthAge(getMonthAge(LAB.aiStart));
  const workTotal = LAB.works.length;
  const goal = Math.max(1, LAB.masterGoal);
  const progressValue = clamp(Math.round((workTotal / goal) * 100), 1, 99);
  const progressText = `${progressValue}%`;

  heroIntro.textContent = `我是老郭，33 岁，接触 AI ${aiAgeText}，也不会写代码。但不耽误我用它做点东西，把过程、翻车和结果都摆出来。`;
  worksCount.textContent = String(workTotal);
  masterProgress.textContent = progressText;
  masterProgressBar.style.setProperty("--progress", progressText);
}

function setCanvasSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = window.innerWidth < 700
    ? Math.max(28, Math.min(52, Math.floor(window.innerWidth / 13)))
    : Math.max(48, Math.min(120, Math.floor(window.innerWidth / 13)));

  points = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    r: 0.9 + Math.random() * 1.3,
    glow: 0.45 + Math.random() * 0.55,
  }));
}

function drawSignal() {
  if (reduceMotion) return;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.lineWidth = 1;

  for (const point of points) {
    point.x += point.vx;
    point.y += point.vy;

    if (point.x < 0 || point.x > window.innerWidth) point.vx *= -1;
    if (point.y < 0 || point.y > window.innerHeight) point.vy *= -1;

    ctx.fillStyle = `rgba(57, 217, 255, ${0.28 + point.glow * 0.34})`;
    ctx.shadowBlur = 14;
    ctx.shadowColor = "rgba(57, 217, 255, 0.42)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  const linkDistance = window.innerWidth < 700 ? 92 : 132;

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < linkDistance) {
        ctx.globalAlpha = (1 - dist / linkDistance) * 0.82;
        ctx.strokeStyle = dist < linkDistance * 0.56
          ? "rgba(124, 247, 212, 0.16)"
          : "rgba(57, 217, 255, 0.12)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  animationFrame = requestAnimationFrame(drawSignal);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2100);
}

function closeMobileNav() {
  navLinks.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

async function typeTerminalLines() {
  if (!typeLines.length) return;

  if (reduceMotion) {
    typeLines.forEach((line) => {
      line.textContent = line.dataset.typeText;
      line.classList.add("is-typed");
    });
    return;
  }

  for (const line of typeLines) {
    const text = line.dataset.typeText || "";
    line.classList.add("is-typing");

    for (let index = 0; index <= text.length; index += 1) {
      line.textContent = text.slice(0, index);
      await new Promise((resolve) => {
        window.setTimeout(resolve, 18 + Math.random() * 18);
      });
    }

    line.classList.remove("is-typing");
    line.classList.add("is-typed");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
}

function setupCursorGlow() {
  if (isCoarsePointer || reduceMotion) return;

  window.addEventListener("pointermove", (event) => {
    document.body.style.setProperty("--cursor-x", `${event.clientX}px`);
    document.body.style.setProperty("--cursor-y", `${event.clientY}px`);
  }, { passive: true });
}

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navItems.forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

submitIdeaBtn.addEventListener("click", () => {
  showToast("投稿功能马上开放");
});

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

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    setCanvasSize();
    drawSignal();
  }, 140);
});

setCanvasSize();
drawSignal();
updateLabStats();
setupCursorGlow();
typeTerminalLines();
