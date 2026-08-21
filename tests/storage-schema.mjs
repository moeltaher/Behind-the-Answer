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
validState.scene='safetyRetest';
validState.flags.miningMinutes=35;
validState.flags.miningBUses=2;
validState.flags.miningIncidentChoice='continue';
validState.flags.miningRiskLevel=1;
validState.flags.factoryChoice='stop';
validState.flags.serverSteps=['rack','network','power','register'];
validState.flags.dcCoolingChoice='move';
validState.flags.dcCoolingRestored=true;
validState.flags.dataIndex=5;
validState.flags.dataReviewMinutes=8;
validState.flags.dataStatuses=['excluded','ready','ready','pending','pending'];
validState.flags.dataChecks=[
  { rights:'na',privacy:'na',fitness:'na' },
  { rights:'clear',privacy:'clear',fitness:'clear' },
  { rights:'clear',privacy:'clear',fitness:'clear' },
  { rights:'unresolved',privacy:'clear',fitness:'clear' },
  { rights:'unresolved',privacy:'unresolved',fitness:'clear' }
];
validState.flags.dataSort={ keep:1,remove:1,redact:1,review:2 };
validState.flags.annotationUnpaidMinutes=9;
validState.flags.tookBreak=true;
validState.flags.breakDecisionMade=true;
validState.flags.trainingIncidentChoice='pause';
validState.flags.evalIndex=2;
validState.flags.evalCorrectCount=2;
validState.flags.evalFeedback={ choice:'a',correct:true };
validState.flags.safetyChoice='details';
validState.flags.safetyRemediated=true;
validState.flags.safetyRetested=true;
validState.flags.launchChoice='delay';
validState.flags.deployLoad=[45,30,25];
validState.flags.deployTabs=['network','compute','model'];
validState.flags.deployRecovery='rollback';
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

const badCheckEnum=clone(validState);
badCheckEnum.flags.dataChecks[1].rights='probably';
expectReset(badCheckEnum);

const inconsistentDataIndex=clone(validState);
inconsistentDataIndex.flags.dataIndex=4;
expectReset(inconsistentDataIndex);

const badLoad=clone(validState);
badLoad.flags.deployLoad=[61,20,19];
expectReset(badLoad);

const recoveryWithoutDiagnosis=clone(validState);
recoveryWithoutDiagnosis.flags.deployTabs=['network','compute'];
expectReset(recoveryWithoutDiagnosis);

const retestWithoutRemediation=clone(validState);
retestWithoutRemediation.flags.safetyRemediated=false;
expectReset(retestWithoutRemediation);

const launchWithoutRetest=clone(validState);
launchWithoutRetest.flags.safetyRetested=false;
launchWithoutRetest.flags.launchChoice='fast';
expectReset(launchWithoutRetest);

const duplicateAnnotation=clone(validState);
duplicateAnnotation.flags.annotationResults=[
  { index:0,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false },
  { index:0,choice:'عنف',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false }
];
expectReset(duplicateAnnotation);

const badCompute=clone(validState);
badCompute.flags.trainingCompute='10';
expectReset(badCompute);

const extraStateField=clone(validState);
extraStateField.legacyCompatibility=true;
expectReset(extraStateField);

const legacy=clone(validState);
delete legacy.schemaVersion;
delete legacy.systemNotice;
for (const key of ['miningRiskLevel','miningForcedInspection','miningInspectionCount','dcCoolingRestored','dataChecks','deployLoad','transferChoice']) delete legacy.flags[key];
legacy.scene='trainingSetup';
legacy.flags.dataStatuses=['excluded','ready','ready','pending','pending'];
saveRaw(STORAGE_KEY,legacy);
const migrated=loadState(DEFAULT_STATE);
assert.equal(migrated.schemaVersion,STATE_SCHEMA_VERSION);
assert.equal(migrated.scene,'trainingSetup');
assert.equal(migrated.flags.dataIndex,5);
assert.equal(migrated.flags.dataChecks.length,5);
assert.equal(migrated.flags.dataChecks[1].rights,'unresolved');
assert.match(migrated.systemNotice,/تم تحديث الحفظ السابق/);

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
console.log('Storage schema validates semantic values, cross-field invariants, migration, system motion defaults, and explicit save failures.');
