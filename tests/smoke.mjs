import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { STATE_SCHEMA_VERSION } from '../js/core/state.js';
import { STORAGE_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
import { stateWith, BASE_URL } from './helpers/browser-fixtures.mjs';

const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};
async function load(page,patch=null){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  const state=patch?stateWith(patch):null;
  await page.evaluate(({state,settings})=>{localStorage.clear();localStorage.setItem('behindTheAnswerSettings',JSON.stringify(settings));if(state)localStorage.setItem('behindTheAnswerGame',JSON.stringify(state));},{state,settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
}
async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
async function setLoad(page,values){await page.evaluate(next=>next.forEach((value,index)=>{const input=document.querySelector(`#range${index}`);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}),values);}
async function completeFailover(page){for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);await click(page,'#finishFailover');}

async function completeCoreJourney(viewport,label){
  const browser=await chromium.launch(),page=await browser.newPage({viewport}),errors=[];page.on('pageerror',error=>errors.push(error.message));await load(page);
  await click(page,'#introSend');await click(page,'#descend');await click(page,'#chapterNext');await click(page,'#startMine');
  await click(page,'[data-sector="b"]');await click(page,'[data-sector="b"]');await click(page,'#mineStop');await click(page,'#inspectMine');await page.reload({waitUntil:'networkidle'});await page.locator('#repairMine').waitFor({state:'visible'});await click(page,'#repairMine');await page.reload({waitUntil:'networkidle'});await page.locator('#verifyMine').waitFor({state:'visible'});await click(page,'#verifyMine');await click(page,'#finishMine');
  for(let index=0;index<4;index++)await click(page,'[data-sector="b"]');await click(page,'#mineAbstract');await click(page,'#abstractNext');
  await click(page,'#chapterNext');await click(page,'#enterFab');await click(page,'#observeFab');await click(page,'#fabStop');await click(page,'#diagnoseFactory');await click(page,'#repairFactory');await click(page,'#verifyFactoryRepair');
  if(await page.locator('#toFactoryAbstract').count())throw new Error(`${label}: stopped factory batch completed before production.`);await click(page,'#completeFactoryBatch');if(await page.locator('#toFactoryAbstract').count())throw new Error(`${label}: factory batch completed before final inspection.`);await click(page,'#inspectFactoryBatch');await click(page,'#toFactoryAbstract');await click(page,'#abstractNext');
  await click(page,'#chapterNext');for(const step of ['rack','power','network','register'])await click(page,`[data-server-step="${step}"]`);await click(page,'#bootServer');await click(page,'#dcMove');await click(page,'#repairCooling');await click(page,'#verifyCooling');await click(page,'#dcAfterCooling');await click(page,'#dcReady');await click(page,'#abstractNext');
  const state=await saved(page);if(STATE_SCHEMA_VERSION!==8||state.schemaVersion!==8)throw new Error(`${label}: schema v8 not persisted.`);for(const field of ['trainingCompute','tookBreak','dcCoolingRestored','dataFollowupResolved','miningInspectionCount','factoryProductionComplete'])if(Object.hasOwn(state.flags,field))throw new Error(`${label}: obsolete field ${field} survived.`);if(errors.length)throw new Error(`${label}: ${errors.join(' | ')}`);
  await browser.close();console.log(`Core journey passed: ${label}`);
}

async function causalChecks(){
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900}});
  await load(page,{scene:'mineTask',flags:{miningCount:6,miningMinutes:28,miningBUses:4,miningWarning:true,miningIncidentChoice:'continue',miningRiskLevel:2,miningForcedInspection:true}});await click(page,'#mineStop');let state=await saved(page);if(state.flags.miningInspectionMode!=='forced'||state.flags.miningInspectionStage!=='inspect')throw new Error('Forced mining stop did not persist explicit inspection state.');await page.reload({waitUntil:'networkidle'});if(!await page.locator('#inspectMine').count())throw new Error('Forced mining inspection did not survive reload before inspection.');await click(page,'#inspectMine');await page.reload({waitUntil:'networkidle'});if(!await page.locator('#repairMine').count())throw new Error('Mining diagnosis did not survive reload.');

  await load(page,{scene:'factoryIncident'});await click(page,'#fabContinue');state=await saved(page);if(state.flags.factoryProductionStage!=='awaiting-completion'||!state.flags.factoryMaintenanceDebt)throw new Error('Factory continue decision executed production implicitly.');if(await page.locator('#toFactoryAbstract').count())throw new Error('Factory continue decision bypassed production and inspection.');await page.reload({waitUntil:'networkidle'});if(!await page.locator('#completeFactoryBatch').count())throw new Error('Factory production action did not survive reload.');await click(page,'#completeFactoryBatch');state=await saved(page);if(state.flags.factoryProductionStage!=='complete')throw new Error('Factory production completion did not persist separately.');if(await page.locator('#toFactoryAbstract').count())throw new Error('Factory production completion bypassed final inspection.');await page.reload({waitUntil:'networkidle'});if(!await page.locator('#inspectFactoryBatch').count())throw new Error('Factory final inspection action did not survive reload.');await click(page,'#inspectFactoryBatch');state=await saved(page);if(state.flags.factoryProductionStage!=='inspected'||state.flags.factoryDisposition!==null)throw new Error('Factory inspection should precede the maintenance-debt disposition decision.');

  await load(page,{scene:'trainingRun',flags:{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1}});await click(page,'#trainPause');state=await saved(page);if(state.flags.trainingIncidentChoice!=='pause'||state.flags.trainingRecoveryStage!=='none')throw new Error('Training pause decision was not persisted immediately.');await click(page,'#repairTrainingCompute');state=await saved(page);if(state.flags.trainingIncidentChoice!=='pause'||state.flags.trainingRecoveryStage!=='repaired')throw new Error('Training repair lost the pause decision or auto-verified.');await page.reload({waitUntil:'networkidle'});if(!await page.locator('#verifyTrainingCompute').count())throw new Error('Training repaired state did not survive reload.');await click(page,'#verifyTrainingCompute');state=await saved(page);if(state.flags.trainingIncidentChoice!=='pause'||state.flags.trainingRecoveryStage!=='verified')throw new Error('Training verification did not close recovery.');
  const ready={dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',trainingRecoveryStage:'verified',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true};
  await load(page,{scene:'releaseGateReview',flags:{...ready,releaseGates:[],releaseCapacityStage:'idle'}});await click(page,'[data-gate-investigate="capacity"]');await click(page,'[data-gate-remediate="capacity"]');state=await saved(page);if(state.flags.releaseCapacityStage!=='remediated'||state.flags.releaseGates.includes('capacity'))throw new Error('Capacity remediation auto-measured.');await click(page,'[data-gate-remeasure="capacity"]');
  await load(page,{scene:'deployLoad',flags:{...ready,releaseGates:['regression','capacity','risk','rollback'],releaseCapacityStage:'remeasured',launchChoice:'ready'}});if(await page.getByText(/السقف الممكن.*1\/3/).count())throw new Error('Failover ceiling leaked before tests.');await setLoad(page,[45,30,25]);await click(page,'#testLoad');if(await page.getByText(/الحمل الذي يجب نقله/).count())throw new Error('Failover result leaked before executing a case.');await completeFailover(page);state=await saved(page);if(state.scene!=='deployGoLive'||state.flags.deployTrafficOpen)throw new Error('Failover implicitly opened traffic.');await click(page,'#openTraffic');state=await saved(page);if(!state.flags.deployTrafficOpen||state.scene!=='deployIncident')throw new Error('Explicit traffic opening failed.');
  await browser.close();console.log('Causal checks passed.');
}

async function accessibilityCheck(){const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();await load(page);const results=await new AxeBuilder({page}).analyze();if(results.violations.length)throw new Error(`Accessibility violations: ${results.violations.map(item=>item.id).join(', ')}`);await context.close();await browser.close();console.log('Accessibility check passed.');}
async function engineSmoke(engine,name){const browser=await engine.launch(),page=await browser.newPage();await load(page);await click(page,'#introSend');await page.getByRole('heading',{name:'الإجابة هي آخر نقطة مرئية في سلسلة أطول.',exact:true}).waitFor({state:'visible'});await browser.close();console.log(`${name} smoke passed.`);}

await completeCoreJourney({width:1280,height:900},'desktop');
await completeCoreJourney({width:390,height:844},'mobile');
await causalChecks();
await accessibilityCheck();
await engineSmoke(firefox,'Firefox');
await engineSmoke(webkit,'WebKit');
console.log('Browser suite passed.');