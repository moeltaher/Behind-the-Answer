import { clone } from './state.js';
export const STORAGE_KEY='behindTheAnswerGame_v1';
export const SETTINGS_KEY='behindTheAnswerSettings_v1';
export const DEFAULT_SETTINGS={reduceMotion:false,highContrast:false,largeText:false,soundOn:false};
export function loadState(defaultState){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?{...clone(defaultState),...JSON.parse(raw)}:clone(defaultState);}catch{return clone(defaultState);}}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}}
export function loadSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}
