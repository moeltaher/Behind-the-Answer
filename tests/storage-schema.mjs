import assert from 'node:assert/strict';
import { DEFAULT_STATE, STATE_SCHEMA_VERSION, clone } from '../js/core/state.js';
import {
  STORAGE_KEY,
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  loadState,
  loadSettings
} from '../js/core/storage.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  clear() { this.values.clear(); }
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
validState.flags.dataReviewMinutes=8;
validState.flags.dataStatuses=['excluded','ready','ready','pending','pending'];
validState.flags.dataChecks=[
  { rights:'na',privacy:'na',fitness:'na' },
  { rights:'clear',privacy:'clear',fitness:'clear' },
  { rights:'clear',privacy:'clear',fitness:'clear' },
  { rights:'unresolved',privacy:'clear',fitness:'clear' },
  { rights:'unresolved',privacy:'unresolved',fitness:'clear' }
];
validState.flags.annotationUnpaidMinutes=9;
validState.flags.tookBreak=true;
validState.flags.breakDecisionMade=true;
validState.flags.trainingIncidentChoice='pause';
validState.flags.evalCorrectCount=2;
validState.flags.evalFeedback={ choice:'a',correct:true };
validState.flags.safetyChoice='details';
validState.flags.safetyRemediated=true;
validState.flags.safetyRetested=true;
validState.flags.launchChoice='delay';
validState.flags.deployLoad=[45,30,25];
validState.flags.deployTabs=['network','compute'];
validState.flags.deployRecovery='rollback';
validState.flags.supportFeedbackLabel='احتفظ الفريق بسياق تشخيصي أفضل';
validState.flags.supportFeedbackDetail='بقي البلاغ مرتبطًا بالحادث.';
validState.flags.transferChoice='build-use';
saveRaw(STORAGE_KEY,validState);
assert.deepEqual(loadState(DEFAULT_STATE),validState);

const badServerStep=clone(validState);
badServerStep.flags.serverSteps=['rack','magic'];
expectReset(badServerStep);

const badChecks=clone(validState);
badChecks.flags.dataChecks.pop();
expectReset(badChecks);

const badCheckEnum=clone(validState);
badCheckEnum.flags.dataChecks[1].rights='probably';
expectReset(badCheckEnum);

const badLoad=clone(validState);
badLoad.flags.deployLoad=[50,30,30];
expectReset(badLoad);

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

delete globalThis.matchMedia;
console.log('Storage schema validates semantic values, migrates the legacy state, and respects system reduced-motion defaults.');
