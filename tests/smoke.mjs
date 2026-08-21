import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL = 'http://127.0.0.1:4173';
const SETTINGS = { ...DEFAULT_SETTINGS, reduceMotion: true };

async function click(page, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: 'visible' });
  await target.click();
}

function currentState(patch = {}) {
  const state = clone(DEFAULT_STATE);
  function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) merge(target[key], value);
      else target[key] = value;
    }
  }
  merge(state, patch);
  return state;
}

async function loadState(page, patch = null) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(({ settingsKey, storageKey, settings, state }) => {
    localStorage.clear();
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    if (state) localStorage.setItem(storageKey, JSON.stringify(state));
  }, { settingsKey: SETTINGS_KEY, storageKey: STORAGE_KEY, settings: SETTINGS, state: patch ? currentState(patch) : null });
  await page.reload({ waitUntil: 'networkidle' });
}

async function savedState(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
}

async function chooseData(page, choice) { await click(page, `[data-sort="${choice}"]`); }
async function chooseAnnotation(page, label) { await click(page, `[data-tag="${label}"]`); }
async function setLoad(page, values) {
  await page.evaluate(nextValues => {
    nextValues.forEach((value, index) => {
      const input = document.querySelector(`#range${index}`);
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }, values);
}

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  await loadState(page);

  await click(page, '#introSend');
  await page.getByText('الإجابة هي آخر نقطة مرئية في سلسلة أطول.').waitFor({ state: 'visible' });
  await click(page, '#descend');

  await page.getByText('استخراج مواد الأجهزة').waitFor({ state: 'visible' });
  if (await page.locator('.chapter-brief').count()) throw new Error(`${label}: legacy three-column chapter brief still renders.`);
  await click(page, '#chapterNext');
  const firstCharacter = await page.locator('.scene-character').boundingBox();
  if (await page.locator('[data-task-panel]').count()) throw new Error(`${label}: orientation should not repeat task panel.`);
  if (!firstCharacter) throw new Error(`${label}: character card missing on role entry.`);
  await click(page, '#startMine');
  await click(page, '[data-sector="b"]'); await click(page, '[data-sector="b"]'); await click(page, '[data-sector="b"]');
  await page.getByText('اهتزاز غير معتاد في القطاع ب').waitFor({ state: 'visible' });
  await click(page, '#mineStop');
  await page.getByText('لم تنتج مواد أثناء التوقف', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#finishMine');
  await click(page, '[data-sector="b"]'); await click(page, '[data-sector="b"]'); await click(page, '[data-sector="b"]');
  await page.getByText('92 وحدة لعب').waitFor({ state: 'visible' });
  await click(page, '#mineTransport'); await click(page, '#mineAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await page.getByText('معالجة الرقاقة').waitFor({ state: 'visible' });
  await click(page, '#enterFab');
  await page.getByText('+12 Pa').waitFor({ state: 'visible' });
  await click(page, '#observeFab'); await click(page, '#fabStop');
  await click(page, '#chipsDone'); await click(page, '#toCh3');
  if (await page.locator('[data-task-panel]').count()) throw new Error(`${label}: abstraction should not render task panel.`);
  await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '[data-server-step="rack"]');
  await click(page, '[data-server-step="network"]');
  await click(page, '[data-server-step="power"]');
  await click(page, '[data-server-step="register"]');
  await click(page, '#bootServer'); await click(page, '#dcStop');
  await page.getByText('عادت الحرارة إلى 24° م', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#dcAfterCooling');
  if (await page.locator('[data-worker]').count()) throw new Error(`${label}: datacenter roles still require reveal clicks.`);
  await page.getByText('«الخادم الجاهز» يخفي فريقًا كاملًا.').waitFor({ state: 'visible' });
  await click(page, '#dcReady'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  for (const origin of ['forum', 'code', 'photo']) await click(page, `[data-origin="${origin}"]`);
  await click(page, '#toClean');
  for (const choice of ['remove', 'keep', 'review', 'review', 'review']) await chooseData(page, choice);
  await click(page, '#dataAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext'); await click(page, '#startAnnot');
  const labels = ['آمن', 'عنف', 'مضايقة أو إساءة', 'غير واضح', 'خطاب كراهية', 'غير واضح'];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 3) await click(page, '#takeBreak');
    await chooseAnnotation(page, labels[index]);
  }
  await page.getByText('29 دقيقة').waitFor({ state: 'visible' });
  await click(page, '#closeShift');
  await page.getByText('عائد مكافئ للساعة').waitFor({ state: 'visible' });
  await click(page, '#annotAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await page.getByText('ليست عملية تدريب نموذج من الصفر', { exact: false }).waitFor({ state: 'visible' });
  await page.selectOption('#computeSel', '8');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await page.getByText('7/8').waitFor({ state: 'visible' });
  if (await page.getByText('97%', { exact: false }).count()) throw new Error(`${label}: fabricated 97% load still appears.`);
  await click(page, '#trainContinue'); await click(page, '#sendHuman');
  await page.getByText('نسخة مطورة من النموذج').waitFor({ state: 'visible' });
  await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'bad']) {
    await click(page, `[data-eval="${choice}"]`);
    await click(page, '#nextEval');
  }
  await click(page, '[data-safety="details"]');
  await page.getByText('يمنع المرور مباشرة إلى الإطلاق', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#remediateSafety');
  await page.getByText('بقي 18 اختبارًا', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#delayLaunch'); await click(page, '#finishEval'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '#testLoad');
  await page.getByText('تجاوز سعته', { exact: false }).waitFor({ state: 'visible' });
  await setLoad(page, [45, 30, 25]);
  await click(page, '#testLoad');
  for (const tab of ['network', 'compute', 'model']) await click(page, `[data-tab="${tab}"]`);
  await click(page, '#rollback'); await click(page, '#toSupport');
  await click(page, '#supportInvestigate'); await click(page, '#supportInvestigate');
  await click(page, '#uptimeAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext'); await click(page, '#compressAI'); await click(page, '#backPrompt');
  const finalAnswer = await page.locator('.message.ai').innerText();
  if (!finalAnswer.includes('أعتذر عن التأخر في تسليم العمل')) throw new Error(`${label}: fixed answer missing.`);
  await click(page, '#behindAnswer'); await click(page, '#showPeople'); await click(page, '#showResults');
  await page.getByText('النتيجة أدلة من قراراتك، لا متوسط نقاط.').waitFor({ state: 'visible' });
  await page.getByText('احتفظت بمادة مناسبة ومصرح باستخدامها', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('أوقفت خلل السلامة قبل الإطلاق', { exact: false }).waitFor({ state: 'visible' });
  if (await page.locator('.metric-card').count()) throw new Error(`${label}: numeric metric cards rendered.`);

  if (viewport.width <= 390) {
    await loadState(page, { scene: 'ch1Intro' });
    const chapterDetailsDisplay = await page.locator('.learning-more').evaluate(element => getComputedStyle(element).display);
    if (chapterDetailsDisplay === 'none') throw new Error(`${label}: optional chapter details unavailable on mobile.`);
    await click(page, '#chapterNext');
    if (await page.locator('[data-task-panel]').count()) throw new Error(`${label}: orientation repeats task panel on mobile.`);
    await click(page, '#promptBtn');
    await page.locator('#promptDialogText').waitFor({ state: 'visible' });
  }

  if (pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Complete journey passed: ${label}`);
}

async function runPrecisionChecks() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await loadState(page, { scene: 'mineTask', flags: { miningCount: 5 } });
  await click(page, '[data-sector="a"]');
  let state = await savedState(page);
  if (state.flags.miningWarning) throw new Error('Mining warning triggered outside sector B.');
  await click(page, '[data-sector="b"]');
  state = await savedState(page);
  if (!state.flags.miningWarning) throw new Error('Mining warning did not follow sector B use.');

  await loadState(page, { scene: 'dcInstall', flags: { serverSteps: ['rack'] } });
  if (await page.locator('[data-server-step="power"]:not([disabled])').count() !== 1) throw new Error('Power should be available after rack.');
  if (await page.locator('[data-server-step="network"]:not([disabled])').count() !== 1) throw new Error('Network should be independently available after rack.');

  await loadState(page, { scene: 'dataOrigins' });
  if (await page.locator('#toClean:not([disabled])').count() !== 1) throw new Error('Data source exploration should be optional.');

  await loadState(page, { scene: 'dataClean', flags: { dataIndex: 2 } });
  await page.getByText('حق إعادة الاستخدام لم يُحسم', { exact: false }).waitFor({ state: 'visible' });
  await chooseData(page, 'review');
  state = await savedState(page);
  if (!state.decisions.some(decision => decision.id === 'data-pii-review')) throw new Error('PII+rights review decision not recorded.');

  await loadState(page, { scene: 'annotationTask', flags: { annotationResults: [
    { index: 0, choice: 'آمن', acceptedAsReasonable: true, pending: false },
    { index: 1, choice: 'عنف', acceptedAsReasonable: true, pending: false },
    { index: 2, choice: 'مضايقة أو إساءة', acceptedAsReasonable: true, pending: false }
  ] } });
  await click(page, '#takeBreak');
  state = await savedState(page);
  if (!state.flags.tookBreak) throw new Error('Unpaid break was not persisted.');
  await page.getByText('17 دقيقة').waitFor({ state: 'visible' });

  await loadState(page, { scene: 'safetyOutcome', flags: { safetyChoice: 'details' } });
  await click(page, '#remediateSafety');
  state = await savedState(page);
  if (!state.flags.safetyRemediated || state.scene !== 'launchDecision') throw new Error('Safety remediation did not gate launch.');

  await loadState(page, { scene: 'deployLoad' });
  await setLoad(page, [45, 30, 25]);
  await click(page, '#testLoad');
  state = await savedState(page);
  if (state.scene !== 'deployIncident') throw new Error('Valid multi-solution load distribution was rejected.');

  await loadState(page, { scene: 'evalTask', flags: { evalIndex: 2 } });
  await click(page, '[data-eval="bad"]');
  state = await savedState(page);
  if (state.flags.evalCorrectCount !== 1) throw new Error('Legal evaluation should accept both answers as bad.');

  if (Object.hasOwn(state, 'metrics')) throw new Error('Hidden metrics still exist in state.');
  if (Object.hasOwn(state.flags, 'revealedWorkers')) throw new Error('Legacy click-through worker reveal state still exists.');
  await browser.close();
  console.log('Precision and causality checks passed.');
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile');
await runPrecisionChecks();
console.log('All smoke tests passed.');
