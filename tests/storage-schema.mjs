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
    miningCount:12,miningMinutes:47,miningBUses:2,miningIncidentChoice:'stop',miningInspectionMode:'routine',miningInspectionStage:'verified',
    factoryChoice:'stop',factoryMaintenanceDebt:false,factoryRemediationStage:'verified',factoryDisposition:'repair',factoryProductionStage:'inspected',
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

assert.equal(STATE_SCHEMA_VERSION,8);
const valid=completeState();saveRaw(STORAGE_KEY,valid);assert.deepEqual(loadState(DEFAULT_STATE),valid);
for(const mutate of [
  s=>{s.flags.tookBreak=true;},
  s=>{s.flags.trainingCompute='12';},
  s=>{s.flags.dataFollowup={index:0,reason:'old'};},
  s=>{s.flags.miningInspectionStage='unknown';},
  s=>{s.flags.miningInspectionMode='forced';s.flags.miningInspectionStage='idle';},
  s=>{s.flags.factoryProductionStage='unknown';},
  s=>{s.flags.deployTrafficOpen=false;},
  s=>{s.flags.deployRecoveryVerifiedFor=null;},
  s=>{s.flags.releaseCapacityStage='diagnosed';},
  s=>{s.scene='finalMessage';}
]){const broken=clone(valid);mutate(broken);expectReset(broken);}

const miningInProgress=clone(DEFAULT_STATE);Object.assign(miningInProgress.flags,{miningCount:6,miningMinutes:28,miningBUses:4,miningIncidentChoice:'continue',miningInspectionMode:'forced',miningInspectionStage:'diagnosed'});miningInProgress.scene='mineInspection';saveRaw(STORAGE_KEY,miningInProgress);assert.equal(loadState(DEFAULT_STATE).flags.miningInspectionStage,'diagnosed');
const factoryStopped=clone(DEFAULT_STATE);Object.assign(factoryStopped.flags,{factoryChoice:'stop',factoryMaintenanceDebt:true,factoryRemediationStage:'diagnosed',factoryDisposition:'repair',factoryProductionStage:'awaiting-completion'});factoryStopped.scene='factoryOutcome';saveRaw(STORAGE_KEY,factoryStopped);assert.equal(loadState(DEFAULT_STATE).scene,'factoryOutcome');
const factoryCarry=clone(DEFAULT_STATE);Object.assign(factoryCarry.flags,{factoryChoice:'continue',factoryMaintenanceDebt:true,factoryRemediationStage:'none',factoryDisposition:'carry',factoryProductionStage:'inspected'});factoryCarry.scene='factoryOutcome';saveRaw(STORAGE_KEY,factoryCarry);assert.equal(loadState(DEFAULT_STATE).flags.factoryDisposition,'carry');
const badFactory=clone(factoryStopped);badFactory.flags.factoryProductionStage='inspected';expectReset(badFactory);

const oldV7=clone(valid);oldV7.schemaVersion=7;delete oldV7.flags.miningInspectionStage;oldV7.flags.miningInspectionCount=1;delete oldV7.flags.factoryProductionStage;oldV7.flags.factoryProductionComplete=true;expectReset(oldV7);
const oldUnversioned={scene:'mineTask',flags:{miningCount:4}};expectReset(oldUnversioned);

saveRaw(SETTINGS_KEY,DEFAULT_SETTINGS);assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);saveRaw(SETTINGS_KEY,{...DEFAULT_SETTINGS,oldSetting:true});assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);
localStorage.clear();globalThis.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')});assert.equal(loadSettings().reduceMotion,true);
globalThis.localStorage=new ThrowingStorage();assert.equal(saveState(valid),false);assert.equal(saveSettings(DEFAULT_SETTINGS),false);delete globalThis.matchMedia;
console.log('Storage v8 validates explicit operational state, rejects obsolete schemas, and handles storage failures.');