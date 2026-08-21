import { ANNOTATION_TASKS, ANNOTATION_LABELS } from '../data/game-data.js';

export function createAnnotationRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { setChapter, chapterIntro, html, go, bind, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch5Intro() { chapterIntro(4, '', '', 'annotationIntro'); }

  function annotationIntro() {
    setChapter(4);
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>منصة «مهمة»</strong><span>مشروع تصنيف بيانات</span></div><div class="annotation-body"><span class="eyebrow annotation-eyebrow">عاملة تصنيف بيانات</span><h1 class="annotation-title">مرحبًا أماني.</h1><div class="reality-note annotation-reality"><strong>ما وظيفة هذا العمل؟</strong> ستقرئين أمثلة قصيرة وتضعين لكل منها تصنيفًا. في الأنظمة الحقيقية قد يحدث هذا النوع من العمل قبل التدريب أو أثناء الضبط أو في التقييم، وقد يتكرر أكثر من مرة.</div><p>صنّفي المحتوى بحسب الفئة الأقرب. الدفع مقابل المهام المقبولة، والاستراحة غير مدفوعة، والتقييم مستمر.</p><div class="annotation-stats"><span>الدفع: لكل مهمة مقبولة</span><span>الاستراحة: غير مدفوعة</span><span>التقييم: مستمر</span></div><div class="action-row"><button id="startAnnot" class="primary-btn">ابدأ الوردية</button></div></div></div>`);
    $('#startAnnot').addEventListener('click', () => go('annotationTask'));
  }

  function currentAccuracy() {
    if (!state.flags.annotationAnswered) return 100;
    return Math.round((state.flags.annotationCorrect / state.flags.annotationAnswered) * 100);
  }

  function annotationTask() {
    const i = state.flags.annotationIndex;
    if (i >= ANNOTATION_TASKS.length) { go('annotationReview'); return; }
    const task = ANNOTATION_TASKS[i];
    const accuracy = currentAccuracy();

    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مشروع تصنيف البيانات</strong><span>المهمة ${i + 1} من ${ANNOTATION_TASKS.length}</span></div><div class="annotation-body">${task.sensitive ? '<div class="alert annotation-sensitive"><strong>تنبيه محتوى</strong><span>وصف مقتضب وغير تفصيلي لمادة حساسة.</span></div>' : ''}<div class="annotation-stats"><span>المهام المكتملة: ${state.flags.annotationAnswered}</span><span>المقبولة: ${state.flags.annotationCounts.accepted}</span><span>الدقة الفعلية: ${accuracy}%</span>${state.flags.tookBreak ? '<span>أخذت استراحة خلال الوردية</span>' : ''}</div><div class="annotation-copy">${ctx.h(task.text)}</div><div class="annotation-tags">${ANNOTATION_LABELS.map(label => `<button data-tag="${ctx.h(label)}">${ctx.h(label)}</button>`).join('')}</div>${i === 5 && !state.flags.tookBreak ? '<div class="action-row"><button id="takeBreak" class="choice-btn break-btn"><strong>خذ استراحة</strong><small>تتوقف المهمة مؤقتًا ولا تُحتسب كمكتملة.</small></button></div>' : ''}</div></div>`);

    bind('[data-tag]', 'click', event => {
      const choice = event.currentTarget.dataset.tag;
      const acceptedAsReasonable = choice === task.best || (task.ambiguity && choice === 'غير واضح');
      state.flags.annotationAnswered += 1;

      if (acceptedAsReasonable) {
        state.flags.annotationCorrect += 1;
        if (choice === 'غير واضح') {
          state.flags.annotationCounts.pending += 1;
          mutateMetrics({ quality: 1, cost: 1, pressure: -1 });
        } else {
          state.flags.annotationCounts.accepted += 1;
          mutateMetrics({ quality: 1 });
        }
      } else {
        state.flags.annotationCounts.accepted += 1;
        mutateMetrics({ quality: -2, pressure: 1, burden: task.ambiguity ? 2 : 0 });
      }

      state.flags.annotationIndex += 1;
      saveState();
      annotationTask();
    });

    $('#takeBreak')?.addEventListener('click', () => {
      state.flags.tookBreak = true;
      addDecision('annotation-break', 'أخذت استراحة غير مدفوعة', 'انخفض العبء الفوري، لكن الاستراحة لا تُحتسب مهمة مكتملة ولا تحذف المهمة الحالية.', { pressure: -3, cost: 1, burden: -7, visibility: 3 });
      saveState();
      annotationTask();
    });
  }

  function annotationReview() {
    state.flags.annotationCounts.rejected = 1;
    saveState();
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مراجعة الجودة</strong><span>اكتملت الوردية</span></div><div class="annotation-body"><h1 class="annotation-review-title">المراجع اختلف مع أحد تصنيفاتك.</h1><p>حتى مع وجود نسبة دقة محسوبة من اختياراتك، قد تختلف مراجعة المنصة عن العامل في حالة بعينها.</p><div class="alert annotation-rejected"><strong>مهمة واحدة مرفوضة — الدفع عنها: صفر</strong><span>يمكنك الاعتراض، لكن المراجعة قد تستغرق حتى 48 ساعة.</span></div><div class="choice-grid"><button id="appeal" class="choice-btn annotation-light-choice"><strong>اعترض</strong><small>يحتاج إلى وقت إضافي غير مدفوع.</small></button><button id="skipAppeal" class="choice-btn annotation-light-choice"><strong>لا تعترض</strong><small>استمر وأغلق الوردية.</small></button></div></div></div>`);
    $('#appeal').addEventListener('click', () => { addDecision('annotation-appeal', 'اعترضت على مهمة مرفوضة', 'استخدمت مسار الاعتراض لكن وقت المراجعة لا يدخل دخل الوردية.', { burden: 2, cost: 1, visibility: 3 }); go('annotationEnd'); });
    $('#skipAppeal').addEventListener('click', () => { addDecision('annotation-noappeal', 'لم تعترض على المهمة المرفوضة', 'وفرت الوقت لكن قرار المنصة ظل قائمًا بلا مراجعة.', { pressure: 1, cost: -1, burden: 1, visibility: 1 }); go('annotationEnd'); });
  }

  function annotationEnd() {
    addLedger(4, 'أماني — عاملة بيانات', 'تصنيف متكرر، حالات غامضة، محتوى حساس، تقييم جودة واعتراض', 'أمثلة صنفها البشر', 'المرحلة التالية ترى أمثلة مصنفة، لا تفاصيل الأجر والاستراحة والرفض.');
    html(`<div><span class="eyebrow">وردية مكتملة</span><h1 class="scene-title">ماذا أنتج عمل أماني؟</h1><div class="stage-output"><strong>${state.flags.annotationAnswered} أمثلة صُنفت أو أُرسلت للمراجعة</strong>يمكن أن تستخدم هذه الأمثلة في تجهيز البيانات أو تقييم النموذج وتحسينه.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>مقبولة</span><strong>${state.flags.annotationCounts.accepted}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${state.flags.annotationCounts.pending}</strong></div><div class="hud-item"><span>دقتك</span><strong>${currentAccuracy()}%</strong></div></div><p class="muted">عند انتقال الناتج إلى فريق التطوير، لا تظهر حالة الدفع أو الاستراحة أو الاعتراض بجوار كل مثال.</p></div><div class="action-row"><button id="annotAbstract" class="primary-btn">شاهد كيف يختصر النظام هذا العمل</button></div></div>`);
    $('#annotAbstract').addEventListener('click', () => go('abstract5'));
  }

  function abstract5() { abstraction([['أماني', 'عاملة بيانات', '⌨']], `${state.flags.annotationAnswered} أمثلة مصنفة`, 'وقت العمل والقراءة والقرارات الغامضة أصبحت في النظام مجموعة من الأمثلة المصنفة.', 'ch6Intro'); }

  return { ch5Intro, annotationIntro, annotationTask, annotationReview, annotationEnd, abstract5 };
}
