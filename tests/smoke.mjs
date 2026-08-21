import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';

const BASE_URL = 'http://127.0.0.1:4173';
const DEFAULT_TEST_SETTINGS = { ...DEFAULT_SETTINGS, reduceMotion: true };

async function click(page, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: 'visible' });
  await target.click();
}

function currentState(patch = {}) {
  const state = clone(DEFAULT_STATE);
  function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
        merge(target[key], value);
      } else target[key] = value;
    }
  }
  merge(state, patch);
  return state;
}

async function loadState(page, patch = null, settings = DEFAULT_TEST_SETTINGS) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(({ settingsKey, storageKey, settingsValue, state }) => {
    localStorage.clear();
    localStorage.setItem(settingsKey, JSON.stringify(settingsValue));
    if (state) localStorage.setItem(storageKey, JSON.stringify(state));
  }, { settingsKey: SETTINGS_KEY, storageKey: STORAGE_KEY, settingsValue: settings, state: patch ? currentState(patch) : null });
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

async function selectedOptionText(page, selector) {
  return page.locator(selector).first().evaluate(select => select.options[select.selectedIndex]?.textContent || '');
}

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  await loadState(page);

  await click(page, '#introSend');
  await page.getByRole('heading', { name: 'الإجابة هي آخر نقطة مرئية في سلسلة أطول.', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
  if ((await page.locator('.glyph').textContent()) !== '◇') throw new Error(`${label}: reduced-motion intro did not render the final static glyph.`);
  await click(page, '#descend');

  await page.getByRole('heading', { name: 'استخراج مواد الأجهزة', exact: true }).waitFor({ state: 'visible' });
  await page.getByText('المرحلة 1 من 8', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#chapterNext');
  if (!await page.locator('.scene-character').boundingBox()) throw new Error(`${label}: mining character missing.`);
  await click(page, '#startMine');
  await click(page, '[data-sector="b"]');
  await click(page, '[data-sector="b"]');
  await page.getByText('اهتزاز غير معتاد في القطاع ب').waitFor({ state: 'visible' });
  await click(page, '#mineStop');
  await page.getByText('لم تنتج مواد أثناء التوقف', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#finishMine');
  for (let i = 0; i < 4; i += 1) await click(page, '[data-sector="b"]');
  await page.getByText('92 وحدة لعب').waitFor({ state: 'visible' });
  await page.getByText('54 دقيقة').waitFor({ state: 'visible' });
  await click(page, '#mineTransport'); await click(page, '#mineAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '#enterFab');
  await page.getByText('فرق الضغط إلى المنطقة المجاورة').waitFor({ state: 'visible' });
  await click(page, '#observeFab'); await click(page, '#fabStop');
  await page.getByText('رفض محدود').waitFor({ state: 'visible' });
  if (await page.getByText('96%', { exact: true }).count()) throw new Error(`${label}: factory faux-precision remains.`);
  await click(page, '#chipsDone'); await click(page, '#toCh3'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '[data-server-step="rack"]');
  await click(page, '[data-server-step="network"]');
  await click(page, '[data-server-step="power"]');
  await click(page, '[data-server-step="register"]');
  await click(page, '#bootServer'); await click(page, '#dcMove');
  await page.getByText('انتقلت مهام الاختبار إلى سعة بديلة', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#dcAfterCooling');
  if (await page.locator('.worker-person__avatar').count() < 6) throw new Error(`${label}: supporting datacenter workers are not represented visually.`);
  const workerCursor = await page.locator('.worker-person').first().evaluate(element => getComputedStyle(element).cursor);
  if (workerCursor !== 'default') throw new Error(`${label}: non-interactive worker card still looks clickable.`);
  await click(page, '#dcReady'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  const ctaTop = (await page.locator('#toClean').boundingBox())?.y ?? Infinity;
  const optionalTop = (await page.locator('.optional-source-details').boundingBox())?.y ?? -Infinity;
  if (ctaTop >= optionalTop) throw new Error(`${label}: optional data sources still precede the primary CTA visually.`);
  await page.locator('.optional-source-details summary').click();
  for (const origin of ['forum', 'code', 'photo']) await click(page, `[data-origin="${origin}"]`);
  await click(page, '#toClean');
  await chooseData(page, 'remove');
  await chooseData(page, 'keep');
  await chooseData(page, 'review');
  await page.getByRole('heading', { name: 'حُسم حق الاستخدام، لكن مشكلة الخصوصية ما زالت قائمة.', exact: true }).waitFor({ state: 'visible' });
  await click(page, '#followupRedact');
  await chooseData(page, 'review');
  await chooseData(page, 'review');
  await page.getByText('12 دقيقة').waitFor({ state: 'visible' });
  await click(page, '#dataAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext'); await click(page, '#startAnnot');
  const labels = ['آمن', 'عنف', 'مضايقة أو إساءة', 'غير واضح', 'خطاب كراهية', 'غير واضح'];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 3) await click(page, '#takeBreak');
    await chooseAnnotation(page, labels[index]);
  }
  await page.getByText('29 دقيقة').waitFor({ state: 'visible' });
  await click(page, '#closeShift');
  await page.getByText('4 أمثلة مؤكدة، و2 قيد المراجعة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('وقت غير مدفوع', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#annotAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  const trainingInput = await selectedOptionText(page, '.config-panel select');
  if (!trainingInput.includes('4 أمثلة بشرية مؤكدة')) throw new Error(`${label}: confirmed annotation inputs are not shown in the training configuration.`);
  await page.getByText('حالتان معلقتان', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('هذه ليست عملية تدريب نموذج من الصفر', { exact: false }).waitFor({ state: 'visible' });
  await page.selectOption('#computeSel', '8');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await click(page, '#trainContinue'); await click(page, '#sendHuman'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'bad']) {
    await click(page, `[data-eval="${choice}"]`);
    await click(page, '#nextEval');
  }
  await click(page, '[data-safety="details"]');
  await click(page, '#remediateSafety');
  await page.getByText('بقيت 3 حزم تحقق', { exact: false }).waitFor({ state: 'visible' });
  for (const title of ['تحقق من تغييرات نقطة الحفظ','فحص استقرار بعد عطل الحوسبة','إعادة اختبار السلامة']) {
    await page.getByText(title, { exact: true }).waitFor({ state: 'visible' });
  }
  if (await page.getByText(/بقي \d+ اختبار/).count()) throw new Error(`${label}: arbitrary verification test count remains.`);
  await click(page, '#delayLaunch'); await click(page, '#finishEval'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '#testLoad');
  await page.getByText('تجاوز سعته', { exact: false }).waitFor({ state: 'visible' });
  await setLoad(page, [45, 30, 25]);
  await click(page, '#testLoad');
  for (const tab of ['network', 'compute', 'model']) await click(page, `[data-tab="${tab}"]`);
  await click(page, '#rollback'); await click(page, '#toSupport');
  await page.getByText('تحقق من الطلب الأول', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#supportInvestigate');
  await page.getByText('اربط البلاغ بالإصدار', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#supportInvestigate');
  await click(page, '#uptimeAbstract'); await click(page, '#abstractNext');

  await page.getByText('اكتملت مراحل اللعب الثماني', { exact: true }).waitFor({ state: 'visible' });
  if (!(await page.locator('#journeyProgress').isHidden())) throw new Error(`${label}: epilogue still renders as a numbered gameplay stage.`);
  await click(page, '#backPrompt');
  await page.getByText('وصل بعد استعادة الإصدار السابق', { exact: true }).waitFor({ state: 'visible' });
  if (await page.getByText(/\d+\.\d+ ثانية/).count()) throw new Error(`${label}: fake request timing remains in ending.`);
  await click(page, '#showResults');
  await page.getByRole('heading', { name: 'أعد البشر والقرارات إلى الصورة.', exact: true }).waitFor({ state: 'visible' });
  await page.getByText('نقحت البيانات بعد حسم الحقوق', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#toFinalMessage');
  await page.getByRole('heading', { name: 'الواجهة هي نهاية السلسلة، وليست بدايتها.', exact: true }).waitFor({ state: 'visible' });
  if (await page.locator('.methodology-details').count() !== 1) throw new Error(`${label}: methodology is not an optional epilogue detail.`);

  if (pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Complete journey passed: ${label}`);
}

async function runPrecisionChecks() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await loadState(page, { scene: 'mineTask' });
  for (let i = 0; i < 12; i += 1) await click(page, '[data-sector="a"]');
  let state = await savedState(page);
  if (state.flags.miningMinutes !== 84 || state.scene !== 'mineEnd') throw new Error('Slow-only mining path should miss the 72-minute window at 84 minutes.');
  await page.getByText('90 وحدة لعب').waitFor({ state: 'visible' });

  await loadState(page, { scene: 'mineTask', flags: { miningCount: 10, miningMinutes: 35, miningBUses: 1 } });
  await click(page, '[data-sector="b"]');
  state = await savedState(page);
  if (!state.flags.miningWarning || state.flags.miningCount !== 12 || state.scene !== 'mineTask') throw new Error('Final quota click must not bypass the mining warning.');
  await click(page, '#mineContinue');
  state = await savedState(page);
  if (state.scene !== 'mineEnd') throw new Error('Resolving a final-click mining warning should finish the shift without a fake extra extraction click.');

  await loadState(page, { scene: 'dataClean', flags: { dataIndex: 2 } });
  await chooseData(page, 'review');
  state = await savedState(page);
  if (state.scene !== 'dataFollowup' || state.flags.dataReviewMinutes !== 4) throw new Error('PII rights review should cost time and lead to a second decision.');
  await click(page, '#followupRedact');
  state = await savedState(page);
  if (!state.decisions.some(decision => decision.id === 'data-pii-redact-after-review')) throw new Error('Review -> redact follow-up was not recorded.');

  const appealResults = [
    { index:0, choice:'عنف', acceptedAsReasonable:false, pending:false },
    { index:1, choice:'عنف', acceptedAsReasonable:true, pending:false },
    { index:2, choice:'مضايقة أو إساءة', acceptedAsReasonable:true, pending:false },
    { index:3, choice:'غير واضح', acceptedAsReasonable:true, pending:true },
    { index:4, choice:'خطاب كراهية', acceptedAsReasonable:true, pending:false },
    { index:5, choice:'غير واضح', acceptedAsReasonable:true, pending:true }
  ];
  await loadState(page, { scene: 'annotationReview', flags: { annotationResults: appealResults } });
  await click(page, '#appeal');
  state = await savedState(page);
  if (state.flags.annotationUnpaidMinutes !== 4) throw new Error('Appeal must add four unpaid minutes to the economic outcome.');
  await page.getByText('4 دقيقة', { exact: true }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'trainingSetup', flags: { annotationResults: [
    { index:0, choice:'آمن', acceptedAsReasonable:true, pending:false },
    { index:1, choice:'غير واضح', acceptedAsReasonable:true, pending:true }
  ] } });
  const precisionTrainingInput = await selectedOptionText(page, '.config-panel select');
  if (!precisionTrainingInput.includes('مثال بشري مؤكد واحد')) throw new Error('Training configuration did not keep the pending annotation outside the confirmed input.');
  await page.getByText('حالة معلقة واحدة', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'launchDecision', flags: { safetyChoice:'details', safetyRemediated:true, trainingCheckpoint:'recent', trainingCompute:'8', trainingIncidentChoice:'continue' } });
  if (await page.locator('.verification-bundles .card').count() !== 3) throw new Error('Named verification bundles should replace arbitrary test counts.');

  await loadState(page, { scene: 'factoryMonitor' });
  const numericDirection = await page.getByText('+12 Pa').evaluate(element => getComputedStyle(element).direction);
  const arabicDirection = await page.getByText('ضمن النطاق').evaluate(element => getComputedStyle(element).direction);
  if (numericDirection !== 'ltr') throw new Error(`Numeric monitor value should resolve LTR, got ${numericDirection}.`);
  if (arabicDirection !== 'rtl') throw new Error(`Arabic monitor value should resolve RTL, got ${arabicDirection}.`);

  await loadState(page, { scene: 'dcWorkers' });
  if (await page.locator('.worker-person__avatar').count() !== 6) throw new Error('All datacenter supporting roles need a visual human representation.');

  await loadState(page, { scene: 'zoomOut' }, { ...DEFAULT_SETTINGS, reduceMotion: true });
  const staticGlyph = await page.locator('.glyph').textContent();
  await page.waitForTimeout(450);
  if (staticGlyph !== '◇' || (await page.locator('.glyph').textContent()) !== '◇') throw new Error('Reduced motion should skip the JavaScript glyph animation entirely.');

  await loadState(page, { scene: 'ch1Intro' }, { ...DEFAULT_SETTINGS, highContrast: true, largeText: true, reduceMotion: true });
  if (!await page.locator('body').evaluate(body => body.classList.contains('high-contrast') && body.classList.contains('large-text'))) throw new Error('Accessibility display settings did not apply together.');

  if (Object.hasOwn(state, 'metrics')) throw new Error('Hidden metrics returned to state.');
  await browser.close();
  console.log('Tradeoff, causality, RTL, and accessibility checks passed.');
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390');
await runPrecisionChecks();
console.log('All smoke tests passed.');