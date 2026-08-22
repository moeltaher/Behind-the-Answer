import { chromium } from 'playwright';
import { load, click, saved } from './helpers/browser-fixtures.mjs';

function advanced(extra={}){return{dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[0,1],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}
function released(extra={}){return advanced({dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataTrainingApproved:[],releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',...extra});}
const annotationResults=Array.from({length:6},(_,index)=>({index,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false}));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('GUIDANCE_HISTORY:history-preserved-when-revision-changes');
const historical=[{id:'checkpoint-evidence-reviewed-r1',label:'دليل قديم',effectText:'حدث فعلًا'},{id:'release-gate-regression-r1',label:'بوابة قديمة',effectText:'خاصة بالنسخة 1'}];
await load(page,{scene:'launchDecision',decisions:historical,ledger:[{chapter:6,human:'ريم',work:'تقييم النسخة 1',system:'جاهزية',details:'تاريخ فعلي'}],flags:{...advanced({releaseGates:['regression','capacity','rollback']})}});
await click(page,'[data-governance-remediate="0"]');
let state=await saved(page);
if(!state.decisions.some(d=>d.id==='revision-superseded-r1'))throw new Error('Superseded revision was not explicitly recorded.');
if(!state.decisions.some(d=>d.id==='data-retrain-plan-without-0-after-r1'))throw new Error('Retraining plan was not explicitly recorded.');
if(!state.ledger.some(e=>e.chapter===6))throw new Error('Revision reset deleted historical ledger entries.');
if(state.flags.releaseGates.length||state.flags.checkpointEvalComplete||state.flags.safetyRetested)throw new Error('Old evidence remained active after revision change.');
if(state.flags.candidateRevision!==1||state.scene!=='trainingSetup')throw new Error('A revision was created before the next training round started.');

console.log('GUIDANCE_HISTORY:eligibility-progress');
await load(page,{scene:'trainingSetup',flags:{dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingHeld:[1]}});
await page.getByText('أهلية البيانات: 2/2 مواد غير محسومة حُسم قرار دخولها',{exact:true}).waitFor({state:'visible'});

console.log('GUIDANCE_HISTORY:calibration-proof-after-errors');
await load(page,{scene:'evalTask',flags:{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:1}});
await click(page,'#confirmCalibration');
state=await saved(page);
if(state.flags.evaluatorCalibrationComplete)throw new Error('Calibration completed without a correct verification sample.');
await page.selectOption('#calibrationChoice','a');
await click(page,'#confirmCalibration');
state=await saved(page);
if(!state.flags.evaluatorCalibrationComplete)throw new Error('Correct calibration proof did not complete calibration.');

console.log('GUIDANCE_HISTORY:task-panel-is-universal-and-singular');
for(const [scene,flags] of [
 ['intro',{}],
 ['ch1Intro',{}],
 ['dataFollowup',{dataIndex:0,dataFollowup:{index:0,reason:'rights-evidence-found'},dataSort:{keep:0,remove:0,redact:0,review:1}}],
 ['annotationReview',{annotationResults}],
 ['safetyRetest',{...advanced()}],
 ['transferChallenge',{...released({deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2})}],
 ['results',{...released({deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'})}]
]){
  await load(page,{scene,flags});
  const persisted=await saved(page);
  if(persisted.scene!==scene)throw new Error(`Guidance state for ${scene} redirected to ${persisted.scene}.`);
  if(await page.locator('[data-task-panel]').count()!==1)throw new Error(`Expected exactly one task panel in ${scene}.`);
  await page.getByText('مهمتك الآن',{exact:true}).waitFor({state:'visible'});
}

await browser.close();
console.log('Guidance and history regression checks passed.');
