import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
import { DEMO_PROMPT } from '../js/data/story.js';

const BASE_URL='http://127.0.0.1:4173';
const TEST_SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

function currentState(patch={}){
  const state=clone(DEFAULT_STATE);
  const merge=(target,source)=>{
    for(const [key,value] of Object.entries(source)){
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key])) target[key]={};
        merge(target[key],value);
      } else target[key]=value;
    }
  };
  merge(state,patch);
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
async function setLoad(page,values){
  await page.evaluate(next=>next.forEach((value,index)=>{const input=document.querySelector(`#range${index}`);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}),values);
}
async function completeCheckpoint(page){
  const answers={apology:'b',legal:'a',friendly:'b'};
  for(const [id,value] of Object.entries(answers)) await page.selectOption(`[data-checkpoint-sample="${id}"]`,value);
  await click(page,'#checkCheckpoint');
  await click(page,'#toSafety');
}
async function completeRelease(page,{delay=true}={}){
  await click(page,'[data-gate-pass="regression"]');
  await click(page,'[data-gate-investigate="capacity"]');
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
async function completeFailover(page){
  for(const index of [0,1,2]) await click(page,`[data-failover-check="${index}"]`);
  await page.getByText('1 من 3 حالات خروج كاملة يمكن امتصاصها',{exact:true}).waitFor({state:'visible'});
  await click(page,'#finishFailover');
}
async function completeTransfer(page){
  const answers={weights:'build',retrieval:'request',inference:'request',monitoring:'continuous',maintenance:'continuous'};
  for(const [id,value] of Object.entries(answers)) await page.selectOption(`[data-transfer-item="${id}"]`,value);
  await click(page,'#transferSubmit');
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

  console.log(`SMOKE_PHASE:${label}:factory`);
  await click(page,'#chapterNext'); await click(page,'#enterFab'); await click(page,'#observeFab'); await click(page,'#fabContinue');
  await page.getByText('دين صيانة باقٍ بعد الدفعة',{exact:true}).waitFor({state:'visible'});
  await click(page,'#toFactoryAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:datacenter`);
  await click(page,'#chapterNext');
  for(const step of ['rack','network','power','register']) await click(page,`[data-server-step="${step}"]`);
  await click(page,'#bootServer'); await click(page,'#dcMove'); await click(page,'#repairCooling'); await click(page,'#dcAfterCooling'); await click(page,'#dcReady'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:data`);
  await click(page,'#chapterNext'); await click(page,'#toClean');
  await chooseData(page,'remove'); await chooseData(page,'keep'); await chooseData(page,'review'); await click(page,'#followupRedact'); await chooseData(page,'review'); await chooseData(page,'review');
  await click(page,'#dataAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:annotation`);
  await click(page,'#chapterNext'); await click(page,'#startAnnot');
  for(const choice of ['آمن','عنف','مضايقة أو إساءة']) await chooseAnnotation(page,choice);
  await click(page,'#takeBreak');
  for(const choice of ['غير واضح','خطاب كراهية','غير واضح']) await chooseAnnotation(page,choice);
  await page.getByText('مراجعة اختياراتك مثالًا بمثال',{exact:true}).waitFor({state:'visible'});
  await click(page,'#appeal'); await click(page,'#annotAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:training`);
  await click(page,'#chapterNext');
  if(await page.locator('#trainStart').isDisabled()) throw new Error(`${label}: clear/pending data path should not create an unresolved training blocker.`);
  await page.selectOption('#computeSel','8'); await page.selectOption('#checkpointSel','recent'); await click(page,'#trainStart'); await click(page,'#trainContinue'); await click(page,'#sendHuman'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:evaluation`);
  await click(page,'#chapterNext');
  for(const choice of ['a','b','bad']){ if(choice==='b') await page.getByText(DEMO_PROMPT,{exact:true}).waitFor({state:'visible'}); await click(page,`[data-eval="${choice}"]`); await click(page,'#nextEval'); }
  await completeCheckpoint(page);
  await click(page,'[data-safety="details"]'); await click(page,'#remediateSafety'); await click(page,'#confirmSafetyRetest');
  if(await page.locator('[data-gate-pass="capacity"]').count()) throw new Error(`${label}: capacity gate must require investigation before it can pass.`);
  await completeRelease(page,{delay:true}); await click(page,'#finishEval'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:deployment`);
  await click(page,'#chapterNext'); await setLoad(page,[45,30,25]); await click(page,'#testLoad'); await completeFailover(page);
  for(const tab of ['network','compute','model']) await click(page,`[data-tab="${tab}"]`);
  await click(page,'#rollback'); await click(page,'#toSupport'); await click(page,'#supportInvestigate'); await click(page,'#supportFast'); await click(page,'#uptimeAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:ending`);
  await click(page,'#backPrompt'); await completeTransfer(page);
  await page.getByText('التمييز الأساسي محفوظ',{exact:true}).waitFor({state:'visible'}); await click(page,'#transferContinue');
  await page.getByText('وقد يحدث وقت الطلب بحسب تصميم المنتج',{exact:true}).waitFor({state:'visible'});
  if(await page.getByText('إعادة محاولة واحدة',{exact:false}).count()) throw new Error(`${label}: ending invented a retry.`);
  await click(page,'#showResults');
  let state=await saved(page);
  const recorded=state.decisions.length;
  const displayed=await page.locator('.full-evidence-details .decision-row').count();
  if(displayed!==recorded) throw new Error(`${label}: full record displays ${displayed}/${recorded} decisions.`);
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

  const dataChecks=[
    {rights:'na',privacy:'na',fitness:'na'},
    {rights:'clear',privacy:'clear',fitness:'clear'},
    {rights:'clear',privacy:'clear',fitness:'clear'},
    {rights:'unresolved',privacy:'clear',fitness:'clear'}
  ];
  await load(page,{scene:'trainingSetup',flags:{dataIndex:4,dataStatuses:['excluded','ready','ready','ready'],dataChecks,dataSort:{keep:2,remove:1,redact:1,review:0}}});
  if(!(await page.locator('#trainStart').isDisabled())) throw new Error('Training must wait for unresolved-data eligibility decisions.');
  await click(page,'[data-training-hold="3"]');
  if(await page.locator('#trainStart').isDisabled()) throw new Error('Holding unresolved material before processing should unlock training.');
  let state=await saved(page);
  if(!state.flags.dataTrainingHeld.includes(3)) throw new Error('Held material was not persisted.');
  await page.reload({waitUntil:'networkidle'});
  if(await page.locator('#trainStart').isDisabled()) throw new Error('Training eligibility did not survive reload.');

  await load(page,{scene:'launchDecision',flags:{
    dataIndex:4,dataStatuses:['excluded','ready','excluded','ready'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'na',privacy:'na',fitness:'na'},{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:2,remove:2,redact:0,review:0},dataTrainingUsed:[1,3],trainingIncidentChoice:'pause',checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true
  }});
  await page.getByText('حاجب إصدار: تاريخ استخدام البيانات',{exact:true}).waitFor({state:'visible'});
  await click(page,'[data-governance-remediate="3"]');
  state=await saved(page);
  if(state.flags.dataChecks[3].rights!=='clear'||!state.flags.dataTrainingUsed.includes(3)) throw new Error('License remediation must clear rights while preserving processing history.');

  await load(page,{scene:'launchDecision',flags:{
    dataIndex:3,dataStatuses:['excluded','ready','ready'],dataChecks:[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'unresolved',privacy:'unresolved',fitness:'clear'}],dataSort:{keep:2,remove:1,redact:0,review:0},dataTrainingUsed:[1,2],trainingIncidentChoice:'pause',checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true
  }});
  await click(page,'[data-governance-remediate="2"]');
  state=await saved(page);
  if(state.flags.dataStatuses[2]!=='excluded'||!state.flags.dataTrainingUsed.includes(2)||!state.decisions.some(item=>item.id==='data-retrain-without-2')) throw new Error('Retraining remediation must exclude current input without erasing historical use.');

  await load(page,{scene:'launchDecision',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true}});
  await click(page,'[data-gate-pass="regression"]');
  await page.reload({waitUntil:'networkidle'});
  state=await saved(page);
  if(!state.flags.releaseGates.includes('regression')||!await page.locator('[data-gate-investigate="capacity"]').count()) throw new Error('Release-gate progress did not survive reload.');

  await load(page,{scene:'deployLoad',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0]}});
  await page.reload({waitUntil:'networkidle'});
  state=await saved(page);
  if(JSON.stringify(state.flags.deployFailoverChecks)!=='[0]') throw new Error('Failover progress did not survive reload.');
  await page.getByText('اختبار N‑1: 1/3 حالات خروج',{exact:false}).waitFor({state:'visible'});

  await browser.close();
  console.log('Causal and reload checks passed.');
}

async function runMigrationBrowserCheck(){
  console.log('SMOKE_PHASE:migration');
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const v2=clone(DEFAULT_STATE);
  v2.schemaVersion=2;
  for(const key of ['factoryMaintenanceDebt','dataTrainingUsed','dataTrainingHeld','checkpointEvalComplete','releaseGates','extraChecks','deployFailoverChecks']) delete v2.flags[key];
  v2.scene='finalAnswer';
  v2.flags.dataIndex=2;
  v2.flags.dataStatuses=['excluded','ready'];
  v2.flags.dataChecks=[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'}];
  v2.flags.dataSort={keep:1,remove:1,redact:0,review:0};
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({key,value})=>{localStorage.clear();localStorage.setItem(key,JSON.stringify(value));},{key:STORAGE_KEY,value:v2});
  await page.reload({waitUntil:'networkidle'});
  const migrated=await saved(page);
  if(migrated.schemaVersion!==3||migrated.scene!=='trainingSetup') throw new Error('Browser v2 migration did not rewind to trainingSetup.');
  await page.getByText('تم تحديث الحفظ من الإصدار 2 إلى الإصدار 3.',{exact:false}).waitFor({state:'visible'});
  await browser.close();
  console.log('Browser v2 migration passed.');
}

async function runA11y(){
  console.log('SMOKE_PHASE:axe');
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  const annotationResults=[
    ['آمن',true,false,false,false],['عنف',true,false,false,false],['مضايقة أو إساءة',true,false,false,false],['غير واضح',true,false,true,true],['خطاب كراهية',true,false,false,false],['غير واضح',true,true,false,false]
  ].map((entry,index)=>({index,choice:entry[0],acceptedAsReasonable:entry[1],pending:entry[2],reviewRejected:entry[3],disputed:entry[4]}));
  const cases=[
    {scene:'intro'},
    {scene:'annotationReview',flags:{annotationResults,breakDecisionMade:true,tookBreak:true,annotationUnpaidMinutes:5}},
    {scene:'checkpointEval',flags:{trainingIncidentChoice:'pause'}},
    {scene:'launchDecision',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true}},
    {scene:'deployLoad',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0]}},
    {scene:'transferChallenge',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2}},
    {scene:'results',flags:{checkpointEvalComplete:true,safetyChoice:'details',safetyRemediated:true,safetyRetested:true,releaseGates:['regression','capacity','risk','rollback'],launchChoice:'ready',deployLoad:[45,30,25],deployFailoverChecks:[0,1,2],deployTabs:['network','compute','model'],deployRecovery:'rollback',supportIndex:2,transferChoice:'build-use'}}
  ];
  for(const patch of cases){
    await load(page,patch);
    const results=await new AxeBuilder({page}).analyze();
    const serious=results.violations.filter(item=>['serious','critical'].includes(item.impact));
    if(serious.length) throw new Error(`Accessibility violations in ${patch.scene}: ${serious.map(item=>item.id).join(', ')}`);
  }
  await context.close();
  await browser.close();
  console.log('Dynamic accessibility matrix passed.');
}

async function crossBrowser(browserType,label){
  console.log(`SMOKE_PHASE:${label}`);
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await load(page);
  await click(page,'#settingsBtn');
  await page.locator('#settingsDialog').waitFor({state:'visible'});
  await click(page,'#settingsDialog [data-close-dialog]');
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
console.log('Browser v3 journey, causality, migration, reload, accessibility and cross-browser checks passed.');
