import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

function stateWith(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>Object.entries(source).forEach(([key,value])=>{
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key])) target[key]={};
      merge(target[key],value);
    } else target[key]=value;
  });
  merge(state,patch);
  return state;
}
async function load(page,patch={}){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({storageKey,settingsKey,state,settings})=>{
    localStorage.clear();
    localStorage.setItem(settingsKey,JSON.stringify(settings));
    localStorage.setItem(storageKey,JSON.stringify(state));
  },{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:stateWith(patch),settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
}
async function click(page,selector){await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}
function advancedFlags(extra={}){
  return {
    dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0},
    dataTrainingUsed:[0],dataCurrentTrainingUsed:[0],candidateRevision:1,trainingIncidentChoice:'pause',evalIndex:3,evalCorrectCount:3,evaluatorCalibrationComplete:true,checkpointEvalComplete:true,
    safetyChoice:'details',safetyRemediated:true,safetyRetested:true,...extra
  };
}

async function completeJourney(browserType,label,viewport){
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport});
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({settingsKey,settings})=>{localStorage.clear();localStorage.setItem(settingsKey,JSON.stringify(settings));},{settingsKey:SETTINGS_KEY,settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
  const step=async selector=>click(page,selector);
  await step('#startBtn'); await step('#zoomContinue'); await step('[data-next="mineOrientation"]'); await step('#mineReady');
  for(let i=0;i<10;i++) await step('[data-sector="a"]');
  await step('[data-sector="b"]'); await step('#mineContinue'); await step('[data-sector="a"]'); await step('#mineInspectionContinue'); await step('#mineEndContinue'); await step('[data-next="ch2Intro"]');
  await step('[data-next="factoryOrientation"]'); await step('#factoryReady'); await step('#factoryMonitor'); await step('[data-factory="stop"]'); await step('#factoryOutcomeContinue'); await step('[data-next="ch3Intro"]');
  await step('[data-next="dcInstall"]'); for(const id of ['rack','power','network','register']) await step(`[data-server-step="${id}"]`); await step('#dcTest'); await step('[data-cooling="stop"]'); await step('#dcAfterCooling'); await step('#dcWorkersContinue'); await step('[data-next="ch4Intro"]');
  await step('[data-next="dataOrigins"]'); await step('#toClean');
  for(let i=0;i<5;i++){
    const choice=await page.locator('[data-clean-choice]').evaluateAll(nodes=>nodes.find(node=>!node.disabled)?.dataset.cleanChoice);
    if(!choice) break;
    await step(`[data-clean-choice="${choice}"]`);
    if(await page.locator('#followupRedact').count()) await step('#followupRedact');
  }
  await step('#finishData'); await step('[data-next="ch5Intro"]'); await step('[data-next="annotationIntro"]'); await step('#annotationStart');
  for(let i=0;i<6;i++){
    const first=page.locator('[data-label-choice]').first(); await first.waitFor({state:'visible'}); await first.click();
    if(await page.locator('#takeBreak').count()) await step('#takeBreak');
    if(await page.locator('#annotationNext').count()) await step('#annotationNext');
  }
  if(await page.locator('#annotationReviewContinue').count()) await step('#annotationReviewContinue');
  await step('#annotationEndContinue'); await step('[data-next="ch6Intro"]'); await step('[data-next="trainingSetup"]');
  for(const button of await page.locator('[data-training-hold]').all()) await button.click();
  await step('#trainStart'); await step('#trainPause'); await step('#sendHuman'); await step('[data-next="ch7Intro"]'); await step('[data-next="evalTask"]');
  for(let i=0;i<3;i++){await step('[data-eval="a"]');await step('#nextEval');}
  if(await page.locator('#calibrationChoice').count()){await page.selectOption('#calibrationChoice','a');await step('#confirmCalibration');}else await step('#confirmCalibration');
  for(const [id,value] of [['apology','b'],['legal','a'],['friendly','b']]) await page.selectOption(`[data-checkpoint-sample="${id}"]`,value);
  await step('#checkCheckpoint'); await step('#toSafety'); await step('[data-safety="details"]'); await step('#remediateSafety'); await step('#confirmSafetyRetest');
  while(await page.locator('[data-governance-remediate]').count()) await page.locator('[data-governance-remediate]').first().click();
  while(await page.locator('[data-gate-investigate]').count()) await page.locator('[data-gate-investigate]').first().click();
  while(await page.locator('[data-gate-pass]').count()) await page.locator('[data-gate-pass]').first().click();
  while(await page.locator('[data-extra-check]').count()) await page.locator('[data-extra-check]').first().click();
  if(await page.locator('#launchReady').count()) await step('#launchReady'); else await step('#delayLaunch');
  await step('#finishEval'); await step('[data-next="ch8Intro"]'); await step('[data-next="deployLoad"]');
  for(const [id,value] of [['#range0','45'],['#range1','30'],['#range2','25']]) await page.locator(id).fill(value);
  await step('#testLoad'); for(const i of [0,1,2]) await step(`[data-failover-check="${i}"]`); await step('#finishFailover');
  for(const id of ['network','compute','model']) await step(`[data-incident-tab="${id}"]`); await step('[data-recovery="rollback"]'); await step('#onCallContinue');
  for(let i=0;i<2;i++){await step('[data-support-choice="evidence"]');if(await page.locator('#supportNext').count())await step('#supportNext');}
  await step('#deployEndContinue'); await step('[data-next="pipelineAssemble"]'); await step('#backPrompt');
  for(const [id,value] of [['weights','build'],['retrieval','request'],['inference','request'],['monitoring','continuous'],['maintenance','continuous']]) await page.selectOption(`[data-transfer-item="${id}"]`,value);
  await step('#transferSubmit'); await step('#transferContinue'); await step('#showResults'); await step('#resultsContinue');
  await page.getByText('مهمتك الآن',{exact:true}).waitFor({state:'visible'});
  await browser.close(); console.log(`Complete journey passed: ${label}`);
}

async function runCausalChecks(){
  console.log('SMOKE_PHASE:causal');
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await load(page,{scene:'deployLoad',flags:{...advancedFlags({trainingCheckpoint:'recent',releaseGates:['regression','capacity','risk','rollback'],launchChoice:'fast',deferredExtraChecks:['checkpoint']})}});
  await page.getByText('نفّذ الفحوص التي قررت تأجيلها بدل اعتبارها مكتملة.',{exact:true}).waitFor({state:'visible'});
  await click(page,'[data-monitoring-check="checkpoint"]');
  let state=await saved(page);
  if(!state.flags.monitoringChecksCompleted.includes('checkpoint')) throw new Error('Deferred monitoring work was not persisted.');
  await page.getByText('لم يظهر انحدار جديد يمنع استمرار النسخة الحالية في سيناريو اللعبة.',{exact:true}).waitFor({state:'visible'});
  await click(page,'#continueAfterMonitoring');
  await page.locator('#range0').waitFor({state:'visible'});

  await load(page,{scene:'deployLoad',flags:{...advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25]})}});
  for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
  await page.getByText('1 من 3 حالات خروج كاملة يمكن امتصاصها',{exact:true}).waitFor({state:'visible'});

  await load(page,{scene:'deployLoad',flags:{...advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[60,5,35]})}});
  for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
  await page.getByText('0 من 3 حالات خروج كاملة يمكن امتصاصها',{exact:true}).waitFor({state:'visible'});

  await load(page,{scene:'evalTask',flags:{...advancedFlags({evalIndex:3,evalCorrectCount:1,evaluatorCalibrationComplete:false,checkpointEvalComplete:false,safetyChoice:null,safetyRemediated:false,safetyRetested:false,releaseGates:[]})}});
  await page.getByText('أثبت أنك تستطيع تطبيق المعيار بعد مراجعته.',{exact:true}).waitFor({state:'visible'});
  await click(page,'#confirmCalibration');
  state=await saved(page);
  if(state.flags.evaluatorCalibrationComplete) throw new Error('Calibration completed without verification evidence.');
  await page.selectOption('#calibrationChoice','a');
  await click(page,'#confirmCalibration');
  state=await saved(page);
  if(!state.flags.evaluatorCalibrationComplete||state.scene!=='checkpointEval') throw new Error('Correct calibration evidence did not unlock checkpoint evaluation.');

  await browser.close();
  console.log('Causal checks passed.');
}

async function runMigrationBrowserCheck(){
  console.log('SMOKE_PHASE:migration');
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const v3=clone(DEFAULT_STATE);
  v3.schemaVersion=3;
  for(const key of ['dataTrainingApproved','dataCurrentTrainingUsed','candidateRevision','evaluatorCalibrationComplete','deferredExtraChecks','monitoringChecksCompleted']) delete v3.flags[key];
  v3.scene='finalAnswer';
  v3.flags.dataIndex=2;
  v3.flags.dataStatuses=['excluded','ready'];
  v3.flags.dataChecks=[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'}];
  v3.flags.dataSort={keep:1,remove:1,redact:0,review:0};
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:STORAGE_KEY,value:v3});
  await page.reload({waitUntil:'networkidle'});
  const migrated=await saved(page);
  if(migrated.schemaVersion!==4||migrated.scene!=='trainingSetup'||migrated.flags.candidateRevision!==0) throw new Error('Browser v3 migration did not rewind safely to training setup.');
  await browser.close(); console.log('Browser migration passed.');
}

async function runAccessibilityMatrix(){
  console.log('SMOKE_PHASE:accessibility');
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const cases=[
    ['intro',{}],
    ['trainingSetup',{dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0}}],
    ['launchDecision',advancedFlags({releaseGates:[]})],
    ['deployLoad',advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready'})],
    ['transferChallenge',advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2})]
  ];
  for(const [scene,flags] of cases){
    await load(page,{scene,flags});
    const result=await new AxeBuilder({page}).analyze();
    if(result.violations.length) throw new Error(`Accessibility violations in ${scene}: ${result.violations.map(v=>v.id).join(', ')}`);
  }
  await browser.close(); console.log('Accessibility matrix passed.');
}

async function runCrossBrowserSmoke(browserType,label){
  const browser=await browserType.launch(); const page=await browser.newPage({viewport:{width:1100,height:800}}); await page.goto(BASE_URL,{waitUntil:'networkidle'}); await page.getByText('مهمتك الآن',{exact:true}).waitFor({state:'visible'}); await page.locator('#startBtn').click(); await page.locator('#zoomContinue').waitFor({state:'visible'}); await browser.close(); console.log(`${label} smoke passed.`);
}

console.log('SMOKE_PHASE:desktop:start');
await completeJourney(chromium,'desktop',{width:1280,height:900});
console.log('SMOKE_PHASE:mobile:start');
await completeJourney(chromium,'mobile',{width:390,height:844});
await runCausalChecks();
await runMigrationBrowserCheck();
await runAccessibilityMatrix();
await runCrossBrowserSmoke(firefox,'Firefox');
await runCrossBrowserSmoke(webkit,'WebKit');
console.log('Complete browser suite passed.');
