import { readStored, writeStored } from "./storage.js";

const links = [
  ["index.html", "home", "Главная"],
  ["books.html", "books", "Книги"],
  ["characters.html", "characters", "Персонажи"],
  ["world.html", "world", "Мир романа"],
  ["gallery.html", "gallery", "Галерея"],
  ["soundtrack.html", "soundtrack", "Саундтрек"],
  ["author.html", "author", "Об авторе"]
];

export async function initNavigation() {
  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");
  if (!header || !footer) return;

  const lang = readStored("language", "ru");
  const dictionary = await fetch(`data/i18n/${lang}.json`).then((response) => {
    if (!response.ok) throw new Error(`Could not load interface language: ${response.status}`);
    return response.json();
  });
  const page = document.body.dataset.page;
  header.className = "site-header";
  header.innerHTML = `
    <a class="brand" href="index.html" aria-label="Сорок минут до дома — главная"><span class="brand-mark">40</span><span>Сорок минут до дома</span></a>
    <nav class="primary-nav" id="primary-nav" aria-label="Основная навигация">
      ${links.map(([href, key, ru]) => `<a href="${href}" data-label="${key}" ${key === page ? 'aria-current="page"' : ""}>${dictionary[key] || ru}</a>`).join("")}
    </nav>
    <div class="header-tools">
      <label class="visually-hidden" for="language-select">Язык интерфейса</label>
      <select id="language-select" aria-label="Язык интерфейса"><option value="ru" ${lang === "ru" ? "selected" : ""}>RU</option><option value="en" ${lang === "en" ? "selected" : ""}>EN</option></select>
      <label class="visually-hidden" for="atmosphere-select">Атмосфера</label>
      <select id="atmosphere-select" aria-label="${dictionary.atmosphere || "Атмосфера"}">
        ${["night", "sunset", "rain", "silence"].map((theme) => `<option value="${theme}">${dictionary[theme]}</option>`).join("")}
      </select>
    </div>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Открыть меню">☰</button>`;
  footer.className = "site-footer";
  footer.innerHTML = `<span>© <span id="footer-year"></span> · FORTY MINUTES TO HOME</span><nav class="footer-links" aria-label="Дополнительная навигация">${links.slice(1).map(([href, key]) => `<a href="${href}">${dictionary[key]}</a>`).join("")}</nav>`;
  document.querySelector("#footer-year").textContent = new Date().getFullYear();

  const atmosphereSelect = document.querySelector("#atmosphere-select");
  atmosphereSelect.value = readStored("atmosphere", "night");
  applyAtmosphere(atmosphereSelect.value);
  atmosphereSelect.addEventListener("change", () => {
    applyAtmosphere(atmosphereSelect.value);
    writeStored("atmosphere", atmosphereSelect.value);
  });
  document.querySelector("#language-select").addEventListener("change", (event) => {
    writeStored("language", event.target.value);
    window.location.reload();
  });

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("menu-open", open);
    if (open) nav.querySelector("a")?.focus();
    else menuButton.focus();
  };
  menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement && window.matchMedia("(max-width: 720px)").matches) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") setMenu(false);
  });

  const continueLink = document.querySelector("#continue-reading");
  if (continueLink) {
    const progress = readStored("progress", null);
    if (progress?.volumeId && progress?.chapterId) {
      continueLink.href = `reader.html?volume=${encodeURIComponent(progress.volumeId)}&chapter=${encodeURIComponent(progress.chapterId)}&resume=1`;
      continueLink.hidden = false;
    }
  }
  window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 28), { passive: true });
}

function applyAtmosphere(theme) {
  document.body.dataset.atmosphere = theme;
}
