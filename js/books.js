import { loadJson, readStored } from "./storage.js";

export async function initBooks() {
  const data = await loadJson("data/books.json");
  const volumes = data.volumes;
  const homeGrid = document.querySelector("#home-volumes");
  const allGrid = document.querySelector("#all-volumes");
  if (homeGrid) homeGrid.innerHTML = volumes.map((volume) => createVolumeCard(volume)).join("");
  if (allGrid) allGrid.innerHTML = volumes.map((volume) => createVolumeCard(volume, true)).join("");
  const charactersMount = document.querySelector("#home-characters");
  if (charactersMount) {
    const { characters } = await loadJson("data/characters.json");
    charactersMount.innerHTML = characters.map((character) => `
      <a class="person-teaser" href="characters.html"><span>ПОРТРЕТ ОЖИДАЕТ МАТЕРИАЛОВ</span><h3>${escapeHtml(character.name)}</h3></a>`).join("");
  }
}

function createVolumeCard(volume, large = false) {
  const progress = readStored("progress", null);
  const completed = readStored("completedChapters", []);
  const count = volume.chapters.length;
  const readCount = completed.filter((item) => item.startsWith(`${volume.id}:`)).length;
  const progressValue = progress?.volumeId === volume.id ? Math.round((progress.ratio || 0) * 100) : Math.round(readCount / count * 100);
  const title = volume.title || "Название уточняется";
  const chapter = volume.chapters[0];
  return `<article class="volume-card">
    <a class="cover-art" data-volume="${volume.number}" href="reader.html?volume=${encodeURIComponent(volume.id)}&chapter=${encodeURIComponent(chapter.id)}" aria-label="Открыть том ${volume.number}: ${escapeHtml(title)}">
      <span class="cover-number">ТОМ ${String(volume.number).padStart(2, "0")}</span>
      <span class="cover-title">${escapeHtml(title)}<small>${volume.englishTitle ? escapeHtml(volume.englishTitle) : "НАЗВАНИЕ ОЖИДАЕТСЯ"}</small></span>
    </a>
    <div class="volume-meta"><p>${escapeHtml(volume.description)}</p></div>
    <div class="volume-progress" aria-label="Прогресс чтения ${progressValue}%"><span style="width:${progressValue}%"></span></div>
    <a class="text-link" href="reader.html?volume=${encodeURIComponent(volume.id)}&chapter=${encodeURIComponent(chapter.id)}">Открыть том <span aria-hidden="true">→</span></a>
    ${large ? `<p class="muted">${count} глава · демонстрационный раздел</p>` : ""}
  </article>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
