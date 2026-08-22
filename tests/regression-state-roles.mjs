import { chromium } from 'playwright';
import { STATE_SCHEMA_VERSION } from '../js/core/state.js';
import { load, click, saved } from './helpers/browser-fixtures.mjs';

function advanced(extra={}){return{dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[0,1],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra};}
function released(extra={}){return advanced({dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataTrainingApproved:[],releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use',...extra});}
function deploymentReady(loadValues=[45,30,25]){return released({deployLoad:loadValues,deployFailoverChecks:[],deployTabs:[],deployRecovery:null,supportIndex:0,transferChoice:null});}

if(STATE_SCHEMA_VERSION!==5)throw new Error(`Expected schema v5, got ${STATE_SCHEMA_VERSION}.`);
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('STATE_ROLES:retraining-revision-on-start');
await load(page,{scene:'launchDecision',flags:{...advanced({trainingCompute:'8',trainingCheckpoint:'recent',releaseGates:['regression','capacity','rollback']})}});
await click(page,'[data-governance-remediate="0"]');
let state=await saved(page);
if(state.scene!=='trainingSetup'||state.flags.candidateRevision!==1)throw new Error('Governance remediation created a revision before training started.');
if(state.flags.trainingCompute!=='8'||state.flags.trainingCheckpoint!=='validated')throw new Error('Next revision did not reset to the fixed project allocation and validated checkpoint.');
if(state.flags.dataCurrentTrainingUsed.length)throw new Error('Old current lineage survived retraining setup.');
if(!state.decisions.some(d=>d.id==='data-retrain-plan-without-0-after-r1'))throw new Error('Retraining plan was not recorded.');
await click(page,'#trainStart');
state=await saved(page);
if(state.flags.candidateRevision!==2||state.scene!=='trainingRun')throw new Error('Revision 2 was not created at the start of the actual round.');
if(!state.decisions.some(d=>d.id==='training-compute-8-r2')||!state.decisions.some(d=>d.id==='training-checkpoint-validated-r2'))throw new Error('Revision 2 did not receive explicit configuration evidence.');

console.log('STATE_ROLES:task-status-matches-unresolved-work');
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

console.log('STATE_ROLES:annotation-does-not-leak-reviewer-outcome');
const firstFour=[
  {index:0,choice:'آمن',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false},
  {index:1,choice:'عنف',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false},
  {index:2,choice:'مضايقة أو إساءة',acceptedAsReasonable:true,pending:false,reviewRejected:false,disputed:false},
  {index:3,choice:'غير واضح',acceptedAsReasonable:true,pending:false,reviewRejected:true,disputed:true}
];
await load(page,{scene:'annotationTask',flags:{annotationResults:firstFour,breakDecisionMade:true}});
await page.getByText('المبلغ قبل مراجعة الجودة: 0.32',{exact:true}).waitFor({state:'visible'});
if(await page.getByText('المبلغ المبدئي:',{exact:false}).count())throw new Error('Old provisional earnings label remains.');

console.log('STATE_ROLES:n1-maximum-removes-impossible-retry');
await load(page,{scene:'deployLoad',flags:{...deploymentReady([45,30,25])}});
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.getByText(/أفضل مرونة ممكنة بهذه الثوابت/).waitFor({state:'visible'});
if(await page.locator('#retryLoad').count())throw new Error('Retry is still offered after reaching the mathematical maximum 1/3.');
await page.getByText(/السقف بهذه السعات وحدود الاستقبال هو 1\/3/).first().waitFor({state:'visible'});
await load(page,{scene:'deployLoad',flags:{...deploymentReady([60,5,35])}});
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.locator('#retryLoad').waitFor({state:'visible'});

console.log('STATE_ROLES:results-show-path-dependent-support-roles');
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
console.log('State and roles regression checks passed.');
