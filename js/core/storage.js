import { clone } from './state.js';

export const STORAGE_KEY = 'behindTheAnswerGame';
export const SETTINGS_KEY = 'behindTheAnswerSettings';

export const DEFAULT_SETTINGS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  soundOn: false
};

function hasExactShape(template, value) {
  if (Array.isArray(template)) return Array.isArray(value);

  if (template && typeof template === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    const templateKeys = Object.keys(template);
    const valueKeys = Object.keys(value);
    if (templateKeys.length !== valueKeys.length) return false;

    return templateKeys.every(key =>
      Object.hasOwn(value, key) && hasExactShape(template[key], value[key])
    );
  }

  return typeof value === typeof template;
}

export function loadState(defaultState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(defaultState);

    const saved = JSON.parse(raw);
    return hasExactShape(defaultState, saved) ? saved : clone(defaultState);
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

    const saved = JSON.parse(raw);
    return hasExactShape(DEFAULT_SETTINGS, saved)
      ? saved
      : { ...DEFAULT_SETTINGS };
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
