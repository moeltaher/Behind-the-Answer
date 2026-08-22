import { chromium } from 'playwright';
import { load, click, saved } from './helpers/browser-fixtures.mjs';

function baseAdvanced(extra={}){
  return {
    dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},
    dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,
    safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra
  };
}

const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1280,height:900}});

console.log('REVISIONS_FAILOVER:fast-launch-only-with-real-debt');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced({trainingCheckpoint:'recent',releaseGates:['regression','capacity','risk','rollback'],extraChecks:['checkpoint']})}});
if(await page.locator('#criticalOnly').count())throw new Error('Fast launch remained available after all extra checks were completed.');
await page.locator('#delayLaunch').waitFor({state:'visible'});

console.log('REVISIONS_FAILOVER:detailed-transfer-feedback');
await load(page,{scene:'transferChallenge',flags:{...baseAdvanced({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2})}});
for(const id of ['weights','retrieval','inference','monitoring','maintenance'])await page.selectOption(`[data-transfer-item="${id}"]`,'build');
await click(page,'#transferSubmit');
const feedback=await page.locator('#transferFeedback').innerText();
if(!feedback.includes('استرجاع مستندات')||!feedback.includes('يحدث مع الطلب الحالي')||!feedback.includes('تشغيل مستمر'))throw new Error('Transfer challenge returns generic feedback.');

console.log('REVISIONS_FAILOVER:historical-lineage-in-results');
await load(page,{scene:'results',flags:{...baseAdvanced({dataIndex:2,dataStatuses:['excluded','ready'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:1,redact:0,review:0},dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[1],candidateRevision:2,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'})}});
await page.getByText('استُخدمت تاريخيًا ثم خرجت من النسخة الحالية',{exact:true}).waitFor({state:'visible'});

console.log('REVISIONS_FAILOVER:risk-gate-cannot-lie');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced({dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataTrainingApproved:[0],releaseGates:[]})}});
await page.getByText('مقفولة حتى معالجة حاجب البيانات',{exact:true}).waitFor({state:'visible'});
if(await page.locator('[data-gate-pass="risk"]').count())throw new Error('Risk gate can be approved while its evidence is false.');

console.log('REVISIONS_FAILOVER:retraining-waits-for-new-setup');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced({dataIndex:2,dataStatuses:['ready','ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:0,redact:0,review:0},dataTrainingApproved:[0],dataTrainingUsed:[0,1],dataCurrentTrainingUsed:[0,1],releaseGates:['regression','capacity','rollback']})}});
await click(page,'[data-governance-remediate="0"]');
let retrained=await saved(page);
if(retrained.flags.candidateRevision!==1||retrained.scene!=='trainingSetup')throw new Error('Governance remediation created a phantom revision before training started.');
if(retrained.flags.releaseGates.length||retrained.flags.checkpointEvalComplete||retrained.flags.safetyRetested||retrained.flags.evalIndex!==0)throw new Error('Evidence from revision 1 remained active after planning retraining.');
if(!retrained.flags.dataTrainingUsed.includes(0)||retrained.flags.dataCurrentTrainingUsed.length)throw new Error('Historical lineage was erased or current lineage was not cleared.');
if(retrained.flags.trainingCompute!=='12'||retrained.flags.trainingCheckpoint!=='validated')throw new Error('Next revision inherited old training settings silently.');
await click(page,'#trainStart');
retrained=await saved(page);
if(retrained.flags.candidateRevision!==2||retrained.scene!=='trainingRun')throw new Error('Revision 2 was not created exactly when the new training round started.');
if(!retrained.decisions.some(d=>d.id==='training-compute-12-r2')||!retrained.decisions.some(d=>d.id==='training-checkpoint-validated-r2'))throw new Error('New revision configuration was not recorded.');

console.log('REVISIONS_FAILOVER:distribution-sensitive-failover');
for(const [values,expected] of [[[45,30,25],'1 من 3 حالات خروج كاملة يمكن امتصاصها'],[[60,5,35],'0 من 3 حالات خروج كاملة يمكن امتصاصها']]){
  await load(page,{scene:'deployLoad',flags:{...baseAdvanced({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:values})}});
  for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);
  await page.getByText(expected,{exact:true}).waitFor({state:'visible'});
}

console.log('REVISIONS_FAILOVER:same-scene-focus');
await load(page,{scene:'launchDecision',flags:{...baseAdvanced({releaseGates:[]})}});
await click(page,'[data-gate-investigate="capacity"]');
await page.waitForTimeout(50);
if(await page.evaluate(()=>document.activeElement?.tagName)!=='H1')throw new Error('Focus was lost after same-scene rerender.');

await browser.close();
console.log('Revisions and failover regression checks passed.');
