import { loadJson, readStored, writeStored } from "./storage.js";

const allowedTags = new Set(["P", "H1", "H2", "H3", "EM", "I", "STRONG", "B", "BLOCKQUOTE", "HR", "FIGURE", "FIGCAPTION", "IMG", "DIV"]);
const safeClasses = new Set(["chapter-label", "missing-image"]);

export async function initReader() {
  const content = document.querySelector("#reader-content");
  if (!content) return;
  const { volumes } = await loadJson("data/books.json");
  const volumeSelect = document.querySelector("#volume-select");
  const chapterSelect = document.querySelector("#chapter-select");
  const params = new URLSearchParams(window.location.search);
  let progress = readStored("progress", null);
  let activeVolume = volumes.find((item) => item.id === params.get("volume")) || volumes.find((item) => item.id === progress?.volumeId) || volumes[0];
  let activeChapter = activeVolume.chapters.find((item) => item.id === params.get("chapter")) || activeVolume.chapters.find((item) => item.id === progress?.chapterId) || activeVolume.chapters[0];
  let currentParagraphId = "";
  let saveTimer = 0;
  let paragraphObserver;
  const settings = readStored("settings", { fontSize: 20, lineHeight: 1.8, columnWidth: 720, font: "serif", theme: "night" });

  volumeSelect.innerHTML = volumes.map((volume) => `<option value="${volume.id}">Том ${volume.number} — ${escapeHtml(volume.title || "Название уточняется")}</option>`).join("");
  volumeSelect.value = activeVolume.id;
  populateChapters();
  applySettings();
  renderBookmarks();

  volumeSelect.addEventListener("change", () => {
    activeVolume = volumes.find((item) => item.id === volumeSelect.value) || volumes[0];
    activeChapter = activeVolume.chapters[0];
    currentParagraphId = "";
    populateChapters();
    loadChapter();
  });
  chapterSelect.addEventListener("change", () => {
    activeChapter = activeVolume.chapters.find((item) => item.id === chapterSelect.value) || activeVolume.chapters[0];
    currentParagraphId = "";
    loadChapter();
  });
  document.querySelector("#previous-chapter").addEventListener("click", () => moveChapter(-1));
  document.querySelector("#next-chapter").addEventListener("click", () => moveChapter(1));
  document.querySelector("#bookmark-toggle").addEventListener("click", toggleBookmark);
  document.querySelector("#settings-toggle").addEventListener("click", (event) => {
    const panel = document.querySelector("#reader-settings");
    panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
  });
  document.querySelector("#font-size").addEventListener("input", (event) => updateSetting("fontSize", Number(event.target.value)));
  document.querySelector("#line-height").addEventListener("input", (event) => updateSetting("lineHeight", Number(event.target.value) / 10));
  document.querySelector("#column-width").addEventListener("input", (event) => updateSetting("columnWidth", Number(event.target.value)));
  document.querySelector("#reader-font").addEventListener("change", (event) => updateSetting("font", event.target.value));
  document.querySelector("#reader-theme").addEventListener("change", (event) => updateSetting("theme", event.target.value));
  document.querySelector("#focus-mode").addEventListener("click", () => document.body.classList.toggle("focus-mode"));
  document.querySelector("#fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector(".reader-shell").requestFullscreen();
    } catch (error) {
      document.querySelector("#chapter-counter").textContent = `Не удалось включить полноэкранный режим: ${error.message}`;
    }
  });
  window.addEventListener("scroll", () => {
    if (content.children.length) queueSaveProgress();
  }, { passive: true });
  await loadChapter(Boolean(params.get("resume")));

  function populateChapters() {
    chapterSelect.innerHTML = activeVolume.chapters.map((chapter, index) => `<option value="${chapter.id}">Глава ${index + 1} — ${escapeHtml(chapter.title)}</option>`).join("");
    chapterSelect.value = activeChapter.id;
  }
  async function loadChapter(shouldResume = false) {
    content.innerHTML = '<p class="loading-state">Загружаем главу…</p>';
    chapterSelect.value = activeChapter.id;
    syncAddress();
    try {
      const response = await fetch(activeChapter.path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = await response.text();
      const parsed = new DOMParser().parseFromString(source, "text/html");
      content.replaceChildren(...sanitizeChildren(parsed.body));
      ensureParagraphIds();
      document.querySelector("#chapter-counter").textContent = `Том ${activeVolume.number} · ${chapterSelect.selectedOptions[0]?.textContent || ""}`;
      const chapterPosition = getChapterPosition();
      document.querySelector("#previous-chapter").disabled = chapterPosition === 0;
      document.querySelector("#next-chapter").disabled = chapterPosition === getAllChapters().length - 1;
      observeParagraphs();
      const bookmark = readStored("bookmarks", []).some((item) => item.volumeId === activeVolume.id && item.chapterId === activeChapter.id && item.paragraphId === (progress?.paragraphId || ""));
      document.querySelector("#bookmark-toggle").textContent = bookmark ? "★ Закладка" : "☆ Закладка";
      const savedParagraph = shouldResume && progress?.volumeId === activeVolume.id && progress?.chapterId === activeChapter.id ? progress.paragraphId : "";
      if (savedParagraph) document.getElementById(savedParagraph)?.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0, behavior: "auto" });
      currentParagraphId = savedParagraph || content.querySelector("p[id]")?.id || "";
      saveProgress();
    } catch (error) {
      content.innerHTML = `<p class="error-state">Не удалось загрузить главу. Проверьте путь к файлу <code>${escapeHtml(activeChapter.path)}</code>. (${escapeHtml(error.message)})</p>`;
      console.error("Chapter loading failed.", error);
    }
  }
  function sanitizeChildren(nodes) {
    return Array.from(nodes).map((node) => sanitizeNode(node)).filter(Boolean);
  }
  function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    if (!(node instanceof HTMLElement)) return null;
    if (!allowedTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      fragment.append(...sanitizeChildren(node.childNodes));
      return fragment;
    }
    const clean = document.createElement(node.tagName.toLowerCase());
    const id = node.getAttribute("id");
    if (id && /^[a-zA-Z][\w-]{0,80}$/.test(id)) clean.id = id;
    const className = node.getAttribute("class");
    if (className && safeClasses.has(className)) clean.className = className;
    if (node.tagName === "IMG") {
      const source = node.getAttribute("src") || "";
      const alt = node.getAttribute("alt") || "";
      try {
        const url = new URL(source, window.location.href);
        if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return makeImagePlaceholder(alt);
        clean.src = source;
        clean.alt = alt;
        clean.loading = "lazy";
        clean.addEventListener("error", () => clean.replaceWith(makeImagePlaceholder(alt)));
        clean.addEventListener("click", () => openImage(clean));
        clean.tabIndex = 0;
        clean.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") openImage(clean); });
      } catch {
        return makeImagePlaceholder(alt);
      }
    } else {
      clean.append(...sanitizeChildren(node.childNodes));
    }
    return clean;
  }
  function makeImagePlaceholder(label) {
    const placeholder = document.createElement("div");
    placeholder.className = "missing-image";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", label || "Место для иллюстрации");
    placeholder.textContent = "МЕСТО ДЛЯ ИЛЛЮСТРАЦИИ";
    return placeholder;
  }
  function openImage(image) {
    const dialog = document.createElement("dialog");
    dialog.className = "gallery-dialog";
    const enlarged = document.createElement("img");
    enlarged.src = image.src;
    enlarged.alt = image.alt;
    enlarged.style.width = "100%";
    const close = document.createElement("button");
    close.className = "dialog-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Закрыть");
    close.addEventListener("click", () => dialog.close());
    dialog.append(close, enlarged);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    close.focus();
  }
  function ensureParagraphIds() {
    let number = 1;
    for (const paragraph of content.querySelectorAll("p")) {
      if (!paragraph.id) paragraph.id = `paragraph-${String(number).padStart(3, "0")}`;
      number += 1;
    }
  }
  function observeParagraphs() {
    paragraphObserver?.disconnect();
    const paragraphs = content.querySelectorAll("p[id]");
    if (!("IntersectionObserver" in window)) return;
    paragraphObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) currentParagraphId = visible.target.id;
    }, { rootMargin: "-12% 0px -72% 0px" });
    paragraphs.forEach((paragraph) => paragraphObserver.observe(paragraph));
  }
  function queueSaveProgress() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveProgress, 250);
  }
  function saveProgress() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    progress = { volumeId: activeVolume.id, chapterId: activeChapter.id, paragraphId: currentParagraphId, ratio, savedAt: Date.now() };
    writeStored("progress", progress);
    if (ratio >= .98) {
      const completed = readStored("completedChapters", []);
      const key = `${activeVolume.id}:${activeChapter.id}`;
      if (!completed.includes(key)) writeStored("completedChapters", [...completed, key]);
    }
  }
  function syncAddress() {
    const url = new URL(window.location.href);
    url.searchParams.set("volume", activeVolume.id);
    url.searchParams.set("chapter", activeChapter.id);
    history.replaceState(null, "", url);
  }
  function getAllChapters() {
    return volumes.flatMap((volume) => volume.chapters.map((chapter) => ({ volume, chapter })));
  }
  function getChapterPosition() {
    return getAllChapters().findIndex((item) => item.volume.id === activeVolume.id && item.chapter.id === activeChapter.id);
  }
  function moveChapter(direction) {
    const target = getAllChapters()[getChapterPosition() + direction];
    if (!target) return;
    activeVolume = target.volume;
    activeChapter = target.chapter;
    volumeSelect.value = activeVolume.id;
    populateChapters();
    currentParagraphId = "";
    loadChapter();
  }
  function toggleBookmark() {
    const paragraph = currentParagraphId || content.querySelector("p[id]")?.id;
    if (!paragraph) return;
    const bookmarks = readStored("bookmarks", []);
    const exists = bookmarks.some((item) => item.volumeId === activeVolume.id && item.chapterId === activeChapter.id && item.paragraphId === paragraph);
    const updated = exists
      ? bookmarks.filter((item) => !(item.volumeId === activeVolume.id && item.chapterId === activeChapter.id && item.paragraphId === paragraph))
      : [...bookmarks, { volumeId: activeVolume.id, chapterId: activeChapter.id, paragraphId: paragraph, label: `Том ${activeVolume.number} · ${activeChapter.title}`, createdAt: Date.now() }];
    writeStored("bookmarks", updated);
    renderBookmarks();
    document.querySelector("#bookmark-toggle").textContent = exists ? "☆ Закладка" : "★ Закладка";
  }
  function renderBookmarks() {
    const root = document.querySelector("#bookmarks");
    if (!root) return;
    const bookmarks = readStored("bookmarks", []);
    root.innerHTML = bookmarks.length ? "" : '<p class="muted">Сохранённых закладок пока нет.</p>';
    bookmarks.forEach((bookmark, index) => {
      const row = document.createElement("div");
      row.className = "bookmark-entry";
      const jump = document.createElement("button");
      jump.type = "button";
      jump.textContent = bookmark.label;
      jump.addEventListener("click", async () => {
        activeVolume = volumes.find((volume) => volume.id === bookmark.volumeId) || volumes[0];
        activeChapter = activeVolume.chapters.find((chapter) => chapter.id === bookmark.chapterId) || activeVolume.chapters[0];
        volumeSelect.value = activeVolume.id;
        populateChapters();
        await loadChapter();
        document.getElementById(bookmark.paragraphId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Удалить";
      remove.setAttribute("aria-label", `Удалить закладку ${bookmark.label}`);
      remove.addEventListener("click", () => {
        writeStored("bookmarks", readStored("bookmarks", []).filter((_, itemIndex) => itemIndex !== index));
        renderBookmarks();
      });
      row.append(jump, remove);
      root.append(row);
    });
  }
  function updateSetting(key, value) {
    settings[key] = value;
    writeStored("settings", settings);
    applySettings();
  }
  function applySettings() {
    const shell = document.querySelector(".reader-shell");
    shell.style.setProperty("--reader-size", `${settings.fontSize}px`);
    shell.style.setProperty("--reader-leading", String(settings.lineHeight));
    shell.style.setProperty("--reader-width", `${settings.columnWidth}px`);
    shell.style.setProperty("--reader-font", settings.font === "sans" ? "var(--sans)" : "var(--serif)");
    shell.dataset.theme = settings.theme;
    document.querySelector("#font-size").value = settings.fontSize;
    document.querySelector("#line-height").value = Math.round(settings.lineHeight * 10);
    document.querySelector("#column-width").value = settings.columnWidth;
    document.querySelector("#reader-font").value = settings.font;
    document.querySelector("#reader-theme").value = settings.theme;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
