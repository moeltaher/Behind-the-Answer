import { STATE_SCHEMA_VERSION, clone } from './state.js';

export const STORAGE_KEY = 'behindTheAnswerGame';
export const SETTINGS_KEY = 'behindTheAnswerSettings';

export const DEFAULT_SETTINGS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  soundOn: false
};

const SCENES = new Set([
  'intro','zoomOut','ch1Intro','mineOrientation','mineTask','mineInspection','mineEnd','abstract1',
  'ch2Intro','factoryOrientation','factoryMonitor','factoryIncident','factoryOutcome','abstract2',
  'ch3Intro','dcInstall','dcCooling','dcCoolingOutcome','dcWorkers','abstract3',
  'ch4Intro','dataOrigins','dataClean','dataFollowup','dataCleanSummary','abstract4',
  'ch5Intro','annotationIntro','annotationTask','annotationReview','annotationEnd','abstract5',
  'ch6Intro','trainingSetup','trainingRun','trainingEval','abstract6',
  'ch7Intro','evalTask','checkpointEval','safetyTest','safetyOutcome','safetyRetest','launchDecision','launchOutcome','abstract7',
  'ch8Intro','deployLoad','deployIncident','onCall','supportTask','deployEnd','abstract8',
  'pipelineAssemble','transferChallenge','finalAnswer','results','finalMessage'
]);
const SERVER_STEPS = new Set(['rack','power','network','register']);
const DATA_STATUSES = new Set(['ready','pending','excluded']);
const CHECK_VALUES = new Set(['clear','unresolved','na']);
const ANNOTATION_CHOICES = new Set(['آمن','عنف','مضايقة أو إساءة','خطاب كراهية','إيذاء النفس','غير واضح']);
const DEPLOY_TABS = new Set(['network','compute','model']);
const DATA_ORIGINS = new Set(['writer','photo','code','research','forum','translate','docs','qa','web','comment','manual','news']);
const RELEASE_GATES = new Set(['regression','capacity','risk','rollback']);
const EXTRA_CHECKS = new Set(['checkpoint','stability']);
const DEPLOY_LIMITS = [60,45,35];
const V2_REWIND_SCENES = new Set([
  'ch6Intro','trainingSetup','trainingRun','trainingEval','abstract6','ch7Intro','evalTask','safetyTest','safetyOutcome','safetyRetest',
  'launchDecision','launchOutcome','abstract7','ch8Intro','deployLoad','deployIncident','onCall','supportTask','deployEnd','abstract8',
  'pipelineAssemble','transferChallenge','finalAnswer','results','finalMessage'
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isPlainObject(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function uniqueAllowedStrings(value, allowed) {
  return Array.isArray(value) && new Set(value).size === value.length && value.every(item => typeof item === 'string' && allowed.has(item));
}

function uniqueIndices(value, max) {
  return Array.isArray(value) && new Set(value).size === value.length && value.every(item => Number.isInteger(item) && item >= 0 && item < max);
}

function validDecision(value) {
  return exactKeys(value,['id','label','effectText']) && ['id','label','effectText'].every(key => typeof value[key] === 'string');
}

function validLedger(value) {
  return exactKeys(value,['chapter','human','work','system','details']) && Number.isInteger(value.chapter) && value.chapter >= 0 && value.chapter < 8 && ['human','work','system','details'].every(key => typeof value[key] === 'string');
}

function validCheck(value) {
  return exactKeys(value,['rights','privacy','fitness']) && [value.rights,value.privacy,value.fitness].every(item => CHECK_VALUES.has(item));
}

function validAnnotationResult(value) {
  return exactKeys(value,['index','choice','acceptedAsReasonable','pending','reviewRejected','disputed']) &&
    Number.isInteger(value.index) && value.index >= 0 && value.index < 6 && ANNOTATION_CHOICES.has(value.choice) &&
    ['acceptedAsReasonable','pending','reviewRejected','disputed'].every(key => typeof value[key] === 'boolean');
}

function validNullableChoice(value, allowed) {
  return value === null || allowed.includes(value);
}

function validServerSequence(steps) {
  if (!uniqueAllowedStrings(steps,SERVER_STEPS)) return false;
  if (!steps.length) return true;
  if (steps[0] !== 'rack') return false;
  const registerIndex=steps.indexOf('register');
  if (registerIndex !== -1) {
    if (registerIndex !== steps.length - 1) return false;
    if (!steps.includes('power') || !steps.includes('network')) return false;
  }
  if (steps.includes('power') && steps.indexOf('power') === 0) return false;
  if (steps.includes('network') && steps.indexOf('network') === 0) return false;
  return true;
}

function unresolvedReadyIndices(flags) {
  const indices=[];
  flags.dataStatuses.forEach((status,index)=>{
    const check=flags.dataChecks[index];
    if(status==='ready' && check && Object.values(check).includes('unresolved')) indices.push(index);
  });
  return indices;
}

function exposedUnresolvedIndices(flags) {
  return flags.dataTrainingUsed.filter(index=>flags.dataStatuses[index]==='ready' && flags.dataChecks[index] && Object.values(flags.dataChecks[index]).includes('unresolved'));
}

function neededExtraChecks(flags) {
  const result=[];
  if(flags.trainingCheckpoint==='recent') result.push('checkpoint');
  if(flags.trainingCompute==='8' && flags.trainingIncidentChoice==='continue') result.push('stability');
  return result;
}

function validStateInvariants(state) {
  const f=state.flags;
  if (!validServerSequence(f.serverSteps)) return false;
  if (f.dataStatuses.length !== f.dataIndex || f.dataChecks.length !== f.dataIndex) return false;
  if (f.dataFollowup && f.dataFollowup.index !== f.dataIndex) return false;
  if (f.dataSort.keep + f.dataSort.remove + f.dataSort.redact + f.dataSort.review < f.dataIndex) return false;
  const annotationIndices=f.annotationResults.map(result=>result.index);
  if (new Set(annotationIndices).size !== annotationIndices.length || !annotationIndices.every((value,index)=>value===index)) return false;
  if (f.evalCorrectCount > f.evalIndex + (f.evalFeedback?.correct ? 1 : 0)) return false;
  if (f.safetyRetested && (!f.safetyRemediated || f.safetyChoice === null)) return false;
  if (f.dcCoolingChoice === 'stop' && !f.dcCoolingRestored) return false;
  if (f.miningForcedInspection && !f.miningWarning) return false;
  if (f.factoryMaintenanceDebt !== (f.factoryChoice === 'continue')) return false;
  if (f.deployLoad && f.deployLoad.some((value,index)=>value>DEPLOY_LIMITS[index])) return false;
  if (f.deployRecovery !== null && (!f.deployLoad || f.deployTabs.length !== 3 || f.deployFailoverChecks.length !== 3)) return false;
  if (f.supportIndex > 0 && f.deployRecovery === null) return false;
  if (f.transferChoice !== null && (f.deployRecovery === null || f.supportIndex < 2)) return false;

  const overlap=f.dataTrainingUsed.filter(index=>f.dataTrainingHeld.includes(index));
  if(overlap.length) return false;
  const unresolved=unresolvedReadyIndices(f);
  const reviewed=new Set([...f.dataTrainingUsed,...f.dataTrainingHeld]);
  if(f.trainingIncidentChoice !== null && unresolved.some(index=>!reviewed.has(index))) return false;
  if(f.dataTrainingUsed.some(index=>index>=f.dataIndex) || f.dataTrainingHeld.some(index=>index>=f.dataIndex)) return false;

  if(f.safetyChoice !== null && !f.checkpointEvalComplete) return false;
  if(f.launchChoice !== null) {
    if(!f.safetyRetested || f.releaseGates.length !== RELEASE_GATES.size) return false;
    if(exposedUnresolvedIndices(f).length) return false;
    if(f.launchChoice==='delay' && neededExtraChecks(f).some(id=>!f.extraChecks.includes(id))) return false;
  }
  return true;
}

function validState(state) {
  if (!exactKeys(state,['schemaVersion','systemNotice','scene','decisions','ledger','flags']) || state.schemaVersion !== STATE_SCHEMA_VERSION || typeof state.systemNotice !== 'string') return false;
  if (!SCENES.has(state.scene) || !Array.isArray(state.decisions) || !state.decisions.every(validDecision) || !Array.isArray(state.ledger) || !state.ledger.every(validLedger)) return false;
  const f=state.flags;
  const keys=[
    'miningCount','miningMinutes','miningBUses','miningWarning','miningIncidentChoice','miningRiskLevel','miningForcedInspection','miningInspectionCount',
    'factoryChoice','factoryMaintenanceDebt','serverSteps','dcCoolingChoice','dcCoolingRestored','dataOrigins','dataIndex','dataReviewMinutes','dataFollowup','dataStatuses','dataChecks','dataFeedbackLabel','dataFeedbackDetail','dataSort','dataTrainingUsed','dataTrainingHeld',
    'annotationResults','annotationUnpaidMinutes','tookBreak','breakDecisionMade','trainingCompute','trainingCheckpoint','trainingIncidentChoice','checkpointEvalComplete','evalIndex','evalCorrectCount','evalFeedback',
    'safetyChoice','safetyRemediated','safetyRetested','releaseGates','extraChecks','launchChoice','deployLoad','deployFailoverChecks','deployTabs','deployRecovery','supportIndex','supportFeedbackLabel','supportFeedbackDetail','transferChoice'
  ];
  if (!exactKeys(f,keys)) return false;
  if (![f.miningCount,f.miningMinutes,f.miningBUses,f.miningRiskLevel,f.miningInspectionCount,f.dataIndex,f.dataReviewMinutes,f.annotationUnpaidMinutes,f.evalIndex,f.evalCorrectCount,f.supportIndex].every(Number.isInteger)) return false;
  if (f.miningCount < 0 || f.miningCount > 12 || f.miningMinutes < 0 || f.miningBUses < 0 || f.miningRiskLevel < 0 || f.miningInspectionCount < 0 || f.miningInspectionCount > 2) return false;
  if (![f.miningWarning,f.miningForcedInspection,f.factoryMaintenanceDebt,f.dcCoolingRestored,f.tookBreak,f.breakDecisionMade,f.checkpointEvalComplete,f.safetyRemediated,f.safetyRetested].every(value => typeof value === 'boolean')) return false;
  if (!validNullableChoice(f.miningIncidentChoice,['stop','continue']) || !validNullableChoice(f.factoryChoice,['stop','continue']) || !validNullableChoice(f.dcCoolingChoice,['move','stop'])) return false;
  if (!validServerSequence(f.serverSteps)) return false;
  if (!uniqueAllowedStrings(f.dataOrigins,DATA_ORIGINS)) return false;
  if (f.dataIndex < 0 || f.dataIndex > 5 || f.dataReviewMinutes < 0) return false;
  if (f.dataFollowup !== null && !(exactKeys(f.dataFollowup,['index','reason']) && Number.isInteger(f.dataFollowup.index) && f.dataFollowup.index >= 0 && f.dataFollowup.index < 5 && typeof f.dataFollowup.reason === 'string')) return false;
  if (!Array.isArray(f.dataStatuses) || f.dataStatuses.length > 5 || !f.dataStatuses.every(status => DATA_STATUSES.has(status))) return false;
  if (!Array.isArray(f.dataChecks) || f.dataChecks.length > 5 || !f.dataChecks.every(value => value === null || validCheck(value))) return false;
  if (f.dataChecks.length !== f.dataStatuses.length) return false;
  if (typeof f.dataFeedbackLabel !== 'string' || typeof f.dataFeedbackDetail !== 'string') return false;
  if (!exactKeys(f.dataSort,['keep','remove','redact','review']) || !Object.values(f.dataSort).every(value => Number.isInteger(value) && value >= 0)) return false;
  if (!uniqueIndices(f.dataTrainingUsed,5) || !uniqueIndices(f.dataTrainingHeld,5)) return false;
  if (!Array.isArray(f.annotationResults) || f.annotationResults.length > 6 || !f.annotationResults.every(validAnnotationResult)) return false;
  if (f.annotationUnpaidMinutes < 0 || !['8','12'].includes(f.trainingCompute) || !['validated','recent'].includes(f.trainingCheckpoint) || !validNullableChoice(f.trainingIncidentChoice,['pause','continue'])) return false;
  if (f.evalIndex < 0 || f.evalIndex > 3 || f.evalCorrectCount < 0 || f.evalCorrectCount > 3) return false;
  if (f.evalFeedback !== null && !(exactKeys(f.evalFeedback,['choice','correct']) && ['a','b','tie','bad'].includes(f.evalFeedback.choice) && typeof f.evalFeedback.correct === 'boolean')) return false;
  if (!validNullableChoice(f.safetyChoice,['details','strict','none']) || !validNullableChoice(f.launchChoice,['ready','fast','delay'])) return false;
  if (!uniqueAllowedStrings(f.releaseGates,RELEASE_GATES) || !uniqueAllowedStrings(f.extraChecks,EXTRA_CHECKS)) return false;
  if (f.deployLoad !== null && !(Array.isArray(f.deployLoad) && f.deployLoad.length === 3 && f.deployLoad.every(value => Number.isInteger(value) && value >= 0 && value <= 100) && f.deployLoad.reduce((sum,value)=>sum+value,0) === 100)) return false;
  if (!uniqueIndices(f.deployFailoverChecks,3) || !uniqueAllowedStrings(f.deployTabs,DEPLOY_TABS) || !validNullableChoice(f.deployRecovery,['restart','rollback'])) return false;
  if (f.supportIndex < 0 || f.supportIndex > 2 || typeof f.supportFeedbackLabel !== 'string' || typeof f.supportFeedbackDetail !== 'string') return false;
  if (!validNullableChoice(f.transferChoice,['history-each-time','build-use','interface-only'])) return false;
  return validStateInvariants(state);
}

function resetDownstreamForV3(migrated) {
  const f=migrated.flags;
  f.trainingIncidentChoice=null;
  f.checkpointEvalComplete=false;
  f.evalIndex=0;
  f.evalCorrectCount=0;
  f.evalFeedback=null;
  f.safetyChoice=null;
  f.safetyRemediated=false;
  f.safetyRetested=false;
  f.releaseGates=[];
  f.extraChecks=[];
  f.launchChoice=null;
  f.deployLoad=null;
  f.deployFailoverChecks=[];
  f.deployTabs=[];
  f.deployRecovery=null;
  f.supportIndex=0;
  f.supportFeedbackLabel='';
  f.supportFeedbackDetail='';
  f.transferChoice=null;
  migrated.decisions=migrated.decisions.filter(decision=>!(/^(training-|train-|checkpoint-|safety-|release-gate-|extra-check-|launch-|deploy-|support-)/.test(decision.id)));
  migrated.ledger=migrated.ledger.filter(entry=>entry.chapter<5);
}

function migrateV2State(defaultState, saved) {
  if (!isPlainObject(saved) || saved.schemaVersion !== 2 || !isPlainObject(saved.flags)) return null;
  const migrated=clone(defaultState);
  try {
    migrated.scene=SCENES.has(saved.scene) ? saved.scene : 'intro';
    migrated.decisions=Array.isArray(saved.decisions) && saved.decisions.every(validDecision) ? clone(saved.decisions) : [];
    migrated.ledger=Array.isArray(saved.ledger) && saved.ledger.every(validLedger) ? clone(saved.ledger) : [];
    const oldKeys=['miningCount','miningMinutes','miningBUses','miningWarning','miningIncidentChoice','miningRiskLevel','miningForcedInspection','miningInspectionCount','factoryChoice','serverSteps','dcCoolingChoice','dcCoolingRestored','dataOrigins','dataIndex','dataReviewMinutes','dataFollowup','dataStatuses','dataChecks','dataFeedbackLabel','dataFeedbackDetail','dataSort','annotationResults','annotationUnpaidMinutes','tookBreak','breakDecisionMade','trainingCompute','trainingCheckpoint','trainingIncidentChoice','evalIndex','evalCorrectCount','evalFeedback','safetyChoice','safetyRemediated','safetyRetested','launchChoice','deployLoad','deployTabs','deployRecovery','supportIndex','supportFeedbackLabel','supportFeedbackDetail','transferChoice'];
    for(const key of oldKeys) if(Object.hasOwn(saved.flags,key)) migrated.flags[key]=clone(saved.flags[key]);
    migrated.flags.factoryMaintenanceDebt=migrated.flags.factoryChoice==='continue';
    migrated.flags.dataTrainingUsed=[];
    migrated.flags.dataTrainingHeld=[];
    migrated.flags.checkpointEvalComplete=false;
    migrated.flags.releaseGates=[];
    migrated.flags.extraChecks=[];
    migrated.flags.deployFailoverChecks=[];
    if(V2_REWIND_SCENES.has(migrated.scene)) {
      migrated.scene='trainingSetup';
      resetDownstreamForV3(migrated);
    }
    migrated.systemNotice='تم تحديث الحفظ من الإصدار 2 إلى الإصدار 3. احتفظت اللعبة بعملك السابق حتى مرحلة البيانات والتصنيف، وأعادتك إلى أقرب نقطة آمنة قبل جولة التطوير لأن الإصدار الجديد يضيف أهلية بيانات، وتقييم checkpoint، وأدلة إصدار واختبار failover لم تكن النسخة السابقة تحفظها.';
    return validState(migrated) ? migrated : null;
  } catch { return null; }
}

function legacyCheckForStatus(status) {
  if (status === 'excluded') return { rights:'na', privacy:'na', fitness:'na' };
  return { rights:'unresolved', privacy:'unresolved', fitness:'unresolved' };
}

function migrateLegacyState(defaultState, saved) {
  if (!isPlainObject(saved) || saved.schemaVersion !== undefined || !isPlainObject(saved.flags)) return null;
  const migrated=clone(defaultState);
  try {
    migrated.scene=SCENES.has(saved.scene) ? saved.scene : 'intro';
    migrated.decisions=Array.isArray(saved.decisions) && saved.decisions.every(validDecision) ? clone(saved.decisions) : [];
    migrated.ledger=Array.isArray(saved.ledger) && saved.ledger.every(validLedger) ? clone(saved.ledger) : [];
    for (const key of Object.keys(migrated.flags)) {
      if (['factoryMaintenanceDebt','dataChecks','dataTrainingUsed','dataTrainingHeld','deployLoad','deployFailoverChecks','miningRiskLevel','miningForcedInspection','miningInspectionCount','dcCoolingRestored','checkpointEvalComplete','releaseGates','extraChecks','transferChoice'].includes(key)) continue;
      if (Object.hasOwn(saved.flags,key)) migrated.flags[key]=clone(saved.flags[key]);
    }
    const oldStatuses=Array.isArray(saved.flags.dataStatuses) ? saved.flags.dataStatuses.filter(status=>DATA_STATUSES.has(status)).slice(0,5) : [];
    migrated.flags.dataStatuses=oldStatuses;
    migrated.flags.dataChecks=oldStatuses.map(legacyCheckForStatus);
    migrated.flags.dataIndex=oldStatuses.length;
    migrated.flags.factoryMaintenanceDebt=migrated.flags.factoryChoice==='continue';
    migrated.flags.dcCoolingRestored=saved.flags.dcCoolingChoice==='stop';
    if(V2_REWIND_SCENES.has(migrated.scene)) {
      migrated.scene='trainingSetup';
      resetDownstreamForV3(migrated);
    }
    migrated.systemNotice='تم تحديث الحفظ القديم إلى الإصدار 3. الحالات التي لم تكن النسخة السابقة تحفظ أدلتها أُعيدت إلى أقرب نقطة آمنة بدل افتراض اكتمالها.';
    return validState(migrated) ? migrated : null;
  } catch { return null; }
}

function withResetNotice(defaultState) {
  const fresh=clone(defaultState);
  fresh.systemNotice='تعذر قراءة الحفظ السابق بأمان بعد تحديث بنية اللعبة، لذلك بدأت جلسة جديدة بدل استخدام حالة قد تكون غير منطقية.';
  return fresh;
}

export function loadState(defaultState) {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(defaultState);
    const saved=JSON.parse(raw);
    if (validState(saved)) return saved;
    return migrateV2State(defaultState,saved) || migrateLegacyState(defaultState,saved) || withResetNotice(defaultState);
  } catch { return withResetNotice(defaultState); }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function systemDefaultSettings() {
  const reduceMotion=typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { ...DEFAULT_SETTINGS, reduceMotion };
}

function validSettings(value) {
  return exactKeys(value,Object.keys(DEFAULT_SETTINGS)) && Object.values(value).every(item => typeof item === 'boolean');
}

export function loadSettings() {
  const defaults=systemDefaultSettings();
  try {
    const raw=localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const saved=JSON.parse(raw);
    return validSettings(saved) ? saved : defaults;
  } catch { return defaults; }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
