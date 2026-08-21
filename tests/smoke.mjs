import { chromium } from 'playwright';
import { DEFAULT_STATE, clone } from '../js/core/state.js';
import {
  STORAGE_KEY,
  SETTINGS_KEY,
  DEFAULT_SETTINGS
} from '../js/core/storage.js';

const BASE_URL = 'http://127.0.0.1:4173';
const SETTINGS = { ...DEFAULT_SETTINGS, reduceMotion: true };

async function click(page, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: 'visible' });
  await target.click();
}

async function expectTask(page) {
  await page.locator('[data-task-panel]').first().waitFor({ state: 'visible' });
  await page.getByText('مهمتك الآن').first().waitFor({ state: 'visible' });
}

async function expectDecision(page, { incident = false } = {}) {
  if (incident) await page.locator('[data-task-event]').first().waitFor({ state: 'visible' });
  await page.locator('[data-decision-required]').first().waitFor({ state: 'visible' });
  await page.getByText('يجب اختيار أحد الخيارات التالية للمتابعة.').first().waitFor({ state: 'visible' });
}

async function expectActors(page) {
  const strip = page.locator('[data-actor-strip]').first();
  await strip.waitFor({ state: 'visible' });
  const images = strip.locator('img');
  if (await images.count() < 1) throw new Error('Actor strip has no visual actor image.');
  const src = await images.first().getAttribute('src');
  if (!src || !src.includes('assets/images/characters/')) throw new Error(`Unexpected actor image source: ${src}`);
}

async function chooseData(page, choice) { await click(page, `[data-sort="${choice}"]`); }
async function chooseAnnotation(page, label) { await click(page, `[data-tag="${label}"]`); }

function currentState(patch = {}) {
  const state = clone(DEFAULT_STATE);

  function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merge(target[key], value);
      } else {
        target[key] = value;
      }
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

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await loadState(page);

  // المقدمة
  await click(page, '#introSend');
  await click(page, '#why');
  await click(page, '#descend');

  // 1. المواد
  await expectTask(page); await click(page, '#chapterNext');
  await expectTask(page); await expectActors(page); await click(page, '#startMine');
  await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]'); await click(page, '[data-yield="2"]');
  await expectDecision(page, { incident: true }); await expectActors(page); await click(page, '#mineStop');
  await page.locator('[data-task-outcome]').waitFor({ state: 'visible' }); await click(page, '#finishMine');
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' });
  await click(page, '#mineTransport'); await expectActors(page); await click(page, '#mineAbstract'); await click(page, '#abstractNext');

  // 2. المصنع
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page);
  for (const ppe of ['hair', 'mask', 'gloves', 'suit']) await click(page, `[data-ppe="${ppe}"]`);
  await click(page, '#enterFab'); await click(page, '#observeFab');
  await expectDecision(page, { incident: true }); await expectActors(page); await click(page, '#fabStop');
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' });
  await click(page, '#chipsDone'); await click(page, '#abstractNext'); await click(page, '#toCh3');

  // 3. مركز البيانات
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page);
  for (const step of ['rack', 'power', 'network', 'register']) await click(page, `[data-server-step="${step}"]`);
  await click(page, '#bootServer'); await expectDecision(page, { incident: true }); await expectActors(page); await click(page, '#dcStop');
  await expectActors(page);
  for (const worker of ['clean', 'electric', 'security']) await click(page, `[data-worker="${worker}"]`);
  await click(page, '#dcReady'); await click(page, '#abstractNext');

  // 4. البيانات
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page); await click(page, '#toClean');
  for (const choice of ['remove', 'keep', 'remove', 'review', 'review', 'remove', 'review', 'review']) {
    await expectDecision(page); await chooseData(page, choice);
  }
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' });
  await click(page, '#dataAbstract'); await click(page, '#abstractNext');

  // 5. التصنيف البشري — مسار بلا رفض مصطنع
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page); await click(page, '#startAnnot');
  const labels = ['آمن','عنف','مضايقة أو إساءة','غير واضح','عنف','خطاب كراهية','غير واضح','آمن','غير واضح'];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 5) await click(page, '#takeBreak');
    await expectDecision(page); await chooseAnnotation(page, labels[index]);
  }
  await page.getByText('لم يرفض المراجع أي مهمة في هذه الجولة.').waitFor({ state: 'visible' });
  if (await page.locator('#appeal').count()) throw new Error(`${label}: appeal should not exist when no task was rejected.`);
  await click(page, '#closeShift');
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' });
  await click(page, '#annotAbstract'); await click(page, '#abstractNext');

  // 6. التدريب
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page); await click(page, '#trainStart');
  await expectDecision(page, { incident: true }); await expectActors(page); await click(page, '#trainPause');
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' }); await click(page, '#sendHuman');

  // 7. التقييم
  await expectTask(page); await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'a']) { await expectTask(page); await expectDecision(page); await click(page, `[data-eval="${choice}"]`); await click(page, '#nextEval'); }
  await expectDecision(page); await expectActors(page); await click(page, '[data-safety="details"]');
  await page.locator('[data-task-outcome]').waitFor({ state: 'visible' }); await click(page, '#toLaunch');
  await expectDecision(page, { incident: true }); await expectActors(page); await click(page, '#delayLaunch');
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' }); await click(page, '#finishEval'); await click(page, '#abstractNext');

  // 8. تشغيل الخدمة
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page); await click(page, '#testLoad');
  await page.locator('[data-task-event]').waitFor({ state: 'visible' });
  for (const tab of ['network', 'compute', 'model']) await click(page, `[data-tab="${tab}"]`);
  await expectDecision(page, { incident: true }); await click(page, '#rollback');
  await page.locator('[data-task-outcome]').waitFor({ state: 'visible' }); await expectActors(page); await click(page, '#toSupport');
  for (let index = 0; index < 3; index += 1) { await expectDecision(page); await expectActors(page); await click(page, '#supportGood'); }
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' }); await click(page, '#uptimeAbstract'); await click(page, '#abstractNext');

  // 9. من الطلب إلى الإجابة
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await click(page, '#compressAI');
  await click(page, '#backPrompt'); await page.getByText('أثر اختيارات النموذج على هذه النسخة').waitFor({ state: 'visible' });
  await click(page, '#behindAnswer'); await click(page, '#showPeople'); await expectActors(page); await click(page, '#showResults');
  await page.getByText('نتيجة متعددة الأبعاد').waitFor({ state: 'visible' });
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' });
  await page.getByText(/استكشافك الاختياري:/).waitFor({ state: 'visible' });
  await page.getByText('جودة البيانات').first().waitFor({ state: 'visible' });
  await page.getByText('جودة النموذج').first().waitFor({ state: 'visible' });
  await page.getByText('موثوقية البنية والخدمة').first().waitFor({ state: 'visible' });
  await page.getByText('جودة دعم المستخدم').first().waitFor({ state: 'visible' });
  await click(page, '#toFinalMessage'); await page.getByText('الواجهة هي نهاية السلسلة، وليست بدايتها.').first().waitFor({ state: 'visible' });

  if (viewport.width <= 390) {
    const task = page.locator('[data-task-panel]').first();
    const position = await task.evaluate(element => getComputedStyle(element).position);
    if (position !== 'sticky') throw new Error(`${label}: mobile task panel is not sticky.`);
  }

  if (pageErrors.length) throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`Smoke journey passed with task guidance: ${label}`);
}

async function runBranchAndResumeChecks() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // معرف مشهد غير صالح يعود إلى البداية بدل إبقاء حالة غير قابلة للرسم.
  await loadState(page, { scene: 'removedScene' });
  await page.locator('#introSend').waitFor({ state: 'visible' });

  // التعدين: المسار البديل للاستمرار بعد التحذير.
  await loadState(page, { scene: 'mineTask', flags: { miningCount: 6, miningWarning: true } });
  await expectDecision(page, { incident: true });
  await click(page, '#mineContinue');
  await page.getByText('لم يحدث').waitFor({ state: 'visible' });

  // المصنع: المسار البديل يجب أن يبقى بعد إعادة التحميل.
  await loadState(page, { scene: 'factoryIncident', flags: { factoryPPE: ['hair','mask','gloves','suit'] } });
  await click(page, '#fabContinue');
  await page.getByText('88%').waitFor({ state: 'visible' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('88%').waitFor({ state: 'visible' });

  // مركز البيانات: نقل الحمل بديل صالح عن الإيقاف.
  await loadState(page, { scene: 'dcCooling', flags: { serverSteps: ['rack','power','network','register'] } });
  await click(page, '#dcMove');
  await page.getByText('مركز البيانات لا يعمل بفني خوادم واحد.').waitFor({ state: 'visible' });

  // التصنيف: الرفض والأجر يعكسان الاختيارات الفعلية.
  await loadState(page, {
    scene: 'annotationReview',
    flags: {
      annotationResults: [
        { index: 0, choice: 'عنف', acceptedAsReasonable: false, pending: false },
        { index: 1, choice: 'عنف', acceptedAsReasonable: true, pending: false }
      ]
    }
  });
  await page.getByText('مهمة واحدة مرفوضة', { exact: false }).first().waitFor({ state: 'visible' });
  await page.getByText('مقبولة: 1').waitFor({ state: 'visible' });
  await expectDecision(page, { incident: true });
  await click(page, '#skipAppeal');
  await page.getByText('مدفوعة بعد المراجعة').waitFor({ state: 'visible' });
  await page.getByText('0.08 وحدة').waitFor({ state: 'visible' });

  // جولة صحيحة بالكامل لا تنشئ رفضًا أو اعتراضًا.
  await loadState(page, {
    scene: 'annotationReview',
    flags: {
      annotationResults: [
        { index: 0, choice: 'آمن', acceptedAsReasonable: true, pending: false },
        { index: 1, choice: 'عنف', acceptedAsReasonable: true, pending: false }
      ]
    }
  });
  await page.getByText('لم يرفض المراجع أي مهمة في هذه الجولة.').waitFor({ state: 'visible' });
  if (await page.locator('#appeal').count()) throw new Error('Perfect annotation review unexpectedly exposes appeal action.');

  // التدريب: 8 مجموعات + نقطة أحدث + الاستمرار بقدرة أقل.
  await loadState(page, { scene: 'trainingSetup' });
  await page.selectOption('#computeSel', '8');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await page.getByText('7/8').waitFor({ state: 'visible' });
  await click(page, '#trainContinue');
  await page.getByText('استمرت الجولة بسعة أقل حتى النهاية', { exact: false }).waitFor({ state: 'visible' });

  // الإطلاق: المسار السريع يعمل ويؤثر في الموثوقية لا جودة النموذج.
  await loadState(page, { scene: 'launchDecision' });
  await click(page, '#criticalOnly');
  await page.getByText('تم الإطلاق في الموعد بعد إكمال الاختبارات الحرجة.').waitFor({ state: 'visible' });

  // التشغيل: إعادة التشغيل مسار بديل صالح للعودة إلى إصدار سابق.
  await loadState(page, { scene: 'deployIncident', flags: { deployTabs: ['network','compute','model'] } });
  await click(page, '#restartInst');
  await page.getByText('بإعادة تشغيل الوحدات المتأثرة', { exact: false }).waitFor({ state: 'visible' });

  // فصل السببية: تغيير موثوقية البنية وحدها لا يغير نص إجابة النموذج.
  const baseMetrics = {
    pressure: 50,
    cost: 50,
    burden: 42,
    dataQuality: 62,
    modelQuality: 62,
    reliability: 10,
    serviceQuality: 62
  };
  await loadState(page, { scene: 'finalAnswer', metrics: baseMetrics });
  const lowReliabilityAnswer = await page.locator('.message.ai').innerText();
  await loadState(page, { scene: 'finalAnswer', metrics: { ...baseMetrics, reliability: 95 } });
  const highReliabilityAnswer = await page.locator('.message.ai').innerText();
  if (lowReliabilityAnswer !== highReliabilityAnswer) {
    throw new Error('Infrastructure reliability changed model answer text despite identical modelQuality.');
  }

  if (pageErrors.length) throw new Error(`branch/resume page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log('Alternate branches, annotation accounting, causal metrics, and current-state persistence passed.');
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390x844');
await runBranchAndResumeChecks();
