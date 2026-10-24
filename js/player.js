import { loadJson, readStored, writeStored } from "./storage.js";

export async function initPlayer() {
  const mount = document.querySelector("#player-mount");
  if (!mount) return;
  const { tracks } = await loadJson("data/tracks.json");
  const saved = readStored("player", {});
  mount.innerHTML = `
    <section class="music-player" aria-label="Музыкальный плеер">
      <div class="player-art" aria-hidden="true">40</div>
      <div class="player-meta"><strong id="player-title">${tracks[0]?.title || "Музыка пока не добавлена"}</strong><span id="player-status">${tracks.length ? "Плеер готов" : "Добавьте аудиофайл в data/tracks.json"}</span></div>
      <button class="player-toggle" id="player-play" type="button" aria-label="Воспроизвести" ${tracks.length ? "" : "disabled"}>▶</button>
      <button class="player-expand" id="player-expand" type="button" aria-expanded="false" aria-label="Показать управление">⌄</button>
      <div class="player-expanded" id="player-expanded" hidden>
        <p id="player-track-name">${tracks[0]?.title || "Нет доступных треков"}</p>
        <div class="player-controls">
          <button type="button" id="player-previous" aria-label="Предыдущий трек" ${tracks.length ? "" : "disabled"}>|◀</button>
          <button type="button" id="player-next" aria-label="Следующий трек" ${tracks.length ? "" : "disabled"}>▶|</button>
          <button type="button" id="player-repeat" aria-pressed="${Boolean(saved.repeat)}">Повтор</button>
          <button type="button" id="player-mute" aria-pressed="${Boolean(saved.muted)}">Звук</button>
        </div>
        <label class="visually-hidden" for="player-seek">Позиция трека</label><input id="player-seek" type="range" min="0" max="100" value="0" disabled>
        <div class="player-time"><span id="player-current">0:00</span><span id="player-duration">0:00</span></div>
        <label class="volume-label" for="player-volume">Громкость</label><input id="player-volume" type="range" min="0" max="1" step=".01" value="${Number.isFinite(saved.volume) ? saved.volume : .7}" ${tracks.length ? "" : "disabled"}>
        <p class="player-message" id="player-message" aria-live="polite"></p>
      </div>
    </section>
    <audio id="audio-element" preload="metadata"></audio>`;

  const audio = document.querySelector("#audio-element");
  const play = document.querySelector("#player-play");
  const status = document.querySelector("#player-status");
  const message = document.querySelector("#player-message");
  const seek = document.querySelector("#player-seek");
  const volume = document.querySelector("#player-volume");
  let trackIndex = Number.isInteger(saved.trackIndex) ? saved.trackIndex : 0;
  let isSeeking = false;

  function savePlayer() {
    writeStored("player", { trackIndex, currentTime: audio.currentTime || saved.currentTime || 0, volume: audio.volume, muted: audio.muted, repeat: audio.loop });
  }
  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
  }
  function loadTrack() {
    const track = tracks[trackIndex];
    if (!track || !track.src) {
      audio.removeAttribute("src");
      audio.load();
      status.textContent = tracks.length ? "Для трека не указан файл" : "Добавьте аудиофайл в data/tracks.json";
      play.disabled = true;
      seek.disabled = true;
      volume.disabled = true;
      return;
    }
    audio.src = track.src;
    audio.load();
    document.querySelector("#player-title").textContent = track.title;
    document.querySelector("#player-track-name").textContent = track.title;
    status.textContent = "Готов к воспроизведению";
    play.disabled = false;
    seek.disabled = false;
    volume.disabled = false;
    const sameTrack = saved.trackIndex === trackIndex && Number.isFinite(saved.currentTime);
    audio.addEventListener("loadedmetadata", () => {
      document.querySelector("#player-duration").textContent = formatTime(audio.duration);
      if (sameTrack && saved.currentTime < audio.duration) audio.currentTime = saved.currentTime;
    }, { once: true });
  }
  audio.volume = Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : .7;
  audio.muted = Boolean(saved.muted);
  audio.loop = Boolean(saved.repeat);
  volume.value = String(audio.volume);
  loadTrack();

  play.addEventListener("click", async () => {
    if (!audio.src) return;
    if (audio.paused) {
      try {
        await audio.play();
        play.textContent = "Ⅱ";
        play.setAttribute("aria-label", "Пауза");
        status.textContent = "Воспроизводится";
      } catch (error) {
        message.textContent = `Не удалось воспроизвести файл: ${error.message}`;
      }
    } else {
      audio.pause();
      play.textContent = "▶";
      play.setAttribute("aria-label", "Воспроизвести");
    }
    savePlayer();
  });
  document.querySelector("#player-previous").addEventListener("click", () => changeTrack(-1));
  document.querySelector("#player-next").addEventListener("click", () => changeTrack(1));
  document.querySelector("#player-repeat").addEventListener("click", (event) => {
    audio.loop = !audio.loop;
    event.currentTarget.setAttribute("aria-pressed", String(audio.loop));
    savePlayer();
  });
  document.querySelector("#player-mute").addEventListener("click", (event) => {
    audio.muted = !audio.muted;
    event.currentTarget.setAttribute("aria-pressed", String(audio.muted));
    savePlayer();
  });
  document.querySelector("#player-expand").addEventListener("click", (event) => {
    const panel = document.querySelector("#player-expanded");
    panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
  });
  volume.addEventListener("input", () => { audio.volume = Number(volume.value); savePlayer(); });
  seek.addEventListener("input", () => {
    isSeeking = true;
    if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Number(seek.value) / 100;
  });
  seek.addEventListener("change", () => { isSeeking = false; savePlayer(); });
  audio.addEventListener("timeupdate", () => {
    if (!isSeeking && Number.isFinite(audio.duration)) seek.value = String(audio.currentTime / audio.duration * 100);
    document.querySelector("#player-current").textContent = formatTime(audio.currentTime);
    savePlayer();
  });
  audio.addEventListener("ended", () => { if (!audio.loop) changeTrack(1); });
  audio.addEventListener("error", () => { status.textContent = "Аудиофайл недоступен. Проверьте путь в data/tracks.json."; });

  function changeTrack(direction) {
    if (tracks.length < 1) return;
    trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
    saved.currentTime = 0;
    loadTrack();
    savePlayer();
  }
}
