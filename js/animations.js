export function initAnimations() {
  const elements = document.querySelectorAll(".section, .volume-card, .character-card, .gallery-item");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-revealed"));
    return;
  }
  const observer = new IntersectionObserver((entries, activeObserver) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-revealed");
      activeObserver.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  elements.forEach((element) => observer.observe(element));

  const heroArt = document.querySelector(".hero-art");
  if (heroArt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener("scroll", () => {
      heroArt.style.transform = `translateY(${Math.min(window.scrollY * 0.12, 90)}px) scale(1.03)`;
    }, { passive: true });
  }
}
