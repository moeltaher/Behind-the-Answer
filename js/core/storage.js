import { clone } from './state.js';

export const STORAGE_KEY = 'behindTheAnswerGame_v1';
export const SETTINGS_KEY = 'behindTheAnswerSettings_v1';

export const DEFAULT_SETTINGS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  soundOn: false
};

const LEGACY_LABELS = {
  'RAW MATERIALS': 'مواد جاهزة للتصنيع',
  HARDWARE: 'مكونات إلكترونية جاهزة',
  COMPUTE: 'خوادم متاحة للتشغيل',
  DATASET: 'مجموعة بيانات جاهزة للتدريب',
  LABELS: 'أمثلة صنفها البشر',
  MODEL: 'نسخة مدرَّبة من النموذج',
  'HUMAN FEEDBACK': 'تقييمات بشرية لإجابات النموذج',
  UPTIME: 'الخدمة متاحة للمستخدمين',
  'AI OUTPUT': 'الإجابة التي يراها المستخدم'
};

function migrateState(saved) {
  if (!saved || typeof saved !== 'object') return {};

  if (Array.isArray(saved.ledger)) {
    saved.ledger = saved.ledger.map(entry => ({
      ...entry,
      system: LEGACY_LABELS[entry.system] || entry.system
    }));
  }

  return saved;
}

function mergeState(defaultState, savedState) {
  const defaults = clone(defaultState);
  const saved = migrateState(savedState);

  return {
    ...defaults,
    ...saved,
    metrics: {
      ...defaults.metrics,
      ...(saved.metrics || {})
    },
    flags: {
      ...defaults.flags,
      ...(saved.flags || {}),
      dataSort: {
        ...defaults.flags.dataSort,
        ...(saved.flags?.dataSort || {})
      },
      annotationCounts: {
        ...defaults.flags.annotationCounts,
        ...(saved.flags?.annotationCounts || {})
      }
    },
    decisions: Array.isArray(saved.decisions) ? saved.decisions : defaults.decisions,
    ledger: Array.isArray(saved.ledger) ? saved.ledger : defaults.ledger
  };
}

export function loadState(defaultState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(defaultState);
    return mergeState(defaultState, JSON.parse(raw));
  } catch {
    return clone(defaultState);
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable in private/restricted browser contexts.
  }
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
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
