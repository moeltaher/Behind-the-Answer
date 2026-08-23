import assert from 'node:assert/strict';
import { DEFAULT_STATE, STATE_SCHEMA_VERSION, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, loadState, loadSettings, saveState, saveSettings } from '../js/core/storage.js';

class MemoryStorage { constructor(){this.values=new Map();} getItem(key){return this.values.has(key)?this.values.get(key):null;} setItem(key,value){this.values.set(key,String(value));} clear(){this.values.clear();} }
class ThrowingStorage extends MemoryStorage{setItem(){throw new Error('storage unavailable');}}
globalThis.localStorage=new MemoryStorage();
const saveRaw=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
function expectReset(value){saveRaw(STORAGE_KEY,value);const loaded=loadState(DEFAULT_STATE);assert.equal(loaded.schemaVersion,STATE_SCHEMA_VERSION);assert.equal(loaded.scene,'intro');assert.match(loaded.systemNotice,/جلسة جديدة/);}

function completeState(){
  const s=clone(DEFAULT_STATE);s.scene='results';
  Object.assign(s.flags,{
    miningCount:12,miningMinutes:47,miningBUses:2,miningIncidentChoice:'stop',miningInspectionCount:1,miningInspectionMode:'routine',
    factoryChoice:'stop',factoryMaintenanceDebt:false,factoryRemediationStage:'verified',factoryDisposition:'repair',factoryProductionComplete:true,
    serverSteps:['rack','network','power','register'],dcCoolingChoice:'move',dcCoolingStage:'verified',
    dataIndex:5,dataReviewMinutes:4,dataStatuses:['excluded','ready','excluded','ready','excluded'],
    dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'na',privacy:'na',fitness:'na'}],
    dataSort:{keep:2,remove:3,redact:0,review:0},dataTrainingUsed:[1,3],dataCurrentTrainingUsed:[1,3],
    annotationResults:[{index:0,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false}],annotationUnpaidMinutes:5,breakDecisionMade:true,
    candidateRevision:1,trainingIncidentChoice:'pause',trainingRecoveryStage:'verified',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,
    safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],releaseCapacityStage:'remeasured',launchChoice:'ready',
    deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployResilienceAccepted:true,deployTrafficOpen:true,deployTabs:['network','compute','model'],
    deployRecovery:'rollback',deployRecoveryVerifiedFor:'rollback',deployRecoveryDisposition:'cleared',supportIndex:2,transferChoice:'build-use'
  });
  s.decisions=[{id:'fixture',label:'fixture',effectText:'fixture'}];return s;
}

assert.equal(STATE_SCHEMA_VERSION,7);
const valid=completeState();saveRaw(STORAGE_KEY,valid);assert.deepEqual(loadState(DEFAULT_STATE),valid);
for(const mutate of [s=>{s.flags.tookBreak=true;},s=>{s.flags.trainingCompute='12';},s=>{s.flags.dataFollowup={index:0,reason:'old'};},s=>{s.flags.miningInspectionCount=2;},s=>{s.flags.miningRiskLevel=3;},s=>{s.flags.deployTrafficOpen=false;},s=>{s.flags.deployRecoveryVerifiedFor=null;},s=>{s.flags.releaseCapacityStage='diagnosed';},s=>{s.scene='finalMessage';}]){const broken=clone(valid);mutate(broken);expectReset(broken);}

const factoryStopped=clone(DEFAULT_STATE);Object.assign(factoryStopped.flags,{factoryChoice:'stop',factoryMaintenanceDebt:true,factoryRemediationStage:'diagnosed',factoryDisposition:'repair',factoryProductionComplete:false});factoryStopped.scene='factoryOutcome';saveRaw(STORAGE_KEY,factoryStopped);assert.equal(loadState(DEFAULT_STATE).scene,'factoryOutcome');
const factoryCarry=clone(DEFAULT_STATE);Object.assign(factoryCarry.flags,{factoryChoice:'continue',factoryMaintenanceDebt:true,factoryRemediationStage:'none',factoryDisposition:'carry',factoryProductionComplete:true});factoryCarry.scene='factoryOutcome';saveRaw(STORAGE_KEY,factoryCarry);assert.equal(loadState(DEFAULT_STATE).flags.factoryDisposition,'carry');
const badFactory=clone(factoryStopped);badFactory.flags.factoryProductionComplete=true;expectReset(badFactory);

const v6=clone(valid);v6.schemaVersion=6;delete v6.flags.miningInspectionMode;delete v6.flags.factoryDisposition;delete v6.flags.factoryProductionComplete;v6.flags.dcCoolingRestored=true;delete v6.flags.dcCoolingStage;delete v6.flags.governanceEvidenceOpened;v6.flags.tookBreak=true;delete v6.flags.trainingRecoveryStage;delete v6.flags.releaseCapacityStage;delete v6.flags.deployDraftLoad;delete v6.flags.deployResilienceAccepted;delete v6.flags.deployTrafficOpen;delete v6.flags.deployMonitoringOpened;delete v6.flags.deployRecoveryVerifiedFor;v6.decisions.push({id:'factory-maintenance-verified',label:'old factory',effectText:'fixture'},{id:'release-capacity-remediated-r1',label:'old capacity',effectText:'fixture'},{id:'deploy-resilience-risk-45-30-25',label:'old resilience',effectText:'fixture'},{id:'deploy-recovery-verified-rollback',label:'old recovery',effectText:'fixture'});saveRaw(STORAGE_KEY,v6);const migrated6=loadState(DEFAULT_STATE);assert.equal(migrated6.schemaVersion,7);assert.equal(migrated6.scene,'results');assert.equal(migrated6.flags.factoryProductionComplete,true);assert.equal(migrated6.flags.dcCoolingStage,'verified');assert.equal(migrated6.flags.deployTrafficOpen,true);assert.equal(migrated6.flags.deployRecoveryVerifiedFor,'rollback');assert.equal(Object.hasOwn(migrated6.flags,'tookBreak'),false);assert.match(migrated6.systemNotice,/الإصدار 6.*الإصدار 7/);

const v5=clone(DEFAULT_STATE);v5.schemaVersion=5;v5.scene='ch6Intro';v5.flags.trainingCompute='12';delete v5.flags.miningInspectionMode;delete v5.flags.factoryDisposition;delete v5.flags.factoryProductionComplete;delete v5.flags.dcCoolingStage;v5.flags.dcCoolingRestored=false;delete v5.flags.governanceEvidenceOpened;v5.flags.tookBreak=false;delete v5.flags.trainingRecoveryStage;delete v5.flags.releaseCapacityStage;delete v5.flags.deployDraftLoad;delete v5.flags.deployResilienceAccepted;delete v5.flags.deployTrafficOpen;delete v5.flags.deployMonitoringOpened;delete v5.flags.deployRecoveryVerifiedFor;saveRaw(STORAGE_KEY,v5);const migrated5=loadState(DEFAULT_STATE);assert.equal(migrated5.schemaVersion,7);assert.equal(migrated5.scene,'trainingSetup');assert.match(migrated5.systemNotice,/الإصدار 5.*الإصدار 7/);

saveRaw(SETTINGS_KEY,DEFAULT_SETTINGS);assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);saveRaw(SETTINGS_KEY,{...DEFAULT_SETTINGS,oldSetting:true});assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);
localStorage.clear();globalThis.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')});assert.equal(loadSettings().reduceMotion,true);
globalThis.localStorage=new ThrowingStorage();assert.equal(saveState(valid),false);assert.equal(saveSettings(DEFAULT_SETTINGS),false);delete globalThis.matchMedia;
console.log('Storage v7 validates explicit operational state, removes obsolete fields, migrates v6 and older saves, and handles storage failures.');
