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
  if (persistentFooter) persistentFooter.hidden = true;
  if (index >= 0) {
    if (progressEl) progressEl.hidden = false;
    if (ledgerBtn) ledgerBtn.hidden = false;
    if (chapterLabelEl) chapterLabelEl.textContent = `المرحلة ${index + 1} من ${chapters.length}`;
    if (chapterTitle) chapterTitle.textContent = chapterLabel(chapters[index]);
    if (progressFill) progressFill.style.width = `${((index + 1) / chapters.length) * 100}%`;
    if (miniJourney) miniJourney.innerHTML = miniMap(ctx, index);
    return;
  }
  if (progressEl) progressEl.hidden = true;
  if (ledgerBtn) ledgerBtn.hidden = true;
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
    0: ['النموذج', 'برنامج رياضي يتعلم أنماطًا من كميات كبيرة من البيانات ثم يستخدم ما تعلمه لإنتاج نتائج جديدة.'],
    1: ['الرقاقة الإلكترونية', 'قطعة تحتوي على دوائر دقيقة تنفذ عمليات حسابية داخل الحواسيب والخوادم.'],
    2: ['الخادم', 'حاسوب مخصص لتشغيل أحمال وخدمات باستمرار داخل بنية أكبر من الطاقة والشبكات والتبريد.'],
    5: ['التدريب الإضافي', 'جولة تطوير تبدأ هنا من نسخة سابقة للنموذج؛ وهي ليست تدريبًا كاملًا من الصفر.']
  };
  if (!definitions[index]) return '';
  const [title, text] = definitions[index];
  return `<p class="chapter-term"><strong>${title}:</strong> ${text}</p>`;
}

export function chapterIntro(ctx, index, next) {
  const chapter = ctx.chapters[index];
  const task = STAGE_TASKS[chapter.key];
  ctx.html(`<div class="learning-intro compact-intro"><div><span class="chapter-theme">${chapter.icon} المرحلة ${index + 1} من ${ctx.chapters.length}</span><h1 class="display-title">${ctx.h(chapter.title)}</h1><p class="chapter-link-line">${ctx.h(chapter.link)}</p></div>${taskPanel(task,{status:'active',progress:'ابدأ المهمة بالزر أدناه',compact:true})}<details class="learning-more"><summary>المكان، العاملون، والتفاصيل التقنية</summary><p><strong>المكان:</strong> ${ctx.h(chapter.where)}</p><p><strong>من يعمل هنا؟</strong> ${ctx.h(chapter.workers)}</p>${terminology(index)}<p>${ctx.h(chapter.what)}</p><div class="stage-output"><strong>الناتج الذي سينتقل معنا</strong>${ctx.h(chapter.output)}</div><details class="journey-map-details"><summary>عرض خريطة المراحل التسع</summary>${journeyMap(ctx,index)}</details></details><div class="action-row"><button id="chapterNext" class="primary-btn">ابدأ المهمة</button></div></div>`);
  ctx.$('#chapterNext')?.addEventListener('click', () => ctx.go(next));
}
