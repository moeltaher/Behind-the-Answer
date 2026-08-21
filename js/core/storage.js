import { clone } from './state.js';

export const STORAGE_KEY = 'behindTheAnswerGame_v1';
export const SETTINGS_KEY = 'behindTheAnswerSettings_v1';

export const DEFAULT_SETTINGS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  soundOn: false
};

function restoreCurrentShape(template, saved) {
  if (Array.isArray(template)) {
    return Array.isArray(saved) ? saved : clone(template);
  }

  if (template && typeof template === 'object') {
    const source = saved && typeof saved === 'object' && !Array.isArray(saved)
      ? saved
      : {};
    const restored = {};

    for (const [key, value] of Object.entries(template)) {
      restored[key] = restoreCurrentShape(value, source[key]);
    }

    return restored;
  }

  return typeof saved === typeof template ? saved : template;
}

export function loadState(defaultState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(defaultState);
    return restoreCurrentShape(defaultState, JSON.parse(raw));
  } catch {
    return clone(defaultState);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The game remains usable when local storage is unavailable.
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return restoreCurrentShape(DEFAULT_SETTINGS, JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are optional; the game still works without persistence.
  }
}
