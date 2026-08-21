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

async function chooseData(page, choice) { await click(page, `[data-sort="${choice}"]`); }
async function chooseAnnotation(page, label) { await click(page, `[data-tag="${label}"]`); }

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await loadState(page);

  await click(page, '#introSend');
  await click(page, '#why');
  await click(page, '#descend');

  // 1. المواد: الإيقاف لا ينتج مواد أثناء الفحص، ثم تستأنف الحصة فعليًا.
  await expectTask(page); await click(page, '#chapterNext');
  await expectTask(page); await click(page, '#startMine');
  await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]');
  await expectTask(page, 'decision');
  await page.getByText('6/12').first().waitFor({ state: 'visible' });
  await click(page, '#mineStop');
  await page.getByText('لم تنتج مواد أثناء التوقف', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('6/12').first().waitFor({ state: 'visible' });
  await click(page, '#finishMine');
  await page.getByText('6/12').first().waitFor({ state: 'visible' });
  await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]');
  await page.getByText('12/12').first().waitFor({ state: 'visible' });
  await click(page, '#mineTransport'); await click(page, '#mineAbstract'); await click(page, '#abstractNext');

  // 2. المصنع.
  await expectTask(page); await click(page, '#chapterNext');
  for (const ppe of ['hair', 'mask', 'gloves', 'suit']) await click(page, `[data-ppe="${ppe}"]`);
  await click(page, '#enterFab'); await click(page, '#observeFab');
  await expectTask(page, 'decision');
  await page.getByText('49 / 40').waitFor({ state: 'visible' });
  await click(page, '#fabStop');
  await page.getByText('96%').waitFor({ state: 'visible' });
  await click(page, '#chipsDone'); await click(page, '#abstractNext'); await click(page, '#toCh3');

  // 3. مركز البيانات.
  await expectTask(page); await click(page, '#chapterNext');
  for (const step of ['rack', 'power', 'network', 'register']) await click(page, `[data-server-step="${step}"]`);
  await click(page, '#bootServer'); await expectTask(page, 'decision');
  await click(page, '#dcStop');
  await expectTask(page, 'active');
  for (const worker of ['clean', 'electric', 'security']) await click(page, `[data-worker="${worker}"]`);
  await page.getByText('الأدوار المطلوبة: 3/3').waitFor({ state: 'visible' });
  await click(page, '#dcReady'); await click(page, '#abstractNext');

  // 4. البيانات: الاستكشاف يكشف معلومة فعلية.
  await expectTask(page); await click(page, '#chapterNext');
  await click(page, '[data-origin="forum"]');
  await page.getByText('قد تتضمن أسماء حسابات', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '[data-origin="code"]');
  await click(page, '#toClean');
  for (const choice of ['remove', 'keep', 'remove', 'review', 'review', 'remove', 'review', 'review']) await chooseData(page, choice);
  await page.getByText('مواد بيانات مجهزة وفق سياسة السيناريو').waitFor({ state: 'visible' });
  await click(page, '#dataAbstract'); await click(page, '#abstractNext');

  // 5. التصنيف: ست مهام، مع استراحة ودخل مؤكد منفصل عن المعلق.
  await expectTask(page); await click(page, '#chapterNext'); await click(page, '#startAnnot');
  const labels = ['آمن', 'عنف', 'مضايقة أو إساءة', 'غير واضح', 'خطاب كراهية', 'غير واضح'];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 3) await click(page, '#takeBreak');
    await chooseAnnotation(page, labels[index]);
  }
  await page.getByText('لم يرفض المراجع أي مهمة في هذه الجولة.').waitFor({ state: 'visible' });
  if (await page.locator('#appeal').count()) throw new Error(`${label}: appeal should not exist without rejection.`);
  await click(page, '#closeShift');
  await page.getByText('الدخل المؤكد').first().waitFor({ state: 'visible' });
  await click(page, '#annotAbstract'); await click(page, '#abstractNext');

  // 6. التدريب: checkpoint لا يقدم نفسه كجودة لغوية.
  await expectTask(page); await click(page, '#chapterNext');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await expectTask(page, 'decision'); await click(page, '#trainPause');
  await page.getByText('نسخة من النموذج تستطيع إنتاج إجابات', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#sendHuman');

  // 7. التقييم: الملاءمة والسلامة والجاهزية منفصلة.
  await expectTask(page); await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'a']) {
    await click(page, `[data-eval="${choice}"]`);
    await click(page, '#nextEval');
  }
  await click(page, '[data-safety="details"]');
  await page.getByText('كتغطية سلامة مستقلة', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#toLaunch'); await expectTask(page, 'decision');
  await click(page, '#delayLaunch');
  await click(page, '#finishEval'); await click(page, '#abstractNext');

  // 8. التشغيل: التوزيع الأولي يفشل، التشخيص يبقى ظاهرًا، والدعم حالتان فقط.
  await expectTask(page); await click(page, '#chapterNext');
  await click(page, '#testLoad');
  await page.getByText('الحمل ما زال مركزًا أكثر من اللازم', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#balanceLoad'); await click(page, '#testLoad');
  await click(page, '[data-tab="network"]');
  await page.getByText('الشبكة مستقرة', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '[data-tab="compute"]');
  await page.getByText('الشبكة مستقرة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('السعة متاحة', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '[data-tab="model"]');
  await page.getByText('الإصدار الجديد هو المشتبه الرئيسي', { exact: false }).waitFor({ state: 'visible' });
  await expectTask(page, 'decision'); await click(page, '#rollback');
  await click(page, '#toSupport');
  await click(page, '#supportGood'); await click(page, '#supportGood');
  await page.getByText('2 عولجت').waitFor({ state: 'visible' });
  await click(page, '#uptimeAbstract'); await click(page, '#abstractNext');

  // 9. النهاية: الخريطة غير خطية، الإجابة ثابتة، والنتيجة اتجاهات لا درجة.
  await expectTask(page); await click(page, '#chapterNext');
  await page.getByText('دورة تطوير النموذج').waitFor({ state: 'visible' });
  await page.getByText('↔ تصنيف ومراجعة').waitFor({ state: 'visible' });
  await click(page, '#compressAI'); await click(page, '#backPrompt');
  const finalAnswer = await page.locator('.message.ai').innerText();
  if (!finalAnswer.includes('أعتذر عن التأخر في تسليم العمل')) throw new Error(`${label}: fixed final answer missing.`);
  await page.getByText('لماذا لم تتغير صياغة الإجابة', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#behindAnswer'); await click(page, '#showPeople'); await click(page, '#showResults');
  await page.getByText('النتيجة اتجاهات، لا درجة واحدة.').waitFor({ state: 'visible' });
  await page.getByText('حوكمة وجودة البيانات').waitFor({ state: 'visible' });
  await page.getByText('ملاءمة المخرجات', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('السلامة').first().waitFor({ state: 'visible' });
  await page.getByText('استكشاف إضافي').waitFor({ state: 'visible' });
  await click(page, '#toFinalMessage');
  await page.getByText('الواجهة هي نهاية السلسلة، وليست بدايتها.').first().waitFor({ state: 'visible' });

  if (viewport.width <= 390) {
    await loadState(page, { scene: 'mineTask', flags: { miningCount: 2 } });
    const task = page.locator('[data-task-panel]').first();
    const position = await task.evaluate(element => getComputedStyle(element).position);
    if (position !== 'static') throw new Error(`${label}: mobile task panel should not be sticky.`);
    const footerDisplay = await page.locator('#persistentFooter').evaluate(element => getComputedStyle(element).display);
    if (footerDisplay !== 'none') throw new Error(`${label}: persistent mobile prompt footer should be hidden.`);
    await click(page, '#promptBtn');
    await page.getByText('اكتب لي رسالة قصيرة أعتذر فيها لمديري', { exact: false }).waitFor({ state: 'visible' });
  }

  if (pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Redesigned journey passed: ${label}`);
}

async function runBranchAndCausalityChecks() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await loadState(page, { scene: 'removedScene' });
  await page.locator('#introSend').waitFor({ state: 'visible' });

  await loadState(page, { scene: 'mineTask', flags: { miningCount: 6, miningWarning: true } });
  await click(page, '#mineStop');
  await page.getByText('6/12').first().waitFor({ state: 'visible' });
  const miningState = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  if (miningState.flags.miningCount !== 6) throw new Error('Mining stop generated materials during inspection.');

  await loadState(page, { scene: 'dcWorkers', flags: { revealedWorkers: ['clean'] } });
  await expectTask(page, 'active');
  await page.getByText('الأدوار المطلوبة: 1/3').waitFor({ state: 'visible' });

  await loadState(page, {
    scene: 'annotationReview',
    flags: { annotationResults: [
      { index: 0, choice: 'آمن', acceptedAsReasonable: true, pending: false },
      { index: 3, choice: 'غير واضح', acceptedAsReasonable: true, pending: true }
    ] }
  });
  await expectTask(page, 'active');
  if (await page.locator('#appeal').count()) throw new Error('Appeal exposed without a rejected annotation.');
  await page.getByText('قيد المراجعة ولم يُحسم دفعها: 1').waitFor({ state: 'visible' });

  await loadState(page, {
    scene: 'annotationReview',
    flags: { annotationResults: [
      { index: 0, choice: 'عنف', acceptedAsReasonable: false, pending: false },
      { index: 1, choice: 'عنف', acceptedAsReasonable: true, pending: false }
    ] }
  });
  await expectTask(page, 'decision');
  await page.getByText('نتيجة الاعتراض تقع خارج الزمن', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'trainingSetup' });
  const beforeTraining = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).metrics.modelQuality, STORAGE_KEY);
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  const afterTraining = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).metrics.modelQuality, STORAGE_KEY);
  if (beforeTraining !== afterTraining) throw new Error('Training checkpoint changed output-fit metric.');

  await loadState(page, { scene: 'safetyTest' });
  const beforeSafety = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).metrics.modelQuality, STORAGE_KEY);
  await click(page, '[data-safety="details"]');
  const afterSafety = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).metrics.modelQuality, STORAGE_KEY);
  if (beforeSafety !== afterSafety) throw new Error('Safety evaluation changed output-fit metric.');

  await loadState(page, { scene: 'deployIncident' });
  await click(page, '[data-tab="network"]');
  await click(page, '[data-tab="compute"]');
  await page.getByText('الشبكة مستقرة', { exact: false }).waitFor({ state: 'visible' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('الشبكة مستقرة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('السعة متاحة', { exact: false }).waitFor({ state: 'visible' });

  const low = { pressure:50,cost:50,burden:42,dataQuality:20,modelQuality:10,reliability:10,serviceQuality:10 };
  const high = { pressure:50,cost:50,burden:42,dataQuality:95,modelQuality:95,reliability:95,serviceQuality:95 };
  await loadState(page, { scene: 'finalAnswer', metrics: low });
  const answerLow = await page.locator('.message.ai').innerText();
  await loadState(page, { scene: 'finalAnswer', metrics: high });
  const answerHigh = await page.locator('.message.ai').innerText();
  if (answerLow !== answerHigh) throw new Error('Final answer changed despite fixed-answer causal design.');

  if (pageErrors.length) throw new Error(`branch/causality page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log('Branch, causality, persistence, and accounting checks passed.');
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390x844');
await runBranchAndCausalityChecks();
