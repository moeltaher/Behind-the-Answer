import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
import { DEMO_PROMPT } from '../js/data/story.js';

const BASE_URL='http://127.0.0.1:4173';
const TEST_SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

function currentState(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>Object.entries(source).forEach(([key,value])=>{
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      if(!target[key]||typeof target[key] !== 'object'||Array.isArray(target[key])) target[key]={};
      merge(target[key],value);
    } else target[key]=value;
  });
  merge(state,patch);
  const revision=state.flags.candidateRevision;
  if(revision>0){
    for(const decision of [
      {id:`training-compute-${state.flags.trainingCompute}-r${revision}`,label:'إعداد حوسبة',effectText:'fixture'},
      {id:`training-checkpoint-${state.flags.trainingCheckpoint}-r${revision}`,label:'إعداد checkpoint',effectText:'fixture'}
    ]) if(!state.decisions.some(item=>item.id===decision.id)) state.decisions.push(decision);
  }
  if(state.flags.deployRecovery&&state.flags.deployLoad&&state.flags.deployFailoverChecks.length===3){
    const id=`deploy-resilience-risk-${state.flags.deployLoad.join('-')}`;
    if(!state.decisions.some(decision=>decision.id===id)) state.decisions.push({id,label:'قبول فجوة المرونة',effectText:'fixture'});
  }
  return state;
}
async function load(page,patch=null,settings=TEST_SETTINGS){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({storageKey,settingsKey,state,settingsValue})=>{
    localStorage.clear();
    if(settingsValue) localStorage.setItem(settingsKey,JSON.stringify(settingsValue));
    if(state) localStorage.setItem(storageKey,JSON.stringify(state));
  },{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:patch?currentState(patch):null,settingsValue:settings});
  await page.reload({waitUntil:'networkidle'});
}
async function saved(page){ return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY); }
async function click(page,selector){ const target=page.locator(selector); await target.waitFor({state:'visible'}); await target.click(); }
async function chooseData(page,choice){ await click(page,`[data-sort="${choice}"]`); }
async function chooseAnnotation(page,label){ await click(page,`[data-tag="${label}"]`); }
async function setLoad(page,values){ await page.evaluate(next=>next.forEach((value,index)=>{const input=document.querySelector(`#range${index}`);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}),values); }
async function completeCheckpoint(page){
  const answers={apology:'b',legal:'a',friendly:'b'};
  for(const [id,value] of Object.entries(answers)) await page.selectOption(`[data-checkpoint-sample="${id}"]`,value);
  await click(page,'#checkCheckpoint');
  await click(page,'#toSafety');
}
async function completeRelease(page,{delay=true}={}){
  await click(page,'[data-gate-pass="regression"]');
  await click(page,'[data-gate-investigate="capacity"]');
  await click(page,'[data-gate-remediate="capacity"]');
  await click(page,'[data-gate-pass="capacity"]');
  await click(page,'[data-gate-pass="risk"]');
  await click(page,'[data-gate-pass="rollback"]');
  if(delay){
    for(const id of ['checkpoint','stability']) if(await page.locator(`[data-extra-check="${id}"]`).count()) await click(page,`[data-extra-check="${id}"]`);
    if(await page.locator('#delayLaunch').count()) await click(page,'#delayLaunch');
    else await click(page,'#launchReady');
  } else if(await page.locator('#criticalOnly').count()) await click(page,'#criticalOnly');
  else await click(page,'#launchReady');
}
async function completeFailover(page,expected='1 من 3 حالات خروج كاملة يمكن امتصاصها'){
  for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
  await page.getByText(expected,{exact:true}).waitFor({state:'visible'});
  await click(page,'#finishFailover');
}
async function completeTransfer(page){
  const answers={weights:'build',retrieval:'request',inference:'request',monitoring:'continuous',maintenance:'continuous'};
  for(const [id,value] of Object.entries(answers)) await page.selectOption(`[data-transfer-item="${id}"]`,value);
  await click(page,'#transferSubmit');
}

function advancedFlags(extra={}){
  return {
    dataIndex:1,
    dataStatuses:['ready'],
    dataChecks:[{rights:'clear',privacy:'clear',fitness:'clear'}],
    dataSort:{keep:1,remove:0,redact:0,review:0},
    dataTrainingUsed:[0],
    dataCurrentTrainingUsed:[0],
    candidateRevision:1,
    trainingIncidentChoice:'pause',
    evalIndex:3,
    evalCorrectCount:3,
    evaluatorCalibrationComplete:true,
    checkpointEvalComplete:true,
    safetyChoice:'details',
    safetyRemediated:true,
    safetyRetested:true,
    ...extra
  };
}

async function runJourney(viewport,label){
  console.log(`SMOKE_PHASE:${label}:start`);
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  await load(page);

  await click(page,'#introSend'); await click(page,'#descend'); await click(page,'#chapterNext'); await click(page,'#startMine');
  await click(page,'[data-sector="b"]'); await click(page,'[data-sector="b"]'); await click(page,'#mineStop'); await click(page,'#finishMine');
  for(let i=0;i<4;i+=1) await click(page,'[data-sector="b"]');
  await click(page,'#mineAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await click(page,'#enterFab'); await click(page,'#observeFab'); await click(page,'#fabContinue'); await click(page,'#toFactoryAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  for(const step of ['rack','network','power','register']) await click(page,`[data-server-step="${step}"]`);
  await click(page,'#bootServer'); await click(page,'#dcMove'); await click(page,'#repairCooling'); await click(page,'#dcAfterCooling'); await click(page,'#dcReady'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await click(page,'#toClean');
  await chooseData(page,'remove'); await chooseData(page,'keep'); await chooseData(page,'review'); await click(page,'#followupRedact'); await chooseData(page,'review'); await chooseData(page,'review');
  await click(page,'#dataAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await click(page,'#startAnnot');
  for(const choice of ['آمن','عنف','مضايقة أو إساءة']) await chooseAnnotation(page,choice);
  await click(page,'#takeBreak');
  for(const choice of ['غير واضح','خطاب كراهية','غير واضح']) await chooseAnnotation(page,choice);
  await page.getByText('مراجعة اختياراتك مثالًا بمثال',{exact:true}).waitFor({state:'visible'});
  if(await page.locator('#appeal').count()) await click(page,'#appeal');
  await click(page,'#annotAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  if(await page.locator('#trainStart').isDisabled()) throw new Error(`${label}: valid inputs should unlock training.`);
  await page.selectOption('#computeSel','8'); await page.selectOption('#checkpointSel','recent'); await click(page,'#trainStart'); await click(page,'#trainContinue'); await click(page,'#sendHuman'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  for(const choice of ['a','b','bad']){ if(choice==='b') await page.getByText(DEMO_PROMPT,{exact:true}).waitFor({state:'visible'}); await click(page,`[data-eval="${choice}"]`); await click(page,'#nextEval'); }
  await page.getByRole('heading',{name:/تطبيق المعيار|أكملت المهام الثلاث/}).waitFor({state:'visible'});
  if(await page.locator('#calibrationChoice').count()) await page.selectOption('#calibrationChoice','a');
  await click(page,'#confirmCalibration');
  await completeCheckpoint(page);
  await click(page,'[data-safety="details"]'); await click(page,'#remediateSafety'); await click(page,'#confirmSafetyRetest');
  await completeRelease(page,{delay:true}); await click(page,'#finishEval'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await setLoad(page,[45,30,25]); await click(page,'#testLoad'); await completeFailover(page);
  for(const tab of ['network','compute','model']) await click(page,`[data-tab="${tab}"]`);
  await click(page,'#rollback'); await click(page,'#toSupport'); await click(page,'#supportInvestigate'); await click(page,'#supportFast'); await click(page,'#uptimeAbstract'); await click(page,'#abstractNext');

  await click(page,'#backPrompt');
  await page.getByText('وقد يحدث وقت الطلب بحسب تصميم المنتج',{exact:true}).waitFor({state:'visible'});
  await click(page,'#transferFromAnswer'); await completeTransfer(page); await click(page,'#transferContinue');
  const state=await saved(page);
  const displayed=await page.locator('.full-evidence-details .decision-row').count();
  if(displayed!==state.decisions.length) throw new Error(`${label}: full record displays ${displayed}/${state.decisions.length} decisions.`);
  await page.getByRole('heading',{name:'سلسلة استخدام البيانات عبر النسخ',exact:true}).waitFor({state:'visible'});
  await click(page,'#toFinalMessage');
  await page.getByRole('heading',{name:'الواجهة هي نهاية السلسلة، وليست بدايتها.',exact:true}).waitFor({state:'visible'});
  if(errors.length) throw new Error(`${label}: page errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`Complete journey passed: ${label}`);
}

async function runCausalChecks(){
  console.log('SMOKE_PHASE:causal');
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});

  await load(page,{scene:'trainingSetup',flags:{dataIndex:1,dataStatuses:['excluded'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'}],dataSort:{keep:0,remove:1,redact:0,review:0}}});
  if(!(await page.locator('#trainStart').isDisabled())) throw new Error('Training started with zero eligible inputs.');
  await page.getByText('لا يمكن بدء جولة بلا مدخلات',{exact:true}).waitFor({state:'visible'});

  await load(page,{scene:'launchDecision',flags:{...advancedFlags({
    dataIndex:2,
    dataStatuses:['ready','ready'],
    dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}],
    dataSort:{keep:2,remove:0,redact:0,review:0},
    dataTrainingApproved:[0],
    dataTrainingUsed:[0,1],
    dataCurrentTrainingUsed:[0,1],
    releaseGates:['regression','capacity','rollback']
  })}});
  if(await page.locator('[data-gate-pass="risk"]').count()) throw new Error('Risk gate was passable while current candidate had a governance blocker.');
  const oldRevision=(await saved(page)).flags.candidateRevision;
  await click(page,'[data-governance-remediate="0"]');
  let state=await saved(page);
  if(state.flags.candidateRevision!==oldRevision||state.scene!=='trainingSetup') throw new Error('Retraining created a phantom revision before setup.');
  if(state.flags.releaseGates.length||state.flags.checkpointEvalComplete||state.flags.safetyRetested) throw new Error('Old candidate evidence survived retraining setup.');
  if(!state.flags.dataTrainingUsed.includes(0)||state.flags.dataCurrentTrainingUsed.length) throw new Error('Historical use/current candidate lineage was not preserved correctly.');
  await click(page,'#trainStart');
  state=await saved(page);
  if(state.flags.candidateRevision!==oldRevision+1||state.scene!=='trainingRun')throw new Error('Next candidate revision was not created exactly when training started.');

  await load(page,{scene:'launchDecision',flags:{...advancedFlags({releaseGates:[]})}});
  await click(page,'[data-gate-investigate="capacity"]');
  await page.waitForTimeout(50);
  const activeTag=await page.evaluate(()=>document.activeElement?.tagName);
  if(activeTag!=='H1') throw new Error(`Same-scene rerender lost keyboard focus; active element is ${activeTag}.`);
  await page.getByText('نتيجة التشخيص',{exact:true}).waitFor({state:'visible'});

  await load(page,{scene:'deployLoad',flags:{...advancedFlags({trainingCheckpoint:'recent',releaseGates:['regression','capacity','risk','rollback'],launchChoice:'fast',deferredExtraChecks:['checkpoint']})}});
  await page.getByText('نفّذ الفحوص التي قررت تأجيلها بدل اعتبارها مكتملة.',{exact:true}).waitFor({state:'visible'});
  await click(page,'[data-monitoring-check="checkpoint"]');
  state=await saved(page);
  if(!state.flags.monitoringChecksCompleted.includes('checkpoint')) throw new Error('Deferred monitoring work was not persisted.');
  await page.getByText('لم يظهر انحدار جديد يمنع استمرار النسخة الحالية في سيناريو اللعبة.',{exact:true}).waitFor({state:'visible'});
  await click(page,'#continueAfterMonitoring');
  await page.locator('#range0').waitFor({state:'visible'});

  await load(page,{scene:'deployLoad',flags:{...advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25]})}});
  for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
  await page.getByText('1 من 3 حالات خروج كاملة يمكن امتصاصها',{exact:true}).waitFor({state:'visible'});
  if(await page.locator('#retryLoad').count())throw new Error('Retry was offered after reaching the mathematical maximum.');

  await load(page,{scene:'deployLoad',flags:{...advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[60,5,35]})}});
  for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
  await page.getByText('0 من 3 حالات خروج كاملة يمكن امتصاصها',{exact:true}).waitFor({state:'visible'});
  await page.locator('#retryLoad').waitFor({state:'visible'});

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
  await page.evaluate(({key,value})=>{localStorage.clear();localStorage.setItem(key,JSON.stringify(value));},{key:STORAGE_KEY,value:v3});
  await page.reload({waitUntil:'networkidle'});
  const migrated=await saved(page);
  if(migrated.schemaVersion!==5||migrated.scene!=='trainingSetup') throw new Error('Browser v3 migration did not rewind safely to trainingSetup under v5.');
  await page.getByText('الإصدار 3 إلى الإصدار 5',{exact:false}).waitFor({state:'visible'});

  const invalid=currentState({scene:'finalMessage'});
  await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:STORAGE_KEY,value:invalid});
  await page.reload({waitUntil:'networkidle'});
  const reset=await saved(page);
  if(reset.scene!=='intro') throw new Error('Impossible v5 scene/state combination was accepted.');
  await browser.close();
  console.log('Browser migration and impossible-state reset passed.');
}

async function runA11y(){
  console.log('SMOKE_PHASE:axe');
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  const cases=[
    {scene:'intro'},
    {scene:'trainingSetup',flags:{dataIndex:1,dataStatuses:['excluded'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'}],dataSort:{keep:0,remove:1,redact:0,review:0}}},
    {scene:'checkpointEval',flags:{...advancedFlags({checkpointEvalComplete:false})}},
    {scene:'launchDecision',flags:{...advancedFlags({releaseGates:[]})}},
    {scene:'deployLoad',flags:{...advancedFlags({trainingCheckpoint:'recent',releaseGates:['regression','capacity','risk','rollback'],launchChoice:'fast',deferredExtraChecks:['checkpoint']})}},
    {scene:'transferChallenge',flags:{...advancedFlags({releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2})}}
  ];
  for(const patch of cases){
    await load(page,patch);
    const results=await new AxeBuilder({page}).analyze();
    const serious=results.violations.filter(item=>['serious','critical'].includes(item.impact));
    if(serious.length) throw new Error(`Accessibility violations in ${patch.scene}: ${serious.map(item=>item.id).join(', ')}`);
  }
  await context.close(); await browser.close();
  console.log('Dynamic accessibility matrix passed.');
}

async function crossBrowser(browserType,label){
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await load(page);
  await click(page,'#settingsBtn'); await page.locator('#settingsDialog').waitFor({state:'visible'}); await click(page,'#settingsDialog [data-close-dialog]');
  await click(page,'#introSend'); await click(page,'#descend');
  await page.getByRole('heading',{name:'استخراج مواد الأجهزة',exact:true}).waitFor({state:'visible'});
  await browser.close();
  console.log(`${label} smoke passed.`);
}

await runJourney({width:1280,height:900},'desktop');
await runJourney({width:390,height:844},'mobile');
await runCausalChecks();
await runMigrationBrowserCheck();
await runA11y();
await crossBrowser(firefox,'firefox');
await crossBrowser(webkit,'webkit');
console.log('Browser v5 journey, causality, migration, focus, accessibility and cross-browser checks passed.');