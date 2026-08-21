import assert from 'node:assert/strict';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
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
function expectDefaultState(value) { saveRaw(STORAGE_KEY, value); assert.deepEqual(loadState(DEFAULT_STATE), DEFAULT_STATE); }

const validState = clone(DEFAULT_STATE);
validState.scene = 'evalTask';
validState.flags.miningIncidentChoice = 'stop';
validState.flags.factoryChoice = 'stop';
validState.flags.dcCoolingChoice = 'move';
validState.flags.trainingIncidentChoice = 'pause';
validState.flags.evalCorrectCount = 2;
validState.flags.evalFeedback = { choice: 'a', correct: true };
validState.flags.safetyChoice = 'details';
validState.flags.safetyRemediated = true;
validState.flags.launchChoice = 'delay';
validState.flags.deployRecovery = 'rollback';
validState.flags.dataSort.redact = 1;
saveRaw(STORAGE_KEY, validState);
assert.deepEqual(loadState(DEFAULT_STATE), validState);

const malformedNullable = clone(DEFAULT_STATE);
malformedNullable.flags.evalFeedback = 'old-format';
expectDefaultState(malformedNullable);

const malformedObject = clone(DEFAULT_STATE);
malformedObject.flags.evalFeedback = { choice: 'a', correct: true, legacy: true };
expectDefaultState(malformedObject);

const malformedChoice = clone(DEFAULT_STATE);
malformedChoice.flags.dcCoolingChoice = { value: 'stop' };
expectDefaultState(malformedChoice);

const legacyMiningStopped = clone(DEFAULT_STATE);
legacyMiningStopped.flags.miningStopped = true;
expectDefaultState(legacyMiningStopped);

const legacyFactoryPpe = clone(DEFAULT_STATE);
legacyFactoryPpe.flags.factoryPPE = ['hair'];
expectDefaultState(legacyFactoryPpe);

const legacyMetrics = clone(DEFAULT_STATE);
legacyMetrics.metrics = { pressure: 50, cost: 50, burden: 42 };
expectDefaultState(legacyMetrics);

const legacyWorkerReveal = clone(DEFAULT_STATE);
legacyWorkerReveal.flags.revealedWorkers = ['clean'];
expectDefaultState(legacyWorkerReveal);

const extraStateField = clone(DEFAULT_STATE);
extraStateField.flags.legacyCompatibility = true;
expectDefaultState(extraStateField);

saveRaw(SETTINGS_KEY, DEFAULT_SETTINGS);
assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
saveRaw(SETTINGS_KEY, { ...DEFAULT_SETTINGS, oldSetting: true });
assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);

console.log('Storage schema accepts only the current evidence-first state and settings shapes.');
