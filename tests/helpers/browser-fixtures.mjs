import { DEFAULT_STATE, clone } from '../../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../../js/core/storage.js';
import { SCENE_ORDER } from '../../js/data/stage-backgrounds.js';

export const BASE_URL='http://127.0.0.1:4173';
export const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};
const atOrAfter=(scene,threshold)=>SCENE_ORDER.indexOf(scene)>=SCENE_ORDER.indexOf(threshold);

export function stateWith(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>Object.entries(source).forEach(([key,value])=>{if(value&&typeof value==='object'&&!Array.isArray(value)){if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key]))target[key]={};merge(target[key],value);}else target[key]=value;});
  merge(state,patch);

  // Fixtures for later scenes must represent a reachable journey rather than bypassing
  // prerequisites that the storage validator correctly requires from a real save.
  if(atOrAfter(state.scene,'abstract2')&&!state.flags.factoryChoice)Object.assign(state.flags,{factoryChoice:'continue',factoryMaintenanceDebt:false,factoryRemediationStage:'verified',factoryDisposition:'repair',factoryProductionComplete:true});
  if(atOrAfter(state.scene,'dcWorkers')&&!state.flags.dcCoolingChoice){state.flags.serverSteps=['rack','power','network','register'];state.flags.dcCoolingChoice='move';state.flags.dcCoolingStage='verified';}

  if(state.flags.candidateRevision>0){
    for(const decision of [
      {id:`training-compute-8-r${state.flags.candidateRevision}`,label:'إعداد حوسبة',effectText:'fixture'},
      {id:`training-checkpoint-${state.flags.trainingCheckpoint}-r${state.flags.candidateRevision}`,label:'إعداد نقطة حفظ',effectText:'fixture'}
    ])if(!state.decisions.some(item=>item.id===decision.id))state.decisions.push(decision);
  }
  if(state.flags.factoryChoice){
    if(state.flags.factoryRemediationStage==='verified'){state.flags.factoryDisposition='repair';state.flags.factoryMaintenanceDebt=false;state.flags.factoryProductionComplete=true;}
    else if(state.flags.factoryChoice==='continue'&&state.flags.factoryMaintenanceDebt&&state.flags.factoryDisposition===null)state.flags.factoryProductionComplete=true;
  }
  if(state.flags.dcCoolingChoice&&state.flags.dcCoolingStage==='idle')state.flags.dcCoolingStage='verified';
  if(state.flags.trainingIncidentChoice==='pause'&&state.flags.trainingRecoveryStage==='none')state.flags.trainingRecoveryStage='verified';
  if(state.flags.releaseGates.includes('capacity')&&state.flags.releaseCapacityStage==='idle')state.flags.releaseCapacityStage='remeasured';
  if(state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3)state.flags.deployResilienceAccepted=true;
  if(atOrAfter(state.scene,'deployMonitoring'))state.flags.deployTrafficOpen=true;
  if(atOrAfter(state.scene,'deployIncident')&&state.flags.deferredExtraChecks.length){state.flags.deployMonitoringOpened=true;state.flags.monitoringChecksCompleted=[...state.flags.deferredExtraChecks];}
  if(state.flags.deployRecovery==='rollback'&&state.flags.deployRecoveryDisposition==='cleared')state.flags.deployRecoveryVerifiedFor='rollback';
  if(state.flags.deployRecovery==='restart'&&state.flags.deployRecoveryDisposition==='monitor')state.flags.deployRecoveryVerifiedFor='restart';
  return state;
}

export async function load(page,patch={}){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({storageKey,settingsKey,state,settings})=>{localStorage.clear();localStorage.setItem(settingsKey,JSON.stringify(settings));localStorage.setItem(storageKey,JSON.stringify(state));},{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
}
export async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
export async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}
