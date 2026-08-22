import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};
function stateWith(patch={}){const state=clone(DEFAULT_STATE);const merge=(t,s)=>Object.entries(s).forEach(([k,v])=>{if(v&&typeof v==='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!=='object'||Array.isArray(t[k]))t[k]={};merge(t[k],v);}else t[k]=v;});merge(state,patch);const r=state.flags.candidateRevision;if(r>0){for(const d of [{id:`training-compute-${state.flags.trainingCompute}-r${r}`,label:'إعداد حوسبة',effectText:'fixture'},{id:`training-checkpoint-${state.flags.trainingCheckpoint}-r${r}`,label:'إعداد checkpoint',effectText:'fixture'}])if(!state.decisions.some(x=>x.id===d.id))state.decisions.push(d);}if(state.flags.deployRecovery&&state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3){const id=`deploy-resilience-risk-${state.flags.deployLoad.join('-')}`;if(!state.decisions.some(d=>d.id===id))state.decisions.push({id,label:'قبول فجوة المرونة',effectText:'fixture'});}return state;}
async function load(page,patch={}){await page.goto(BASE_URL,{waitUntil:'networkidle'});await page.evaluate(({storageKey,settingsKey,state,settings})=>{localStorage.clear();localStorage.setItem(settingsKey,JSON.stringify(settings));localStorage.setItem(storageKey,JSON.stringify(state));},{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});await page.reload({waitUntil:'networkidle'});}
async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}
function baseAdvanced(extra={}){return{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1280,height:900}});
console.log('THIRD_AUDIT:data-eligibility-v5');
await load(page,{scene:'trainingSetup',flags:{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0}}});
if(!(await page.locator('#trainStart').isDisabled()))throw new Error('Unresolved material did not create an eligibility gate.');
await click(page,'[data-training-use="0"]');let state=await saved(page);
if(!state.flags.dataTrainingApproved.includes(0)||state.flags.dataTrainingUsed.includes(0))throw new Error('v5 eligibility must record approval before historical use.');
console.log('THIRD_AUDIT:held-not-launch-blocker');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced(),dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],dataTrainingHeld:[1]}});
if(await page.getByText('حاجب إصدار: بيانات النسخة الحالية',{exact:true}).count())throw new Error('Held material blocked release as if it were in current candidate.');
console.log('THIRD_AUDIT:checkpoint-evidence');
await load(page,{scene:'checkpointEval',flags:{...baseAdvanced({checkpointEvalComplete:false,safetyChoice:null,safetyRemediated:false,safetyRetested:false,releaseGates:[]})}});
if(await page.locator('[data-checkpoint-sample]').count()!==3)throw new Error('Checkpoint comparison no longer has three samples.');
console.log('THIRD_AUDIT:release-evidence');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced({releaseGates:[]})}});
if(await page.locator('[data-gate-pass="capacity"]').count())throw new Error('Capacity gate passed before investigation.');
await click(page,'[data-gate-investigate="capacity"]');await page.getByText('84%',{exact:false}).waitFor({state:'visible'});
console.log('THIRD_AUDIT:no-post-render-patch');
const scripts=await page.evaluate(()=>[...document.scripts].map(script=>script.src));if(scripts.some(src=>src.includes('audit-enhancements')))throw new Error('Obsolete post-render audit layer returned.');
console.log('THIRD_AUDIT:full-decision-record');
const decisions=[{id:'mine-stop',label:'mine',effectText:'x'},{id:'checkpoint-evidence-reviewed-r1',label:'checkpoint',effectText:'x'},{id:'release-gate-regression-r1',label:'gate',effectText:'x'},{id:'future-unknown-id',label:'fallback',effectText:'x'}];
await load(page,{scene:'results',decisions,flags:{...baseAdvanced({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'})}});
const fullRecord=page.locator('.full-evidence-details');
await fullRecord.waitFor({state:'visible'});
if(!(await fullRecord.getAttribute('open')))await fullRecord.locator('summary').click();
for(const decision of decisions)await fullRecord.getByText(decision.label,{exact:true}).waitFor({state:'visible'});
await browser.close();console.log('Third-audit regression checks passed for schema v5.');
