export const STATE_SCHEMA_VERSION = 7;

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
    miningInspectionMode: null,
    factoryChoice: null,
    factoryMaintenanceDebt: false,
    factoryRemediationStage: 'none',
    factoryDisposition: null,
    factoryProductionComplete: false,
    serverSteps: [],
    dcCoolingChoice: null,
    dcCoolingRestored: false,
    dataOrigins: [],
    dataIndex: 0,
    dataReviewMinutes: 0,
    dataFollowup: null,
    dataFollowupResolved: false,
    dataStatuses: [],
    dataChecks: [],
    dataFeedbackLabel: '',
    dataFeedbackDetail: '',
    dataSort: { keep: 0, remove: 0, redact: 0, review: 0 },
    dataTrainingApproved: [],
    dataTrainingUsed: [],
    dataCurrentTrainingUsed: [],
    dataTrainingHeld: [],
    governanceEvidenceOpened: [],
    annotationResults: [],
    annotationUnpaidMinutes: 0,
    breakDecisionMade: false,
    candidateRevision: 0,
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
    releaseCapacityStage: 'idle',
    extraChecks: [],
    deferredExtraChecks: [],
    monitoringChecksCompleted: [],
    launchChoice: null,
    deployDraftLoad: null,
    deployLoad: null,
    deployFailoverChecks: [],
    deployResilienceAccepted: false,
    deployTrafficOpen: false,
    deployMonitoringOpened: false,
    deployTabs: [],
    deployRecovery: null,
    deployRecoveryVerifiedFor: null,
    deployRecoveryDisposition: null,
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
  f.governanceEvidenceOpened=[];
  f.releaseGates=[];
  f.releaseCapacityStage='idle';
  f.extraChecks=[];
  f.deferredExtraChecks=[];
  f.monitoringChecksCompleted=[];
  f.launchChoice=null;
  f.deployDraftLoad=null;
  f.deployLoad=null;
  f.deployFailoverChecks=[];
  f.deployResilienceAccepted=false;
  f.deployTrafficOpen=false;
  f.deployMonitoringOpened=false;
  f.deployTabs=[];
  f.deployRecovery=null;
  f.deployRecoveryVerifiedFor=null;
  f.deployRecoveryDisposition=null;
  f.supportIndex=0;
  f.supportFeedbackLabel='';
  f.supportFeedbackDetail='';
  f.transferChoice=null;
  // decisions وledger يظلان تاريخًا لما حدث فعلًا، ولا يستخدمان كبديل عن حالة التشغيل الحالية.
}
