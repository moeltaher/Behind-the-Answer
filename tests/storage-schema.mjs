import assert from 'node:assert/strict';
import { DEFAULT_STATE, STATE_SCHEMA_VERSION, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, loadState, loadSettings, saveState, saveSettings } from '../js/core/storage.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  clear() { this.values.clear(); }
}
class ThrowingStorage extends MemoryStorage { setItem() { throw new Error('storage unavailable'); } }

globalThis.localStorage = new MemoryStorage();
function saveRaw(key,value){ localStorage.setItem(key,JSON.stringify(value)); }
function expectReset(value){ saveRaw(STORAGE_KEY,value); const loaded=loadState(DEFAULT_STATE); assert.equal(loaded.schemaVersion,STATE_SCHEMA_VERSION); assert.equal(loaded.scene,'intro'); assert.match(loaded.systemNotice,/جلسة جديدة/); }
function configDecisions(revision=1,compute='12',checkpoint='validated'){
  return [
    {id:`training-compute-${compute}-r${revision}`,label:'إعداد حوسبة',effectText:'fixture'},
    {id:`training-checkpoint-${checkpoint}-r${revision}`,label:'إعداد checkpoint',effectText:'fixture'}
  ];
}

function completeState(){
  const state=clone(DEFAULT_STATE);
  state.scene='results';
  state.flags.miningMinutes=35;
  state.flags.miningBUses=2;
  state.flags.miningIncidentChoice='stop';
  state.flags.miningInspectionCount=1;
  state.flags.factoryChoice='stop';
  state.flags.serverSteps=['rack','network','power','register'];
  state.flags.dcCoolingChoice='move';
  state.flags.dcCoolingRestored=true;
  state.flags.dataIndex=5;
  state.flags.dataReviewMinutes=4;
  state.flags.dataStatuses=['excluded','ready','excluded','ready','excluded'];
  state.flags.dataChecks=[
    {rights:'na',privacy:'na',fitness:'na'},
    {rights:'clear',privacy:'clear',fitness:'clear'},
    {rights:'na',privacy:'na',fitness:'na'},
    {rights:'clear',privacy:'clear',fitness:'clear'},
    {rights:'na',privacy:'na',fitness:'na'}
  ];
  state.flags.dataSort={keep:2,remove:3,redact:0,review:0};
  state.flags.dataTrainingUsed=[1,3];
  state.flags.dataCurrentTrainingUsed=[1,3];
  state.flags.annotationResults=[{index:0,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false}];
  state.flags.annotationUnpaidMinutes=9;
  state.flags.breakDecisionMade=true;
  state.flags.tookBreak=true;
  state.flags.candidateRevision=1;
  state.flags.trainingIncidentChoice='pause';
  state.flags.evalIndex=3;
  state.flags.evalCorrectCount=3;
  state.flags.evaluatorCalibrationComplete=true;
  state.flags.checkpointEvalComplete=true;
  state.flags.safetyChoice='details';
  state.flags.safetyRemediated=true;
  state.flags.safetyRetested=true;
  state.flags.releaseGates=['regression','capacity','risk','rollback'];
  state.flags.launchChoice='ready';
  state.flags.deployLoad=[45,30,25];
  state.flags.deployFailoverChecks=[0,1,2];
  state.flags.deployTabs=['network','compute','model'];
  state.flags.deployRecovery='rollback';
  state.flags.supportIndex=2;
  state.flags.transferChoice='build-use';
  state.decisions=[...configDecisions(),{id:'deploy-resilience-risk-45-30-25',label:'قبلت فجوة المرونة',effectText:'fixture'}];
  return state;
}

assert.equal(STATE_SCHEMA_VERSION,5);
const validState=completeState();
saveRaw(STORAGE_KEY,validState);
assert.deepEqual(loadState(DEFAULT_STATE),validState);

const removedFinalMessage=clone(validState); removedFinalMessage.scene='finalMessage'; expectReset(removedFinalMessage);
const badServerStep=clone(validState); badServerStep.flags.serverSteps=['rack','magic']; expectReset(badServerStep);
const badChecks=clone(validState); badChecks.flags.dataChecks.pop(); expectReset(badChecks);
const badLineage=clone(validState); badLineage.flags.dataCurrentTrainingUsed=[4]; expectReset(badLineage);
const riskWithCurrentBlocker=clone(validState); riskWithCurrentBlocker.flags.dataStatuses[3]='ready'; riskWithCurrentBlocker.flags.dataChecks[3]={rights:'unresolved',privacy:'clear',fitness:'clear'}; expectReset(riskWithCurrentBlocker);
const fastWithoutDebt=clone(validState); fastWithoutDebt.flags.launchChoice='fast'; fastWithoutDebt.flags.trainingCheckpoint='recent'; fastWithoutDebt.flags.deferredExtraChecks=[]; fastWithoutDebt.decisions=fastWithoutDebt.decisions.filter(d=>!d.id.startsWith('training-checkpoint-')); fastWithoutDebt.decisions.push({id:'training-checkpoint-recent-r1',label:'recent',effectText:'fixture'}); expectReset(fastWithoutDebt);
const monitoringOutsideDebt=clone(validState); monitoringOutsideDebt.flags.monitoringChecksCompleted=['checkpoint']; expectReset(monitoringOutsideDebt);
const finalWithoutTransfer=clone(validState); finalWithoutTransfer.flags.transferChoice=null; expectReset(finalWithoutTransfer);
const checkpointWithoutCalibration=clone(validState); checkpointWithoutCalibration.scene='checkpointEval'; checkpointWithoutCalibration.flags.evaluatorCalibrationComplete=false; expectReset(checkpointWithoutCalibration);
const launchWithoutGates=clone(validState); launchWithoutGates.flags.releaseGates=['regression','capacity']; expectReset(launchWithoutGates);
const recoveryWithoutFailover=clone(validState); recoveryWithoutFailover.flags.deployFailoverChecks=[0,1]; expectReset(recoveryWithoutFailover);
const missingTrainingConfig=clone(validState); missingTrainingConfig.decisions=missingTrainingConfig.decisions.filter(d=>!d.id.startsWith('training-checkpoint-')); expectReset(missingTrainingConfig);
const missingResilienceAcceptance=clone(validState); missingResilienceAcceptance.decisions=missingResilienceAcceptance.decisions.filter(d=>!d.id.startsWith('deploy-resilience-risk-')); expectReset(missingResilienceAcceptance);
const wrongDistributionAcceptance=clone(validState); wrongDistributionAcceptance.decisions=wrongDistributionAcceptance.decisions.filter(d=>!d.id.startsWith('deploy-resilience-risk-')); wrongDistributionAcceptance.decisions.push({id:'deploy-resilience-risk-40-30-30',label:'قديم',effectText:'fixture'}); expectReset(wrongDistributionAcceptance);

const v4=clone(validState);
v4.schemaVersion=4;
saveRaw(STORAGE_KEY,v4);
const migratedV4=loadState(DEFAULT_STATE);
assert.equal(migratedV4.schemaVersion,5);
assert.equal(migratedV4.scene,'trainingSetup');
assert.equal(migratedV4.flags.candidateRevision,0);
assert.deepEqual(migratedV4.flags.dataTrainingUsed,[]);
assert.deepEqual(migratedV4.flags.releaseGates,[]);
assert.match(migratedV4.systemNotice,/الإصدار 4.*الإصدار 5/);

const preTrainingV4=clone(DEFAULT_STATE);
preTrainingV4.schemaVersion=4;
preTrainingV4.scene='factoryOutcome';
preTrainingV4.flags.factoryChoice='continue';
preTrainingV4.flags.factoryMaintenanceDebt=false;
preTrainingV4.decisions=[{id:'factory-debt-closed',label:'مغلق',effectText:'fixture'}];
saveRaw(STORAGE_KEY,preTrainingV4);
const migratedPreTraining=loadState(DEFAULT_STATE);
assert.equal(migratedPreTraining.schemaVersion,5);
assert.equal(migratedPreTraining.scene,'factoryOutcome');
assert.equal(migratedPreTraining.flags.factoryMaintenanceDebt,false);
assert.match(migratedPreTraining.systemNotice,/الإصدار 4.*الإصدار 5/);

const v3=clone(DEFAULT_STATE);
v3.schemaVersion=3;
for(const key of ['dataTrainingApproved','dataCurrentTrainingUsed','candidateRevision','evaluatorCalibrationComplete','deferredExtraChecks','monitoringChecksCompleted']) delete v3.flags[key];
v3.scene='finalAnswer';
v3.flags.dataIndex=2;
v3.flags.dataStatuses=['excluded','ready'];
v3.flags.dataChecks=[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'}];
v3.flags.dataSort={keep:1,remove:1,redact:0,review:0};
v3.flags.dataTrainingUsed=[1];
v3.flags.trainingIncidentChoice='pause';
v3.flags.checkpointEvalComplete=true;
v3.flags.evalIndex=3;
v3.flags.evalCorrectCount=3;
v3.flags.safetyChoice='details';
v3.flags.safetyRemediated=true;
v3.flags.safetyRetested=true;
v3.flags.releaseGates=['regression','capacity','risk','rollback'];
v3.flags.launchChoice='ready';
v3.flags.deployLoad=[45,30,25];
v3.flags.deployFailoverChecks=[0,1,2];
v3.flags.deployTabs=['network','compute','model'];
v3.flags.deployRecovery='rollback';
v3.flags.supportIndex=2;
v3.flags.transferChoice='build-use';
saveRaw(STORAGE_KEY,v3);
const migratedV3=loadState(DEFAULT_STATE);
assert.equal(migratedV3.schemaVersion,5);
assert.equal(migratedV3.scene,'trainingSetup');
assert.equal(migratedV3.flags.candidateRevision,0);
assert.deepEqual(migratedV3.flags.dataTrainingUsed,[]);
assert.deepEqual(migratedV3.flags.releaseGates,[]);
assert.match(migratedV3.systemNotice,/الإصدار 3.*الإصدار 5/);

const v2=clone(v3); v2.schemaVersion=2; saveRaw(STORAGE_KEY,v2);
const migratedV2=loadState(DEFAULT_STATE);
assert.equal(migratedV2.schemaVersion,5);
assert.equal(migratedV2.scene,'trainingSetup');
assert.match(migratedV2.systemNotice,/الإصدار 2.*الإصدار 5/);

saveRaw(SETTINGS_KEY,DEFAULT_SETTINGS); assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);
saveRaw(SETTINGS_KEY,{...DEFAULT_SETTINGS,oldSetting:true}); assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);
localStorage.clear(); globalThis.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')}); assert.equal(loadSettings().reduceMotion,true);
globalThis.localStorage=new ThrowingStorage(); assert.equal(saveState(validState),false); assert.equal(saveSettings(DEFAULT_SETTINGS),false);
delete globalThis.matchMedia;
console.log('Storage v5 validates current ending, rejects removed scenes, checks lineage/resilience, migrates old saves, and handles settings/save failures.');