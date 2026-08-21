import { clone } from './state.js';
export const STORAGE_KEY='behindTheAnswerGame_v1';
export const SETTINGS_KEY='behindTheAnswerSettings_v1';
export const DEFAULT_SETTINGS={reduceMotion:false,highContrast:false,largeText:false,soundOn:false};

const LEGACY_LABELS={
  'RAW MATERIALS':'مواد جاهزة للتصنيع',
  'HARDWARE':'مكونات إلكترونية جاهزة',
  'COMPUTE':'خوادم متاحة للتشغيل',
  'DATASET':'مجموعة بيانات جاهزة للتدريب',
  'LABELS':'أمثلة صنفها البشر',
  'MODEL':'نسخة مدرَّبة من النموذج',
  'HUMAN FEEDBACK':'تقييمات بشرية لإجابات النموذج',
  'UPTIME':'الخدمة متاحة للمستخدمين',
  'AI OUTPUT':'الإجابة التي يراها المستخدم'
};

function migrateState(saved){
  if(Array.isArray(saved?.ledger)) saved.ledger=saved.ledger.map(entry=>({...entry,system:LEGACY_LABELS[entry.system]||entry.system}));
  return saved;
}

export function loadState(defaultState){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return clone(defaultState);const saved=migrateState(JSON.parse(raw));return {...clone(defaultState),...saved};}catch{return clone(defaultState);}}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}}
export function loadSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}
