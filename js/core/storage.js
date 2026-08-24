import { STATE_SCHEMA_VERSION, clone } from './state.js';
import { SCENE_ORDER } from '../data/stage-backgrounds.js';
import {
  DEPLOY_CAPACITY_LIMITS,
  hasUnresolved,
  unresolvedReadyIndices,
  exposedCurrentUnresolvedIndices,
  neededExtraChecks,
  confirmedAnnotations,
  hasResilienceResolution,
  recoveryDispositionComplete
} from '../domain/game-rules.js';
import {
  ANNOTATION_CHOICES,
  DATA_ORIGIN_IDS,
  DEPLOY_TAB_IDS,
  RELEASE_GATE_IDS,
  EXTRA_CHECK_IDS,
  FACTORY_REMEDIATION_STAGES,
  FACTORY_DISPOSITIONS,
  FACTORY_PRODUCTION_STAGES,
  MINING_INSPECTION_MODES,
  MINING_INSPECTION_STAGES,
  RELEASE_CAPACITY_STAGES,
  DC_COOLING_STAGES,
  TRAINING_RECOVERY_STAGES
} from '../domain/game-schema.js';

export const STORAGE_KEY='behindTheAnswerGame';
export const SETTINGS_KEY='behindTheAnswerSettings';
export const DEFAULT_SETTINGS={reduceMotion:false,highContrast:false,largeText:false,soundOn:false};

const SCENES=SCENE_ORDER,SCENE_SET=new Set(SCENES);
const SERVER_STEPS=new Set(['rack','power','network','register']);
const DATA_STATUSES=new Set(['ready','pending','excluded']);
const CHECK_VALUES=new Set(['clear','unresolved','na']);
const ANNOTATION_CHOICE_SET=new Set(ANNOTATION_CHOICES);
const DEPLOY_TAB_SET=new Set(DEPLOY_TAB_IDS);
const DATA_ORIGIN_SET=new Set(DATA_ORIGIN_IDS);
const RELEASE_GATE_SET=new Set(RELEASE_GATE_IDS);
const EXTRA_CHECK_SET=new Set(EXTRA_CHECK_IDS);
const FACTORY_REMEDIATION_SET=new Set(FACTORY_REMEDIATION_STAGES);
const FACTORY_DISPOSITION_SET=new Set(FACTORY_DISPOSITIONS);
const FACTORY_PRODUCTION_SET=new Set(FACTORY_PRODUCTION_STAGES);
const MINING_INSPECTION_MODE_SET=new Set(MINING_INSPECTION_MODES);
const MINING_INSPECTION_STAGE_SET=new Set(MINING_INSPECTION_STAGES);
const RELEASE_CAPACITY_STAGE_SET=new Set(RELEASE_CAPACITY_STAGES);
const DC_COOLING_STAGE_SET=new Set(DC_COOLING_STAGES);
const TRAINING_RECOVERY_STAGE_SET=new Set(TRAINING_RECOVERY_STAGES);
const from=scene=>new Set(SCENES.slice(SCENES.indexOf(scene)));
const FACTORY_DONE_OR_LATER=from('abstract2');
const DC_WORKERS_OR_LATER=from('dcWorkers');
const TRAINING_OR_LATER=from('trainingRun');
const AFTER_TRAINING=from('trainingEval');
const CHECKPOINT_OR_LATER=from('checkpointEval');
const SAFETY_OR_LATER=from('safetyTest');
const SAFETY_OUTCOME_OR_LATER=from('safetyOutcome');
const SAFETY_RETEST_OR_LATER=from('safetyRetest');
const READINESS_OR_LATER=from('governanceReview');
const LAUNCHED_OR_LATER=from('launchOutcome');
const TRAFFIC_OPEN_OR_LATER=from('deployMonitoring');
const DEPLOY_INCIDENT_OR_LATER=from('deployIncident');
const ONCALL_OR_LATER=from('onCall');
const SUPPORT_OR_LATER=from('supportTask');
const ENDING_OR_LATER=from('pipelineAssemble');
const RESULTS_OR_LATER=from('results');

function isPlainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function exactKeys(value,keys){return isPlainObject(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
function uniqueAllowedStrings(value,allowed){return Array.isArray(value)&&new Set(value).size===value.length&&value.every(item=>typeof item==='string'&&allowed.has(item));}
function uniqueIndices(value,max){return Array.isArray(value)&&new Set(value).size===value.length&&value.every(item=>Number.isInteger(item)&&item>=0&&item<max);}
function validNullableChoice(value,allowed){return value===null||allowed.includes(value);}
function validNullableSetChoice(value,allowed){return value===null||allowed.has(value);}
function validDecision(value){return exactKeys(value,['id','label','effectText'])&&['id','label','effectText'].every(key=>typeof value[key]==='string');}
function validLedger(value){return exactKeys(value,['chapter','human','work','system','details'])&&Number.isInteger(value.chapter)&&value.chapter>=0&&value.chapter<8&&['human','work','system','details'].every(key=>typeof value[key]==='string');}
function validCheck(value){return exactKeys(value,['rights','privacy','fitness'])&&[value.rights,value.privacy,value.fitness].every(item=>CHECK_VALUES.has(item));}
function validAnnotationResult(value){return exactKeys(value,['index','choice','acceptedAsReasonable','pending','reviewRejected','disputed'])&&Number.isInteger(value.index)&&value.index>=0&&value.index<6&&ANNOTATION_CHOICE_SET.has(value.choice)&&['acceptedAsReasonable','pending','reviewRejected','disputed'].every(key=>typeof value[key]==='boolean');}
function validServerSequence(steps){if(!uniqueAllowedStrings(steps,SERVER_STEPS))return false;if(!steps.length)return true;if(steps[0]!=='rack')return false;const register=steps.indexOf('register');if(register!==-1&&(register!==steps.length-1||!steps.includes('power')||!steps.includes('network')))return false;return !(steps.includes('power')&&steps.indexOf('power')===0)&&!(steps.includes('network')&&steps.indexOf('network')===0);}
function validLoad(values){return values===null||(Array.isArray(values)&&values.length===3&&values.every(value=>Number.isInteger(value)&&value>=0&&value<=100)&&values.reduce((sum,value)=>sum+value,0)===100);}

function sceneConsistent(state){
  const f=state.flags,s=state.scene;
  if(FACTORY_DONE_OR_LATER.has(s)&&(f.factoryProductionStage!=='inspected'||f.factoryDisposition===null||(f.factoryMaintenanceDebt&&f.factoryDisposition!=='carry')))return false;
  if(DC_WORKERS_OR_LATER.has(s)&&f.dcCoolingStage!=='verified')return false;
  if(TRAINING_OR_LATER.has(s)&&(f.candidateRevision<1||(f.dataCurrentTrainingUsed.length===0&&confirmedAnnotations(f)===0)))return false;
  if(AFTER_TRAINING.has(s)&&(f.trainingIncidentChoice===null||(f.trainingIncidentChoice==='pause'&&f.trainingRecoveryStage!=='verified')))return false;
  if(CHECKPOINT_OR_LATER.has(s)&&(f.evalIndex<3||!f.evaluatorCalibrationComplete))return false;
  if(SAFETY_OR_LATER.has(s)&&!f.checkpointEvalComplete)return false;
  if(SAFETY_OUTCOME_OR_LATER.has(s)&&f.safetyChoice===null)return false;
  if(SAFETY_RETEST_OR_LATER.has(s)&&!f.safetyRemediated)return false;
  if(READINESS_OR_LATER.has(s)&&!f.safetyRetested)return false;
  if(LAUNCHED_OR_LATER.has(s)&&f.launchChoice===null)return false;
  if(TRAFFIC_OPEN_OR_LATER.has(s)&&!f.deployTrafficOpen)return false;
  if(DEPLOY_INCIDENT_OR_LATER.has(s)&&(!f.deployLoad||f.deployFailoverChecks.length!==3||!hasResilienceResolution(state)||f.deferredExtraChecks.some(id=>!f.monitoringChecksCompleted.includes(id))))return false;
  if(ONCALL_OR_LATER.has(s)&&f.deployRecovery===null)return false;
  if(SUPPORT_OR_LATER.has(s)&&!recoveryDispositionComplete(state))return false;
  if(ENDING_OR_LATER.has(s)&&(!recoveryDispositionComplete(state)||f.supportIndex<2))return false;
  if(RESULTS_OR_LATER.has(s)&&f.transferChoice!=='build-use')return false;
  return true;
}

function validStateInvariants(state){
  const f=state.flags;
  if(!validServerSequence(f.serverSteps))return false;
  if(f.dataStatuses.length!==f.dataIndex||f.dataChecks.length!==f.dataIndex)return false;
  if(f.dataFollowup&&f.dataFollowup.index!==f.dataIndex)return false;
  const sortActions=f.dataSort.keep+f.dataSort.remove+f.dataSort.redact+f.dataSort.review;
  if(f.dataFollowup){if(sortActions!==f.dataIndex+1)return false;}else if(sortActions!==f.dataIndex&&sortActions!==f.dataIndex+1)return false;
  const annotationIndices=f.annotationResults.map(result=>result.index);
  if(new Set(annotationIndices).size!==annotationIndices.length||!annotationIndices.every((value,index)=>value===index))return false;
  if(f.evalCorrectCount>f.evalIndex+(f.evalFeedback?.correct?1:0))return false;
  if(f.safetyRetested&&(!f.safetyRemediated||f.safetyChoice===null))return false;

  if(f.miningForcedInspection&&!f.miningWarning)return false;
  if(f.miningInspectionStage==='idle'&&f.miningInspectionMode!==null)return false;
  if(f.miningInspectionStage!=='idle'&&f.miningInspectionMode===null)return false;
  if(['inspect','diagnosed','repaired'].includes(f.miningInspectionStage)&&f.miningWarning)return false;

  if(f.factoryChoice===null&&(f.factoryMaintenanceDebt||f.factoryRemediationStage!=='none'||f.factoryDisposition!==null||f.factoryProductionStage!=='idle'))return false;
  if(f.factoryChoice!==null&&f.factoryProductionStage==='idle')return false;
  if(f.factoryDisposition==='carry'&&(!f.factoryMaintenanceDebt||f.factoryChoice!=='continue'||f.factoryProductionStage!=='inspected'||f.factoryRemediationStage!=='none'))return false;
  if(['diagnosed','repaired'].includes(f.factoryRemediationStage)&&(!f.factoryMaintenanceDebt||f.factoryDisposition!=='repair'))return false;
  if(f.factoryRemediationStage==='verified'&&(f.factoryMaintenanceDebt||f.factoryDisposition!=='repair'))return false;
  if(f.factoryChoice==='stop'&&f.factoryDisposition!=='repair')return false;
  if(f.factoryChoice==='stop'&&['complete','inspected'].includes(f.factoryProductionStage)&&f.factoryRemediationStage!=='verified')return false;

  if(f.dcCoolingChoice===null&&f.dcCoolingStage!=='idle')return false;
  if(f.dcCoolingChoice!==null&&f.dcCoolingStage==='idle')return false;
  if(f.trainingIncidentChoice!=='pause'&&f.trainingRecoveryStage!=='none')return false;
  if(f.releaseGates.includes('capacity')&&f.releaseCapacityStage!=='remeasured')return false;
  if(!validLoad(f.deployDraftLoad)||!validLoad(f.deployLoad))return false;
  if(f.deployLoad&&f.deployLoad.some((value,index)=>value>DEPLOY_CAPACITY_LIMITS[index]))return false;
  if(f.deployDraftLoad&&f.deployDraftLoad.some((value,index)=>value>DEPLOY_CAPACITY_LIMITS[index]))return false;
  if(f.deployLoad!==null&&f.launchChoice===null)return false;
  if(f.deployResilienceAccepted&&(!f.deployLoad||f.deployFailoverChecks.length!==3))return false;
  if(f.deployTrafficOpen&&(!f.deployLoad||!hasResilienceResolution(state)))return false;
  if(f.deployMonitoringOpened&&(!f.deployTrafficOpen||!f.deferredExtraChecks.length))return false;
  if(f.deployRecovery!==null&&(!f.deployTrafficOpen||!f.deployLoad||f.deployTabs.length!==3||f.deployFailoverChecks.length!==3||f.launchChoice===null||!hasResilienceResolution(state)))return false;
  if(f.deployRecoveryVerifiedFor!==null&&f.deployRecoveryVerifiedFor!==f.deployRecovery)return false;
  if(f.deployRecovery==='restart'&&f.deployRecoveryDisposition==='cleared')return false;
  if(f.deployRecovery==='rollback'&&f.deployRecoveryDisposition==='monitor')return false;
  if(f.deployRecovery===null&&(f.deployRecoveryVerifiedFor!==null||f.deployRecoveryDisposition!==null))return false;
  if(f.supportIndex>0&&!recoveryDispositionComplete(state))return false;
  if(f.transferChoice!==null&&(!recoveryDispositionComplete(state)||f.supportIndex<2))return false;

  const allDataRefs=[...f.dataTrainingUsed,...f.dataTrainingApproved,...f.dataCurrentTrainingUsed,...f.dataTrainingHeld,...f.governanceEvidenceOpened];
  if(allDataRefs.some(index=>index>=f.dataIndex))return false;
  if(f.dataCurrentTrainingUsed.some(index=>!f.dataTrainingUsed.includes(index)||f.dataStatuses[index]!=='ready'||f.dataTrainingHeld.includes(index)))return false;
  if(f.dataTrainingApproved.some(index=>f.dataTrainingHeld.includes(index)||f.dataStatuses[index]!=='ready'))return false;
  if(f.dataTrainingHeld.some(index=>f.dataStatuses[index]!=='ready'||!hasUnresolved(f.dataChecks[index])))return false;
  const unresolved=unresolvedReadyIndices(f),reviewed=new Set([...f.dataTrainingApproved,...f.dataTrainingHeld]);
  if(f.candidateRevision>0&&unresolved.some(index=>!reviewed.has(index)))return false;
  if(f.safetyChoice!==null&&!f.checkpointEvalComplete)return false;
  if(f.releaseGates.includes('risk')&&exposedCurrentUnresolvedIndices(f).length)return false;
  const needed=neededExtraChecks(f);
  if(f.launchChoice!==null&&(!f.safetyRetested||f.releaseGates.length!==RELEASE_GATE_SET.size||exposedCurrentUnresolvedIndices(f).length))return false;
  if(f.launchChoice==='delay'&&needed.some(id=>!f.extraChecks.includes(id)))return false;
  if(f.launchChoice==='fast'){
    const pending=needed.filter(id=>!f.extraChecks.includes(id));
    if(!pending.length||pending.some(id=>!f.deferredExtraChecks.includes(id))||f.deferredExtraChecks.some(id=>!pending.includes(id)))return false;
  }
  if(f.launchChoice!=='fast'&&f.deferredExtraChecks.length)return false;
  if(f.monitoringChecksCompleted.some(id=>!f.deferredExtraChecks.includes(id)))return false;
  return sceneConsistent(state);
}

function validState(state){
  if(!exactKeys(state,['schemaVersion','systemNotice','scene','decisions','ledger','flags'])||state.schemaVersion!==STATE_SCHEMA_VERSION||typeof state.systemNotice!=='string')return false;
  if(!SCENE_SET.has(state.scene)||!Array.isArray(state.decisions)||!state.decisions.every(validDecision)||!Array.isArray(state.ledger)||!state.ledger.every(validLedger))return false;
  const f=state.flags;
  const keys=['miningCount','miningMinutes','miningBUses','miningWarning','miningIncidentChoice','miningRiskLevel','miningForcedInspection','miningInspectionMode','miningInspectionStage','factoryChoice','factoryMaintenanceDebt','factoryRemediationStage','factoryDisposition','factoryProductionStage','serverSteps','dcCoolingChoice','dcCoolingStage','dataOrigins','dataIndex','dataReviewMinutes','dataFollowup','dataStatuses','dataChecks','dataFeedbackLabel','dataFeedbackDetail','dataSort','dataTrainingApproved','dataTrainingUsed','dataCurrentTrainingUsed','dataTrainingHeld','governanceEvidenceOpened','annotationResults','annotationUnpaidMinutes','breakDecisionMade','candidateRevision','trainingCheckpoint','trainingIncidentChoice','trainingRecoveryStage','evaluatorCalibrationComplete','checkpointEvalComplete','evalIndex','evalCorrectCount','evalFeedback','safetyChoice','safetyRemediated','safetyRetested','releaseGates','releaseCapacityStage','extraChecks','deferredExtraChecks','monitoringChecksCompleted','launchChoice','deployDraftLoad','deployLoad','deployFailoverChecks','deployResilienceAccepted','deployTrafficOpen','deployMonitoringOpened','deployTabs','deployRecovery','deployRecoveryVerifiedFor','deployRecoveryDisposition','supportIndex','supportFeedbackLabel','supportFeedbackDetail','transferChoice'];
  if(!exactKeys(f,keys))return false;
  const integers=[f.miningCount,f.miningMinutes,f.miningBUses,f.miningRiskLevel,f.dataIndex,f.dataReviewMinutes,f.annotationUnpaidMinutes,f.candidateRevision,f.evalIndex,f.evalCorrectCount,f.supportIndex];
  if(!integers.every(Number.isInteger))return false;
  if(f.candidateRevision<0||f.miningCount<0||f.miningCount>12||f.miningMinutes<0||f.miningBUses<0||f.miningRiskLevel<0||f.miningRiskLevel>2)return false;
  if(![f.miningWarning,f.miningForcedInspection,f.factoryMaintenanceDebt,f.breakDecisionMade,f.evaluatorCalibrationComplete,f.checkpointEvalComplete,f.safetyRemediated,f.safetyRetested,f.deployResilienceAccepted,f.deployTrafficOpen,f.deployMonitoringOpened].every(value=>typeof value==='boolean'))return false;
  if(!validNullableChoice(f.miningIncidentChoice,['stop','continue'])||!validNullableSetChoice(f.miningInspectionMode,MINING_INSPECTION_MODE_SET)||!MINING_INSPECTION_STAGE_SET.has(f.miningInspectionStage)||!validNullableChoice(f.factoryChoice,['stop','continue'])||!FACTORY_REMEDIATION_SET.has(f.factoryRemediationStage)||!validNullableSetChoice(f.factoryDisposition,FACTORY_DISPOSITION_SET)||!FACTORY_PRODUCTION_SET.has(f.factoryProductionStage)||!validNullableChoice(f.dcCoolingChoice,['move','stop'])||!DC_COOLING_STAGE_SET.has(f.dcCoolingStage))return false;
  if(!validServerSequence(f.serverSteps)||!uniqueAllowedStrings(f.dataOrigins,DATA_ORIGIN_SET))return false;
  if(f.dataIndex<0||f.dataIndex>5||f.dataReviewMinutes<0)return false;
  if(f.dataFollowup!==null&&!(exactKeys(f.dataFollowup,['index'])&&Number.isInteger(f.dataFollowup.index)&&f.dataFollowup.index>=0&&f.dataFollowup.index<5))return false;
  if(!Array.isArray(f.dataStatuses)||f.dataStatuses.length>5||!f.dataStatuses.every(status=>DATA_STATUSES.has(status)))return false;
  if(!Array.isArray(f.dataChecks)||f.dataChecks.length>5||!f.dataChecks.every(value=>value===null||validCheck(value))||f.dataChecks.length!==f.dataStatuses.length)return false;
  if(typeof f.dataFeedbackLabel!=='string'||typeof f.dataFeedbackDetail!=='string')return false;
  if(!exactKeys(f.dataSort,['keep','remove','redact','review'])||!Object.values(f.dataSort).every(value=>Number.isInteger(value)&&value>=0))return false;
  if(!uniqueIndices(f.dataTrainingApproved,5)||!uniqueIndices(f.dataTrainingUsed,5)||!uniqueIndices(f.dataCurrentTrainingUsed,5)||!uniqueIndices(f.dataTrainingHeld,5)||!uniqueIndices(f.governanceEvidenceOpened,5))return false;
  if(!Array.isArray(f.annotationResults)||f.annotationResults.length>6||!f.annotationResults.every(validAnnotationResult)||f.annotationUnpaidMinutes<0)return false;
  if(!['validated','recent'].includes(f.trainingCheckpoint)||!validNullableChoice(f.trainingIncidentChoice,['pause','continue'])||!TRAINING_RECOVERY_STAGE_SET.has(f.trainingRecoveryStage))return false;
  if(f.evalIndex<0||f.evalIndex>3||f.evalCorrectCount<0||f.evalCorrectCount>3)return false;
  if(f.evalFeedback!==null&&!(exactKeys(f.evalFeedback,['choice','correct'])&&['a','b','tie','bad'].includes(f.evalFeedback.choice)&&typeof f.evalFeedback.correct==='boolean'))return false;
  if(!validNullableChoice(f.safetyChoice,['details','strict','none'])||!validNullableChoice(f.launchChoice,['ready','fast','delay'])||!RELEASE_CAPACITY_STAGE_SET.has(f.releaseCapacityStage))return false;
  if(!uniqueAllowedStrings(f.releaseGates,RELEASE_GATE_SET)||!uniqueAllowedStrings(f.extraChecks,EXTRA_CHECK_SET)||!uniqueAllowedStrings(f.deferredExtraChecks,EXTRA_CHECK_SET)||!uniqueAllowedStrings(f.monitoringChecksCompleted,EXTRA_CHECK_SET))return false;
  if(!validLoad(f.deployDraftLoad)||!validLoad(f.deployLoad))return false;
  if(!uniqueIndices(f.deployFailoverChecks,3)||!uniqueAllowedStrings(f.deployTabs,DEPLOY_TAB_SET)||!validNullableChoice(f.deployRecovery,['restart','rollback'])||!validNullableChoice(f.deployRecoveryVerifiedFor,['restart','rollback'])||!validNullableChoice(f.deployRecoveryDisposition,['monitor','cleared']))return false;
  if(f.supportIndex<0||f.supportIndex>2||typeof f.supportFeedbackLabel!=='string'||typeof f.supportFeedbackDetail!=='string')return false;
  if(!validNullableChoice(f.transferChoice,['build-use']))return false;
  return validStateInvariants(state);
}

function withResetNotice(defaultState){const fresh=clone(defaultState);fresh.systemNotice='الحفظ المحلي يعود إلى بنية أقدم أو غير صالحة للنسخة الحالية، لذلك بدأت اللعبة جلسة جديدة بدل تشغيل حالة قديمة غير متسقة.';return fresh;}
export function loadState(defaultState){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return clone(defaultState);const saved=JSON.parse(raw);return validState(saved)?saved:withResetNotice(defaultState);}catch{return withResetNotice(defaultState);}}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
function systemDefaultSettings(){const reduceMotion=typeof globalThis.matchMedia==='function'&&globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;return{...DEFAULT_SETTINGS,reduceMotion};}
function validSettings(value){return exactKeys(value,Object.keys(DEFAULT_SETTINGS))&&Object.values(value).every(item=>typeof item==='boolean');}
export function loadSettings(){const defaults=systemDefaultSettings();try{const raw=localStorage.getItem(SETTINGS_KEY);if(!raw)return defaults;const saved=JSON.parse(raw);return validSettings(saved)?saved:defaults;}catch{return defaults;}}
export function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));return true;}catch{return false;}}