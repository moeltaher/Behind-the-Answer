import assert from 'node:assert/strict';
import { DEFAULT_STATE, STATE_SCHEMA_VERSION, clone } from '../js/core/state.js';
import {
  STORAGE_KEY,
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  loadState,
  loadSettings,
  saveState,
  saveSettings
} from '../js/core/storage.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  clear() { this.values.clear(); }
}

class ThrowingStorage extends MemoryStorage {
  setItem() { throw new Error('storage unavailable'); }
}

globalThis.localStorage = new MemoryStorage();
function saveRaw(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function expectReset(value) {
  saveRaw(STORAGE_KEY,value);
  const loaded=loadState(DEFAULT_STATE);
  assert.equal(loaded.schemaVersion,STATE_SCHEMA_VERSION);
  assert.equal(loaded.scene,'intro');
  assert.match(loaded.systemNotice,/جلسة جديدة/);
}

const validState=clone(DEFAULT_STATE);
validState.scene='finalMessage';
validState.flags.miningMinutes=35;
validState.flags.miningBUses=2;
validState.flags.miningIncidentChoice='stop';
validState.flags.miningInspectionCount=1;
validState.flags.factoryChoice='stop';
validState.flags.factoryMaintenanceDebt=false;
validState.flags.serverSteps=['rack','network','power','register'];
validState.flags.dcCoolingChoice='move';
validState.flags.dcCoolingRestored=true;
validState.flags.dataIndex=5;
validState.flags.dataReviewMinutes=4;
validState.flags.dataStatuses=['excluded','ready','excluded','ready','excluded'];
validState.flags.dataChecks=[
  { rights:'na',privacy:'na',fitness:'na' },
  { rights:'clear',privacy:'clear',fitness:'clear' },
  { rights:'na',privacy:'na',fitness:'na' },
  { rights:'clear',privacy:'clear',fitness:'clear' },
  { rights:'na',privacy:'na',fitness:'na' }
];
validState.flags.dataSort={ keep:2,remove:3,redact:0,review:0 };
validState.flags.dataTrainingUsed=[1,3];
validState.flags.dataTrainingHeld=[];
validState.flags.annotationUnpaidMinutes=9;
validState.flags.tookBreak=true;
validState.flags.breakDecisionMade=true;
validState.flags.trainingIncidentChoice='pause';
validState.flags.checkpointEvalComplete=true;
validState.flags.evalIndex=3;
validState.flags.evalCorrectCount=3;
validState.flags.safetyChoice='details';
validState.flags.safetyRemediated=true;
validState.flags.safetyRetested=true;
validState.flags.releaseGates=['regression','capacity','risk','rollback'];
validState.flags.launchChoice='ready';
validState.flags.deployLoad=[45,30,25];
validState.flags.deployFailoverChecks=[0,1,2];
validState.flags.deployTabs=['network','compute','model'];
validState.flags.deployRecovery='rollback';
validState.flags.supportIndex=2;
validState.flags.supportFeedbackLabel='احتفظ الفريق بسياق تشخيصي أفضل';
validState.flags.supportFeedbackDetail='بقي البلاغ مرتبطًا بالحادث.';
validState.flags.transferChoice='build-use';
saveRaw(STORAGE_KEY,validState);
assert.deepEqual(loadState(DEFAULT_STATE),validState);

const badServerStep=clone(validState);
badServerStep.flags.serverSteps=['rack','magic'];
expectReset(badServerStep);

const impossibleServerOrder=clone(validState);
impossibleServerOrder.flags.serverSteps=['register'];
expectReset(impossibleServerOrder);

const badChecks=clone(validState);
badChecks.flags.dataChecks.pop();
expectReset(badChecks);

const inconsistentDataIndex=clone(validState);
inconsistentDataIndex.flags.dataIndex=4;
expectReset(inconsistentDataIndex);

const factoryDebtMismatch=clone(validState);
factoryDebtMismatch.flags.factoryMaintenanceDebt=true;
expectReset(factoryDebtMismatch);

const unresolvedWithoutEligibility=clone(validState);
unresolvedWithoutEligibility.flags.dataStatuses[3]='ready';
unresolvedWithoutEligibility.flags.dataChecks[3]={rights:'unresolved',privacy:'clear',fitness:'clear'};
unresolvedWithoutEligibility.flags.dataTrainingUsed=[];
unresolvedWithoutEligibility.flags.dataTrainingHeld=[];
expectReset(unresolvedWithoutEligibility);

const launchWithoutGates=clone(validState);
launchWithoutGates.flags.releaseGates=['regression','capacity'];
expectReset(launchWithoutGates);

const launchWithUnresolvedExposure=clone(validState);
launchWithUnresolvedExposure.flags.dataChecks[3]={rights:'unresolved',privacy:'clear',fitness:'clear'};
expectReset(launchWithUnresolvedExposure);

const recoveryWithoutFailover=clone(validState);
recoveryWithoutFailover.flags.deployFailoverChecks=[0,1];
expectReset(recoveryWithoutFailover);

const transferBeforeSupport=clone(validState);
transferBeforeSupport.flags.supportIndex=1;
expectReset(transferBeforeSupport);

const duplicateAnnotation=clone(validState);
duplicateAnnotation.flags.annotationResults=[
  { index:0,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false },
  { index:0,choice:'عنف',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false }
];
expectReset(duplicateAnnotation);

const badOrigin=clone(validState);
badOrigin.flags.dataOrigins=['mystery-source'];
expectReset(badOrigin);

const v2=clone(validState);
v2.schemaVersion=2;
for(const key of ['factoryMaintenanceDebt','dataTrainingUsed','dataTrainingHeld','checkpointEvalComplete','releaseGates','extraChecks','deployFailoverChecks']) delete v2.flags[key];
v2.scene='finalAnswer';
v2.flags.launchChoice='delay';
v2.flags.deployRecovery='rollback';
v2.flags.transferChoice='build-use';
saveRaw(STORAGE_KEY,v2);
const migratedV2=loadState(DEFAULT_STATE);
assert.equal(migratedV2.schemaVersion,3);
assert.equal(migratedV2.scene,'trainingSetup');
assert.equal(migratedV2.flags.factoryMaintenanceDebt,false);
assert.equal(migratedV2.flags.trainingIncidentChoice,null);
assert.deepEqual(migratedV2.flags.releaseGates,[]);
assert.equal(migratedV2.flags.deployLoad,null);
assert.equal(migratedV2.flags.transferChoice,null);
assert.match(migratedV2.systemNotice,/الإصدار 2 إلى الإصدار 3/);

const legacy=clone(v2);
delete legacy.schemaVersion;
delete legacy.systemNotice;
for(const key of ['miningRiskLevel','miningForcedInspection','miningInspectionCount','dcCoolingRestored','dataChecks','deployLoad','transferChoice']) delete legacy.flags[key];
legacy.scene='trainingSetup';
legacy.flags.dataStatuses=['excluded','ready'];
saveRaw(STORAGE_KEY,legacy);
const migratedLegacy=loadState(DEFAULT_STATE);
assert.equal(migratedLegacy.schemaVersion,3);
assert.equal(migratedLegacy.flags.dataIndex,2);
assert.equal(migratedLegacy.flags.dataChecks.length,2);
assert.match(migratedLegacy.systemNotice,/الإصدار 3/);

saveRaw(SETTINGS_KEY,DEFAULT_SETTINGS);
assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);
saveRaw(SETTINGS_KEY,{ ...DEFAULT_SETTINGS,oldSetting:true });
assert.deepEqual(loadSettings(),DEFAULT_SETTINGS);

localStorage.clear();
globalThis.matchMedia=query=>({ matches:query.includes('prefers-reduced-motion') });
assert.equal(loadSettings().reduceMotion,true);

globalThis.localStorage = new ThrowingStorage();
assert.equal(saveState(validState),false);
assert.equal(saveSettings(DEFAULT_SETTINGS),false);

delete globalThis.matchMedia;
console.log('Storage v3 validates causal invariants, v2 migration, legacy migration, system motion defaults, and explicit save failures.');
