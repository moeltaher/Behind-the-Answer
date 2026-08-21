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
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  clear() {
    this.values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

function saveRaw(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function expectDefaultState(value) {
  saveRaw(STORAGE_KEY, value);
  assert.deepEqual(loadState(DEFAULT_STATE), DEFAULT_STATE);
}

const validState = clone(DEFAULT_STATE);
validState.scene = 'evalTask';
validState.flags.evalFeedback = { choice: 'a', correct: true };
validState.flags.factoryChoice = 'stop';
validState.flags.trainingIncidentChoice = 'pause';
validState.flags.safetyChoice = 'details';
validState.flags.launchChoice = 'delay';
validState.flags.deployRecovery = 'rollback';
saveRaw(STORAGE_KEY, validState);
assert.deepEqual(loadState(DEFAULT_STATE), validState);

const malformedNullable = clone(DEFAULT_STATE);
malformedNullable.flags.evalFeedback = 'old-format';
expectDefaultState(malformedNullable);

const malformedObject = clone(DEFAULT_STATE);
malformedObject.flags.evalFeedback = { choice: 'a', correct: true, legacy: true };
expectDefaultState(malformedObject);

const malformedChoice = clone(DEFAULT_STATE);
malformedChoice.flags.factoryChoice = { value: 'stop' };
expectDefaultState(malformedChoice);

const extraStateField = clone(DEFAULT_STATE);
extraStateField.flags.legacyCompatibility = true;
expectDefaultState(extraStateField);

saveRaw(SETTINGS_KEY, DEFAULT_SETTINGS);
assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);

saveRaw(SETTINGS_KEY, { ...DEFAULT_SETTINGS, oldSetting: true });
assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);

console.log('Storage schema accepts only the current state and settings shapes.');
