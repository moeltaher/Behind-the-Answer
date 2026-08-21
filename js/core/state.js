export const DEFAULT_STATE = {
  scene: 'intro',
  chapter: 0,
  metrics: {
    pressure: 50,
    cost: 50,
    burden: 42,
    quality: 62,
    visibility: 20
  },
  decisions: [],
  ledger: [],
  flags: {
    miningCount: 0,
    miningWarning: false,
    miningStopped: false,
    factoryPPE: [],
    factoryChoice: null,
    serverSteps: [],
    revealedWorkers: [],
    dataOrigins: [],
    dataIndex: 0,
    dataSort: {
      keep: 0,
      remove: 0,
      review: 0
    },
    annotationIndex: 0,
    annotationCounts: {
      accepted: 0,
      pending: 0,
      rejected: 0
    },
    tookBreak: false,
    trainingConfigured: false,
    evalIndex: 0,
    deployTabs: [],
    supportIndex: 0,
    finalEnding: null
  }
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function escapeHtml(value = '') {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  };

  return String(value).replace(/[&<>'"]/g, character => entities[character]);
}

export function replaceObjectContents(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
  return target;
}
