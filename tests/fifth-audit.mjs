import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};
function stateWith(patch={}){const state=clone(DEFAULT_STATE);const merge=(t,s)=>Object.entries(s).forEach(([k,v])=>{if(v&&typeof v==='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!=='object'||Array.isArray(t[k]))t[k]={};merge(t[k],v);}else t[k]=v;});merge(state,patch);const r=state.flags.candidateRevision;if(r>0){const cfg=[{id:`training-compute-${state.flags.trainingCompute}-r${r}`,label:'إعداد حوسبة',effectText:'fixture'},{id:`training-checkpoint-${state.flags.trainingCheckpoint}-r${r}`,label:'إعداد checkpoint',effectText:'fixture'}];for(const d of cfg)if(!state.decisions.some(x=>x.id===d.id))state.decisions.push(d);}if(state.flags.deployRecovery&&state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3){const id=`deploy-resilience-risk-${state.flags.deployLoad.join('-')}`;if(!state.decisions.some(d=>d.id===id))state.decisions.push({id,label:'قبول فجوة المرونة',effectText:'fixture'});}return state;}
async function load(page,patch={}){await page.goto(BASE_URL,{waitUntil:'networkidle'});await page.evaluate(({storageKey,settingsKey,state,settings})=>{localStorage.clear();localStorage.setItem(settingsKey,JSON.stringify(settings));localStorage.setItem(storageKey,JSON.stringify(state));},{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});await page.reload({waitUntil:'networkidle'});}
async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}
function advanced(extra={}){return{dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[0,1],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}
function released(extra={}){return advanced({dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataTrainingApproved:[],releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',...extra});}
const annotationResults=Array.from({length:6},(_,index)=>({index,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false}));
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1280,height:900}});
console.log('FIFTH_AUDIT:history-is-preserved-when-revision-changes');
const historical=[{id:'checkpoint-evidence-reviewed-r1',label:'دليل قديم',effectText:'حدث فعلًا'},{id:'release-gate-regression-r1',label:'بوابة قديمة',effectText:'خاصة بالنسخة 1'}];
await load(page,{scene:'launchDecision',decisions:historical,ledger:[{chapter:6,human:'ريم',work:'تقييم النسخة 1',system:'جاهزية',details:'تاريخ فعلي'}],flags:{...advanced({releaseGates:['regression','capacity','rollback']})}});
await click(page,'[data-governance-remediate="0"]');let state=await saved(page);
if(!state.decisions.some(d=>d.id==='revision-superseded-r1'))throw new Error('Superseded revision was not explicitly recorded.');
if(!state.decisions.some(d=>d.id==='data-retrain-plan-without-0-after-r1'))throw new Error('Retraining plan was not explicitly recorded.');
if(!state.ledger.some(e=>e.chapter===6))throw new Error('Revision reset deleted historical ledger entries.');
if(state.flags.releaseGates.length||state.flags.checkpointEvalComplete||state.flags.safetyRetested)throw new Error('Old evidence remained active after revision change.');
if(state.flags.candidateRevision!==1||state.scene!=='trainingSetup')throw new Error('A revision was created before the next training round actually started.');
console.log('FIFTH_AUDIT:eligibility-progress-uses-approved-plus-held');
await load(page,{scene:'trainingSetup',flags:{dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingHeld:[1]}});
await page.getByText('أهلية البيانات: 2/2 مواد غير محسومة حُسم قرار دخولها',{exact:true}).waitFor({state:'visible'});
console.log('FIFTH_AUDIT:calibration-requires-proof-after-errors');
await load(page,{scene:'evalTask',flags:{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:1}});
await click(page,'#confirmCalibration');
state=await saved(page);if(state.flags.evaluatorCalibrationComplete)throw new Error('Calibration completed without a correct verification sample.');
await page.selectOption('#calibrationChoice','a');await click(page,'#confirmCalibration');state=await saved(page);if(!state.flags.evaluatorCalibrationComplete)throw new Error('Correct calibration proof did not complete calibration.');
console.log('FIFTH_AUDIT:task-panel-is-universal');
for(const [scene,flags] of [
 ['intro',{}],
 ['dataFollowup',{dataIndex:0,dataFollowup:{index:0,reason:'rights-cleared'},dataSort:{keep:0,remove:0,redact:0,review:1}}],
 ['annotationReview',{annotationResults}],
 ['safetyRetest',{...advanced()}],
 ['transferChallenge',{...released({deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2})}],
 ['results',{...released({deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'})}]
]){
  await load(page,{scene,flags});
  const persisted=await saved(page);
  if(persisted.scene!==scene)throw new Error(`Guidance test state for ${scene} was rejected or redirected to ${persisted.scene}.`);
  if(await page.locator('[data-task-panel]').count()!==1)throw new Error(`Missing universal task panel in ${scene}.`);
  await page.getByText('مهمتك الآن',{exact:true}).waitFor({state:'visible'});
}
await browser.close();console.log('Fifth-audit regression checks passed under schema v5.');
