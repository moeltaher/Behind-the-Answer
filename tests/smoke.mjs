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

async function expectTask(page, status = null) {
  const task = page.locator('[data-task-panel]').first();
  await task.waitFor({ state: 'visible' });
  if (status) {
    const actual = await task.getAttribute('data-task-status');
    if (actual !== status) throw new Error(`Expected task status ${status}, got ${actual}`);
  }
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
  }, {
    settingsKey: SETTINGS_KEY,
    storageKey: STORAGE_KEY,
    settings: SETTINGS,
    state: patch ? currentState(patch) : null
  });
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

  await click(page, '#chapterNext');
  if ((await page.locator('.scene-character').count()) !== 1) throw new Error(`${label}: mining should render one character card only.`);
  await click(page, '#startMine');
  await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]');
  await expectTask(page, 'decision');
  await click(page, '#mineStop');
  await page.getByText('لم تنتج مواد أثناء التوقف', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#finishMine');
  await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]');
  await page.getByText('92 وحدة لعب').waitFor({ state: 'visible' });
  await click(page, '#mineTransport'); await click(page, '#mineAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  if ((await page.locator('[data-ppe]').count()) !== 0) throw new Error(`${label}: legacy PPE ordering still exists.`);
  await page.getByText('معالجة الرقاقة').waitFor({ state: 'visible' });
  await click(page, '#enterFab'); await click(page, '#observeFab');
  await expectTask(page, 'decision');
  await click(page, '#fabStop');
  await page.getByText('96%').waitFor({ state: 'visible' });
  await click(page, '#chipsDone'); await click(page, '#abstractNext'); await click(page, '#toCh3');

  await click(page, '#chapterNext');
  for (const step of ['rack', 'power', 'network', 'register']) await click(page, `[data-server-step="${step}"]`);
  await click(page, '#bootServer'); await expectTask(page, 'decision');
  await click(page, '#dcStop');
  await expectTask(page, 'resumed');
  await page.getByText('عادت الحرارة إلى 24° م', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#dcAfterCooling');
  for (const worker of ['clean', 'electric', 'security']) await click(page, `[data-worker="${worker}"]`);
  await page.getByText('الأدوار المطلوبة: 3/3').waitFor({ state: 'visible' });
  await click(page, '#dcReady'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  for (const origin of ['forum', 'code', 'photo']) await click(page, `[data-origin="${origin}"]`);
  await click(page, '#toClean');
  for (const choice of ['remove', 'keep', 'redact', 'review', 'review']) await chooseData(page, choice);
  await page.getByText('نُقحت').waitFor({ state: 'visible' });
  await click(page, '#dataAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext'); await click(page, '#startAnnot');
  await page.getByText('المبلغ المبدئي').waitFor({ state: 'visible' });
  if (await page.getByText('الدخل المؤكد', { exact: false }).count()) throw new Error(`${label}: confirmed income appeared before review.`);
  const labels = ['آمن', 'عنف', 'مضايقة أو إساءة', 'غير واضح', 'خطاب كراهية', 'غير واضح'];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 3) await click(page, '#takeBreak');
    await chooseAnnotation(page, labels[index]);
  }
  await page.getByText('الدخل المؤكد الآن', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#closeShift');
  await click(page, '#annotAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await page.selectOption('#computeSel', '8');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await page.getByText('7/8').waitFor({ state: 'visible' });
  await page.getByText('97%', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#trainContinue');
  await page.getByText('يتطلب السيناريو مجموعة تحقق إضافية', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#sendHuman');

  await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'a']) {
    await click(page, `[data-eval="${choice}"]`);
    await click(page, '#nextEval');
  }
  await click(page, '[data-safety="details"]');
  await click(page, '#toLaunch');
  await page.getByText('بقي 18 اختبارًا', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#delayLaunch');
  await page.getByText('3/3').waitFor({ state: 'visible' });
  await click(page, '#finishEval'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '#testLoad');
  await page.getByText('تجاوز سعته', { exact: false }).waitFor({ state: 'visible' });
  await setLoad(page, [50, 30, 20]);
  await click(page, '#testLoad');
  for (const tab of ['network', 'compute', 'model']) await click(page, `[data-tab="${tab}"]`);
  await page.getByText('الإصدار الجديد هو المشتبه الرئيسي', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#rollback');
  await click(page, '#toSupport');
  await click(page, '#supportInvestigate'); await click(page, '#supportInvestigate');
  await page.getByText('2 عولجت').waitFor({ state: 'visible' });
  await click(page, '#uptimeAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await page.getByText('دورة تطوير النموذج').waitFor({ state: 'visible' });
  await click(page, '#compressAI'); await click(page, '#backPrompt');
  await page.getByText('1.3 ثانية', { exact: false }).waitFor({ state: 'visible' });
  const finalAnswer = await page.locator('.message.ai').innerText();
  if (!finalAnswer.includes('أعتذر عن التأخر في تسليم العمل')) throw new Error(`${label}: fixed answer is missing.`);
  await click(page, '#behindAnswer'); await click(page, '#showPeople'); await click(page, '#showResults');
  await page.getByText('النتيجة أدلة من قراراتك، لا متوسط نقاط.').waitFor({ state: 'visible' });
  await page.getByText('العمل والوقت').waitFor({ state: 'visible' });
  await page.getByText('التدريب والتحقق').waitFor({ state: 'visible' });
  if (await page.locator('.metric-card').count()) throw new Error(`${label}: numeric metric cards still render.`);
  await click(page, '#toFinalMessage');
  await page.getByText('الواجهة هي نهاية السلسلة، وليست بدايتها.').first().waitFor({ state: 'visible' });

  if (viewport.width <= 390) {
    await loadState(page, { scene: 'ch1Intro' });
    const details = page.locator('.task-panel__details').first();
    await details.waitFor({ state: 'visible' });
    const columns = await details.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length);
    if (columns !== 1) throw new Error(`${label}: full task details must stack into one column on mobile.`);
    await click(page, '#chapterNext');
    const compactTask = page.locator('[data-task-panel]').first();
    const position = await compactTask.evaluate(element => getComputedStyle(element).position);
    if (position !== 'static') throw new Error(`${label}: mobile task panel should not be sticky.`);
    const footerDisplay = await page.locator('#persistentFooter').evaluate(element => getComputedStyle(element).display);
    if (footerDisplay !== 'none') throw new Error(`${label}: persistent prompt footer should remain hidden.`);
    await click(page, '#promptBtn');
    await page.locator('#promptDialogText').waitFor({ state: 'visible' });
  }

  if (pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Complete journey passed: ${label}`);
}

async function runCausalityChecks() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));

  await loadState(page, { scene: 'mineTask', flags: { miningCount: 6, miningWarning: true } });
  await click(page, '#mineContinue');
  let state = await savedState(page);
  if (state.flags.miningCount !== 6) throw new Error('Mining continue auto-completed the quota.');
  if (state.flags.miningIncidentChoice !== 'continue') throw new Error('Mining continue choice was not persisted.');
  await page.getByText('مخاطرة غير معالجة').waitFor({ state: 'visible' });

  await loadState(page, { scene: 'mineTask', flags: { miningCount: 6, miningWarning: true } });
  await click(page, '#mineStop');
  state = await savedState(page);
  if (state.flags.miningCount !== 6) throw new Error('Mining stop generated materials during inspection.');

  await loadState(page, { scene: 'dcCooling' });
  await click(page, '#dcStop');
  state = await savedState(page);
  if (state.scene !== 'dcCoolingOutcome') throw new Error('Datacenter stop skipped cooling outcome/repair.');
  await page.getByText('عادت الحرارة إلى 24° م', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'trainingRun', flags: { trainingCompute: '8' } });
  await page.getByText('97%', { exact: false }).waitFor({ state: 'visible' });
  await loadState(page, { scene: 'trainingRun', flags: { trainingCompute: '12' } });
  await page.getByText('84%', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'launchDecision', flags: { trainingCompute: '12', trainingCheckpoint: 'validated', trainingIncidentChoice: 'pause' } });
  await page.getByText('بقي 12 اختبارًا', { exact: false }).waitFor({ state: 'visible' });
  await loadState(page, { scene: 'launchDecision', flags: { trainingCompute: '8', trainingCheckpoint: 'recent', trainingIncidentChoice: 'continue' } });
  await page.getByText('بقي 18 اختبارًا', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'evalTask' });
  const beforeEval = await savedState(page);
  await click(page, '[data-eval="a"]');
  const afterEval = await savedState(page);
  if (JSON.stringify(afterEval.metrics) !== JSON.stringify(beforeEval.metrics)) throw new Error('Evaluator answer mutated system metrics.');
  if (afterEval.flags.evalCorrectCount !== 1) throw new Error('Evaluator correctness was not recorded separately.');

  await loadState(page, { scene: 'deployLoad' });
  await setLoad(page, [34, 33, 33]);
  await click(page, '#testLoad');
  await page.getByText('تجاوز سعته', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'finalAnswer', flags: { deployRecovery: 'restart' } });
  const restartAnswer = await page.locator('.message.ai').innerText();
  await page.getByText('2.4 ثانية', { exact: false }).waitFor({ state: 'visible' });
  await loadState(page, { scene: 'finalAnswer', flags: { deployRecovery: 'rollback' } });
  const rollbackAnswer = await page.locator('.message.ai').innerText();
  await page.getByText('1.3 ثانية', { exact: false }).waitFor({ state: 'visible' });
  if (restartAnswer !== rollbackAnswer) throw new Error('Operational recovery incorrectly changed answer wording.');

  await loadState(page, { scene: 'mineTask' });
  if (await page.locator('body').getAttribute('data-stage') !== 'mining') throw new Error('Mining stage skin not applied.');
  await loadState(page, { scene: 'deployLoad' });
  if (await page.locator('body').getAttribute('data-stage') !== 'deployment') throw new Error('Deployment stage skin not applied.');

  if (pageErrors.length) throw new Error(`Causality checks page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log('Causality, accounting, cross-stage, delivery, and visual-stage checks passed.');
}

await runJourney({ width: 1440, height: 1000 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile');
await runCausalityChecks();
