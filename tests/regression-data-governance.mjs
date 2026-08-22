import { chromium } from 'playwright';
import { load, click, saved } from './helpers/browser-fixtures.mjs';

function baseAdvanced(extra={}){return{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}

const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('DATA_GOVERNANCE:eligibility-before-use');
await load(page,{scene:'trainingSetup',flags:{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0}}});
if(!(await page.locator('#trainStart').isDisabled()))throw new Error('Unresolved material did not create an eligibility gate.');
await click(page,'[data-training-use="0"]');
let state=await saved(page);
if(!state.flags.dataTrainingApproved.includes(0)||state.flags.dataTrainingUsed.includes(0))throw new Error('Eligibility must record approval before historical use.');

console.log('DATA_GOVERNANCE:held-material-does-not-block-release');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced(),dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],dataTrainingHeld:[1]}});
if(await page.getByText('حاجب إصدار: بيانات النسخة الحالية',{exact:true}).count())throw new Error('Held material blocked release as if it were in current candidate.');

console.log('DATA_GOVERNANCE:checkpoint-evidence');
await load(page,{scene:'checkpointEval',flags:{...baseAdvanced({checkpointEvalComplete:false,safetyChoice:null,safetyRemediated:false,safetyRetested:false,releaseGates:[]})}});
if(await page.locator('[data-checkpoint-sample]').count()!==3)throw new Error('Checkpoint comparison no longer has three samples.');

console.log('DATA_GOVERNANCE:capacity-evidence');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced({releaseGates:[]})}});
if(await page.locator('[data-gate-pass="capacity"]').count())throw new Error('Capacity gate passed before investigation.');
await click(page,'[data-gate-investigate="capacity"]');
await page.getByText('نتيجة التشخيص',{exact:true}).waitFor({state:'visible'});
if(await page.getByText('84%',{exact:false}).count())throw new Error('Capacity result appeared before remediation and remeasurement.');
await click(page,'[data-gate-remediate="capacity"]');
await page.getByText('84%',{exact:false}).waitFor({state:'visible'});

console.log('DATA_GOVERNANCE:no-post-render-patch');
const scripts=await page.evaluate(()=>[...document.scripts].map(script=>script.src));
if(scripts.some(src=>src.includes('audit-enhancements')))throw new Error('Obsolete post-render audit layer returned.');

console.log('DATA_GOVERNANCE:full-decision-record');
const decisions=[{id:'mine-stop',label:'mine',effectText:'x'},{id:'checkpoint-evidence-reviewed-r1',label:'checkpoint',effectText:'x'},{id:'release-gate-regression-r1',label:'gate',effectText:'x'},{id:'future-unknown-id',label:'fallback',effectText:'x'}];
await load(page,{scene:'results',decisions,flags:{...baseAdvanced({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'})}});
const fullRecord=page.locator('.full-evidence-details');
await fullRecord.waitFor({state:'visible'});
if(!(await fullRecord.getAttribute('open')))await fullRecord.locator('summary').click();
for(const decision of decisions)await fullRecord.getByText(decision.label,{exact:true}).waitFor({state:'visible'});

await browser.close();
console.log('Data governance regression checks passed.');
