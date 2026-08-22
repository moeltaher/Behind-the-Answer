import { chromium } from 'playwright';
import { addLedger } from '../js/core/ledger.js';
import { load, click, saved } from './helpers/browser-fixtures.mjs';

function advanced(extra={}){return{dataIndex:2,dataStatuses:['excluded','ready'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:1,redact:0,review:0},dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[1],candidateRevision:2,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',...extra};}
function released(extra={}){return advanced({deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use',...extra});}

console.log('CAUSALITY_RESULTS:ledger-keeps-multiple-revisions');
const ledgerState={ledger:[]};
addLedger(ledgerState,5,'ديفيد','تدريب','revision 1','قديم');
addLedger(ledgerState,5,'ديفيد','تدريب','revision 2','حالي');
addLedger(ledgerState,5,'ديفيد','تدريب','revision 2','حالي');
if(ledgerState.ledger.length!==2)throw new Error('Ledger did not preserve distinct revision records idempotently.');

const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});
await load(page,{scene:'results',ledger:[{chapter:5,human:'ديفيد',work:'جولة قديمة',system:'revision 1',details:'سجل قديم'},{chapter:5,human:'ديفيد',work:'جولة حالية',system:'revision 2',details:'سجل حالي'}],flags:released()});
await click(page,'#resultsLedger');
await page.getByText('revision 2',{exact:true}).waitFor({state:'visible'});
await page.getByText('عرض 1 سجل تاريخي سابق',{exact:true}).waitFor({state:'visible'});

console.log('CAUSALITY_RESULTS:factory-debt-close-or-carry');
await load(page,{scene:'factoryOutcome',decisions:[{id:'factory-continue',label:'واصلت',effectText:'دين مفتوح'}],flags:{factoryChoice:'continue',factoryMaintenanceDebt:true}});
await page.getByText('قرار ظهر بسبب اختيارك الاستمرار في الإنتاج',{exact:true}).waitFor({state:'visible'});
await click(page,'#closeMaintenance');
let state=await saved(page);
if(state.flags.factoryMaintenanceDebt)throw new Error('Factory maintenance debt remained open after explicit closure.');
if(!state.decisions.some(d=>d.id==='factory-debt-closed'))throw new Error('Factory debt closure was not recorded.');
await page.locator('#toFactoryAbstract').waitFor({state:'visible'});
await load(page,{scene:'factoryOutcome',decisions:[{id:'factory-continue',label:'واصلت',effectText:'دين مفتوح'}],flags:{factoryChoice:'continue',factoryMaintenanceDebt:true}});
await click(page,'#toFactoryAbstract');
state=await saved(page);
if(!state.decisions.some(d=>d.id==='factory-debt-carried')||state.scene!=='abstract2')throw new Error('Factory continuation did not record carried maintenance debt.');

console.log('CAUSALITY_RESULTS:contextual-task-guidance');
await load(page,{scene:'dataFollowup',flags:{dataIndex:0,dataFollowup:{index:0,reason:'rights-evidence-found'},dataSort:{keep:0,remove:0,redact:0,review:1}}});
await page.getByRole('heading',{name:'احسم مشكلة الخصوصية التي بقيت بعد مراجعة الحقوق',exact:true}).waitFor({state:'visible'});
await load(page,{scene:'trainingEval',flags:{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause'}});
if(await page.locator('[data-task-panel][data-task-status="complete"]').count()!==1)throw new Error('Completed scene does not expose complete task status.');

console.log('CAUSALITY_RESULTS:extra-checks-explain-cause');
await load(page,{scene:'launchDecision',flags:{...advanced({trainingCheckpoint:'recent',trainingCompute:'8',trainingIncidentChoice:'continue',dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1})}});
await page.getByText(/ظهر لأن نقطة الحفظ الأحدث حسنت النبرة/).waitFor({state:'visible'});
await page.getByText(/ظهر لأنك واصلت جولة التدريب بعد العطل عند الحد الأدنى/).waitFor({state:'visible'});

console.log('CAUSALITY_RESULTS:n1-gap-needs-explicit-decision');
await load(page,{scene:'deployLoad',flags:{...advanced({deployLoad:[45,30,25],deployFailoverChecks:[]})}});
for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
await page.getByText('وصلت إلى أفضل مرونة ممكنة بهذه الثوابت.',{exact:true}).waitFor({state:'visible'});
await page.getByText('اقبل فجوة المرونة وسجلها',{exact:true}).waitFor({state:'visible'});
await click(page,'#finishFailover');
state=await saved(page);
if(state.scene!=='deployIncident'||!state.decisions.some(d=>d.id==='deploy-resilience-risk-45-30-25'))throw new Error('Explicit resilience-risk acceptance did not gate incident progression.');

console.log('CAUSALITY_RESULTS:results-prefer-newest-match');
await load(page,{scene:'results',decisions:[{id:'data-retrain-plan-without-0-after-r1',label:'إعادة تدريب قديمة',effectText:'قديم'},{id:'data-retrain-plan-without-1-after-r2',label:'إعادة تدريب أحدث',effectText:'أحدث'}],flags:released({candidateRevision:3})});
const materialCard=page.locator('.journey-highlight').nth(1);
await materialCard.getByText('إعادة تدريب أحدث',{exact:true}).waitFor({state:'visible'});
if(await materialCard.getByText('إعادة تدريب قديمة',{exact:true}).count())throw new Error('Results highlight selected an older matching decision.');

await browser.close();
console.log('Causality and results regression checks passed.');
