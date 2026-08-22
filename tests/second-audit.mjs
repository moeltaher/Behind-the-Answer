import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL='http://127.0.0.1:4173';
const SETTINGS={...DEFAULT_SETTINGS,reduceMotion:true};

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

async function load(page,patch={}){
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.evaluate(({storageKey,settingsKey,state,settings})=>{
    localStorage.clear();
    localStorage.setItem(settingsKey,JSON.stringify(settings));
    localStorage.setItem(storageKey,JSON.stringify(state));
  },{storageKey:STORAGE_KEY,settingsKey:SETTINGS_KEY,state:currentState(patch),settings:SETTINGS});
  await page.reload({waitUntil:'networkidle'});
}

async function saved(page){ return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY); }
async function click(page,selector){ await page.locator(selector).waitFor({state:'visible'}); await page.locator(selector).click(); }

const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();

console.log('AUDIT_PHASE:factory');
await load(page,{scene:'factoryOutcome',flags:{factoryChoice:'continue'}});
await page.getByText('دين صيانة باقٍ بعد الدفعة',{exact:true}).waitFor({state:'visible'});
await click(page,'#toFactoryAbstract');
let state=await saved(page);
if(!state.decisions.some(item=>item.id==='factory-maintenance-open')) throw new Error('Factory maintenance debt was not persisted.');

console.log('AUDIT_PHASE:annotation');
const annotationResults=[
  ['آمن',true,false,false,false],['عنف',true,false,false,false],['مضايقة أو إساءة',true,false,false,false],
  ['غير واضح',true,false,true,true],['خطاب كراهية',true,false,false,false],['غير واضح',true,true,false,false]
].map((entry,index)=>({index,choice:entry[0],acceptedAsReasonable:entry[1],pending:entry[2],reviewRejected:entry[3],disputed:entry[4]}));
await load(page,{scene:'annotationReview',flags:{annotationResults,breakDecisionMade:true,tookBreak:true,annotationUnpaidMinutes:5}});
await page.getByText('مراجعة اختياراتك مثالًا بمثال',{exact:true}).waitFor({state:'visible'});
if(await page.locator('[data-audit-annotation-review] article').count()!==6) throw new Error('Annotation review must explain all six examples.');
await page.getByText('رغم اتساق اختيارك مع الدليل المعروض',{exact:false}).waitFor({state:'visible'});

console.log('AUDIT_PHASE:checkpoint');
await load(page,{scene:'safetyTest',flags:{trainingCheckpoint:'recent'}});
if(!(await page.locator('.safety-choice').first().isDisabled())) throw new Error('Safety test should wait for checkpoint hypothesis review.');
await click(page,'[data-checkpoint-answer="better"]');
await page.getByText('الاستنتاج أوسع من الأدلة.',{exact:true}).waitFor({state:'visible'});
await click(page,'[data-checkpoint-answer="measure"]');
await page.getByText('اكتمل التحقق المفاهيمي',{exact:true}).waitFor({state:'visible'});
if(await page.locator('.safety-choice').first().isDisabled()) throw new Error('Safety choices should unlock after hypothesis review.');

console.log('AUDIT_PHASE:release');
await load(page,{scene:'launchDecision',flags:{
  safetyChoice:'details',safetyRemediated:true,safetyRetested:true,
  trainingCheckpoint:'recent',trainingCompute:'8',trainingIncidentChoice:'continue',
  dataIndex:1,dataStatuses:['ready'],dataChecks:[{rights:'unresolved',privacy:'clear',fitness:'clear'}],
  dataSort:{keep:1,remove:0,redact:0,review:0}
}});
await page.getByText('حاجب إصدار: حوكمة البيانات',{exact:true}).waitFor({state:'visible'});
if(!(await page.locator('#criticalOnly').isHidden()) || !(await page.locator('#delayLaunch').isHidden())) throw new Error('Launch choices must be hidden while a data blocker remains.');
await click(page,'[data-data-resolve="0"]');
for(const id of ['regression','capacity','risk','rollback']) await click(page,`[data-release-gate="${id}"]`);
await page.getByText('أعمال إضافية قابلة للمراقبة',{exact:true}).waitFor({state:'visible'});
const delay=page.locator('#delayLaunch');
if(!(await delay.isDisabled())) throw new Error('Delayed launch must not claim extra work is complete before executing it.');
await click(page,'[data-extra-check="checkpoint"]');
await click(page,'[data-extra-check="stability"]');
if(await page.locator('#delayLaunch').isDisabled()) throw new Error('Delayed launch should unlock after monitorable checks are completed.');

console.log('AUDIT_PHASE:transfer');
await load(page,{scene:'transferChallenge'});
const answers={weights:'build',retrieval:'request',inference:'request',monitoring:'continuous',maintenance:'continuous'};
for(const [id,value] of Object.entries(answers)) await page.selectOption(`[data-transfer-item="${id}"]`,value);
await click(page,'[data-transfer-submit]');
await page.getByText('التمييز الأساسي محفوظ',{exact:true}).waitFor({state:'visible'});
state=await saved(page);
if(state.flags.transferChoice!=='build-use') throw new Error('Transfer challenge did not persist the successful categorization.');

console.log('AUDIT_PHASE:request-time');
await load(page,{scene:'finalAnswer',flags:{deployLoad:[45,30,25],deployTabs:['network','compute','model'],deployRecovery:'restart'}});
await page.getByText('وقد يحدث وقت الطلب بحسب تصميم المنتج',{exact:true}).waitFor({state:'visible'});
if(await page.getByText('إعادة محاولة واحدة',{exact:false}).count()) throw new Error('Ending still invents a retry that did not happen in gameplay.');

console.log('AUDIT_PHASE:headroom');
await load(page,{scene:'deployIncident',flags:{deployLoad:[45,30,25]}});
await page.getByText('إجمالي الهامش المتاح',{exact:true}).waitFor({state:'visible'});
await page.getByText('40 نقطة مئوية',{exact:true}).waitFor({state:'visible'});
await page.getByText('أكبر هامش في موقع واحد',{exact:true}).waitFor({state:'visible'});

console.log('AUDIT_PHASE:dialogs');
await load(page,{scene:'ch1Intro'});
for(const [button,dialog] of [['#settingsBtn','#settingsDialog'],['#promptBtn','#promptDialog'],['#ledgerBtn','#ledgerDialog']]){
  await click(page,button);
  const results=await new AxeBuilder({page}).include(dialog).withRules(['aria-dialog-name']).analyze();
  if(results.violations.length) throw new Error(`Dialog lacks accessible name: ${dialog}`);
  await page.locator(`${dialog} [data-close-dialog]`).click();
}
await click(page,'#settingsBtn');
await click(page,'#resetProgress');
const confirmResults=await new AxeBuilder({page}).include('#confirmResetDialog').withRules(['aria-dialog-name']).analyze();
if(confirmResults.violations.length) throw new Error('Reset confirmation dialog lacks accessible name.');

await context.close();
await browser.close();
console.log('Second-audit regression checks passed.');
