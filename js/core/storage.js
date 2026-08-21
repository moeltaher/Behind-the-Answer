import { clone } from './state.js';

export const STORAGE_KEY = 'behindTheAnswerGame';
export const SETTINGS_KEY = 'behindTheAnswerSettings';

export const DEFAULT_SETTINGS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  soundOn: false
};

const STATE_NULLABLE_VALIDATORS = {
  factoryChoice: value => typeof value === 'string',
  trainingIncidentChoice: value => typeof value === 'string',
  evalFeedback: value => (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 2 &&
    typeof value.choice === 'string' &&
    typeof value.correct === 'boolean'
  ),
  safetyChoice: value => typeof value === 'string',
  launchChoice: value => typeof value === 'string',
  deployRecovery: value => typeof value === 'string'
};

function hasExactShape(template, value, key = '') {
  if (Array.isArray(template)) return Array.isArray(value);

  if (template === null) {
    if (value === null) return true;
    const validate = STATE_NULLABLE_VALIDATORS[key];
    return validate ? validate(value) : false;
  }

  if (typeof template === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

    const templateKeys = Object.keys(template);
    const valueKeys = Object.keys(value);
    if (templateKeys.length !== valueKeys.length) return false;

    return templateKeys.every(childKey =>
      Object.hasOwn(value, childKey) && hasExactShape(template[childKey], value[childKey], childKey)
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
