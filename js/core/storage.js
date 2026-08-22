import { STATE_SCHEMA_VERSION, clone } from './state.js';

export const STORAGE_KEY='behindTheAnswerGame';
export const SETTINGS_KEY='behindTheAnswerSettings';
export const DEFAULT_SETTINGS={reduceMotion:false,highContrast:false,largeText:false,soundOn:false};

const SCENES=[
  'intro','zoomOut','ch1Intro','mineOrientation','mineTask','mineInspection','mineEnd','abstract1',
  'ch2Intro','factoryOrientation','factoryMonitor','factoryIncident','factoryOutcome','abstract2',
  'ch3Intro','dcInstall','dcCooling','dcCoolingOutcome','dcWorkers','abstract3',
  'ch4Intro','dataOrigins','dataClean','dataFollowup','dataCleanSummary','abstract4',
  'ch5Intro','annotationIntro','annotationTask','annotationReview','annotationEnd','abstract5',
  'ch6Intro','trainingSetup','trainingRun','trainingEval','abstract6',
  'ch7Intro','evalTask','checkpointEval','safetyTest','safetyOutcome','safetyRetest','launchDecision','launchOutcome','abstract7',
  'ch8Intro','deployLoad','deployIncident','onCall','supportTask','deployEnd','abstract8',
  'pipelineAssemble','transferChallenge','finalAnswer','results','finalMessage'
];
const SCENE_SET=new Set(SCENES);
const SERVER_STEPS=new Set(['rack','power','network','register']);
const DATA_STATUSES=new Set(['ready','pending','excluded']);
const CHECK_VALUES=new Set(['clear','unresolved','na']);
const ANNOTATION_CHOICES=new Set(['آمن','عنف','مضايقة أو إساءة','خطاب كراهية','إيذاء النفس','غير واضح']);
const DEPLOY_TABS=new Set(['network','compute','model']);
const DATA_ORIGINS=new Set(['writer','photo','code','research','forum','translate','docs','qa','web','comment','manual','news']);
const RELEASE_GATES=new Set(['regression','capacity','risk','rollback']);
const EXTRA_CHECKS=new Set(['checkpoint','stability']);
const DEPLOY_LIMITS=[60,45,35];
const from=scene=>new Set(SCENES.slice(SCENES.indexOf(scene)));
const TRAINING_OR_LATER=from('trainingRun');
const AFTER_TRAINING=from('trainingEval');
const CHECKPOINT_OR_LATER=from('checkpointEval');
const SAFETY_OR_LATER=from('safetyTest');
const SAFETY_OUTCOME_OR_LATER=from('safetyOutcome');
const SAFETY_RETEST_OR_LATER=from('safetyRetest');
const LAUNCH_OR_LATER=from('launchDecision');
const LAUNCHED_OR_LATER=from('launchOutcome');
const DEPLOY_INCIDENT_OR_LATER=from('deployIncident');
const ONCALL_OR_LATER=from('onCall');
const ENDING_OR_LATER=from('pipelineAssemble');
const FINAL_ANSWER_OR_LATER=from('finalAnswer');
const REWIND_FOR_OLD_SCHEMA=from('ch6Intro');

function isPlainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function exactKeys(value,keys){return isPlainObject(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
function uniqueAllowedStrings(value,allowed){return Array.isArray(value)&&new Set(value).size===value.length&&value.every(item=>typeof item==='string'&&allowed.has(item));}
function uniqueIndices(value,max){return Array.isArray(value)&&new Set(value).size===value.length&&value.every(item=>Number.isInteger(item)&&item>=0&&item<max);}
function validDecision(value){return exactKeys(value,['id','label','effectText'])&&['id','label','effectText'].every(key=>typeof value[key]==='string');}
function validLedger(value){return exactKeys(value,['chapter','human','work','system','details'])&&Number.isInteger(value.chapter)&&value.chapter>=0&&value.chapter<8&&['human','work','system','details'].every(key=>typeof value[key]==='string');}
function validCheck(value){return exactKeys(value,['rights','privacy','fitness'])&&[value.rights,value.privacy,value.fitness].every(item=>CHECK_VALUES.has(item));}
function validAnnotationResult(value){return exactKeys(value,['index','choice','acceptedAsReasonable','pending','reviewRejected','disputed'])&&Number.isInteger(value.index)&&value.index>=0&&value.index<6&&ANNOTATION_CHOICES.has(value.choice)&&['acceptedAsReasonable','pending','reviewRejected','disputed'].every(key=>typeof value[key]==='boolean');}
function validNullableChoice(value,allowed){return value===null||allowed.includes(value);}
function validServerSequence(steps){
  if(!uniqueAllowedStrings(steps,SERVER_STEPS)) return false;
  if(!steps.length) return true;
  if(steps[0]!=='rack') return false;
  const registerIndex=steps.indexOf('register');
  if(registerIndex!==-1&&(registerIndex!==steps.length-1||!steps.includes('power')||!steps.includes('network'))) return false;
  if(steps.includes('power')&&steps.indexOf('power')===0) return false;
  if(steps.includes('network')&&steps.indexOf('network')===0) return false;
  return true;
}
function hasUnresolved(check){return Boolean(check)&&Object.values(check).includes('unresolved');}
function unresolvedReadyIndices(flags){return flags.dataStatuses.flatMap((status,index)=>status==='ready'&&hasUnresolved(flags.dataChecks[index])?[index]:[]);}
function exposedCurrentUnresolvedIndices(flags){return flags.dataCurrentTrainingUsed.filter(index=>flags.dataStatuses[index]==='ready'&&hasUnresolved(flags.dataChecks[index]));}
function neededExtraChecks(flags){const result=[];if(flags.trainingCheckpoint==='recent')result.push('checkpoint');if(flags.trainingCompute==='8'&&flags.trainingIncidentChoice==='continue')result.push('stability');return result;}
function confirmedAnnotations(flags){return flags.annotationResults.filter(result=>result.acceptedAsReasonable&&!result.pending&&!result.reviewRejected).length;}

function sceneConsistent(state){
  const f=state.flags;
  const scene=state.scene;
  if(TRAINING_OR_LATER.has(scene)&&f.candidateRevision<1) return false;
  if(TRAINING_OR_LATER.has(scene)&&f.dataCurrentTrainingUsed.length===0&&confirmedAnnotations(f)===0) return false;
  if(AFTER_TRAINING.has(scene)&&f.trainingIncidentChoice===null) return false;
  if(CHECKPOINT_OR_LATER.has(scene)&&f.evalIndex<3) return false;
  if(CHECKPOINT_OR_LATER.has(scene)&&!f.evaluatorCalibrationComplete) return false;
  if(SAFETY_OR_LATER.has(scene)&&!f.checkpointEvalComplete) return false;
  if(SAFETY_OUTCOME_OR_LATER.has(scene)&&f.safetyChoice===null) return false;
  if(SAFETY_RETEST_OR_LATER.has(scene)&&!f.safetyRemediated) return false;
  if(LAUNCH_OR_LATER.has(scene)&&!f.safetyRetested) return false;
  if(LAUNCHED_OR_LATER.has(scene)&&f.launchChoice===null) return false;
  if(DEPLOY_INCIDENT_OR_LATER.has(scene)&&(!f.deployLoad||f.deployFailoverChecks.length!==3)) return false;
  if(ONCALL_OR_LATER.has(scene)&&f.deployRecovery===null) return false;
  if(ENDING_OR_LATER.has(scene)&&(f.deployRecovery===null||f.supportIndex<2)) return false;
  if(FINAL_ANSWER_OR_LATER.has(scene)&&f.transferChoice!=='build-use') return false;
  return true;
}

function validStateInvariants(state){
  const f=state.flags;
  if(!validServerSequence(f.serverSteps)) return false;
  if(f.dataStatuses.length!==f.dataIndex||f.dataChecks.length!==f.dataIndex) return false;
  if(f.dataFollowup&&f.dataFollowup.index!==f.dataIndex) return false;
  if(f.dataSort.keep+f.dataSort.remove+f.dataSort.redact+f.dataSort.review<f.dataIndex) return false;
  const annotationIndices=f.annotationResults.map(result=>result.index);
  if(new Set(annotationIndices).size!==annotationIndices.length||!annotationIndices.every((value,index)=>value===index)) return false;
  if(f.evalCorrectCount>f.evalIndex+(f.evalFeedback?.correct?1:0)) return false;
  if(f.safetyRetested&&(!f.safetyRemediated||f.safetyChoice===null)) return false;
  if(f.dcCoolingChoice==='stop'&&!f.dcCoolingRestored) return false;
  if(f.miningForcedInspection&&!f.miningWarning) return false;
  if(f.factoryMaintenanceDebt!==(f.factoryChoice==='continue')) return false;
  if(f.deployLoad&&f.deployLoad.some((value,index)=>value>DEPLOY_LIMITS[index])) return false;
  if(f.deployLoad!==null&&f.launchChoice===null) return false;
  if(f.deployRecovery!==null&&(!f.deployLoad||f.deployTabs.length!==3||f.deployFailoverChecks.length!==3||f.launchChoice===null)) return false;
  if(f.supportIndex>0&&f.deployRecovery===null) return false;
  if(f.transferChoice!==null&&(f.deployRecovery===null||f.supportIndex<2)) return false;
  if(f.dataTrainingUsed.some(index=>index>=f.dataIndex)||f.dataTrainingApproved.some(index=>index>=f.dataIndex)||f.dataCurrentTrainingUsed.some(index=>index>=f.dataIndex)||f.dataTrainingHeld.some(index=>index>=f.dataIndex)) return false;
  if(f.dataCurrentTrainingUsed.some(index=>!f.dataTrainingUsed.includes(index))) return false;
  if(f.dataCurrentTrainingUsed.some(index=>f.dataTrainingHeld.includes(index))) return false;
  if(f.dataTrainingApproved.some(index=>f.dataTrainingHeld.includes(index))) return false;
  const unresolved=unresolvedReadyIndices(f);
  const reviewed=new Set([...f.dataTrainingApproved,...f.dataTrainingHeld]);
  if(f.candidateRevision>0&&unresolved.some(index=>!reviewed.has(index))) return false;
  if(f.safetyChoice!==null&&!f.checkpointEvalComplete) return false;
  if(f.releaseGates.includes('risk')&&exposedCurrentUnresolvedIndices(f).length) return false;
  const needed=neededExtraChecks(f);
  if(f.launchChoice!==null){
    if(!f.safetyRetested||f.releaseGates.length!==RELEASE_GATES.size) return false;
    if(exposedCurrentUnresolvedIndices(f).length) return false;
  }
  if(f.launchChoice==='delay'&&needed.some(id=>!f.extraChecks.includes(id))) return false;
  if(f.launchChoice==='fast'){
    const pending=needed.filter(id=>!f.extraChecks.includes(id));
    if(!pending.length||pending.some(id=>!f.deferredExtraChecks.includes(id))||f.deferredExtraChecks.some(id=>!pending.includes(id))) return false;
  }
  if(f.launchChoice!=='fast'&&f.deferredExtraChecks.length) return false;
  if(f.monitoringChecksCompleted.some(id=>!f.deferredExtraChecks.includes(id))) return false;
  return sceneConsistent(state);
}

function validState(state){
  if(!exactKeys(state,['schemaVersion','systemNotice','scene','decisions','ledger','flags'])||state.schemaVersion!==STATE_SCHEMA_VERSION||typeof state.systemNotice!=='string') return false;
  if(!SCENE_SET.has(state.scene)||!Array.isArray(state.decisions)||!state.decisions.every(validDecision)||!Array.isArray(state.ledger)||!state.ledger.every(validLedger)) return false;
  const f=state.flags;
  const keys=[
    'miningCount','miningMinutes','miningBUses','miningWarning','miningIncidentChoice','miningRiskLevel','miningForcedInspection','miningInspectionCount',
    'factoryChoice','factoryMaintenanceDebt','serverSteps','dcCoolingChoice','dcCoolingRestored','dataOrigins','dataIndex','dataReviewMinutes','dataFollowup','dataStatuses','dataChecks','dataFeedbackLabel','dataFeedbackDetail','dataSort','dataTrainingApproved','dataTrainingUsed','dataCurrentTrainingUsed','dataTrainingHeld',
    'annotationResults','annotationUnpaidMinutes','tookBreak','breakDecisionMade','candidateRevision','trainingCompute','trainingCheckpoint','trainingIncidentChoice','evaluatorCalibrationComplete','checkpointEvalComplete','evalIndex','evalCorrectCount','evalFeedback',
    'safetyChoice','safetyRemediated','safetyRetested','releaseGates','extraChecks','deferredExtraChecks','monitoringChecksCompleted','launchChoice','deployLoad','deployFailoverChecks','deployTabs','deployRecovery','supportIndex','supportFeedbackLabel','supportFeedbackDetail','transferChoice'
  ];
  if(!exactKeys(f,keys)) return false;
  const integers=[f.miningCount,f.miningMinutes,f.miningBUses,f.miningRiskLevel,f.miningInspectionCount,f.dataIndex,f.dataReviewMinutes,f.annotationUnpaidMinutes,f.candidateRevision,f.evalIndex,f.evalCorrectCount,f.supportIndex];
  if(!integers.every(Number.isInteger)) return false;
  if(f.candidateRevision<0||f.miningCount<0||f.miningCount>12||f.miningMinutes<0||f.miningBUses<0||f.miningRiskLevel<0||f.miningInspectionCount<0||f.miningInspectionCount>2) return false;
  if(![f.miningWarning,f.miningForcedInspection,f.factoryMaintenanceDebt,f.dcCoolingRestored,f.tookBreak,f.breakDecisionMade,f.evaluatorCalibrationComplete,f.checkpointEvalComplete,f.safetyRemediated,f.safetyRetested].every(value=>typeof value==='boolean')) return false;
  if(!validNullableChoice(f.miningIncidentChoice,['stop','continue'])||!validNullableChoice(f.factoryChoice,['stop','continue'])||!validNullableChoice(f.dcCoolingChoice,['move','stop'])) return false;
  if(!validServerSequence(f.serverSteps)||!uniqueAllowedStrings(f.dataOrigins,DATA_ORIGINS)) return false;
  if(f.dataIndex<0||f.dataIndex>5||f.dataReviewMinutes<0) return false;
  if(f.dataFollowup!==null&&!(exactKeys(f.dataFollowup,['index','reason'])&&Number.isInteger(f.dataFollowup.index)&&f.dataFollowup.index>=0&&f.dataFollowup.index<5&&typeof f.dataFollowup.reason==='string')) return false;
  if(!Array.isArray(f.dataStatuses)||f.dataStatuses.length>5||!f.dataStatuses.every(status=>DATA_STATUSES.has(status))) return false;
  if(!Array.isArray(f.dataChecks)||f.dataChecks.length>5||!f.dataChecks.every(value=>value===null||validCheck(value))||f.dataChecks.length!==f.dataStatuses.length) return false;
  if(typeof f.dataFeedbackLabel!=='string'||typeof f.dataFeedbackDetail!=='string') return false;
  if(!exactKeys(f.dataSort,['keep','remove','redact','review'])||!Object.values(f.dataSort).every(value=>Number.isInteger(value)&&value>=0)) return false;
  if(!uniqueIndices(f.dataTrainingApproved,5)||!uniqueIndices(f.dataTrainingUsed,5)||!uniqueIndices(f.dataCurrentTrainingUsed,5)||!uniqueIndices(f.dataTrainingHeld,5)) return false;
  if(!Array.isArray(f.annotationResults)||f.annotationResults.length>6||!f.annotationResults.every(validAnnotationResult)||f.annotationUnpaidMinutes<0) return false;
  if(!['8','12'].includes(f.trainingCompute)||!['validated','recent'].includes(f.trainingCheckpoint)||!validNullableChoice(f.trainingIncidentChoice,['pause','continue'])) return false;
  if(f.evalIndex<0||f.evalIndex>3||f.evalCorrectCount<0||f.evalCorrectCount>3) return false;
  if(f.evalFeedback!==null&&!(exactKeys(f.evalFeedback,['choice','correct'])&&['a','b','tie','bad'].includes(f.evalFeedback.choice)&&typeof f.evalFeedback.correct==='boolean')) return false;
  if(!validNullableChoice(f.safetyChoice,['details','strict','none'])||!validNullableChoice(f.launchChoice,['ready','fast','delay'])) return false;
  if(!uniqueAllowedStrings(f.releaseGates,RELEASE_GATES)||!uniqueAllowedStrings(f.extraChecks,EXTRA_CHECKS)||!uniqueAllowedStrings(f.deferredExtraChecks,EXTRA_CHECKS)||!uniqueAllowedStrings(f.monitoringChecksCompleted,EXTRA_CHECKS)) return false;
  if(f.deployLoad!==null&&!(Array.isArray(f.deployLoad)&&f.deployLoad.length===3&&f.deployLoad.every(value=>Number.isInteger(value)&&value>=0&&value<=100)&&f.deployLoad.reduce((sum,value)=>sum+value,0)===100)) return false;
  if(!uniqueIndices(f.deployFailoverChecks,3)||!uniqueAllowedStrings(f.deployTabs,DEPLOY_TABS)||!validNullableChoice(f.deployRecovery,['restart','rollback'])) return false;
  if(f.supportIndex<0||f.supportIndex>2||typeof f.supportFeedbackLabel!=='string'||typeof f.supportFeedbackDetail!=='string') return false;
  if(!validNullableChoice(f.transferChoice,['history-each-time','build-use','interface-only'])) return false;
  return validStateInvariants(state);
}

function copyCommonFlags(target,savedFlags){for(const key of Object.keys(target.flags))if(Object.hasOwn(savedFlags,key))target.flags[key]=clone(savedFlags[key]);}
function normalizePreTraining(target){
  const f=target.flags;
  f.factoryMaintenanceDebt=f.factoryChoice==='continue';
  f.dataTrainingApproved=[];f.dataTrainingUsed=[];f.dataCurrentTrainingUsed=[];f.dataTrainingHeld=[];
  f.candidateRevision=0;f.trainingIncidentChoice=null;f.evaluatorCalibrationComplete=false;f.checkpointEvalComplete=false;f.evalIndex=0;f.evalCorrectCount=0;f.evalFeedback=null;
  f.safetyChoice=null;f.safetyRemediated=false;f.safetyRetested=false;f.releaseGates=[];f.extraChecks=[];f.deferredExtraChecks=[];f.monitoringChecksCompleted=[];f.launchChoice=null;
  f.deployLoad=null;f.deployFailoverChecks=[];f.deployTabs=[];f.deployRecovery=null;f.supportIndex=0;f.supportFeedbackLabel='';f.supportFeedbackDetail='';f.transferChoice=null;
  target.decisions=target.decisions.filter(decision=>!(/^(training-|train-|evaluator-|checkpoint-|safety-|release-|extra-check-|launch-|monitoring-|deploy-|support-)/.test(decision.id)));
  target.ledger=target.ledger.filter(entry=>entry.chapter<5);
}
function migrateOldState(defaultState,saved){
  if(!isPlainObject(saved)||![2,3,undefined].includes(saved.schemaVersion)||!isPlainObject(saved.flags)) return null;
  const migrated=clone(defaultState);
  try{
    migrated.scene=SCENE_SET.has(saved.scene)?saved.scene:'intro';
    migrated.decisions=Array.isArray(saved.decisions)&&saved.decisions.every(validDecision)?clone(saved.decisions):[];
    migrated.ledger=Array.isArray(saved.ledger)&&saved.ledger.every(validLedger)?clone(saved.ledger):[];
    copyCommonFlags(migrated,saved.flags);
    if(saved.schemaVersion===undefined){
      const oldStatuses=Array.isArray(saved.flags.dataStatuses)?saved.flags.dataStatuses.filter(status=>DATA_STATUSES.has(status)).slice(0,5):[];
      migrated.flags.dataStatuses=oldStatuses;
      migrated.flags.dataChecks=oldStatuses.map(status=>status==='excluded'?{rights:'na',privacy:'na',fitness:'na'}:{rights:'unresolved',privacy:'unresolved',fitness:'unresolved'});
      migrated.flags.dataIndex=oldStatuses.length;
      migrated.flags.dcCoolingRestored=saved.flags.dcCoolingChoice==='stop';
    }
    if(REWIND_FOR_OLD_SCHEMA.has(migrated.scene)) migrated.scene='trainingSetup';
    normalizePreTraining(migrated);
    migrated.systemNotice=`تم تحديث الحفظ من ${saved.schemaVersion===3?'الإصدار 3':saved.schemaVersion===2?'الإصدار 2':'إصدار قديم'} إلى الإصدار 4. احتفظت اللعبة بالتقدم القابل للإثبات حتى ما قبل post-training، وأعادتك إلى نقطة آمنة لأن الإصدار الجديد يربط الأدلة بالنسخة المرشحة الحالية.`;
    return validState(migrated)?migrated:null;
  }catch{return null;}
}
function withResetNotice(defaultState){const fresh=clone(defaultState);fresh.systemNotice='تعذر قراءة الحفظ السابق بأمان بعد تحديث بنية اللعبة، لذلك بدأت جلسة جديدة بدل استخدام حالة قد تكون غير منطقية.';return fresh;}

export function loadState(defaultState){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return clone(defaultState);const saved=JSON.parse(raw);if(validState(saved))return saved;return migrateOldState(defaultState,saved)||withResetNotice(defaultState);}catch{return withResetNotice(defaultState);}}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
function systemDefaultSettings(){const reduceMotion=typeof globalThis.matchMedia==='function'&&globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;return{...DEFAULT_SETTINGS,reduceMotion};}
function validSettings(value){return exactKeys(value,Object.keys(DEFAULT_SETTINGS))&&Object.values(value).every(item=>typeof item==='boolean');}
export function loadSettings(){const defaults=systemDefaultSettings();try{const raw=localStorage.getItem(SETTINGS_KEY);if(!raw)return defaults;const saved=JSON.parse(raw);return validSettings(saved)?saved:defaults;}catch{return defaults;}}
export function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));return true;}catch{return false;}}
