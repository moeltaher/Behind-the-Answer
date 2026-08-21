import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:4173';

async function click(page, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: 'visible' });
  await target.click();
}

async function chooseData(page, choice) {
  await click(page, `[data-sort="${choice}"]`);
}

async function chooseAnnotation(page, label) {
  await click(page, `[data-tag="${label}"]`);
}

async function runJourney(viewport, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('behindTheAnswerSettings_v1', JSON.stringify({
      reduceMotion: true,
      highContrast: false,
      largeText: false,
      soundOn: false
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });

  // المقدمة
  await click(page, '#introSend');
  await click(page, '#why');
  await click(page, '#descend');

  // 1. المواد
  await click(page, '#chapterNext');
  await click(page, '#startMine');
  await click(page, '[data-yield="2"]');
  await click(page, '[data-yield="2"]');
  await click(page, '[data-yield="2"]');
  await click(page, '#mineStop');
  await click(page, '#finishMine');
  await click(page, '#mineTransport');
  await click(page, '#mineAbstract');
  await click(page, '#abstractNext');

  // 2. المصنع
  await click(page, '#chapterNext');
  for (const ppe of ['hair', 'mask', 'gloves', 'suit']) {
    await click(page, `[data-ppe="${ppe}"]`);
  }
  await click(page, '#enterFab');
  await click(page, '#observeFab');
  await click(page, '#fabStop');
  await click(page, '#chipsDone');
  await click(page, '#abstractNext');
  await click(page, '#toCh3');

  // 3. مركز البيانات
  await click(page, '#chapterNext');
  for (const step of ['rack', 'power', 'network', 'register']) {
    await click(page, `[data-server-step="${step}"]`);
  }
  await click(page, '#bootServer');
  await click(page, '#dcStop');
  for (const worker of ['clean', 'electric', 'security']) {
    await click(page, `[data-worker="${worker}"]`);
  }
  await click(page, '#dcReady');
  await click(page, '#abstractNext');

  // 4. البيانات
  await click(page, '#chapterNext');
  await click(page, '#toClean');
  for (const choice of ['remove', 'keep', 'remove', 'review', 'review', 'remove', 'review', 'review']) {
    await chooseData(page, choice);
  }
  await click(page, '#dataAbstract');
  await click(page, '#abstractNext');

  // 5. التصنيف البشري
  await click(page, '#chapterNext');
  await click(page, '#startAnnot');
  const labels = [
    'آمن',
    'عنف',
    'مضايقة أو إساءة',
    'غير واضح',
    'عنف',
    'خطاب كراهية',
    'غير واضح',
    'آمن',
    'غير واضح'
  ];
  for (let index = 0; index < labels.length; index += 1) {
    if (index === 5) await click(page, '#takeBreak');
    await chooseAnnotation(page, labels[index]);
  }
  await click(page, '#appeal');
  await click(page, '#annotAbstract');
  await click(page, '#abstractNext');

  // 6. التدريب
  await click(page, '#chapterNext');
  await click(page, '#trainStart');
  await click(page, '#trainPause');
  await click(page, '#sendHuman');

  // 7. التقييم
  await click(page, '#chapterNext');
  for (const choice of ['a', 'b', 'a']) {
    await click(page, `[data-eval="${choice}"]`);
    await click(page, '#nextEval');
  }
  await click(page, '[data-safety="details"]');
  await click(page, '#toLaunch');
  await click(page, '#delayLaunch');
  await click(page, '#finishEval');
  await click(page, '#abstractNext');

  // 8. تشغيل الخدمة
  await click(page, '#chapterNext');
  await click(page, '#testLoad');
  for (const tab of ['network', 'compute', 'model']) {
    await click(page, `[data-tab="${tab}"]`);
  }
  await click(page, '#rollback');
  await click(page, '#toSupport');
  for (let index = 0; index < 3; index += 1) {
    await click(page, '#supportGood');
  }
  await click(page, '#uptimeAbstract');
  await click(page, '#abstractNext');

  // 9. من الطلب إلى الإجابة
  await click(page, '#chapterNext');
  await click(page, '#compressAI');
  await click(page, '#backPrompt');
  await page.getByText('أثر رحلتك على هذه النسخة').waitFor({ state: 'visible' });
  await click(page, '#behindAnswer');
  await click(page, '#showPeople');
  await click(page, '#showResults');
  await page.getByText('نتيجة متعددة الأبعاد').waitFor({ state: 'visible' });
  await page.getByText(/استكشافك للعبة:/).waitFor({ state: 'visible' });
  await click(page, '#toFinalMessage');
  await page.getByText('الواجهة هي نهاية السلسلة، وليست بدايتها.').first().waitFor({ state: 'visible' });

  if (pageErrors.length) {
    throw new Error(`${label}: page errors: ${pageErrors.join(' | ')}`);
  }

  await browser.close();
  console.log(`Smoke journey passed: ${label}`);
}

await runJourney({ width: 1280, height: 900 }, 'desktop');
await runJourney({ width: 390, height: 844 }, 'mobile-390x844');
