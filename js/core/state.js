export const DEFAULT_STATE = {
  scene: 'intro',
  metrics: {
    pressure: 50,
    cost: 50,
    burden: 42,
    dataQuality: 62,
    reliability: 62,
    serviceQuality: 62
  },
  decisions: [],
  ledger: [],
  flags: {
    miningCount: 0,
    miningWarning: false,
    miningIncidentChoice: null,
    factoryChoice: null,
    serverSteps: [],
    dcCoolingChoice: null,
    revealedWorkers: [],
    dataOrigins: [],
    dataIndex: 0,
    dataSort: {
      keep: 0,
      remove: 0,
      redact: 0,
      review: 0
    },
    annotationResults: [],
    tookBreak: false,
    trainingCompute: '12',
    trainingCheckpoint: 'validated',
    trainingIncidentChoice: null,
    evalIndex: 0,
    evalCorrectCount: 0,
    evalFeedback: null,
    safetyChoice: null,
    launchChoice: null,
    deployTabs: [],
    deployRecovery: null,
    supportIndex: 0
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
