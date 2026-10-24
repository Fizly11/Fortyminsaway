import { loadJson } from "./storage.js";

const placeholderItems = [
  { id: "cover-art", title: "Обложки томов", category: "Тома" },
  { id: "portrait-art", title: "Портреты персонажей", category: "Персонажи" },
  { id: "location-art", title: "Иллюстрации мест", category: "Места" },
  { id: "chapter-art", title: "Иллюстрации глав", category: "Тома" }
];

export async function initGallery() {
  const grid = document.querySelector("#gallery-grid");
  if (!grid) return;
  const data = await loadJson("data/gallery.json");
  const items = data.items.length ? data.items : placeholderItems;
  const filtersRoot = document.querySelector("#gallery-filters");
  const filters = ["Все", ...new Set(items.map((item) => item.category))];
  let activeFilter = "Все";
  let activeIndex = 0;
  const dialog = document.querySelector("#gallery-dialog");

  filtersRoot.innerHTML = filters.map((filter) => `<button type="button" data-filter="${escapeHtml(filter)}" aria-pressed="${filter === activeFilter}">${escapeHtml(filter)}</button>`).join("");
  filtersRoot.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    filtersRoot.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render();
  });
  document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  document.querySelector("#gallery-previous").addEventListener("click", () => change(-1));
  document.querySelector("#gallery-next").addEventListener("click", () => change(1));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {
    const focusTarget = grid.querySelectorAll("button.gallery-item")[activeIndex];
    focusTarget?.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowRight") change(1);
    if (event.key === "ArrowLeft") change(-1);
  });
  render();

  function visibleItems() {
    return activeFilter === "Все" ? items : items.filter((item) => item.category === activeFilter);
  }
  function render() {
    const visible = visibleItems();
    grid.innerHTML = visible.map((item, index) => `<button type="button" class="gallery-item" data-index="${index}" aria-label="Открыть заглушку: ${escapeHtml(item.title)}">
      <span class="gallery-art-placeholder">МЕСТО ДЛЯ ИЗОБРАЖЕНИЯ</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · материал ожидается</small></button>`).join("");
    grid.querySelectorAll(".gallery-item").forEach((button) => button.addEventListener("click", () => {
      activeIndex = Number(button.dataset.index);
      updateDialog();
      dialog.showModal();
      document.querySelector(".dialog-close").focus();
    }));
  }
  function change(direction) {
    const visible = visibleItems();
    if (!visible.length) return;
    activeIndex = (activeIndex + direction + visible.length) % visible.length;
    updateDialog();
  }
  function updateDialog() {
    const item = visibleItems()[activeIndex];
    if (!item) return;
    document.querySelector("#gallery-dialog-content").innerHTML = '<div class="dialog-preview" role="img" aria-label="Место для будущего изображения">ОРИГИНАЛЬНОЕ ИЗОБРАЖЕНИЕ ПОКА НЕ ДОБАВЛЕНО</div>';
    document.querySelector("#gallery-caption").textContent = `${item.title} · ${item.category} · ожидает материалов`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
