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
  MINING_INSPECTION_MODES,
  RELEASE_CAPACITY_STAGES,
  DC_COOLING_STAGES,
  TRAINING_RECOVERY_STAGES
} from '../domain/game-schema.js';

export const STORAGE_KEY='behindTheAnswerGame';
export const SETTINGS_KEY='behindTheAnswerSettings';
export const DEFAULT_SETTINGS={reduceMotion:false,highContrast:false,largeText:false,soundOn:false};
const SCENES=SCENE_ORDER;
const SCENE_SET=new Set(SCENES);
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
const MINING_INSPECTION_MODE_SET=new Set(MINING_INSPECTION_MODES);
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
const REWIND_FOR_PRE_V6=from('ch6Intro');

function isPlainObject(v){return Boolean(v)&&typeof v==='object'&&!Array.isArray(v);}
function exactKeys(v,keys){return isPlainObject(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));}
function uniqueAllowedStrings(v,a){return Array.isArray(v)&&new Set(v).size===v.length&&v.every(i=>typeof i==='string'&&a.has(i));}
function uniqueIndices(v,max){return Array.isArray(v)&&new Set(v).size===v.length&&v.every(i=>Number.isInteger(i)&&i>=0&&i<max);}
function validDecision(v){return exactKeys(v,['id','label','effectText'])&&['id','label','effectText'].every(k=>typeof v[k]==='string');}
function validLedger(v){return exactKeys(v,['chapter','human','work','system','details'])&&Number.isInteger(v.chapter)&&v.chapter>=0&&v.chapter<8&&['human','work','system','details'].every(k=>typeof v[k]==='string');}
function validCheck(v){return exactKeys(v,['rights','privacy','fitness'])&&[v.rights,v.privacy,v.fitness].every(i=>CHECK_VALUES.has(i));}
function validAnnotationResult(v){return exactKeys(v,['index','choice','acceptedAsReasonable','pending','reviewRejected','disputed'])&&Number.isInteger(v.index)&&v.index>=0&&v.index<6&&ANNOTATION_CHOICE_SET.has(v.choice)&&['acceptedAsReasonable','pending','reviewRejected','disputed'].every(k=>typeof v[k]==='boolean');}
function validNullableChoice(v,a){return v===null||a.includes(v);}
function validNullableSetChoice(v,a){return v===null||a.has(v);}
function validServerSequence(steps){if(!uniqueAllowedStrings(steps,SERVER_STEPS))return false;if(!steps.length)return true;if(steps[0]!=='rack')return false;const r=steps.indexOf('register');if(r!==-1&&(r!==steps.length-1||!steps.includes('power')||!steps.includes('network')))return false;if(steps.includes('power')&&steps.indexOf('power')===0)return false;if(steps.includes('network')&&steps.indexOf('network')===0)return false;return true;}
function validLoad(values){return values===null||(Array.isArray(values)&&values.length===3&&values.every(v=>Number.isInteger(v)&&v>=0&&v<=100)&&values.reduce((s,v)=>s+v,0)===100);}

function sceneConsistent(state){
  const f=state.flags,s=state.scene;
  if(FACTORY_DONE_OR_LATER.has(s)&&(!f.factoryProductionComplete||f.factoryDisposition===null||(f.factoryMaintenanceDebt&&f.factoryDisposition!=='carry')))return false;
  if(DC_WORKERS_OR_LATER.has(s)&&f.dcCoolingStage!=='verified')return false;
  if(TRAINING_OR_LATER.has(s)&&f.candidateRevision<1)return false;
  if(TRAINING_OR_LATER.has(s)&&f.dataCurrentTrainingUsed.length===0&&confirmedAnnotations(f)===0)return false;
  if(AFTER_TRAINING.has(s)&&f.trainingIncidentChoice===null)return false;
  if(AFTER_TRAINING.has(s)&&f.trainingIncidentChoice==='pause'&&f.trainingRecoveryStage!=='verified')return false;
  if(CHECKPOINT_OR_LATER.has(s)&&f.evalIndex<3)return false;
  if(CHECKPOINT_OR_LATER.has(s)&&!f.evaluatorCalibrationComplete)return false;
  if(SAFETY_OR_LATER.has(s)&&!f.checkpointEvalComplete)return false;
  if(SAFETY_OUTCOME_OR_LATER.has(s)&&f.safetyChoice===null)return false;
  if(SAFETY_RETEST_OR_LATER.has(s)&&!f.safetyRemediated)return false;
  if(READINESS_OR_LATER.has(s)&&!f.safetyRetested)return false;
  if(LAUNCHED_OR_LATER.has(s)&&f.launchChoice===null)return false;
  if(TRAFFIC_OPEN_OR_LATER.has(s)&&!f.deployTrafficOpen)return false;
  if(DEPLOY_INCIDENT_OR_LATER.has(s)&&(!f.deployLoad||f.deployFailoverChecks.length!==3||!hasResilienceResolution(state)))return false;
  if(DEPLOY_INCIDENT_OR_LATER.has(s)&&f.deferredExtraChecks.some(id=>!f.monitoringChecksCompleted.includes(id)))return false;
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
  const expectedSortActions=f.dataIndex+(f.dataFollowup?1:0)+(f.dataFollowupResolved?1:0);
  if(sortActions!==expectedSortActions)return false;
  const annotationIndices=f.annotationResults.map(r=>r.index);
  if(new Set(annotationIndices).size!==annotationIndices.length||!annotationIndices.every((v,i)=>v===i))return false;
  if(f.evalCorrectCount>f.evalIndex+(f.evalFeedback?.correct?1:0))return false;
  if(f.safetyRetested&&(!f.safetyRemediated||f.safetyChoice===null))return false;
  if(f.miningForcedInspection&&!f.miningWarning)return false;
  if(f.miningInspectionMode==='forced'&&f.miningInspectionCount<1)return false;
  if(f.factoryChoice===null&&(f.factoryMaintenanceDebt||f.factoryRemediationStage!=='none'||f.factoryDisposition!==null||f.factoryProductionComplete))return false;
  if(f.factoryDisposition==='carry'&&(!f.factoryMaintenanceDebt||f.factoryChoice!=='continue'||!f.factoryProductionComplete||f.factoryRemediationStage!=='none'))return false;
  if(['diagnosed','repaired'].includes(f.factoryRemediationStage)&&(!f.factoryMaintenanceDebt||f.factoryDisposition!=='repair'))return false;
  if(f.factoryRemediationStage==='verified'&&(f.factoryMaintenanceDebt||f.factoryDisposition!=='repair'))return false;
  if(f.factoryChoice==='stop'&&f.factoryDisposition!=='repair')return false;
  if(f.factoryChoice==='stop'&&f.factoryProductionComplete&&f.factoryRemediationStage!=='verified')return false;
  if(f.dcCoolingChoice===null&&f.dcCoolingStage!=='idle')return false;
  if(f.dcCoolingChoice!==null&&f.dcCoolingStage==='idle')return false;
  if(f.trainingIncidentChoice!=='pause'&&f.trainingRecoveryStage!=='none')return false;
  if(f.releaseGates.includes('capacity')&&f.releaseCapacityStage!=='remeasured')return false;
  if(f.deployDraftLoad!==null&&!validLoad(f.deployDraftLoad))return false;
  if(f.deployLoad!==null&&!validLoad(f.deployLoad))return false;
  if(f.deployLoad&&f.deployLoad.some((v,i)=>v>DEPLOY_CAPACITY_LIMITS[i]))return false;
  if(f.deployDraftLoad&&f.deployDraftLoad.some((v,i)=>v>DEPLOY_CAPACITY_LIMITS[i]))return false;
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
  if(allDataRefs.some(i=>i>=f.dataIndex))return false;
  if(f.dataCurrentTrainingUsed.some(i=>!f.dataTrainingUsed.includes(i)||f.dataStatuses[i]!=='ready'||f.dataTrainingHeld.includes(i)))return false;
  if(f.dataTrainingApproved.some(i=>f.dataTrainingHeld.includes(i)||f.dataStatuses[i]!=='ready'))return false;
  if(f.dataTrainingHeld.some(i=>f.dataStatuses[i]!=='ready'||!hasUnresolved(f.dataChecks[i])))return false;
  const unresolved=unresolvedReadyIndices(f),reviewed=new Set([...f.dataTrainingApproved,...f.dataTrainingHeld]);
  if(f.candidateRevision>0&&unresolved.some(i=>!reviewed.has(i)))return false;
  if(f.safetyChoice!==null&&!f.checkpointEvalComplete)return false;
  if(f.releaseGates.includes('risk')&&exposedCurrentUnresolvedIndices(f).length)return false;
  const needed=neededExtraChecks(f);
  if(f.launchChoice!==null){if(!f.safetyRetested||f.releaseGates.length!==RELEASE_GATE_SET.size)return false;if(exposedCurrentUnresolvedIndices(f).length)return false;}
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
  const keys=['miningCount','miningMinutes','miningBUses','miningWarning','miningIncidentChoice','miningRiskLevel','miningForcedInspection','miningInspectionCount','miningInspectionMode','factoryChoice','factoryMaintenanceDebt','factoryRemediationStage','factoryDisposition','factoryProductionComplete','serverSteps','dcCoolingChoice','dcCoolingStage','dataOrigins','dataIndex','dataReviewMinutes','dataFollowup','dataFollowupResolved','dataStatuses','dataChecks','dataFeedbackLabel','dataFeedbackDetail','dataSort','dataTrainingApproved','dataTrainingUsed','dataCurrentTrainingUsed','dataTrainingHeld','governanceEvidenceOpened','annotationResults','annotationUnpaidMinutes','breakDecisionMade','candidateRevision','trainingCheckpoint','trainingIncidentChoice','trainingRecoveryStage','evaluatorCalibrationComplete','checkpointEvalComplete','evalIndex','evalCorrectCount','evalFeedback','safetyChoice','safetyRemediated','safetyRetested','releaseGates','releaseCapacityStage','extraChecks','deferredExtraChecks','monitoringChecksCompleted','launchChoice','deployDraftLoad','deployLoad','deployFailoverChecks','deployResilienceAccepted','deployTrafficOpen','deployMonitoringOpened','deployTabs','deployRecovery','deployRecoveryVerifiedFor','deployRecoveryDisposition','supportIndex','supportFeedbackLabel','supportFeedbackDetail','transferChoice'];
  if(!exactKeys(f,keys))return false;
  const integers=[f.miningCount,f.miningMinutes,f.miningBUses,f.miningRiskLevel,f.miningInspectionCount,f.dataIndex,f.dataReviewMinutes,f.annotationUnpaidMinutes,f.candidateRevision,f.evalIndex,f.evalCorrectCount,f.supportIndex];
  if(!integers.every(Number.isInteger))return false;
  if(f.candidateRevision<0||f.miningCount<0||f.miningCount>12||f.miningMinutes<0||f.miningBUses<0||f.miningRiskLevel<0||f.miningRiskLevel>2||f.miningInspectionCount<0||f.miningInspectionCount>1)return false;
  if(![f.miningWarning,f.miningForcedInspection,f.factoryMaintenanceDebt,f.factoryProductionComplete,f.dataFollowupResolved,f.breakDecisionMade,f.evaluatorCalibrationComplete,f.checkpointEvalComplete,f.safetyRemediated,f.safetyRetested,f.deployResilienceAccepted,f.deployTrafficOpen,f.deployMonitoringOpened].every(v=>typeof v==='boolean'))return false;
  if(!validNullableChoice(f.miningIncidentChoice,['stop','continue'])||!validNullableSetChoice(f.miningInspectionMode,MINING_INSPECTION_MODE_SET)||!validNullableChoice(f.factoryChoice,['stop','continue'])||!FACTORY_REMEDIATION_SET.has(f.factoryRemediationStage)||!validNullableSetChoice(f.factoryDisposition,FACTORY_DISPOSITION_SET)||!validNullableChoice(f.dcCoolingChoice,['move','stop'])||!DC_COOLING_STAGE_SET.has(f.dcCoolingStage))return false;
  if(!validServerSequence(f.serverSteps)||!uniqueAllowedStrings(f.dataOrigins,DATA_ORIGIN_SET))return false;
  if(f.dataIndex<0||f.dataIndex>5||f.dataReviewMinutes<0)return false;
  if(f.dataFollowup!==null&&!(exactKeys(f.dataFollowup,['index'])&&Number.isInteger(f.dataFollowup.index)&&f.dataFollowup.index>=0&&f.dataFollowup.index<5))return false;
  if(!Array.isArray(f.dataStatuses)||f.dataStatuses.length>5||!f.dataStatuses.every(s=>DATA_STATUSES.has(s)))return false;
  if(!Array.isArray(f.dataChecks)||f.dataChecks.length>5||!f.dataChecks.every(v=>v===null||validCheck(v))||f.dataChecks.length!==f.dataStatuses.length)return false;
  if(typeof f.dataFeedbackLabel!=='string'||typeof f.dataFeedbackDetail!=='string')return false;
  if(!exactKeys(f.dataSort,['keep','remove','redact','review'])||!Object.values(f.dataSort).every(v=>Number.isInteger(v)&&v>=0))return false;
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

function copyCommonFlags(target,savedFlags){for(const key of Object.keys(target.flags))if(Object.hasOwn(savedFlags,key))target.flags[key]=clone(savedFlags[key]);}
function decisionExists(state,id){return state.decisions.some(d=>d.id===id);}
function decisionStarts(state,prefix){return state.decisions.some(d=>d.id.startsWith(prefix));}
function sceneAtOrAfter(scene,threshold){return SCENES.indexOf(scene)>=SCENES.indexOf(threshold);}
function normalizePreTraining(target){
  const f=target.flags;
  f.dataTrainingApproved=[];f.dataTrainingUsed=[];f.dataCurrentTrainingUsed=[];f.dataTrainingHeld=[];f.governanceEvidenceOpened=[];f.candidateRevision=0;f.trainingCheckpoint='validated';f.trainingIncidentChoice=null;f.trainingRecoveryStage='none';f.evaluatorCalibrationComplete=false;f.checkpointEvalComplete=false;f.evalIndex=0;f.evalCorrectCount=0;f.evalFeedback=null;f.safetyChoice=null;f.safetyRemediated=false;f.safetyRetested=false;f.releaseGates=[];f.releaseCapacityStage='idle';f.extraChecks=[];f.deferredExtraChecks=[];f.monitoringChecksCompleted=[];f.launchChoice=null;f.deployDraftLoad=null;f.deployLoad=null;f.deployFailoverChecks=[];f.deployResilienceAccepted=false;f.deployTrafficOpen=false;f.deployMonitoringOpened=false;f.deployTabs=[];f.deployRecovery=null;f.deployRecoveryVerifiedFor=null;f.deployRecoveryDisposition=null;f.supportIndex=0;f.supportFeedbackLabel='';f.supportFeedbackDetail='';f.transferChoice=null;
  target.decisions=target.decisions.filter(d=>!(/^(training-|train-|evaluator-|checkpoint-|safety-|revision-superseded-|data-retrain-plan-|release-|extra-check-|launch-|monitoring-|deploy-|support-)/.test(d.id)));
  target.ledger=target.ledger.filter(e=>e.chapter<5);
}
function migrateFactoryState(migrated,saved){
  const f=migrated.flags;
  if(!f.factoryChoice)return;
  if(f.factoryChoice==='stop'){
    f.factoryDisposition='repair';
    if(f.factoryRemediationStage==='verified'||sceneAtOrAfter(saved.scene,'abstract2')){f.factoryRemediationStage='verified';f.factoryMaintenanceDebt=false;f.factoryProductionComplete=true;}
    else{f.factoryMaintenanceDebt=true;f.factoryProductionComplete=false;}
    return;
  }
  f.factoryProductionComplete=true;
  if(f.factoryRemediationStage==='verified'||!f.factoryMaintenanceDebt){f.factoryRemediationStage='verified';f.factoryMaintenanceDebt=false;f.factoryDisposition='repair';return;}
  if(decisionExists(migrated,'factory-debt-carried')||sceneAtOrAfter(saved.scene,'abstract2')){f.factoryDisposition='carry';f.factoryRemediationStage='none';f.factoryMaintenanceDebt=true;return;}
  if(decisionExists(migrated,'factory-maintenance-started')||f.factoryRemediationStage!=='none')f.factoryDisposition='repair';
}
function migrateV6DerivedState(migrated,saved){
  const f=migrated.flags;
  if(saved.flags.dataFollowup&&Number.isInteger(saved.flags.dataFollowup.index))f.dataFollowup={index:saved.flags.dataFollowup.index};
  f.dataFollowupResolved=decisionExists(migrated,'data-pii-redact-after-review')||decisionExists(migrated,'data-pii-keep-after-review');
  f.governanceEvidenceOpened=migrated.decisions.flatMap(d=>{const m=d.id.match(/^data-license-review-opened-(\d+)-r/);return m?[Number(m[1])]:[];}).filter(i=>i<f.dataIndex);
  if(f.dcCoolingChoice===null)f.dcCoolingStage='idle';else f.dcCoolingStage=saved.flags.dcCoolingRestored?'verified':'open';
  f.trainingRecoveryStage=f.trainingIncidentChoice==='pause'?'verified':'none';
  f.releaseCapacityStage=f.releaseGates.includes('capacity')?'remeasured':decisionStarts(migrated,'release-capacity-remediated-')?'remeasured':decisionStarts(migrated,'release-capacity-investigated-')?'diagnosed':'idle';
  f.deployDraftLoad=null;
  f.deployResilienceAccepted=decisionStarts(migrated,'deploy-resilience-risk-');
  f.deployTrafficOpen=sceneAtOrAfter(saved.scene,'deployMonitoring');
  f.deployMonitoringOpened=decisionStarts(migrated,'deploy-monitoring-window-')||(f.deployTrafficOpen&&f.deferredExtraChecks.length>0&&sceneAtOrAfter(saved.scene,'deployIncident'));
  if(decisionExists(migrated,'deploy-recovery-verified-rollback'))f.deployRecoveryVerifiedFor='rollback';else if(decisionExists(migrated,'deploy-recovery-verified-restart'))f.deployRecoveryVerifiedFor='restart';
}
function migrateOldState(defaultState,saved){
  if(!isPlainObject(saved)||![6,5,4,3,2,undefined].includes(saved.schemaVersion)||!isPlainObject(saved.flags))return null;
  const migrated=clone(defaultState);
  try{
    migrated.scene=SCENE_SET.has(saved.scene)?saved.scene:'intro';
    migrated.decisions=Array.isArray(saved.decisions)&&saved.decisions.every(validDecision)?clone(saved.decisions):[];
    migrated.ledger=Array.isArray(saved.ledger)&&saved.ledger.every(validLedger)?clone(saved.ledger):[];
    copyCommonFlags(migrated,saved.flags);
    if(saved.schemaVersion===undefined){
      const oldStatuses=Array.isArray(saved.flags.dataStatuses)?saved.flags.dataStatuses.filter(s=>DATA_STATUSES.has(s)).slice(0,5):[];
      migrated.flags.dataStatuses=oldStatuses;
      migrated.flags.dataChecks=oldStatuses.map(s=>s==='excluded'?{rights:'na',privacy:'na',fitness:'na'}:{rights:'unresolved',privacy:'unresolved',fitness:'unresolved'});
      migrated.flags.dataIndex=oldStatuses.length;
    }
    migrateFactoryState(migrated,saved);
    if(saved.schemaVersion===6)migrateV6DerivedState(migrated,saved);
    else{
      if(saved.schemaVersion===5&&migrated.scene==='dcCoolingOutcome'&&migrated.flags.dcCoolingChoice===null&&migrated.decisions.some(d=>d.id==='dc-stop'))migrated.flags.dcCoolingChoice='stop';
      migrated.flags.dcCoolingStage=migrated.flags.dcCoolingChoice?((saved.flags.dcCoolingRestored||saved.schemaVersion===undefined&&saved.flags.dcCoolingChoice==='stop')?'verified':'open'):'idle';
      const rewound=REWIND_FOR_PRE_V6.has(migrated.scene);
      if(rewound){migrated.scene='trainingSetup';normalizePreTraining(migrated);}
    }
    if(migrated.flags.miningInspectionCount>1)migrated.flags.miningInspectionCount=1;
    if(migrated.flags.miningRiskLevel>2)migrated.flags.miningRiskLevel=2;
    if(migrated.flags.miningInspectionCount===1)migrated.flags.miningInspectionMode=decisionExists(migrated,'mine-forced-inspection')?'forced':'routine';
    const source=saved.schemaVersion===6?'الإصدار 6':saved.schemaVersion===5?'الإصدار 5':saved.schemaVersion===4?'الإصدار 4':saved.schemaVersion===3?'الإصدار 3':saved.schemaVersion===2?'الإصدار 2':'إصدار قديم';
    const rewound=saved.schemaVersion!==6&&REWIND_FOR_PRE_V6.has(saved.scene);
    migrated.systemNotice=rewound?`تم تحديث الحفظ من ${source} إلى الإصدار 7. احتفظت اللعبة بالتقدم حتى ما قبل التدريب الإضافي، وأعادتك إلى إعداد الجولة لأن البنية الحالية تفرض حالة تشغيل صريحة لكل خطوة.`:`تم تحديث الحفظ من ${source} إلى الإصدار 7 مع تحويل الحالة التشغيلية إلى البنية الحالية.`;
    return validState(migrated)?migrated:null;
  }catch{return null;}
}
function withResetNotice(defaultState){const fresh=clone(defaultState);fresh.systemNotice='تعذر قراءة الحفظ السابق بأمان بعد تحديث بنية اللعبة، لذلك بدأت جلسة جديدة بدل استخدام حالة قد تكون غير منطقية.';return fresh;}
export function loadState(defaultState){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return clone(defaultState);const saved=JSON.parse(raw);if(validState(saved))return saved;return migrateOldState(defaultState,saved)||withResetNotice(defaultState);}catch{return withResetNotice(defaultState);}}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
function systemDefaultSettings(){const reduceMotion=typeof globalThis.matchMedia==='function'&&globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;return{...DEFAULT_SETTINGS,reduceMotion};}
function validSettings(value){return exactKeys(value,Object.keys(DEFAULT_SETTINGS))&&Object.values(value).every(i=>typeof i==='boolean');}
export function loadSettings(){const defaults=systemDefaultSettings();try{const raw=localStorage.getItem(SETTINGS_KEY);if(!raw)return defaults;const saved=JSON.parse(raw);return validSettings(saved)?saved:defaults;}catch{return defaults;}}
export function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));return true;}catch{return false;}}
