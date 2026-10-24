import { loadJson, readStored } from "./storage.js";

export async function initCharacters() {
  const data = await loadJson("data/characters.json");
  const list = document.querySelector("#character-list");
  if (list) {
    list.innerHTML = data.characters.map((character) => `
      <article class="character-card">
        <div class="character-art" role="img" aria-label="Место для портрета ${escapeHtml(character.name)}">ПОРТРЕТ ОЖИДАЕТСЯ</div>
        <div class="character-info"><span class="age">${character.age} лет</span><h2>${escapeHtml(character.name)}</h2>
          <p>${character.biography ? escapeHtml(character.biography) : "Описание, цитаты, связанные главы и музыкальная тема будут добавлены по материалам романа."}</p>
          <a class="text-link" href="character.html?id=${encodeURIComponent(character.id)}">Открыть страницу <span aria-hidden="true">→</span></a>
        </div>
      </article>`).join("");
  }
  const detail = document.querySelector("#character-detail");
  if (!detail) return;
  const character = data.characters.find((item) => item.id === new URLSearchParams(location.search).get("id"));
  if (!character) {
    document.querySelector("#character-title").textContent = "Персонаж не найден";
    document.querySelector("#character-name").textContent = "Нет данных для этой страницы";
    document.querySelector("#character-bio").textContent = "Выберите персонажа из общего списка.";
    return;
  }
  document.title = `${character.name} — Сорок минут до дома`;
  document.querySelector("#character-title").textContent = character.name;
  document.querySelector("#character-name").textContent = character.name;
  document.querySelector("#character-bio").textContent = character.biography || `Возраст: ${character.age}. Биография, цитаты и галерея будут добавлены автором.`;
  const completed = readStored("completedChapters", []);
  const spoilerIsUnlocked = character.spoilerAfter && completed.includes(character.spoilerAfter);
  document.querySelector("#character-spoiler").textContent = character.spoilerAfter && !spoilerIsUnlocked
    ? "Дополнительные сведения скрыты до прочтения соответствующей главы."
    : "";
  if (character.portrait) {
    const image = document.createElement("img");
    image.src = character.portrait;
    image.alt = `Портрет ${character.name}`;
    image.loading = "lazy";
    image.addEventListener("error", () => image.replaceWith(document.createTextNode("Портрет недоступен.")));
    detail.querySelector(".portrait-placeholder").replaceChildren(image);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
