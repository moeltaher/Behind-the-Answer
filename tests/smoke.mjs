import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:4173';
const SETTINGS = { reduceMotion: true, highContrast: false, largeText: false, soundOn: false };

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

async function loadState(page, savedState) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(({ settings, state }) => {
    localStorage.clear();
    localStorage.setItem('behindTheAnswerSettings_v1', JSON.stringify(settings));
    if (state) localStorage.setItem('behindTheAnswerGame_v1', JSON.stringify(state));
  }, { settings: SETTINGS, state: savedState });
  await page.reload({ waitUntil: 'networkidle' });
}

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await loadState(page, null);

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

  // حفظ قديم بمشهد لم يعد موجودًا يجب أن يعود إلى البداية بدل حالة هجينة.
  await loadState(page, { scene: 'removedScene', chapter: 4 });
  await page.locator('#introSend').waitFor({ state: 'visible' });

  // التعدين: المسار البديل للاستمرار بعد التحذير.
  await loadState(page, { scene: 'mineTask', chapter: 0, flags: { miningCount: 6, miningWarning: true } });
  await expectDecision(page, { incident: true });
  await click(page, '#mineContinue');
  await page.getByText('لم يحدث').waitFor({ state: 'visible' });

  // المصنع: المسار البديل يجب أن يبقى بعد إعادة التحميل.
  await loadState(page, { scene: 'factoryIncident', chapter: 1, flags: { factoryPPE: ['hair','mask','gloves','suit'] } });
  await click(page, '#fabContinue');
  await page.getByText('88%').waitFor({ state: 'visible' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('88%').waitFor({ state: 'visible' });

  // مركز البيانات: نقل الحمل بديل صالح عن الإيقاف.
  await loadState(page, { scene: 'dcCooling', chapter: 2, flags: { serverSteps: ['rack','power','network','register'] } });
  await click(page, '#dcMove');
  await page.getByText('مركز البيانات لا يعمل بفني خوادم واحد.').waitFor({ state: 'visible' });

  // التصنيف: الرفض والأجر يعكسان الاختيارات الفعلية.
  await loadState(page, {
    scene: 'annotationReview',
    chapter: 4,
    flags: {
      annotationIndex: 2,
      annotationAnswered: 2,
      annotationCorrect: 1,
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
    chapter: 4,
    flags: {
      annotationIndex: 2,
      annotationAnswered: 2,
      annotationCorrect: 2,
      annotationResults: [
        { index: 0, choice: 'آمن', acceptedAsReasonable: true, pending: false },
        { index: 1, choice: 'عنف', acceptedAsReasonable: true, pending: false }
      ]
    }
  });
  await page.getByText('لم يرفض المراجع أي مهمة في هذه الجولة.').waitFor({ state: 'visible' });
  if (await page.locator('#appeal').count()) throw new Error('Perfect annotation review unexpectedly exposes appeal action.');

  // التدريب: 8 مجموعات + نقطة أحدث + الاستمرار بقدرة أقل.
  await loadState(page, { scene: 'trainingSetup', chapter: 5 });
  await page.selectOption('#computeSel', '8');
  await page.selectOption('#checkpointSel', 'recent');
  await click(page, '#trainStart');
  await page.getByText('7/8').waitFor({ state: 'visible' });
  await click(page, '#trainContinue');
  await page.getByText('استمرت الجولة بسعة أقل حتى النهاية', { exact: false }).waitFor({ state: 'visible' });

  // الإطلاق: المسار السريع يعمل ويؤثر في الموثوقية لا جودة النموذج.
  await loadState(page, { scene: 'launchDecision', chapter: 6 });
  await click(page, '#criticalOnly');
  await page.getByText('تم الإطلاق في الموعد بعد إكمال الاختبارات الحرجة.').waitFor({ state: 'visible' });

  // التشغيل: إعادة التشغيل مسار بديل صالح للـ rollback.
  await loadState(page, { scene: 'deployIncident', chapter: 7, flags: { deployTabs: ['network','compute','model'] } });
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
  await loadState(page, { scene: 'finalAnswer', chapter: 8, metrics: baseMetrics });
  const lowReliabilityAnswer = await page.locator('.message.ai').innerText();
  await loadState(page, { scene: 'finalAnswer', chapter: 8, metrics: { ...baseMetrics, reliability: 95 } });
  const highReliabilityAnswer = await page.locator('.message.ai').innerText();
  if (lowReliabilityAnswer !== highReliabilityAnswer) {
    throw new Error('Infrastructure reliability changed model answer text despite identical modelQuality.');
  }

  if (pageErrors.length) throw new Error(`branch/resume page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log('Alternate branches, annotation accounting, causal metrics, and saved-state recovery passed.');
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390x844');
await runBranchAndResumeChecks();
