import { chromium } from 'playwright';
import { load, click, saved } from './helpers/browser-fixtures.mjs';

function candidate(extra={}){return{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}
function released(extra={}){return candidate({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',...extra});}
function ending(extra={}){return released({deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',deployRecoveryDisposition:'cleared',supportIndex:2,...extra});}

const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('CLARITY_REMEDIATION:single-task-panel');
await load(page,{scene:'ch1Intro'});
if(await page.locator('[data-task-panel]').count()!==1)throw new Error('Chapter intro renders more than one task panel.');

console.log('CLARITY_REMEDIATION:training-recovery-is-explicit');
await load(page,{scene:'trainingRun',flags:{...candidate({trainingIncidentChoice:null})}});
await click(page,'#trainPause');
let state=await saved(page);
if(state.scene!=='trainingRecovery')throw new Error('Training pause skipped explicit recovery scene.');
if(state.flags.trainingIncidentChoice!==null)throw new Error('Pause marked the incident complete before recovery.');
await page.getByRole('heading',{name:'الجولة متوقفة حتى تعود المجموعة المعطلة إلى حالة صالحة.',exact:true}).waitFor({state:'visible'});
await page.getByText('استعادة أو استبدال المجموعة',{exact:true}).waitFor({state:'visible'});
await page.getByText('التحقق من 8/8',{exact:true}).waitFor({state:'visible'});
await click(page,'#repairTrainingCompute');
state=await saved(page);
if(state.scene!=='trainingEval'||state.flags.trainingIncidentChoice!=='pause')throw new Error('Training recovery did not close the incident before evaluation.');
if(!state.decisions.some(decision=>decision.id==='train-recovery-r1'))throw new Error('Training recovery evidence was not recorded.');

console.log('CLARITY_REMEDIATION:mining-open-debt-status');
await load(page,{scene:'mineEnd',flags:{miningCount:12,miningMinutes:42,miningBUses:2,miningIncidentChoice:'continue',miningRiskLevel:0,miningWarning:false,miningInspectionCount:0}});
if(await page.locator('[data-task-panel][data-task-status="debt"] .task-status--debt').count()!==1)throw new Error('Mining end hides unresolved maintenance risk behind complete status.');

console.log('CLARITY_REMEDIATION:capacity-diagnose-remediate-measure');
await load(page,{scene:'releaseGateReview',flags:{...candidate({releaseGates:[]})}});
await click(page,'[data-gate-investigate="capacity"]');
if(await page.getByText('84%',{exact:false}).count())throw new Error('Capacity reached 84% immediately after diagnosis.');
await page.getByText('نتيجة التشخيص',{exact:true}).waitFor({state:'visible'});
await click(page,'[data-gate-remediate="capacity"]');
await page.getByText('84%',{exact:false}).waitFor({state:'visible'});
if(await page.locator('[data-gate-pass="capacity"]').count()!==1)throw new Error('Capacity gate did not become reviewable after remeasurement.');

console.log('CLARITY_REMEDIATION:license-evidence-before-clear');
await load(page,{scene:'governanceReview',flags:{...candidate({dataIndex:4,dataStatuses:['excluded','excluded','excluded','ready'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'na',privacy:'na',fitness:'na'},{rights:'na',privacy:'na',fitness:'na'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:3,redact:0,review:0},dataTrainingApproved:[3],dataTrainingUsed:[3],dataCurrentTrainingUsed:[3],releaseGates:['regression','capacity','rollback']})}});
await click(page,'[data-governance-remediate="3"]');
state=await saved(page);
if(state.flags.dataChecks[3].rights!=='unresolved')throw new Error('Opening license evidence silently cleared rights.');
await page.getByText('دليل الترخيص ظاهر',{exact:true}).waitFor({state:'visible'});
await click(page,'[data-governance-remediate="3"]');
state=await saved(page);
if(state.flags.dataChecks[3].rights!=='clear')throw new Error('Adopting visible license evidence did not clear the rights blocker.');

console.log('CLARITY_REMEDIATION:failover-ceiling-after-tests');
await load(page,{scene:'deployLoad',flags:{...released()}});
if(await page.getByText(/السقف بهذه السعات وحدود الاستقبال هو 1\/3/).count())throw new Error('Failover ceiling is revealed before the tests.');
for(const [selector,value] of [['#range0','45'],['#range1','30'],['#range2','25']])await page.locator(selector).evaluate((input,next)=>{input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
await click(page,'#testLoad');
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.getByText(/السقف بهذه السعات وحدود الاستقبال هو 1\/3/).waitFor({state:'visible'});

console.log('CLARITY_REMEDIATION:answer-before-transfer-test');
await load(page,{scene:'pipelineAssemble',flags:{...ending({transferChoice:null})}});
await click(page,'#backPrompt');
state=await saved(page);
if(state.scene!=='finalAnswer'||state.flags.transferChoice!==null)throw new Error('Pipeline did not return to the original answer before transfer testing.');
await page.getByText('الإجابة:',{exact:true}).waitFor({state:'visible'});
await click(page,'#transferFromAnswer');
state=await saved(page);
if(state.scene!=='transferChallenge')throw new Error('Transfer challenge is not placed after the answer payoff.');

await browser.close();
console.log('Clarity and remediation regression checks passed.');
