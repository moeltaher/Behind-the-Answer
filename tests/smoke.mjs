import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../js/core/storage.js';
import { DEMO_PROMPT } from '../js/data/story.js';

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
  await page.getByText('كيف تنفذها؟', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('التأخر عن نافذة التسليم وإغلاق القطاع للفحص', { exact: false }).waitFor({ state: 'visible' });
  if (viewport.width <= 390) {
    for (const toolLabel of ['الطلب', 'السجل', 'الوصول']) {
      const item = page.getByText(toolLabel, { exact: true });
      await item.waitFor({ state: 'visible' });
      if (await item.evaluate(element => getComputedStyle(element).display === 'none')) throw new Error(`${label}: mobile toolbar label ${toolLabel} is hidden.`);
    }
  }
  await click(page, '#chapterNext');
  if (!await page.locator('.scene-character').boundingBox()) throw new Error(`${label}: mining character missing.`);
  await page.getByText('تخلق قواعد الأجر هنا حافزًا ماليًا', { exact: false }).waitFor({ state: 'visible' });
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
  if (await page.locator('#mineTransport').count()) throw new Error(`${label}: obsolete mining bridge route/button remains.`);
  await click(page, '#mineAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '#enterFab');
  await page.getByText('فرق الضغط إلى المنطقة المجاورة').waitFor({ state: 'visible' });
  await click(page, '#observeFab'); await click(page, '#fabStop');
  await page.getByText('رفض محدود').waitFor({ state: 'visible' });
  await page.getByText('حدد تسربًا عند وصلة في مسار الترشيح', { exact: false }).waitFor({ state: 'visible' });
  if (await page.getByText('96%', { exact: true }).count()) throw new Error(`${label}: factory faux-precision remains.`);
  if (await page.locator('#chipsDone, #toCh3').count()) throw new Error(`${label}: obsolete factory bridge buttons remain.`);
  await click(page, '#toFactoryAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '[data-server-step="rack"]');
  await click(page, '[data-server-step="network"]');
  await click(page, '[data-server-step="power"]');
  await click(page, '[data-server-step="register"]');
  await click(page, '#bootServer');
  await page.getByText('الحمل الحالي في القاعة البديلة').waitFor({ state: 'visible' });
  await page.getByText('هامش القاعة البديلة الآن').waitFor({ state: 'visible' });
  await click(page, '#dcMove');
  await page.getByText('الحمل بعد النقل: 82%', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('الهامش المتبقي: 18%', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#dcAfterCooling');
  const workerAvatars = page.locator('.worker-person__avatar');
  if (await workerAvatars.count() !== 6) throw new Error(`${label}: six datacenter supporting workers are required.`);
  const workerSources = await workerAvatars.evaluateAll(images => images.map(image => image.getAttribute('src')));
  if (new Set(workerSources).size !== 6) throw new Error(`${label}: datacenter roles still reuse indistinguishable portraits.`);
  const workerCursor = await page.locator('.worker-person').first().evaluate(element => getComputedStyle(element).cursor);
  if (workerCursor !== 'default') throw new Error(`${label}: non-interactive worker card still looks clickable.`);
  await click(page, '#dcReady'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  const ctaTop = (await page.locator('#toClean').boundingBox())?.y ?? Infinity;
  const optionalTop = (await page.locator('.optional-source-details').boundingBox())?.y ?? -Infinity;
  if (ctaTop >= optionalTop) throw new Error(`${label}: optional data sources still precede the primary CTA visually.`);
  await page.locator('.optional-source-details summary').click();
  for (const origin of ['forum', 'code', 'photo']) await click(page, `[data-origin="${origin}"]`);
  if (await page.locator('[data-origin="forum"]').count()) throw new Error(`${label}: revealed data source remains a dead clickable button.`);
  await click(page, '#toClean');
  await chooseData(page, 'remove');
  await page.getByText('استبعدت مادة لا تضيف قيمة للدفعة', { exact: true }).waitFor({ state: 'visible' });
  await chooseData(page, 'keep');
  await chooseData(page, 'review');
  await page.getByRole('heading', { name: 'حُسم حق الاستخدام، لكن مشكلة الخصوصية ما زالت قائمة.', exact: true }).waitFor({ state: 'visible' });
  await click(page, '#followupRedact');
  await chooseData(page, 'review');
  await chooseData(page, 'review');
  await page.getByText('2 مواد جاهزة للتطوير', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('2 مواد ما زالت معلقة للمراجعة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('12 دقيقة').waitFor({ state: 'visible' });
  let state = await savedState(page);
  if (JSON.stringify(state.flags.dataStatuses) !== JSON.stringify(['excluded','ready','ready','pending','pending'])) throw new Error(`${label}: data readiness states are not preserved explicitly.`);
  await click(page, '#dataAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await page.locator('.annotation-policy').waitFor({ state: 'visible' });
  for (const policyLabel of ['آمن','عنف','مضايقة أو إساءة','خطاب كراهية','إيذاء النفس','غير واضح']) {
    await page.locator('.annotation-policy').getByText(policyLabel, { exact: true }).first().waitFor({ state: 'visible' });
  }
  await click(page, '#startAnnot');
  for (const labelChoice of ['آمن','عنف','مضايقة أو إساءة']) await chooseAnnotation(page, labelChoice);
  await page.getByRole('heading', { name: 'وصلت إلى نقطة الاستراحة.', exact: true }).waitFor({ state: 'visible' });
  if (await page.locator('[data-tag]').count()) throw new Error(`${label}: task 4 can bypass the explicit break decision.`);
  await click(page, '#takeBreak');
  await chooseAnnotation(page, 'غير واضح');
  await chooseAnnotation(page, 'خطاب كراهية');
  await chooseAnnotation(page, 'غير واضح');
  await page.getByText('29 دقيقة').waitFor({ state: 'visible' });
  await page.getByText('رفض قابل للنزاع', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('مراجع جودة المنصة', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#appeal');
  await page.getByText('4 أمثلة مؤكدة، 1 قيد المراجعة، 1 مرفوضة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('9 دقيقة').waitFor({ state: 'visible' });
  await click(page, '#annotAbstract'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  const trainingInput = await selectedOptionText(page, '.config-panel select');
  if (!trainingInput.includes('2 مواد جاهزة من الدفعة 18') || !trainingInput.includes('4 أمثلة بشرية مؤكدة')) throw new Error(`${label}: training configuration does not restrict inputs to confirmed ready material.`);
  await page.getByText('حالة معلقة واحدة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('1 مرفوضة خارج المدخل المؤكد', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('هذه ليست عملية تدريب نموذج من الصفر', { exact: false }).waitFor({ state: 'visible' });
  const trainingLog = page.locator('.training-log').first();
  const trainingDirection = await trainingLog.evaluate(element => getComputedStyle(element).direction);
  const trainingAlign = await trainingLog.evaluate(element => getComputedStyle(element).textAlign);
  if (trainingDirection !== 'rtl' || trainingAlign !== 'right') throw new Error(`${label}: Arabic training summary is not RTL/right aligned.`);
  await page.selectOption('#computeSel', '8');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await page.getByText('فريق البنية والتشغيل', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('وفرت 4 وحدات لعب للحوسبة', { exact: false }).waitFor({ state: 'visible' });
  await click(page, '#trainContinue'); await click(page, '#sendHuman'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'bad']) {
    if (choice === 'b') {
      await page.getByText(DEMO_PROMPT, { exact: true }).waitFor({ state: 'visible' });
      await page.getByText('هذا هو الطلب الذي بدأت به اللعبة.', { exact: true }).waitFor({ state: 'visible' });
    }
    await click(page, `[data-eval="${choice}"]`);
    await click(page, '#nextEval');
  }
  await page.getByText('مختبر سلامة', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '[data-safety="details"]');
  await click(page, '#remediateSafety');
  await page.getByRole('heading', { name: 'أُصلح السلوك وأصبحت النسخة أمام اختبار البوابة من جديد.', exact: true }).waitFor({ state: 'visible' });
  await click(page, '#confirmSafetyRetest');
  await page.getByText('بقيت 2 حزم تحقق غير مرتبطة بالسلامة', { exact: false }).waitFor({ state: 'visible' });
  for (const title of ['تحقق من تغيير نقطة الحفظ الأحدث','فحص استقرار بعد عطل الحوسبة']) {
    await page.getByText(title, { exact: true }).waitFor({ state: 'visible' });
  }
  if (await page.locator('.verification-bundles').getByText('إعادة اختبار السلامة', { exact: false }).count()) throw new Error(`${label}: safety retest is duplicated as a remaining launch bundle.`);
  if (await page.getByText(/بقي \d+ اختبار/).count()) throw new Error(`${label}: arbitrary verification test count remains.`);
  await click(page, '#delayLaunch'); await click(page, '#finishEval'); await click(page, '#abstractNext');

  await click(page, '#chapterNext');
  await click(page, '#testLoad');
  await page.getByText('تجاوز سعته', { exact: false }).waitFor({ state: 'visible' });
  await setLoad(page, [45, 30, 25]);
  await click(page, '#testLoad');
  await click(page, '[data-tab="network"]');
  if (await page.locator('[data-tab="network"]').count()) throw new Error(`${label}: inspected diagnosis tab remains a dead clickable control.`);
  for (const tab of ['compute', 'model']) await click(page, `[data-tab="${tab}"]`);
  await click(page, '#rollback'); await click(page, '#toSupport');
  await page.getByText('مستخدم متأثر', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('تحقق من الطلب الأول', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#supportInvestigate');
  await page.getByText('احتفظ الفريق بسياق تشخيصي أفضل', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('اربط البلاغ بالإصدار', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#supportInvestigate');
  await page.getByText('احتفظ الفريق بسياق تشخيصي أفضل', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#uptimeAbstract'); await click(page, '#abstractNext');

  await page.getByText('اكتملت مراحل اللعب الثماني', { exact: true }).waitFor({ state: 'visible' });
  if (!(await page.locator('#journeyProgress').isHidden())) throw new Error(`${label}: epilogue still renders as a numbered gameplay stage.`);
  await click(page, '#backPrompt');
  await page.getByText('وصل بعد استعادة الإصدار السابق', { exact: true }).waitFor({ state: 'visible' });
  if (await page.getByText(/\d+\.\d+ ثانية/).count()) throw new Error(`${label}: fake request timing remains in ending.`);
  await click(page, '#showResults');
  await page.getByRole('heading', { name: 'أعد البشر والقرارات إلى الصورة.', exact: true }).waitFor({ state: 'visible' });
  if (await page.locator('.journey-highlight').count() !== 4) throw new Error(`${label}: final result should prioritize four journey highlights.`);
  if (await page.locator('.full-evidence-details').evaluate(element => element.open)) throw new Error(`${label}: full evidence should be collapsed by default.`);
  await page.locator('.full-evidence-details summary').click();
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
  await page.getByText('حافز اقتصادي يدفع العامل نحو قبول مخاطرة أكبر', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'dataClean', flags: { dataIndex: 3 } });
  await chooseData(page, 'review');
  state = await savedState(page);
  if (state.flags.dataReviewMinutes !== 4 || state.flags.dataStatuses[3] !== 'pending') throw new Error('A review-only data item must remain pending rather than becoming ready.');

  await loadState(page, { scene: 'annotationTask', flags: { annotationResults: [
    { index:0, choice:'آمن', acceptedAsReasonable:true, pending:false, reviewRejected:false, disputed:false },
    { index:1, choice:'عنف', acceptedAsReasonable:true, pending:false, reviewRejected:false, disputed:false },
    { index:2, choice:'مضايقة أو إساءة', acceptedAsReasonable:true, pending:false, reviewRejected:false, disputed:false }
  ] } });
  await page.getByRole('heading', { name: 'وصلت إلى نقطة الاستراحة.', exact: true }).waitFor({ state: 'visible' });
  if (await page.locator('[data-tag]').count()) throw new Error('Break decision must be resolved before task four appears.');
  await click(page, '#skipBreak');
  await chooseAnnotation(page, 'غير واضح');
  state = await savedState(page);
  const disputed = state.flags.annotationResults[3];
  if (!disputed.acceptedAsReasonable || !disputed.reviewRejected || !disputed.disputed || disputed.pending) throw new Error('The policy-consistent ambiguous choice must create a genuine reviewer dispute, not a worker mistake.');

  const appealResults = [
    { index:0, choice:'آمن', acceptedAsReasonable:true, pending:false, reviewRejected:false, disputed:false },
    { index:3, choice:'غير واضح', acceptedAsReasonable:true, pending:false, reviewRejected:true, disputed:true }
  ];
  await loadState(page, { scene: 'annotationReview', flags: { annotationResults: appealResults } });
  await page.getByText('رفض قابل للنزاع', { exact: true }).waitFor({ state: 'visible' });
  await click(page, '#appeal');
  state = await savedState(page);
  if (state.flags.annotationUnpaidMinutes !== 4) throw new Error('Appeal must add four unpaid minutes even when the reviewer dispute is defensible.');

  await loadState(page, { scene: 'trainingSetup', flags: {
    dataStatuses: ['ready','pending','excluded','ready','pending'],
    annotationResults: [
      { index:0, choice:'آمن', acceptedAsReasonable:true, pending:false, reviewRejected:false, disputed:false },
      { index:5, choice:'غير واضح', acceptedAsReasonable:true, pending:true, reviewRejected:false, disputed:false },
      { index:3, choice:'غير واضح', acceptedAsReasonable:true, pending:false, reviewRejected:true, disputed:true }
    ]
  } });
  const precisionTrainingInput = await selectedOptionText(page, '.config-panel select');
  if (!precisionTrainingInput.includes('2 مواد جاهزة') || !precisionTrainingInput.includes('مثال بشري مؤكد واحد')) throw new Error('Training configuration includes pending/excluded/rejected material as confirmed input.');
  await page.getByText('حالة معلقة واحدة', { exact: false }).waitFor({ state: 'visible' });
  await page.getByText('1 مرفوضة خارج المدخل المؤكد', { exact: false }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'evalTask', flags: { evalIndex: 1 } });
  await page.getByText(DEMO_PROMPT, { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('هذا هو الطلب الذي بدأت به اللعبة.', { exact: true }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'launchDecision', flags: { safetyChoice:'details', safetyRemediated:true, safetyRetested:false, trainingCheckpoint:'recent', trainingCompute:'8', trainingIncidentChoice:'continue' } });
  await page.getByRole('heading', { name: 'أُصلح السلوك وأصبحت النسخة أمام اختبار البوابة من جديد.', exact: true }).waitFor({ state: 'visible' });

  await loadState(page, { scene: 'launchDecision', flags: { safetyChoice:'details', safetyRemediated:true, safetyRetested:true, trainingCheckpoint:'recent', trainingCompute:'8', trainingIncidentChoice:'continue' } });
  if (await page.locator('.verification-bundles .card').count() !== 2) throw new Error('Only checkpoint and stability bundles should remain after mandatory safety retest.');
  if (await page.locator('.verification-bundles').getByText('السلامة', { exact: false }).count()) throw new Error('Safety retest must not reappear in remaining launch bundles.');

  await loadState(page, { scene: 'launchDecision', flags: { safetyChoice:'details', safetyRemediated:true, safetyRetested:true, trainingCheckpoint:'validated', trainingCompute:'12', trainingIncidentChoice:'pause' } });
  await page.locator('#launchReady').waitFor({ state: 'visible' });
  if (await page.locator('.verification-bundles .card').count()) throw new Error('A path with no causal follow-up work should not invent verification bundles.');

  await loadState(page, { scene: 'factoryMonitor' });
  const numericDirection = await page.getByText('+12 Pa').evaluate(element => getComputedStyle(element).direction);
  const arabicDirection = await page.getByText('ضمن النطاق').evaluate(element => getComputedStyle(element).direction);
  if (numericDirection !== 'ltr') throw new Error(`Numeric monitor value should resolve LTR, got ${numericDirection}.`);
  if (arabicDirection !== 'rtl') throw new Error(`Arabic monitor value should resolve RTL, got ${arabicDirection}.`);

  await loadState(page, { scene: 'trainingSetup' });
  const rtlDirection = await page.locator('.training-log').evaluate(element => getComputedStyle(element).direction);
  if (rtlDirection !== 'rtl') throw new Error(`Training summary should resolve RTL, got ${rtlDirection}.`);

  await loadState(page, { scene: 'dcWorkers' });
  const avatars = page.locator('.worker-person__avatar');
  if (await avatars.count() !== 6) throw new Error('All datacenter supporting roles need a visual human representation.');
  const sources = await avatars.evaluateAll(images => images.map(image => image.getAttribute('src')));
  if (new Set(sources).size !== 6) throw new Error('Datacenter supporting roles need distinct visual portraits.');

  await loadState(page, { scene: 'zoomOut' }, { ...DEFAULT_SETTINGS, reduceMotion: true });
  const staticGlyph = await page.locator('.glyph').textContent();
  await page.waitForTimeout(450);
  if (staticGlyph !== '◇' || (await page.locator('.glyph').textContent()) !== '◇') throw new Error('Reduced motion should skip the JavaScript glyph animation entirely.');

  await loadState(page, { scene: 'ch1Intro' }, { ...DEFAULT_SETTINGS, highContrast: true, largeText: true, reduceMotion: true });
  if (!await page.locator('body').evaluate(body => body.classList.contains('high-contrast') && body.classList.contains('large-text'))) throw new Error('Accessibility display settings did not apply together.');
  await page.getByText('كيف تنفذها؟', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText('عرض خريطة المراحل الثماني', { exact: true }).waitFor({ state: 'attached' });

  if (Object.hasOwn(state, 'metrics')) throw new Error('Hidden metrics returned to state.');
  await browser.close();
  console.log('Tradeoff, causality, flow, RTL, visual-role, and accessibility checks passed.');
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390');
await runPrecisionChecks();
console.log('All smoke tests passed.');
