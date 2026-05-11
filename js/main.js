document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initScrollAnimations();
  initStatCounters();
  initSkillBars();
  initContactForm();
});

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => links.classList.remove("open"));
  });
}

function initScrollAnimations() {
  const elements = document.querySelectorAll(
    ".project-card, .skill-category, .stat-card, .contact-form, .section-title"
  );

  elements.forEach((el) => el.classList.add("fade-in"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => observer.observe(el));
}

function initStatCounters() {
  const counters = document.querySelectorAll(".stat-number");
  let started = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        counters.forEach(animateCounter);
      }
    },
    { threshold: 0.3 }
  );

  if (counters.length) observer.observe(counters[0]);
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1500;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }

  requestAnimationFrame(tick);
}

function initSkillBars() {
  const fills = document.querySelectorAll(".skill-fill");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.width + "%";
        }
      });
    },
    { threshold: 0.2 }
  );

  fills.forEach((fill) => observer.observe(fill));
}

function initContactForm() {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector(".btn");
    btn.textContent = "Sent!";
    btn.style.background = "#22C55E";
    setTimeout(() => {
      btn.textContent = "Send Message";
      btn.style.background = "";
      form.reset();
    }, 2000);
  });
}
