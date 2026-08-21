import { STAGE_TASKS } from '../data/stage-tasks.js';
import { taskPanel } from './task-flow.js';

function chapterLabel(chapter) {
  return chapter.shortTitle || chapter.title;
}

function miniMap(ctx, currentIndex) {
  return ctx.chapters.map((chapter, index) => {
    const stateClass = index === currentIndex ? 'current' : index < currentIndex ? 'done' : '';
    return `<span class="mini-node ${stateClass}" title="${ctx.h(chapter.title)}"><span aria-hidden="true">${chapter.icon}</span><small>${ctx.h(chapterLabel(chapter))}</small></span>`;
  }).join('');
}

export function renderJourneyProgress(ctx, index) {
  const { progressEl, ledgerBtn, persistentFooter, chapterLabel: chapterLabelEl, chapterTitle, progressFill, chapters } = ctx;
  const miniJourney = ctx.$('#miniJourney');

  persistentFooter.hidden = true;
  if (index >= 0) {
    progressEl.hidden = false;
    ledgerBtn.hidden = false;
    chapterLabelEl.textContent = `المرحلة ${index + 1} من ${chapters.length}`;
    chapterTitle.textContent = chapterLabel(chapters[index]);
    progressFill.style.width = `${((index + 1) / chapters.length) * 100}%`;
    if (miniJourney) miniJourney.innerHTML = miniMap(ctx, index);
    return;
  }

  progressEl.hidden = true;
  ledgerBtn.hidden = true;
  if (miniJourney) miniJourney.innerHTML = '';
}

function journeyMap(ctx, currentIndex) {
  const nodes = ctx.chapters.map((chapter, index) => {
    const stateClass = index === currentIndex ? 'current' : index < currentIndex ? 'done' : '';
    return `<div class="journey-node ${stateClass}"><span class="journey-icon" aria-hidden="true">${chapter.icon}</span><small>${ctx.h(chapterLabel(chapter))}</small></div>`;
  }).join('');
  return `<div class="journey-map" aria-label="خريطة رحلة الإجابة">${nodes}</div>`;
}

function terminology(index) {
  const definitions = {
    0: ['النموذج', 'برنامج رياضي يتعلم أنماطًا من كميات كبيرة من البيانات، ثم يستخدم ما تعلمه لإنتاج نتائج جديدة.'],
    1: ['الرقاقة الإلكترونية', 'قطعة صغيرة تحتوي على دوائر دقيقة تنفذ العمليات الحسابية داخل الحواسيب والخوادم.'],
    2: ['الخادم', 'حاسوب قوي مخصص لتشغيل خدمات وبرامج باستمرار، وتوجد أعداد كبيرة منه داخل مراكز البيانات.'],
    5: ['تدريب النموذج', 'عملية تعرض فيها أمثلة كثيرة على النموذج وتُعدَّل قيمه الداخلية تدريجيًا حتى يتحسن.']
  };
  if (!definitions[index]) return '';
  const [title, text] = definitions[index];
  return `<div class="learning-card term-card"><h3>مصطلح مهم: ${title}</h3><p>${text}</p></div>`;
}

function learningCard(title, text) {
  return `<div class="learning-card"><h3>${title}</h3><p>${text}</p></div>`;
}

export function chapterIntro(ctx, index, next) {
  const chapter = ctx.chapters[index];
  const task = STAGE_TASKS[chapter.key];
  ctx.html(`<div class="learning-intro"><div><span class="chapter-theme">${chapter.icon} المرحلة ${index + 1} من ${ctx.chapters.length}</span><h1 class="display-title">${ctx.h(chapter.title)}</h1><p class="scene-subtitle">تعرف على المكان والدور والمهمة، ثم ابدأ. التفاصيل الإضافية اختيارية.</p></div>${taskPanel(task, { status: 'active', progress: 'تبدأ المهمة بعد الضغط على الزر أدناه' })}${terminology(index)}<div class="learning-grid learning-grid--essential">${learningCard('أين نحن؟', ctx.h(chapter.where))}${learningCard('ما علاقتها بالإجابة؟', ctx.h(chapter.link))}${learningCard('من يعمل هنا؟', ctx.h(chapter.workers))}</div><details class="learning-more"><summary>اعرف أكثر عن هذه المرحلة</summary>${learningCard('ماذا يحدث هنا؟', ctx.h(chapter.what))}<div class="stage-output"><strong>ما الذي سنخرج به؟</strong>${ctx.h(chapter.output)}</div><details class="journey-map-details"><summary>عرض خريطة المراحل التسع</summary>${journeyMap(ctx, index)}</details></details><div class="action-row"><button id="chapterNext" class="primary-btn">ابدأ المهمة</button></div></div>`);
  ctx.$('#chapterNext').addEventListener('click', () => ctx.go(next));
}
