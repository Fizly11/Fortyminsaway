import { loadJson } from "./storage.js";

export async function initAuthor() {
  const target = document.querySelector("#author-name");
  if (!target) return;
  const author = await loadJson("data/author.json");
  if (author.name) target.textContent = author.name;
  if (author.biography) document.querySelector("#author-bio").textContent = author.biography;
  if (author.portrait) {
    const image = document.createElement("img");
    image.src = author.portrait;
    image.alt = `Портрет: ${author.name || "автор"}`;
    image.loading = "lazy";
    image.addEventListener("error", () => image.replaceWith(document.createTextNode("Портрет автора недоступен.")));
    document.querySelector(".portrait-placeholder").replaceChildren(image);
  }
}
