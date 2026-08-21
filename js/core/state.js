export const DEFAULT_STATE = {
  scene: 'intro',
  decisions: [],
  ledger: [],
  flags: {
    miningCount: 0,
    miningMinutes: 0,
    miningBUses: 0,
    miningWarning: false,
    miningIncidentChoice: null,
    factoryChoice: null,
    serverSteps: [],
    dcCoolingChoice: null,
    dataOrigins: [],
    dataIndex: 0,
    dataReviewMinutes: 0,
    dataFollowup: null,
    dataStatuses: [],
    dataFeedbackLabel: '',
    dataFeedbackDetail: '',
    dataSort: {
      keep: 0,
      remove: 0,
      redact: 0,
      review: 0
    },
    annotationResults: [],
    annotationUnpaidMinutes: 0,
    tookBreak: false,
    breakDecisionMade: false,
    trainingCompute: '12',
    trainingCheckpoint: 'validated',
    trainingIncidentChoice: null,
    evalIndex: 0,
    evalCorrectCount: 0,
    evalFeedback: null,
    safetyChoice: null,
    safetyRemediated: false,
    safetyRetested: false,
    launchChoice: null,
    deployTabs: [],
    deployRecovery: null,
    supportIndex: 0,
    supportFeedbackLabel: '',
    supportFeedbackDetail: ''
  }
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
