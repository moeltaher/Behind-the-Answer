function chapterLabel(chapter) {
  return chapter.shortTitle || chapter.title;
}

function miniMap(ctx, currentIndex) {
  return ctx.chapters
    .map((chapter, index) => {
      const stateClass = index === currentIndex
        ? 'current'
        : index < currentIndex
          ? 'done'
          : '';

      return `
        <span
          class="mini-node ${stateClass}"
          title="${ctx.h(chapter.title)}"
        >
          <span aria-hidden="true">${chapter.icon}</span>
          <small>${ctx.h(chapterLabel(chapter))}</small>
        </span>
      `;
    })
    .join('');
}

export function setChapter(ctx, index) {
  const {
    state,
    progressEl,
    ledgerBtn,
    persistentFooter,
    chapterLabel: chapterLabelEl,
    chapterTitle,
    progressFill,
    chapters,
    saveState
  } = ctx;

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
  const nodes = ctx.chapters
    .map((chapter, index) => {
      const stateClass = index === currentIndex
        ? 'current'
        : index < currentIndex
          ? 'done'
          : '';

      return `
        <div class="journey-node ${stateClass}">
          <span class="journey-icon" aria-hidden="true">${chapter.icon}</span>
          <small>${ctx.h(chapterLabel(chapter))}</small>
        </div>
      `;
    })
    .join('');

  return `<div class="journey-map" aria-label="خريطة رحلة الإجابة">${nodes}</div>`;
}

function terminology(index) {
  const definitions = {
    0: `
      <div class="learning-card term-card">
        <h3>مصطلح سنستخدمه طوال الرحلة: النموذج</h3>
        <p>المقصود بـ«النموذج» برنامج رياضي يتعلم أنماطًا من كميات كبيرة من البيانات، ثم يستخدم ما تعلمه لإنتاج إجابات جديدة عندما ترسل إليه طلبًا.</p>
      </div>
    `,
    1: `
      <div class="learning-card term-card">
        <h3>ما هي الرقاقة الإلكترونية؟</h3>
        <p>قطعة صغيرة تحتوي على دوائر إلكترونية دقيقة تنفذ العمليات الحسابية. تدخل أنواع مختلفة من الرقائق في الحواسيب والخوادم التي تشغّل أنظمة الذكاء الاصطناعي.</p>
      </div>
    `,
    2: `
      <div class="learning-card term-card">
        <h3>ما هو الخادم؟</h3>
        <p>الخادم حاسوب قوي مخصص لتشغيل خدمات وبرامج باستمرار. توجد أعداد كبيرة من هذه الأجهزة داخل مراكز البيانات.</p>
      </div>
    `,
    5: `
      <div class="learning-card term-card">
        <h3>ما معنى تدريب النموذج؟</h3>
        <p>هي العملية التي تُعرض فيها أمثلة كثيرة على النموذج وتُعدَّل قيمه الداخلية تدريجيًا حتى يتحسن في توقع الأنماط وإنتاج النص.</p>
      </div>
    `
  };

  return definitions[index] || '';
}

function learningCard(title, text) {
  return `
    <div class="learning-card">
      <h3>${title}</h3>
      <p>${text}</p>
    </div>
  `;
}

export function chapterIntro(ctx, index, _title, _subtitle, next) {
  const chapter = ctx.chapters[index];
  ctx.setChapter(index);

  ctx.html(`
    <div class="learning-intro">
      <div>
        <span class="chapter-theme">${chapter.icon} المرحلة ${index + 1} من ${ctx.chapters.length}</span>
        <h1 class="display-title">${ctx.h(chapter.title)}</h1>
        <p class="scene-subtitle">لا تحتاج إلى معرفة هذه المرحلة مسبقًا. سنبني الرابط بينها وبين الإجابة خطوة بخطوة.</p>
      </div>

      ${journeyMap(ctx, index)}
      ${terminology(index)}

      <div class="learning-grid">
        ${learningCard('أين نحن؟', ctx.h(chapter.where))}
        ${learningCard('ماذا يحدث هنا؟', ctx.h(chapter.what))}
        ${learningCard('ما علاقتها بالذكاء الاصطناعي؟', ctx.h(chapter.link))}
        ${learningCard('من يعمل هنا؟', ctx.h(chapter.workers))}
      </div>

      <details class="reality-note">
        <summary><strong>أين يحدث هذا في الواقع؟</strong></summary>
        <p>${ctx.h(chapter.where)} ${ctx.h(chapter.workers)} تختلف الشركات والبلدان والتقنيات من سلسلة إلى أخرى، لذلك تمثل اللعبة نوع المرحلة لا موردًا أو شركة بعينها.</p>
      </details>

      <div class="journey-link">
        <strong>اربطها بطلبك:</strong>
        إجابتك ما زالت تنتظر. هذه المرحلة تبني شيئًا تحتاجه المراحل التالية قبل أن تصل إلى مربع المحادثة.
      </div>

      <div class="stage-output">
        <strong>ما الذي سنخرج به من هذه المرحلة؟</strong>
        ${ctx.h(chapter.output)}
      </div>

      <div class="action-row">
        <button id="chapterNext" class="primary-btn">ابدأ هذه المرحلة</button>
      </div>
    </div>
  `);

  ctx.$('#chapterNext').addEventListener('click', () => ctx.go(next));
}
