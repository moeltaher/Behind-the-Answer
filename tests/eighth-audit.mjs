import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

function stateWith(patch={}){
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
    ]) if(!state.decisions.some(item=>item.id===decision.id)) state.decisions.push(decision);
  }
  if(state.flags.deployRecovery&&state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3){
    const id=`deploy-resilience-risk-${state.flags.deployLoad.join('-')}`;
    if(!state.decisions.some(decision=>decision.id===id))state.decisions.push({id,label:'قبول فجوة المرونة',effectText:'fixture'});
  }
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

function candidate(extra={}){
  return {
    dataIndex:1,
    dataStatuses:['ready'],
    dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],
    dataSort:{keep:1,remove:0,redact:0,review:0},
    dataTrainingUsed:[0],
    dataCurrentTrainingUsed:[0],
    candidateRevision:1,
    trainingIncidentChoice:'pause',
    evalIndex:3,
    evalCorrectCount:3,
    evaluatorCalibrationComplete:true,
    checkpointEvalComplete:true,
    safetyChoice:'details',
    safetyRemediated:true,
    safetyRetested:true,
    ...extra
  };
}
function released(extra={}){
  return candidate({
    releaseGates:['regression','capacity','risk','rollback'],
    launchChoice:'ready',
    ...extra
  });
}
function ending(extra={}){
  return released({
    deployLoad:[45,30,25],
    deployFailoverChecks:[0,1,2],
    deployTabs:['network','compute','model'],
    deployRecovery:'rollback',
    supportIndex:2,
    ...extra
  });
}

const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('EIGHTH_AUDIT:single-task-panel');
await load(page,{scene:'ch1Intro'});
if(await page.locator('[data-task-panel]').count()!==1)throw new Error('Chapter intro renders more than one task panel.');

console.log('EIGHTH_AUDIT:training-recovery-is-explicit');
await load(page,{scene:'trainingRun',flags:{...candidate({trainingIncidentChoice:null})}});
await click(page,'#trainPause');
let state=await saved(page);
if(state.scene!=='trainingRecovery')throw new Error('Training pause skipped explicit recovery scene.');
if(state.flags.trainingIncidentChoice!==null)throw new Error('Pause marked the incident complete before recovery.');
await page.getByText('قرار التوقف لا يصلح العطل بمفرده.',{exact:true}).waitFor({state:'visible'});
await click(page,'#repairTrainingCompute');
state=await saved(page);
if(state.scene!=='trainingEval'||state.flags.trainingIncidentChoice!=='pause')throw new Error('Training recovery did not close the incident before evaluation.');
if(!state.decisions.some(decision=>decision.id==='train-recovery-r1'))throw new Error('Training recovery evidence was not recorded.');

console.log('EIGHTH_AUDIT:mining-open-debt-status');
await load(page,{scene:'mineEnd',flags:{miningCount:12,miningMinutes:42,miningBUses:2,miningIncidentChoice:'continue',miningRiskLevel:0,miningWarning:false,miningInspectionCount:0}});
if(await page.locator('[data-task-panel][data-task-status="debt"]').count()!==1)throw new Error('Mining end hides unresolved maintenance risk behind complete status.');
await page.getByText('اكتملت مع عمل مفتوح',{exact:true}).waitFor({state:'visible'});

console.log('EIGHTH_AUDIT:capacity-diagnose-remediate-measure');
await load(page,{scene:'launchDecision',flags:{...candidate({releaseGates:[]})}});
await click(page,'[data-gate-investigate="capacity"]');
if(await page.getByText('84%',{exact:false}).count())throw new Error('Capacity reached 84% immediately after diagnosis.');
await page.getByText('نتيجة التشخيص',{exact:true}).waitFor({state:'visible'});
await click(page,'[data-gate-remediate="capacity"]');
await page.getByText('84%',{exact:false}).waitFor({state:'visible'});
if(await page.locator('[data-gate-pass="capacity"]').count()!==1)throw new Error('Capacity gate did not become reviewable after remeasurement.');

console.log('EIGHTH_AUDIT:license-evidence-before-clear');
await load(page,{scene:'launchDecision',flags:{...candidate({
  dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}],
  dataTrainingApproved:[0],
  releaseGates:['regression','capacity','rollback']
})}});
await click(page,'[data-governance-remediate="0"]');
state=await saved(page);
if(state.flags.dataChecks[0].rights!=='unresolved')throw new Error('Opening license evidence silently cleared rights.');
await page.getByText('دليل الترخيص ظاهر الآن',{exact:true}).waitFor({state:'visible'});
await click(page,'[data-governance-remediate="0"]');
state=await saved(page);
if(state.flags.dataChecks[0].rights!=='clear')throw new Error('Adopting visible license evidence did not clear the rights blocker.');

console.log('EIGHTH_AUDIT:failover-ceiling-discovered-after-tests');
await load(page,{scene:'deployLoad',flags:{...released()}});
if(await page.getByText(/الحد الأقصى.*1\/3/).count())throw new Error('Failover ceiling is revealed before the player runs the tests.');
await page.locator('#range0').evaluate((input)=>{input.value='45';input.dispatchEvent(new Event('input',{bubbles:true}));});
await page.locator('#range1').evaluate((input)=>{input.value='30';input.dispatchEvent(new Event('input',{bubbles:true}));});
await page.locator('#range2').evaluate((input)=>{input.value='25';input.dispatchEvent(new Event('input',{bubbles:true}));});
await click(page,'#testLoad');
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.getByText(/الحد الأقصى بهذه الثوابت هو 1\/3/).waitFor({state:'visible'});

console.log('EIGHTH_AUDIT:answer-before-transfer-test');
await load(page,{scene:'pipelineAssemble',flags:{...ending({transferChoice:null})}});
await click(page,'#backPrompt');
state=await saved(page);
if(state.scene!=='finalAnswer'||state.flags.transferChoice!==null)throw new Error('Pipeline did not return to the original answer before transfer testing.');
await page.getByText('الإجابة:',{exact:true}).waitFor({state:'visible'});
await click(page,'#transferFromAnswer');
state=await saved(page);
if(state.scene!=='transferChallenge')throw new Error('Transfer challenge is not placed after the answer payoff.');

await browser.close();
console.log('Eighth-audit causality and clarity regression checks passed.');
