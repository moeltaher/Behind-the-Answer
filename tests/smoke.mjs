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

async function runJourney(viewport,label){
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.stack||error.message));
  await loadState(page);

  await page.getByText('فصل ما بُني قبل الطلب', {exact:false}).waitFor({state:'visible'});
  await click(page,'#introSend');
  await page.getByRole('heading',{name:'الإجابة هي آخر نقطة مرئية في سلسلة أطول.',exact:true}).waitFor({state:'visible'});
  await page.getByText('ترتيب اللعب ليس مخططًا هندسيًا',{exact:true}).waitFor({state:'visible'});
  await click(page,'#descend');

  await page.getByRole('heading',{name:'استخراج مواد الأجهزة',exact:true}).waitFor({state:'visible'});
  if(await page.locator('[aria-current="step"]').count()!==1) throw new Error(`${label}: current gameplay stage lacks a single aria-current step.`);
  if(viewport.width<=390){
    for(const toolLabel of ['الطلب','السجل','الوصول']) await page.getByText(toolLabel,{exact:true}).waitFor({state:'visible'});
  }
  await click(page,'#chapterNext'); await click(page,'#startMine');
  await click(page,'[data-sector="b"]'); await click(page,'[data-sector="b"]');
  await click(page,'#mineStop'); await click(page,'#finishMine');
  for(let i=0;i<4;i+=1) await click(page,'[data-sector="b"]');
  await page.getByText('92 وحدة لعب').waitFor({state:'visible'});
  await page.getByText('54 دقيقة').waitFor({state:'visible'});
  await click(page,'#mineAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await click(page,'#enterFab'); await click(page,'#observeFab'); await click(page,'#fabStop');
  await page.getByText('رفض محدود').waitFor({state:'visible'});
  await click(page,'#toFactoryAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  for(const step of ['rack','network','power','register']) await click(page,`[data-server-step="${step}"]`);
  await click(page,'#bootServer'); await click(page,'#dcMove');
  await page.getByText('لا تُحسب قدرة جاهزة',{exact:true}).waitFor({state:'visible'});
  if(await page.locator('#dcAfterCooling').count()) throw new Error(`${label}: datacenter can still skip repair after moving test workload.`);
  await click(page,'#repairCooling');
  await page.getByText('اجتازت إعادة الاختبار',{exact:true}).waitFor({state:'visible'});
  await click(page,'#dcAfterCooling');
  const workerAvatars=page.locator('.worker-person__avatar');
  if(await workerAvatars.count()!==6) throw new Error(`${label}: six datacenter supporting workers are required.`);
  await click(page,'#dcReady'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  await page.locator('.optional-source-details summary').click();
  for(const origin of ['forum','code','photo']) await click(page,`[data-origin="${origin}"]`);
  await click(page,'#toClean');
  await chooseData(page,'remove'); await chooseData(page,'keep'); await chooseData(page,'review');
  await click(page,'#followupRedact'); await chooseData(page,'review'); await chooseData(page,'review');
  await page.getByText('2 مواد مرّت إلى المسار التالي',{exact:false}).waitFor({state:'visible'});
  let state=await savedState(page);
  if(JSON.stringify(state.flags.dataStatuses)!==JSON.stringify(['excluded','ready','ready','pending','pending'])) throw new Error(`${label}: data workflow states are wrong.`);
  if(state.flags.dataChecks.length!==5||state.flags.dataChecks[1].rights!=='clear'||state.flags.dataChecks[3].rights!=='unresolved') throw new Error(`${label}: data issue resolution is not preserved separately from workflow passage.`);
  await click(page,'#dataAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await click(page,'#startAnnot');
  for(const choice of ['آمن','عنف','مضايقة أو إساءة']) await chooseAnnotation(page,choice);
  await click(page,'#takeBreak');
  for(const choice of ['غير واضح','خطاب كراهية','غير واضح']) await chooseAnnotation(page,choice);
  await page.getByText('رفض قابل للنزاع',{exact:true}).waitFor({state:'visible'});
  await page.getByText('gold label سابق',{exact:false}).waitFor({state:'visible'});
  await click(page,'#appeal'); await click(page,'#annotAbstract'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  const trainingInput=await selectedOptionText(page,'.config-panel select');
  if(!trainingInput.includes('2 مواد من الدفعة 18')||!trainingInput.includes('2 محسومة / 0 غير محسومة')||!trainingInput.includes('4 أمثلة بشرية مؤكدة')) throw new Error(`${label}: training input summary lost resolved/unresolved distinction.`);
  await page.selectOption('#computeSel','8'); await page.selectOption('#checkpointSel','recent'); await click(page,'#trainStart');
  await page.getByText('الحد الأدنى المفترض').waitFor({state:'visible'});
  await page.getByText('0 مجموعة',{exact:true}).waitFor({state:'visible'});
  await click(page,'#trainContinue'); await click(page,'#sendHuman'); await click(page,'#abstractNext');

  await click(page,'#chapterNext');
  for(const choice of ['a','b','bad']){ if(choice==='b') await page.getByText(DEMO_PROMPT,{exact:true}).waitFor({state:'visible'}); await click(page,`[data-eval="${choice}"]`); await click(page,'#nextEval'); }
  await click(page,'[data-safety="details"]'); await click(page,'#remediateSafety'); await click(page,'#confirmSafetyRetest');
  for(const gate of ['اختبارات الانحدار','الأداء والسعة','السلامة والأمن والخصوصية','المراقبة وخطة التراجع']) await page.getByText(gate,{exact:true}).waitFor({state:'visible'});
  if(await page.locator('.additional-bundles .card').count()!==2) throw new Error(`${label}: expected two additional causal verification bundles.`);
  await click(page,'#delayLaunch'); await click(page,'#finishEval'); await click(page,'#abstractNext');

  await click(page,'#chapterNext'); await click(page,'#testLoad');
  await page.getByText('تجاوز سعته',{exact:false}).waitFor({state:'visible'});
  await setLoad(page,[45,30,25]); await click(page,'#testLoad');
  state=await savedState(page);
  if(JSON.stringify(state.flags.deployLoad)!==JSON.stringify([45,30,25])) throw new Error(`${label}: valid load distribution is not saved.`);
  await page.getByText('توزيعك السابق 45 / 30 / 25%',{exact:false}).waitFor({state:'visible'});
  for(const tab of ['network','compute','model']) await click(page,`[data-tab="${tab}"]`);
  await click(page,'#rollback'); await click(page,'#toSupport');
  await page.getByText('45 / 30 / 25%',{exact:false}).waitFor({state:'visible'});
  await click(page,'#supportInvestigate'); await click(page,'#supportInvestigate');
  await click(page,'#uptimeAbstract'); await click(page,'#abstractNext');

  await page.getByRole('heading',{name:'افصل الآن بين ترتيب اللعب وبنية النظام.',exact:true}).waitFor({state:'visible'});
  await click(page,'#backPrompt');
  await page.getByRole('heading',{name:'غيّر المنتج: ماذا يبقى صحيحًا في مولد صور؟',exact:true}).waitFor({state:'visible'});
  await click(page,'[data-transfer="build-use"]');
  await page.getByText('التمييز الأساسي محفوظ',{exact:true}).waitFor({state:'visible'});
  await click(page,'#transferContinue');
  await page.getByText('وصل بعد استعادة الإصدار السابق',{exact:true}).waitFor({state:'visible'});
  await click(page,'#showResults');
  if(await page.locator('.journey-highlight').count()!==4) throw new Error(`${label}: result should show four prioritized highlights.`);
  await page.locator('.journey-highlight').getByText('عدت إلى الإصدار السابق',{exact:true}).waitFor({state:'visible'});
  await click(page,'#toFinalMessage');
  await page.getByRole('heading',{name:'الواجهة هي نهاية السلسلة، وليست بدايتها.',exact:true}).waitFor({state:'visible'});

  if(pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Complete journey passed: ${label}`);
}

async function runPrecisionChecks(){
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});

  await loadState(page,{scene:'mineTask'});
  for(let i=0;i<12;i+=1) await click(page,'[data-sector="a"]');
  let state=await savedState(page);
  if(state.flags.miningMinutes!==84||state.scene!=='mineEnd') throw new Error('Slow-only mining path should miss the delivery window.');

  await loadState(page,{scene:'mineTask',flags:{miningCount:4,miningMinutes:14,miningBUses:2,miningIncidentChoice:'continue',miningRiskLevel:0}});
  await click(page,'[data-sector="b"]'); await click(page,'[data-sector="b"]');
  state=await savedState(page);
  if(!state.flags.miningWarning||!state.flags.miningForcedInspection||state.flags.miningRiskLevel!==2) throw new Error('Deferred mining maintenance must accumulate into a mandatory inspection.');
  if(await page.locator('#mineContinue').count()) throw new Error('Mandatory mining inspection can still be bypassed.');
  await click(page,'#mineStop');
  state=await savedState(page);
  if(state.flags.miningInspectionCount!==1||!state.decisions.some(item=>item.id==='mine-forced-inspection')) throw new Error('Forced inspection was not recorded as a real mechanical consequence.');

  const priorChecks=[
    {rights:'na',privacy:'na',fitness:'na'},
    {rights:'clear',privacy:'clear',fitness:'clear'},
    {rights:'clear',privacy:'clear',fitness:'clear'}
  ];
  await loadState(page,{scene:'dataClean',flags:{dataIndex:3,dataStatuses:['excluded','ready','ready'],dataChecks:priorChecks}});
  await chooseData(page,'keep');
  state=await savedState(page);
  if(state.flags.dataStatuses[3]!=='ready'||state.flags.dataChecks[3].rights!=='unresolved') throw new Error('Passing unlicensed code must preserve unresolved rights separately from workflow passage.');

  await loadState(page,{scene:'trainingSetup',flags:{
    dataStatuses:['ready','pending','excluded','ready','pending'],
    dataChecks:[
      {rights:'clear',privacy:'clear',fitness:'clear'},
      {rights:'unresolved',privacy:'clear',fitness:'clear'},
      {rights:'na',privacy:'na',fitness:'na'},
      {rights:'unresolved',privacy:'clear',fitness:'clear'},
      {rights:'unresolved',privacy:'unresolved',fitness:'clear'}
    ]
  }});
  await page.getByText('1 محسومة / 1 غير محسومة',{exact:false}).waitFor({state:'visible'});

  await loadState(page,{scene:'launchDecision',flags:{safetyChoice:'details',safetyRemediated:true,safetyRetested:true,trainingCheckpoint:'validated',trainingCompute:'12',trainingIncidentChoice:'pause',dataStatuses:['ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}]}});
  await page.getByText('حسم مسائل بيانات مرّت إلى التطوير',{exact:true}).waitFor({state:'visible'});
  if(await page.locator('.additional-bundles .card').count()!==1) throw new Error('Unresolved passed data should create exactly one governance verification bundle in this path.');

  await loadState(page,{scene:'launchDecision',flags:{safetyChoice:'details',safetyRemediated:true,safetyRetested:true,trainingCheckpoint:'validated',trainingCompute:'12',trainingIncidentChoice:'pause'}});
  await page.locator('#launchReady').waitFor({state:'visible'});
  if(await page.locator('.baseline-gates .card').count()!==4) throw new Error('Baseline release gates must remain visible when no causal extra work exists.');
  if(await page.locator('.additional-bundles').count()) throw new Error('Empty path invented extra verification work.');

  await loadState(page,{scene:'dcWorkers',flags:{dcCoolingChoice:'move',dcCoolingRestored:false}});
  await page.locator('#repairCooling').waitFor({state:'visible'});

  await loadState(page,{scene:'deployLoad'});
  await setLoad(page,[60,25,15]); await click(page,'#testLoad');
  state=await savedState(page);
  if(JSON.stringify(state.flags.deployLoad)!==JSON.stringify([60,25,15])) throw new Error('Deployment load choice not persisted.');
  await page.getByText('هامشًا موجبًا في 2 من 3 مراكز',{exact:false}).waitFor({state:'visible'});

  await loadState(page,{scene:'results',decisions:[
    {id:'deploy-rollback',label:'عدت إلى الإصدار السابق',effectText:'قرار الاستعادة الرئيسي.'},
    {id:'support-fast-0',label:'قدمت استعادة أسرع للبلاغ 1',effectText:'قرار دعم لاحق.'}
  ],flags:{deployRecovery:'rollback',transferChoice:'build-use'}});
  const operationHighlight=page.locator('.journey-highlight').nth(3);
  await operationHighlight.getByText('عدت إلى الإصدار السابق',{exact:true}).waitFor({state:'visible'});
  if(await operationHighlight.getByText('قدمت استعادة أسرع للبلاغ 1',{exact:true}).count()) throw new Error('Result highlight still uses the last click instead of the salient recovery decision.');

  await page.emulateMedia({reducedMotion:'reduce'});
  await loadState(page,null,null);
  if(!await page.locator('body').evaluate(body=>body.classList.contains('reduced-motion'))) throw new Error('System reduced-motion preference is not applied by default.');
  if(!await page.locator('#reduceMotion').isChecked()) throw new Error('Reduced-motion setting does not reflect the system-derived default.');

  await loadState(page,{scene:'ch1Intro'});
  if(await page.locator('#scene[aria-live]').count()) throw new Error('Whole-scene aria-live remains and may duplicate focus announcements.');
  if(await page.locator('[aria-current="step"]').count()!==1) throw new Error('aria-current is missing from the active stage.');

  await browser.close();
  console.log('Precision checks passed.');
}

async function runA11yChecks(){
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  for(const scene of ['intro','ch1Intro','dataClean']){
    const patch=scene==='dataClean'?{scene,flags:{dataIndex:0,dataStatuses:[],dataChecks:[]}}:{scene};
    await loadState(page,patch);
    const results=await new AxeBuilder({page}).withRules(['document-title','html-has-lang','landmark-one-main','button-name','label','aria-allowed-attr','aria-required-attr','aria-valid-attr-value','duplicate-id']).analyze();
    const serious=results.violations.filter(item=>['serious','critical'].includes(item.impact));
    if(serious.length) throw new Error(`Accessibility violations in ${scene}: ${serious.map(item=>item.id).join(', ')}`);
  }
  await browser.close();
  console.log('Targeted axe accessibility checks passed.');
}

async function runCrossBrowserSmoke(browserType,label){
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await loadState(page);
  await click(page,'#introSend'); await click(page,'#descend');
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
