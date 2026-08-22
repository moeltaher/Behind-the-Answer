import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

function stateWith(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>Object.entries(source).forEach(([key,value])=>{
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key])) target[key]={};
      merge(target[key],value);
    } else target[key]=value;
  });
  merge(state,patch);
  return state;
}
async function load(page,patch={}){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({storageKey,settingsKey,state,settings})=>{
    localStorage.clear();
    localStorage.setItem(settingsKey,JSON.stringify(settings));
    localStorage.setItem(storageKey,JSON.stringify(state));
  },{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
}
async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}

const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('THIRD_AUDIT:data-eligibility');
await load(page,{scene:'trainingSetup',flags:{
  dataIndex:4,
  dataStatuses:['excluded','ready','ready','ready'],
  dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],
  dataSort:{keep:2,remove:1,redact:1,review:0}
}});
if(!(await page.locator('#trainStart').isDisabled())) throw new Error('Unresolved material did not create a pre-training eligibility gate.');
await click(page,'[data-training-use="3"]');
let state=await saved(page);
if(!state.flags.dataTrainingUsed.includes(3)) throw new Error('Override did not persist processing history.');

console.log('THIRD_AUDIT:held-not-launch-blocker');
await load(page,{scene:'launchDecision',flags:{
  dataIndex:4,
  dataStatuses:['excluded','ready','ready','ready'],
  dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],
  dataSort:{keep:2,remove:1,redact:1,review:0},
  dataTrainingUsed:[1,2],dataTrainingHeld:[3],trainingIncidentChoice:'pause',checkpointEvalComplete:true,
  safetyChoice:'details',safetyRemediated:true,safetyRetested:true
}});
if(await page.getByText('حاجب إصدار: تاريخ استخدام البيانات',{exact:true}).count()) throw new Error('Held material incorrectly blocked release as if it had been processed.');

console.log('THIRD_AUDIT:checkpoint-evidence');
await load(page,{scene:'checkpointEval',flags:{trainingIncidentChoice:'pause'}});
if(await page.locator('[data-checkpoint-sample]').count()!==3) throw new Error('Checkpoint evaluation is not a three-sample comparison.');
await page.selectOption('[data-checkpoint-sample="apology"]','b');
await page.selectOption('[data-checkpoint-sample="legal"]','a');
await page.selectOption('[data-checkpoint-sample="friendly"]','b');
await click(page,'#checkCheckpoint');
state=await saved(page);
if(!state.flags.checkpointEvalComplete||!state.decisions.some(item=>item.id==='checkpoint-evidence-reviewed')) throw new Error('Checkpoint evidence was not persisted.');

console.log('THIRD_AUDIT:release-evidence');
await load(page,{scene:'launchDecision',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true}});
if(await page.locator('[data-gate-pass="capacity"]').count()) throw new Error('Capacity gate can pass before investigating failing evidence.');
await click(page,'[data-gate-investigate="capacity"]');
await page.getByText('84%',{exact:false}).waitFor({state:'visible'});
await click(page,'[data-gate-pass="capacity"]');
state=await saved(page);
if(!state.flags.releaseGates.includes('capacity')) throw new Error('Remediated capacity gate was not persisted.');

console.log('THIRD_AUDIT:governance-history');
await load(page,{scene:'launchDecision',flags:{
  dataIndex:3,
  dataStatuses:['excluded','ready','ready'],
  dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'unresolved',fitness:'clear'}],
  dataSort:{keep:2,remove:1,redact:0,review:0},dataTrainingUsed:[1,2],trainingIncidentChoice:'pause',checkpointEvalComplete:true,
  safetyChoice:'details',safetyRemediated:true,safetyRetested:true
}});
await click(page,'[data-governance-remediate="2"]');
state=await saved(page);
if(!state.flags.dataTrainingUsed.includes(2)||state.flags.dataStatuses[2]!=='excluded') throw new Error('Governance remediation erased processing history or failed to remove current input.');

console.log('THIRD_AUDIT:n-minus-one');
await load(page,{scene:'deployLoad',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25]}});
for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
await page.getByText('1 من 3 حالات خروج كاملة يمكن امتصاصها',{exact:true}).waitFor({state:'visible'});
if(await page.getByText('إجمالي الهامش المتاح',{exact:true}).count()) throw new Error('Constant total-headroom metric still exists.');

console.log('THIRD_AUDIT:no-post-render-patch');
const scripts=await page.evaluate(()=>[...document.scripts].map(script=>script.src));
if(scripts.some(src=>src.includes('audit-enhancements'))) throw new Error('Obsolete post-render audit layer is still loaded.');

console.log('THIRD_AUDIT:full-decision-record');
const decisions=[
  {id:'mine-stop',label:'mine',effectText:'x'},
  {id:'data-training-hold-3',label:'data',effectText:'x'},
  {id:'checkpoint-evidence-reviewed',label:'checkpoint',effectText:'x'},
  {id:'release-gate-regression',label:'gate',effectText:'x'},
  {id:'extra-check-checkpoint',label:'extra',effectText:'x'},
  {id:'deploy-failover-review',label:'failover',effectText:'x'},
  {id:'future-unknown-id',label:'fallback',effectText:'x'}
];
await load(page,{scene:'results',decisions,flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'}});
const displayed=await page.locator('.full-evidence-details .decision-row').count();
if(displayed!==decisions.length) throw new Error(`Full record lost decisions: ${displayed}/${decisions.length}.`);
const fallbackHeading=page.locator('.full-evidence-details h2').filter({hasText:'قرارات أخرى'});
if(await fallbackHeading.count()!==1) throw new Error('Fallback decision category was not rendered in the full record.');

await browser.close();
console.log('Third-audit regression checks passed.');
