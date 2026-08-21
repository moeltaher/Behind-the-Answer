function chapterLabel(chapter) {
  return chapter.shortTitle || chapter.title;
}

function miniMap(ctx, currentIndex) {
  return ctx.chapters.map((chapter, index) => {
    const stateClass = index === currentIndex ? 'current' : index < currentIndex ? 'done' : '';
    return `<span class="mini-node ${stateClass}" title="${ctx.h(chapter.title)}"><span aria-hidden="true">${chapter.icon}</span><small>${ctx.h(chapterLabel(chapter))}</small></span>`;
  }).join('');
}

export function setChapter(ctx, index) {
  const { state, progressEl, ledgerBtn, persistentFooter, chapterLabel: chapterLabelEl, chapterTitle, progressFill, chapters, saveState } = ctx;
  state.chapter = index;
  const miniJourney = ctx.$('#miniJourney');

  if (index >= 0) {
    progressEl.hidden = false;
    ledgerBtn.hidden = false;
    persistentFooter.hidden = false;
    chapterLabelEl.textContent = `المرحلة ${index + 1} من ${chapters.length}`;
    chapterTitle.textContent = chapterLabel(chapters[index]);
    progressFill.style.width = `${((index + 1) / chapters.length) * 100}%`;
    if (miniJourney) miniJourney.innerHTML = miniMap(ctx, index);
  } else {
    progressEl.hidden = true;
    ledgerBtn.hidden = true;
    persistentFooter.hidden = true;
    if (miniJourney) miniJourney.innerHTML = '';
  }
  saveState();
}

function journeyMap(ctx, currentIndex) {
  return `<div class="journey-map" aria-label="خريطة رحلة الإجابة">${ctx.chapters.map((chapter, index) => {
    const stateClass = index === currentIndex ? 'current' : index < currentIndex ? 'done' : '';
    return `<div class="journey-node ${stateClass}"><span class="journey-icon" aria-hidden="true">${chapter.icon}</span><small>${ctx.h(chapterLabel(chapter))}</small></div>`;
  }).join('')}</div>`;
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

export function chapterIntro(ctx, index, _title, _subtitle, next) {
  const chapter = ctx.chapters[index];
  ctx.setChapter(index);

  ctx.html(`<div class="learning-intro"><div><span class="chapter-theme">${chapter.icon} المرحلة ${index + 1} من ${ctx.chapters.length}</span><h1 class="display-title">${ctx.h(chapter.title)}</h1><p class="scene-subtitle">يكفي أن تعرف أين نحن، لماذا تهم هذه المرحلة، ومن يعمل فيها. التفاصيل الإضافية اختيارية.</p></div>${terminology(index)}<div class="learning-grid learning-grid--essential">${learningCard('أين نحن؟', ctx.h(chapter.where))}${learningCard('ما علاقتها بالإجابة؟', ctx.h(chapter.link))}${learningCard('من يعمل هنا؟', ctx.h(chapter.workers))}</div><details class="learning-more"><summary>اعرف أكثر عن هذه المرحلة</summary>${learningCard('ماذا يحدث هنا؟', ctx.h(chapter.what))}<div class="stage-output"><strong>ما الذي سنخرج به؟</strong>${ctx.h(chapter.output)}</div><div class="reality-note"><strong>ملاحظة عن الواقع</strong><p>تختلف الشركات والبلدان والتقنيات من سلسلة إلى أخرى؛ اللعبة تمثل نوع المرحلة لا موردًا أو شركة بعينها.</p></div><details class="journey-map-details"><summary>عرض خريطة المراحل التسع</summary>${journeyMap(ctx, index)}</details></details><div class="journey-link"><strong>اربطها بطلبك:</strong> إجابتك ما زالت تنتظر. هذه المرحلة تبني جزءًا تحتاجه المراحل التالية.</div><div class="action-row"><button id="chapterNext" class="primary-btn">ابدأ هذه المرحلة</button></div></div>`);

  ctx.$('#chapterNext').addEventListener('click', () => ctx.go(next));
}
