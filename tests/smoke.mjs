import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:4173';

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

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('behindTheAnswerSettings_v1', JSON.stringify({ reduceMotion: true, highContrast: false, largeText: false, soundOn: false }));
  });
  await page.reload({ waitUntil: 'networkidle' });

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

  // 5. التصنيف البشري
  await expectTask(page); await click(page, '#chapterNext'); await expectTask(page); await expectActors(page); await click(page, '#startAnnot');
  const labels = ['آمن','عنف','مضايقة أو إساءة','غير واضح','عنف','خطاب كراهية','غير واضح','آمن','غير واضح'];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 5) await click(page, '#takeBreak');
    await expectDecision(page); await chooseAnnotation(page, labels[index]);
  }
  await expectDecision(page, { incident: true }); await expectActors(page); await click(page, '#appeal');
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
  await click(page, '#backPrompt'); await page.getByText('أثر رحلتك على هذه النسخة').waitFor({ state: 'visible' });
  await click(page, '#behindAnswer'); await click(page, '#showPeople'); await expectActors(page); await click(page, '#showResults');
  await page.getByText('نتيجة متعددة الأبعاد').waitFor({ state: 'visible' });
  await page.getByText('✓ المهمة مكتملة').first().waitFor({ state: 'visible' });
  await page.getByText(/استكشافك للعبة:/).waitFor({ state: 'visible' });
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

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390x844');
