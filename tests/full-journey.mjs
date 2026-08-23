import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { BASE_URL } from './helpers/browser-fixtures.mjs';
import { STORAGE_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};
const click=async(page,selector)=>{await page.locator(selector).waitFor({state:'visible'});await page.locator(selector).click();};
async function boot(page){await page.goto(BASE_URL,{waitUntil:'networkidle'});await page.evaluate(settings=>{localStorage.clear();localStorage.setItem('behindTheAnswerSettings',JSON.stringify(settings));},SETTINGS);await page.reload({waitUntil:'networkidle'});}
async function axe(page,label){const result=await new AxeBuilder({page}).analyze();if(result.violations.length)throw new Error(`${label}: accessibility violations ${result.violations.map(v=>v.id).join(', ')}`);}
async function setLoad(page,values){await page.evaluate(next=>next.forEach((value,index)=>{const input=document.querySelector(`#range${index}`);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));}),values);}
async function failover(page){for(const index of [0,1,2])await click(page,`[data-failover-check="${index}"]`);}
async function chooseTag(page,label){await page.getByRole('button',{name:label,exact:true}).click();}

async function runJourney(engine,{viewport,label,checkAxe=false}){
  const browser=await engine.launch(),context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await boot(page);
  if(checkAxe)await axe(page,`${label}:intro`);

  await click(page,'#introSend');await click(page,'#descend');await click(page,'#chapterNext');await click(page,'#startMine');
  await click(page,'[data-sector="b"]');await click(page,'[data-sector="b"]');await click(page,'#mineStop');
  let state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
  if(state.flags.miningInspectionCount!==0)throw new Error(`${label}: closing mining sector completed inspection early.`);
  await click(page,'#inspectMine');await page.getByText('كشف الفحص ارتخاءً في دعامة داخل القطاع.',{exact:true}).waitFor({state:'visible'});
  await click(page,'#repairMine');
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
  if(state.flags.miningInspectionCount!==0)throw new Error(`${label}: mining repair completed verification early.`);
  await click(page,'#verifyMine');
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
  if(state.flags.miningInspectionCount!==1)throw new Error(`${label}: mining verification did not close inspection.`);
  await click(page,'#finishMine');for(let index=0;index<4;index++)await click(page,'[data-sector="b"]');await click(page,'#mineAbstract');await click(page,'#abstractNext');

  await click(page,'#chapterNext');await click(page,'#enterFab');await click(page,'#observeFab');await click(page,'#fabStop');await click(page,'#diagnoseFactory');await click(page,'#repairFactory');await click(page,'#verifyFactoryRepair');await click(page,'#resumeFactory');await click(page,'#toFactoryAbstract');await click(page,'#abstractNext');

  await click(page,'#chapterNext');for(const step of ['rack','power','network','register'])await click(page,`[data-server-step="${step}"]`);await click(page,'#bootServer');await click(page,'#dcMove');await click(page,'#repairCooling');await click(page,'#verifyCooling');await click(page,'#dcAfterCooling');await click(page,'#dcReady');await click(page,'#abstractNext');
  if(checkAxe)await axe(page,`${label}:after-datacenter`);

  await click(page,'#chapterNext');await click(page,'#toClean');for(const choice of ['remove','keep','review'])await click(page,`[data-sort="${choice}"]`);await click(page,'#followupRedact');await click(page,'[data-sort="review"]');await click(page,'[data-sort="review"]');await click(page,'#dataDone');await click(page,'#abstractNext');
  if(checkAxe)await axe(page,`${label}:data`);

  await click(page,'#chapterNext');await click(page,'#startAnnot');for(const labelValue of ['آمن','عنف','مضايقة أو إساءة'])await chooseTag(page,labelValue);await click(page,'#skipBreak');for(const labelValue of ['غير واضح','خطاب كراهية','غير واضح'])await chooseTag(page,labelValue);await click(page,'#skipAppeal');await click(page,'#annotAbstract');await click(page,'#abstractNext');
  if(checkAxe)await axe(page,`${label}:annotation`);

  await click(page,'#chapterNext');await click(page,'#trainStart');await click(page,'#trainPause');await click(page,'#repairTrainingCompute');await click(page,'#verifyTrainingCompute');await click(page,'#resumeTraining');await click(page,'#sendHuman');await click(page,'#abstractNext');
  if(checkAxe)await axe(page,`${label}:training`);

  await click(page,'#chapterNext');for(const choice of ['a','b','bad']){await click(page,`[data-eval="${choice}"]`);await click(page,'#nextEval');}await click(page,'#confirmCalibration');for(const select of await page.locator('[data-checkpoint-sample]').all())await select.selectOption('a');await click(page,'#checkCheckpoint');await click(page,'#toSafety');await click(page,'[data-safety="details"]');await click(page,'#remediateSafety');await click(page,'#confirmSafetyRetest');await click(page,'#toReleaseGates');
  await click(page,'[data-gate-pass="regression"]');await click(page,'[data-gate-investigate="capacity"]');await click(page,'[data-gate-remediate="capacity"]');await click(page,'[data-gate-remeasure="capacity"]');await click(page,'[data-gate-pass="capacity"]');await click(page,'[data-gate-pass="risk"]');await click(page,'[data-gate-pass="rollback"]');await click(page,'#toLaunchDecision');await click(page,'#launchReady');await click(page,'#finishEval');await click(page,'#abstractNext');
  if(checkAxe)await axe(page,`${label}:evaluation`);

  await click(page,'#chapterNext');await click(page,'#testLoad');await failover(page);await click(page,'#retryLoad');await setLoad(page,[45,30,25]);await click(page,'#testLoad');await failover(page);await click(page,'#finishFailover');await click(page,'#openTraffic');for(const tab of ['network','compute','model'])await click(page,`[data-tab="${tab}"]`);await click(page,'#rollback');await click(page,'#verifyRecovery');await click(page,'#toSupport');await click(page,'#supportInvestigate');await click(page,'#supportInvestigate');await click(page,'#uptimeAbstract');await click(page,'#abstractNext');
  if(checkAxe)await axe(page,`${label}:ending-assembly`);

  await click(page,'#backPrompt');await click(page,'#transferFromAnswer');
  const transfer={weights:'build',retrieval:'request',inference:'request',monitoring:'continuous',maintenance:'continuous'};
  for(const [id,value] of Object.entries(transfer))await page.selectOption(`[data-transfer-item="${id}"]`,value);
  await click(page,'#transferSubmit');await click(page,'#transferContinue');await page.getByText('نتيجة رحلتك',{exact:false}).waitFor({state:'visible'});
  if(checkAxe)await axe(page,`${label}:results`);
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
  if(state.scene!=='results'||state.flags.transferChoice!=='build-use')throw new Error(`${label}: journey did not reach results.`);
  if(errors.length)throw new Error(`${label}: ${errors.join(' | ')}`);
  await context.close();
  await browser.close();
  console.log(`Full journey passed: ${label}`);
}

await runJourney(chromium,{viewport:{width:1280,height:900},label:'Chromium desktop',checkAxe:true});
await runJourney(chromium,{viewport:{width:390,height:844},label:'Chromium mobile'});
await runJourney(firefox,{viewport:{width:1280,height:900},label:'Firefox desktop'});
await runJourney(webkit,{viewport:{width:1280,height:900},label:'WebKit desktop'});
console.log('Full journey, mobile, accessibility and cross-browser coverage passed.');
