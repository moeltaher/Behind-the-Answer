import { DEFAULT_STATE, clone } from '../../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../../js/core/storage.js';

export const BASE_URL='http://127.0.0.1:4173';
export const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

export function stateWith(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>Object.entries(source).forEach(([key,value])=>{
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key]))target[key]={};
      merge(target[key],value);
    }else target[key]=value;
  });
  merge(state,patch);
  const revision=state.flags.candidateRevision;
  if(revision>0){
    for(const decision of [
      {id:`training-compute-${state.flags.trainingCompute}-r${revision}`,label:'إعداد حوسبة',effectText:'fixture'},
      {id:`training-checkpoint-${state.flags.trainingCheckpoint}-r${revision}`,label:'إعداد نقطة حفظ',effectText:'fixture'}
    ]) if(!state.decisions.some(item=>item.id===decision.id))state.decisions.push(decision);
  }
  if(state.flags.deployRecovery&&state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3){
    const id=`deploy-resilience-risk-${state.flags.deployLoad.join('-')}`;
    if(!state.decisions.some(decision=>decision.id===id))state.decisions.push({id,label:'قبول فجوة المرونة',effectText:'fixture'});
  }
  return state;
}

export async function load(page,patch={}){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({storageKey,settingsKey,state,settings})=>{
    localStorage.clear();
    localStorage.setItem(settingsKey,JSON.stringify(settings));
    localStorage.setItem(storageKey,JSON.stringify(state));
  },{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
}

export async function click(page,selector){
  await page.locator(selector).waitFor({state:'visible'});
  await page.locator(selector).click();
}

export async function saved(page){
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
}
