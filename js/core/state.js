export const STATE_SCHEMA_VERSION = 5;

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
    factoryMaintenanceDebt: false,
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
    dataSort: { keep: 0, remove: 0, redact: 0, review: 0 },
    dataTrainingApproved: [],
    dataTrainingUsed: [],
    dataCurrentTrainingUsed: [],
    dataTrainingHeld: [],
    annotationResults: [],
    annotationUnpaidMinutes: 0,
    tookBreak: false,
    breakDecisionMade: false,
    candidateRevision: 0,
    trainingCompute: '12',
    trainingCheckpoint: 'validated',
    trainingIncidentChoice: null,
    evaluatorCalibrationComplete: false,
    checkpointEvalComplete: false,
    evalIndex: 0,
    evalCorrectCount: 0,
    evalFeedback: null,
    safetyChoice: null,
    safetyRemediated: false,
    safetyRetested: false,
    releaseGates: [],
    extraChecks: [],
    deferredExtraChecks: [],
    monitoringChecksCompleted: [],
    launchChoice: null,
    deployLoad: null,
    deployFailoverChecks: [],
    deployTabs: [],
    deployRecovery: null,
    supportIndex: 0,
    supportFeedbackLabel: '',
    supportFeedbackDetail: '',
    transferChoice: null
  }
};

export function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function escapeHtml(value = '') {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return String(value).replace(/[&<>'"]/g, character => entities[character]);
}

export function replaceObjectContents(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
  return target;
}

export function resetCandidateEvidence(state) {
  const f=state.flags;
  f.trainingIncidentChoice=null;
  f.evaluatorCalibrationComplete=false;
  f.checkpointEvalComplete=false;
  f.evalIndex=0;
  f.evalCorrectCount=0;
  f.evalFeedback=null;
  f.safetyChoice=null;
  f.safetyRemediated=false;
  f.safetyRetested=false;
  f.releaseGates=[];
  f.extraChecks=[];
  f.deferredExtraChecks=[];
  f.monitoringChecksCompleted=[];
  f.launchChoice=null;
  f.deployLoad=null;
  f.deployFailoverChecks=[];
  f.deployTabs=[];
  f.deployRecovery=null;
  f.supportIndex=0;
  f.supportFeedbackLabel='';
  f.supportFeedbackDetail='';
  f.transferChoice=null;
  // decisions وledger تاريخ لما حدث فعلًا؛ تصفير هذه الحقول يمنع إعادة استخدام
  // أدلة revision سابقة في نسخة جديدة. إنشاء revision نفسها يحدث فقط عند بدء trainingRun.
}
