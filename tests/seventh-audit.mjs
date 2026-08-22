import { chromium } from 'playwright';
import { DEFAULT_STATE, STATE_SCHEMA_VERSION, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};
function stateWith(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>Object.entries(source).forEach(([key,value])=>{
    if(value&&typeof value==='object'&&!Array.isArray(value)){if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[k]))target[key]={};merge(target[key],value);}else target[key]=value;
  });
  merge(state,patch);
  const r=state.flags.candidateRevision;
  if(r>0){for(const d of [{id:`training-compute-${state.flags.trainingCompute}-r${r}`,label:'إعداد حوسبة',effectText:'fixture'},{id:`training-checkpoint-${state.flags.trainingCheckpoint}-r${r}`,label:'إعداد checkpoint',effectText:'fixture'}])if(!state.decisions.some(x=>x.id===d.id))state.decisions.push(d);}
  if(state.flags.deployRecovery&&state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3){const id=`deploy-resilience-risk-${state.flags.deployLoad.join('-')}`;if(!state.decisions.some(d=>d.id===id))state.decisions.push({id,label:'قبول فجوة المرونة',effectText:'fixture'});}
  return state;
}
async function load(page,patch={}){await page.goto(BASE_URL,{waitUntil:'networkidle'});await page.evaluate(({storageKey,settingsKey,state,settings})=>{localStorage.clear();localStorage.setItem(settingsKey,JSON.stringify(settings));localStorage.setItem(storageKey,JSON.stringify(state));},{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});await page.reload({waitUntil:'networkidle'});}
async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}
function advanced(extra={}){return{dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[0,1],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}
function released(extra={}){return advanced({dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataTrainingApproved:[],releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use',...extra});}
function deploymentReady(load=[45,30,25]){return released({deployLoad:load,deployFailoverChecks:[],deployTabs:[],deployRecovery:null,supportIndex:0,transferChoice:null});}

if(STATE_SCHEMA_VERSION!==5)throw new Error(`Expected schema v5, got ${STATE_SCHEMA_VERSION}.`);
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('SEVENTH_AUDIT:retraining-creates-revision-only-on-start');
await load(page,{scene:'launchDecision',flags:{...advanced({trainingCompute:'8',trainingCheckpoint:'recent',releaseGates:['regression','capacity','rollback']})}});
await click(page,'[data-governance-remediate="0"]');
let state=await saved(page);
if(state.scene!=='trainingSetup'||state.flags.candidateRevision!==1)throw new Error('Governance remediation created a revision before training started.');
if(state.flags.trainingCompute!=='12'||state.flags.trainingCheckpoint!=='validated')throw new Error('Next revision silently inherited previous training settings.');
if(state.flags.dataCurrentTrainingUsed.length)throw new Error('Old current lineage survived retraining setup.');
if(!state.decisions.some(d=>d.id==='data-retrain-plan-without-0-after-r1'))throw new Error('Retraining plan was not recorded.');
await click(page,'#trainStart');
state=await saved(page);
if(state.flags.candidateRevision!==2||state.scene!=='trainingRun')throw new Error('Revision 2 was not created at the start of the actual round.');
if(!state.decisions.some(d=>d.id==='training-compute-12-r2')||!state.decisions.some(d=>d.id==='training-checkpoint-validated-r2'))throw new Error('Revision 2 did not receive explicit configuration evidence.');

console.log('SEVENTH_AUDIT:task-status-matches-unresolved-work');
await load(page,{scene:'factoryOutcome',decisions:[{id:'factory-continue',label:'واصلت',effectText:'fixture'}],flags:{factoryChoice:'continue',factoryMaintenanceDebt:true}});
if(await page.locator('[data-task-panel][data-task-status="decision"]').count()!==1)throw new Error('Factory outcome was marked complete with maintenance debt open.');
await click(page,'#closeMaintenance');
if(await page.locator('[data-task-panel][data-task-status="complete"]').count()!==1)throw new Error('Factory outcome did not become complete after debt closure.');
await load(page,{scene:'dcCoolingOutcome',decisions:[{id:'dc-move',label:'نقل',effectText:'fixture'}],flags:{dcCoolingChoice:'move',dcCoolingRestored:false}});
if(await page.locator('[data-task-panel][data-task-status="decision"]').count()!==1)throw new Error('Cooling outcome was marked complete before repair.');
await click(page,'#repairCooling');
if(await page.locator('[data-task-panel][data-task-status="complete"]').count()!==1)throw new Error('Cooling outcome did not become complete after repair.');
await load(page,{scene:'checkpointEval',flags:{...advanced({checkpointEvalComplete:true})}});
if(await page.locator('[data-task-panel][data-task-status="complete"]').count()!==1)throw new Error('Completed checkpoint evaluation is not marked complete.');
await load(page,{scene:'transferChallenge',flags:{...released()}});
if(await page.locator('[data-task-panel][data-task-status="complete"]').count()!==1)throw new Error('Completed transfer challenge still requests a decision.');

console.log('SEVENTH_AUDIT:annotation-does-not-leak-reviewer-outcome');
const firstFour=[
  {index:0,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false},
  {index:1,choice:'عنف',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false},
  {index:2,choice:'مضايقة أو إساءة',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false},
  {index:3,choice:'غير واضح',acceptedAsReasonable:true,pending:false,reviewRejected:true,disputed:true}
];
await load(page,{scene:'annotationTask',flags:{annotationResults:firstFour,breakDecisionMade:true}});
await page.getByText('المبلغ قبل مراجعة الجودة: 0.32',{exact:true}).waitFor({state:'visible'});
if(await page.getByText('المبلغ المبدئي:',{exact:false}).count())throw new Error('Old provisional earnings label remains.');

console.log('SEVENTH_AUDIT:n1-maximum-removes-impossible-retry');
await load(page,{scene:'deployLoad',flags:{...deploymentReady([45,30,25])}});
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.getByText(/أفضل مرونة ممكنة بهذه الثوابت/).waitFor({state:'visible'});
if(await page.locator('#retryLoad').count())throw new Error('Retry is still offered after reaching the mathematical maximum 1/3.');
await page.getByText(/الحد الأقصى الممكن بهذه الثوابت هو 1\/3/).first().waitFor({state:'visible'});
await load(page,{scene:'deployLoad',flags:{...deploymentReady([60,5,35])}});
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.locator('#retryLoad').waitFor({state:'visible'});

console.log('SEVENTH_AUDIT:results-show-visual-encountered-support-roles');
await load(page,{scene:'results',flags:released({safetyChoice:'details'})});
let supportDetails=page.locator('.secondary-labor-details');
await supportDetails.waitFor({state:'visible'});
if(!(await supportDetails.getAttribute('open')))await supportDetails.locator('summary').click();
let roles=supportDetails.locator('.person-card');
if(await roles.count()<10)throw new Error('Supporting roles are not rendered as visual person cards.');
await supportDetails.getByText('مها',{exact:true}).waitFor({state:'visible'});
await supportDetails.getByText('مستخدم متأثر',{exact:true}).waitFor({state:'visible'});
if(await supportDetails.getByText('مراجع لغة',{exact:true}).count())throw new Error('Language reviewer appears despite not being encountered on this path.');
await load(page,{scene:'results',flags:released({safetyChoice:'strict'})});
supportDetails=page.locator('.secondary-labor-details');
await supportDetails.waitFor({state:'visible'});
if(!(await supportDetails.getAttribute('open')))await supportDetails.locator('summary').click();
roles=supportDetails.locator('.person-card');
if(await roles.count()<10)throw new Error('Supporting roles disappeared on the remediation path.');
await supportDetails.getByText('مراجع لغة',{exact:true}).waitFor({state:'visible'});

await browser.close();
console.log('Seventh-audit regression checks passed.');
