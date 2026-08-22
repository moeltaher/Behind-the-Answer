import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
import { DEMO_PROMPT } from '../js/data/story.js';

const BASE_URL='http://127.0.0.1:4173';
const DEFAULT_TEST_SETTINGS={ ...DEFAULT_SETTINGS, reduceMotion:true };

async function click(page,selector){ const target=page.locator(selector); await target.waitFor({state:'visible'}); await target.click(); }
function currentState(patch={}){
  const state=clone(DEFAULT_STATE);
  function merge(target,source){
    for(const [key,value] of Object.entries(source)){
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key])) target[key]={};
        merge(target[key],value);
      } else target[key]=value;
    }
  }
  merge(state,patch);
  return state;
}
async function loadState(page,patch=null,settings=DEFAULT_TEST_SETTINGS){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({settingsKey,storageKey,settingsValue,state})=>{
    localStorage.clear();
    if(settingsValue) localStorage.setItem(settingsKey,JSON.stringify(settingsValue));
    if(state) localStorage.setItem(storageKey,JSON.stringify(state));
  },{settingsKey:SETTINGS_KEY,storageKey:STORAGE_KEY,settingsValue:settings,state:patch?currentState(patch):null});
  await page.reload({waitUntil:'networkidle'});
}
async function savedState(page){ return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY); }
async function chooseData(page,choice){ await click(page,`[data-sort="${choice}"]`); }
async function chooseAnnotation(page,label){ await click(page,`[data-tag="${label}"]`); }
async function setLoad(page,values){ await page.evaluate(nextValues=>{ nextValues.forEach((value,index)=>{ const input=document.querySelector(`#range${index}`); input.value=String(value); input.dispatchEvent(new Event('input',{bubbles:true})); }); },values); }
async function selectedOptionText(page,selector){ return page.locator(selector).first().evaluate(select=>select.options[select.selectedIndex]?.textContent||''); }
async function completeReleaseGates(page){ for(const id of ['regression','capacity','risk','rollback']) await click(page,`[data-release-gate="${id}"]`); }
async function completeTransfer(page){
  const answers={weights:'build',retrieval:'request',inference:'request',monitoring:'continuous',maintenance:'continuous'};
  for(const [id,value] of Object.entries(answers)) await page.selectOption(`[data-transfer-item="${id}"]`,value);
  await click(page,'[data-transfer-submit]');
}

async function runJourney(viewport,label){
  console.log(`SMOKE_PHASE:${label}:start`);
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.stack||error.message));
  await loadState(page);

  await page.getByText('فصل ما بُني قبل الطلب', {exact:false}).waitFor({state:'visible'});
  await click(page,'#introSend'); await click(page,'#descend');
  await page.getByRole('heading',{name:'استخراج مواد الأجهزة',exact:true}).waitFor({state:'visible'});
  if(await page.locator('[aria-current="step"]').count()!==1) throw new Error(`${label}: current stage needs one aria-current step.`);
  await click(page,'#chapterNext'); await click(page,'#startMine');
  await click(page,'[data-sector="b"]'); await click(page,'[data-sector="b"]'); await click(page,'#mineStop'); await click(page,'#finishMine');
  for(let i=0;i<4;i+=1) await click(page,'[data-sector="b"]');
  await click(page,'#mineAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:factory`);
  await click(page,'#chapterNext'); await click(page,'#enterFab'); await click(page,'#observeFab'); await click(page,'#fabStop');
  await page.getByText('أُغلق سبب التنبيه داخل المرحلة',{exact:true}).waitFor({state:'visible'});
  await click(page,'#toFactoryAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:datacenter`);
  await click(page,'#chapterNext');
  for(const step of ['rack','network','power','register']) await click(page,`[data-server-step="${step}"]`);
  await click(page,'#bootServer'); await click(page,'#dcMove');
  if(await page.locator('#dcAfterCooling').count()) throw new Error(`${label}: datacenter can skip repair.`);
  await click(page,'#repairCooling'); await click(page,'#dcAfterCooling');
  if(await page.locator('.worker-person__avatar').count()!==6) throw new Error(`${label}: supporting datacenter workers missing.`);
  await click(page,'#dcReady'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:data`);
  await click(page,'#chapterNext'); await click(page,'#toClean');
  await chooseData(page,'remove'); await chooseData(page,'keep'); await chooseData(page,'review'); await click(page,'#followupRedact'); await chooseData(page,'review'); await chooseData(page,'review');
  let state=await savedState(page);
  if(state.flags.dataIndex!==5||state.flags.dataStatuses.length!==5||state.flags.dataChecks.length!==5) throw new Error(`${label}: data state is inconsistent.`);
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
  const trainingInput=await selectedOptionText(page,'.config-panel select');
  if(!trainingInput.includes('2 مواد من الدفعة 18')||!trainingInput.includes('4 أمثلة بشرية مؤكدة')) throw new Error(`${label}: training input summary lost prior work.`);
  await page.selectOption('#computeSel','8'); await page.selectOption('#checkpointSel','recent'); await click(page,'#trainStart'); await click(page,'#trainContinue'); await click(page,'#sendHuman'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:evaluation`);
  await click(page,'#chapterNext');
  for(const choice of ['a','b','bad']){ if(choice==='b') await page.getByText(DEMO_PROMPT,{exact:true}).waitFor({state:'visible'}); await click(page,`[data-eval="${choice}"]`); await click(page,'#nextEval'); }
  await click(page,'[data-checkpoint-answer="measure"]');
  await click(page,'[data-safety="details"]'); await click(page,'#remediateSafety'); await click(page,'#confirmSafetyRetest');
  await completeReleaseGates(page);
  await click(page,'[data-extra-check="checkpoint"]'); await click(page,'[data-extra-check="stability"]');
  await click(page,'#delayLaunch'); await click(page,'#finishEval'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:deployment`);
  await click(page,'#chapterNext');
  await setLoad(page,[45,30,25]); await click(page,'#testLoad');
  await page.getByText('إجمالي الهامش المتاح',{exact:true}).waitFor({state:'visible'});
  for(const tab of ['network','compute','model']) await click(page,`[data-tab="${tab}"]`);
  await click(page,'#rollback'); await click(page,'#toSupport'); await click(page,'#supportInvestigate'); await click(page,'#supportInvestigate'); await click(page,'#uptimeAbstract'); await click(page,'#abstractNext');

  console.log(`SMOKE_PHASE:${label}:ending`);
  await click(page,'#backPrompt');
  await completeTransfer(page);
  await page.getByText('التمييز الأساسي محفوظ',{exact:true}).waitFor({state:'visible'});
  await click(page,'#transferContinue');
  await page.getByText('وقد يحدث وقت الطلب بحسب تصميم المنتج',{exact:true}).waitFor({state:'visible'});
  await click(page,'#showResults');
  if(await page.locator('.journey-highlight').count()!==4) throw new Error(`${label}: expected four result highlights.`);
  await click(page,'#toFinalMessage');
  await page.getByRole('heading',{name:'الواجهة هي نهاية السلسلة، وليست بدايتها.',exact:true}).waitFor({state:'visible'});

  if(pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Complete journey passed: ${label}`);
}

async function runPrecisionChecks(){
  console.log('SMOKE_PHASE:precision');
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});

  await loadState(page,{scene:'mineTask'});
  for(let i=0;i<12;i+=1) await click(page,'[data-sector="a"]');
  let state=await savedState(page);
  if(state.flags.miningMinutes!==84||state.scene!=='mineEnd') throw new Error('Slow-only mining should miss the delivery window.');

  await loadState(page,{scene:'mineTask',flags:{miningCount:4,miningMinutes:14,miningBUses:2,miningIncidentChoice:'continue',miningRiskLevel:0}});
  await click(page,'[data-sector="b"]'); await click(page,'[data-sector="b"]');
  state=await savedState(page);
  if(!state.flags.miningWarning||!state.flags.miningForcedInspection) throw new Error('Deferred mining maintenance must force inspection.');

  const priorChecks=[{rights:'na',privacy:'na',fitness:'na'},{rights:'clear',privacy:'clear',fitness:'clear'},{rights:'clear',privacy:'clear',fitness:'clear'}];
  await loadState(page,{scene:'dataClean',flags:{dataIndex:3,dataStatuses:['excluded','ready','ready'],dataChecks:priorChecks,dataSort:{keep:1,remove:1,redact:1,review:0}}});
  await chooseData(page,'keep');
  state=await savedState(page);
  if(state.flags.dataChecks[3].rights!=='unresolved') throw new Error('Passing unlicensed code must preserve unresolved rights.');

  await loadState(page,{scene:'trainingSetup',flags:{
    dataIndex:5,
    dataStatuses:['ready','pending','excluded','ready','pending'],
    dataChecks:[
      {rights:'clear',privacy:'clear',fitness:'clear'},
      {rights:'unresolved',privacy:'clear',fitness:'clear'},
      {rights:'na',privacy:'na',fitness:'na'},
      {rights:'unresolved',privacy:'clear',fitness:'clear'},
      {rights:'unresolved',privacy:'unresolved',fitness:'clear'}
    ],
    dataSort:{keep:2,remove:1,redact:0,review:2}
  }});
  const precisionTrainingInput=await selectedOptionText(page,'.config-panel select');
  if(!precisionTrainingInput.includes('1 محسومة / 1 غير محسومة')) throw new Error('Training lost resolved/unresolved distinction.');

  await loadState(page,{scene:'launchDecision',flags:{
    safetyChoice:'details',safetyRemediated:true,safetyRetested:true,
    trainingCheckpoint:'validated',trainingCompute:'12',trainingIncidentChoice:'pause',
    dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}],dataSort:{keep:1,remove:0,redact:0,review:0}
  }});
  await page.getByText('حاجب إصدار: حوكمة البيانات',{exact:true}).waitFor({state:'visible'});
  await click(page,'[data-data-exclude="0"]');
  await completeReleaseGates(page);
  await page.locator('#launchReady').waitFor({state:'visible'});

  await loadState(page,{scene:'dcWorkers',flags:{dcCoolingChoice:'move',dcCoolingRestored:false}});
  await page.locator('#repairCooling').waitFor({state:'visible'});

  await loadState(page,{scene:'deployLoad'});
  await setLoad(page,[60,25,15]); await click(page,'#testLoad');
  state=await savedState(page);
  if(JSON.stringify(state.flags.deployLoad)!==JSON.stringify([60,25,15])) throw new Error('Deployment load not persisted.');

  await loadState(page,{scene:'results',decisions:[
    {id:'deploy-rollback',label:'عدت إلى الإصدار السابق',effectText:'قرار الاستعادة الرئيسي.'},
    {id:'support-fast-0',label:'قدمت استعادة أسرع للبلاغ 1',effectText:'قرار دعم لاحق.'}
  ],flags:{deployLoad:[45,30,25],deployTabs:['network','compute','model'],deployRecovery:'rollback',transferChoice:'build-use'}});
  const operationHighlight=page.locator('.journey-highlight').nth(3);
  await operationHighlight.getByText('عدت إلى الإصدار السابق',{exact:true}).waitFor({state:'visible'});

  await page.emulateMedia({reducedMotion:'reduce'});
  await loadState(page,null,null);
  if(!await page.locator('body').evaluate(body=>body.classList.contains('reduced-motion'))) throw new Error('System reduced-motion preference not applied.');

  await loadState(page,{scene:'ch1Intro'});
  if(await page.locator('#scene[aria-live]').count()) throw new Error('Whole-scene aria-live remains.');
  if(await page.locator('[aria-current="step"]').count()!==1) throw new Error('aria-current missing from active stage.');

  await browser.close();
  console.log('Precision checks passed.');
}

async function runA11yChecks(){
  console.log('SMOKE_PHASE:axe');
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  for(const scene of ['intro','ch1Intro','dataClean']){
    const patch=scene==='dataClean'?{scene,flags:{dataIndex:0,dataStatuses:[],dataChecks:[]}}:{scene};
    await loadState(page,patch);
    const results=await new AxeBuilder({page}).analyze();
    const serious=results.violations.filter(item=>['serious','critical'].includes(item.impact));
    if(serious.length) throw new Error(`Accessibility violations in ${scene}: ${serious.map(item=>item.id).join(', ')}`);
  }
  await context.close(); await browser.close();
  console.log('Targeted axe accessibility checks passed.');
}

async function runCrossBrowserSmoke(browserType,label){
  console.log(`SMOKE_PHASE:${label}`);
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await loadState(page); await click(page,'#introSend'); await click(page,'#descend');
  await page.getByRole('heading',{name:'استخراج مواد الأجهزة',exact:true}).waitFor({state:'visible'});
  await click(page,'#chapterNext');
  await page.getByRole('heading',{name:'أنت الآن موسى، عامل استخراج وفرز.',exact:true}).waitFor({state:'visible'});
  await browser.close();
  console.log(`Cross-browser smoke passed: ${label}`);
}

await runJourney({width:1280,height:900},'desktop');
await runJourney({width:390,height:844},'mobile-390');
await runPrecisionChecks();
await runA11yChecks();
await runCrossBrowserSmoke(firefox,'firefox');
await runCrossBrowserSmoke(webkit,'webkit');
console.log('All browser, causality, transfer-learning, storage-facing, and accessibility smoke tests passed.');
