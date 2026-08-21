export const STATE_SCHEMA_VERSION = 2;

export const DEFAULT_STATE = {
  schemaVersion: STATE_SCHEMA_VERSION,
  systemNotice: '',
  scene: 'intro',
  decisions: [],
  ledger: [],
  flags: {
    miningCount: 0,
    miningMinutes: 0,
    miningBUses: 0,
    miningWarning: false,
    miningIncidentChoice: null,
    miningRiskLevel: 0,
    miningForcedInspection: false,
    miningInspectionCount: 0,
    factoryChoice: null,
    serverSteps: [],
    dcCoolingChoice: null,
    dcCoolingRestored: false,
    dataOrigins: [],
    dataIndex: 0,
    dataReviewMinutes: 0,
    dataFollowup: null,
    dataStatuses: [],
    dataChecks: [],
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
    deployLoad: null,
    deployTabs: [],
    deployRecovery: null,
    supportIndex: 0,
    supportFeedbackLabel: '',
    supportFeedbackDetail: '',
    transferChoice: null
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
