import { initNavigation } from "./navigation.js";
import { initAnimations } from "./animations.js";
import { initBooks } from "./books.js";
import { initReader } from "./reader.js";
import { initPlayer } from "./player.js";
import { initGallery } from "./gallery.js";
import { initWorld } from "./world.js";
import { initAuthor } from "./author.js";
import { initCharacters } from "./characters.js";

async function runInitialization(label, initialize) {
  try {
    await initialize();
  } catch (error) {
    console.error(`${label} could not be initialized.`, error);
    const message = document.createElement("p");
    message.className = "runtime-error";
    message.setAttribute("role", "alert");
    message.textContent = `Не удалось загрузить раздел «${label}». Проверьте локальный сервер и файлы данных.`;
    document.body.append(message);
  }
}

initAnimations();
window.addEventListener("storage-warning", () => {
  let status = document.querySelector("#storage-warning");
  if (!status) {
    status = document.createElement("p");
    status.id = "storage-warning";
    status.className = "runtime-error";
    status.setAttribute("role", "status");
    status.textContent = "Браузер не разрешил сохранить настройку. Проверьте параметры хранилища сайта.";
    document.body.append(status);
  }
});

await Promise.all([
  runInitialization("навигация", initNavigation),
  runInitialization("книги", initBooks),
  runInitialization("читалка", initReader),
  runInitialization("аудиоплеер", initPlayer),
  runInitialization("галерея", initGallery),
  runInitialization("карта", async () => initWorld()),
  runInitialization("страница автора", initAuthor)
  ,runInitialization("персонажи", initCharacters)
]);
