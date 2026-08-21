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
  DATASET: 'بيانات مجهزة للتطوير',
  LABELS: 'أمثلة صنفها البشر',
  MODEL: 'نسخة مدرَّبة من النموذج',
  'HUMAN FEEDBACK': 'تقييمات بشرية لإجابات النموذج',
  UPTIME: 'الخدمة متاحة للمستخدمين',
  'AI OUTPUT': 'الإجابة التي يراها المستخدم'
};

function migrateState(saved) {
  if (!saved || typeof saved !== 'object') return {};

  if (saved.scene === 'introError') saved.scene = 'introExplain';

  if (Array.isArray(saved.ledger)) {
    saved.ledger = saved.ledger.map(entry => ({
      ...entry,
      system: LEGACY_LABELS[entry.system] || entry.system
    }));
  }

  if (saved.flags?.trainingCheckpoint === 'older') {
    saved.flags.trainingCheckpoint = 'validated';
  }
  if (saved.flags?.trainingCheckpoint === 'latest') {
    saved.flags.trainingCheckpoint = 'recent';
  }

  if (saved.metrics) {
    delete saved.metrics.visibility;
    delete saved.metrics.discovery;
    // The old single quality score mixed unrelated causal dimensions.
    // New split metrics intentionally start from their documented defaults.
    delete saved.metrics.quality;
  }

  if (saved.flags) {
    delete saved.flags.finalEnding;

    // Saves made before per-task annotation results cannot be reconciled
    // reliably with accepted/rejected pay. Restart only this stage's task data.
    if (saved.flags.annotationAnswered > 0 && !Array.isArray(saved.flags.annotationResults)) {
      saved.flags.annotationIndex = 0;
      saved.flags.annotationCorrect = 0;
      saved.flags.annotationAnswered = 0;
      saved.flags.annotationResults = [];
      saved.flags.annotationCounts = { accepted: 0, pending: 0, rejected: 0 };
    }
  }

  return saved;
}

function numericMetrics(defaults, savedMetrics) {
  const result = { ...defaults };
  if (!savedMetrics || typeof savedMetrics !== 'object') return result;

  for (const key of Object.keys(defaults)) {
    const value = savedMetrics[key];
    if (Number.isFinite(value)) result[key] = Math.max(0, Math.min(100, value));
  }
  return result;
}

function mergeState(defaultState, savedState) {
  const defaults = clone(defaultState);
  const saved = migrateState(savedState);
  const savedFlags = saved.flags && typeof saved.flags === 'object' ? saved.flags : {};

  return {
    ...defaults,
    ...saved,
    scene: typeof saved.scene === 'string' ? saved.scene : defaults.scene,
    chapter: Number.isInteger(saved.chapter) ? saved.chapter : defaults.chapter,
    metrics: numericMetrics(defaults.metrics, saved.metrics),
    flags: {
      ...defaults.flags,
      ...savedFlags,
      factoryPPE: Array.isArray(savedFlags.factoryPPE) ? savedFlags.factoryPPE : defaults.flags.factoryPPE,
      serverSteps: Array.isArray(savedFlags.serverSteps) ? savedFlags.serverSteps : defaults.flags.serverSteps,
      revealedWorkers: Array.isArray(savedFlags.revealedWorkers) ? savedFlags.revealedWorkers : defaults.flags.revealedWorkers,
      dataOrigins: Array.isArray(savedFlags.dataOrigins) ? savedFlags.dataOrigins : defaults.flags.dataOrigins,
      deployTabs: Array.isArray(savedFlags.deployTabs) ? savedFlags.deployTabs : defaults.flags.deployTabs,
      annotationResults: Array.isArray(savedFlags.annotationResults) ? savedFlags.annotationResults : defaults.flags.annotationResults,
      dataSort: {
        ...defaults.flags.dataSort,
        ...(savedFlags.dataSort && typeof savedFlags.dataSort === 'object' ? savedFlags.dataSort : {})
      },
      annotationCounts: {
        ...defaults.flags.annotationCounts,
        ...(savedFlags.annotationCounts && typeof savedFlags.annotationCounts === 'object' ? savedFlags.annotationCounts : {})
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
