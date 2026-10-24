const STORAGE_KEYS = {
  settings: "fmth-settings",
  progress: "fmth-progress",
  bookmarks: "fmth-bookmarks",
  completedChapters: "fmth-completed-chapters",
  player: "fmth-player",
  atmosphere: "fmth-atmosphere",
  language: "fmth-language"
};

export function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(STORAGE_KEYS[key]);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`Could not read saved ${key} data.`, error);
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} data.`, error);
    window.dispatchEvent(new CustomEvent("storage-warning", { detail: { key } }));
    return false;
  }
}

export function getStorageKeys() {
  return { ...STORAGE_KEYS };
}

export async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json();
}
