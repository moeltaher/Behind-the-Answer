import { ANNOTATION_TASKS, ANNOTATION_LABELS } from '../data/content-tasks.js';

const PAY_PER_ACCEPTED_TASK = 0.08;

export function createAnnotationRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) =>
    ctx.abstraction(humans, word, line, next);

  function ch5Intro() {
    chapterIntro(4, 'annotationIntro');
  }

  function annotationIntro() {
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>منصة «مهمة»</strong><span>مشروع تصنيف بيانات</span></div><div class="annotation-body"><span class="eyebrow annotation-eyebrow">عاملة تصنيف بيانات</span><h1 class="annotation-title">مرحبًا أماني.</h1><div class="reality-note annotation-reality"><strong>ما وظيفة هذا العمل؟</strong> ستقرئين أمثلة قصيرة وتضعين لكل منها تصنيفًا. في الأنظمة الحقيقية قد يحدث هذا النوع من العمل قبل التدريب أو أثناء الضبط أو في التقييم، وقد يتكرر أكثر من مرة.</div><p>صنّفي المحتوى بحسب معيار المشروع. الدفع هنا افتراضي: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} وحدة لعب لكل مهمة يقبلها المراجع، والاستراحة غير مدفوعة، والتقييم مستمر.</p><div class="annotation-stats"><span>الدفع: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} لكل مهمة مقبولة</span><span>الاستراحة: غير مدفوعة</span><span>المراجعة: تحدد القبول والرفض بعد الوردية</span></div><div class="action-row"><button id="startAnnot" class="primary-btn">ابدأ الوردية</button></div></div></div>`);
    $('#startAnnot').addEventListener('click', () => go('annotationTask'));
  }

  function currentAgreement() {
    if (!state.flags.annotationAnswered) return 100;
    return Math.round((state.flags.annotationCorrect / state.flags.annotationAnswered) * 100);
  }

  function paidTasks() {
    return state.flags.annotationCounts.accepted;
  }

  function currentEarnings() {
    return (paidTasks() * PAY_PER_ACCEPTED_TASK).toFixed(2);
  }

  function annotationTask() {
    const index = state.flags.annotationIndex;
    if (index >= ANNOTATION_TASKS.length) {
      go('annotationReview');
      return;
    }

    const task = ANNOTATION_TASKS[index];
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مشروع تصنيف البيانات</strong><span>المهمة ${index + 1} من ${ANNOTATION_TASKS.length}</span></div><div class="annotation-body">${task.sensitive ? '<div class="alert annotation-sensitive"><strong>تنبيه محتوى</strong><span>وصف مقتضب وغير تفصيلي لمادة حساسة.</span></div>' : ''}<div class="annotation-stats"><span>المهام المكتملة: ${state.flags.annotationAnswered}</span><span>التوافق المؤقت مع المعيار: ${currentAgreement()}%</span><span>الدفع النهائي: بعد المراجعة</span>${state.flags.tookBreak ? '<span>أخذت استراحة خلال الوردية</span>' : ''}</div><div class="annotation-copy">${ctx.h(task.text)}</div><div class="annotation-tags">${ANNOTATION_LABELS.map(label => `<button data-tag="${ctx.h(label)}">${ctx.h(label)}</button>`).join('')}</div>${index === 5 && !state.flags.tookBreak ? '<div class="action-row"><button id="takeBreak" class="choice-btn break-btn"><strong>خذ استراحة</strong><small>تتوقف المهمة مؤقتًا ولا تُحتسب كمكتملة ولا مدفوعة.</small></button></div>' : ''}</div></div>`);

    bind('[data-tag]', 'click', event => {
      const choice = event.currentTarget.dataset.tag;
      const pending = task.ambiguity && choice === 'غير واضح';
      const acceptedAsReasonable = choice === task.best || pending;

      state.flags.annotationAnswered += 1;
      if (acceptedAsReasonable) state.flags.annotationCorrect += 1;
      state.flags.annotationResults.push({
        index,
        choice,
        acceptedAsReasonable,
        pending
      });

      if (pending) {
        mutateMetrics({ dataQuality: 1, cost: 1, pressure: -1 });
      } else if (acceptedAsReasonable) {
        mutateMetrics({ dataQuality: 1 });
      } else {
        mutateMetrics({
          dataQuality: -2,
          pressure: 1,
          burden: task.ambiguity ? 2 : 0
        });
      }

      state.flags.annotationIndex += 1;
      saveState();
      annotationTask();
    });

    $('#takeBreak')?.addEventListener('click', () => {
      state.flags.tookBreak = true;
      addDecision(
        'annotation-break',
        'أخذت استراحة غير مدفوعة',
        'انخفض العبء الفوري، لكن الاستراحة لا تُحتسب مهمة مكتملة ولا تضيف دخلًا.',
        { pressure: -3, cost: 1, burden: -7 }
      );
      saveState();
      annotationTask();
    });
  }

  function annotationReview() {
    const results = state.flags.annotationResults;
    const accepted = results.filter(result => result.acceptedAsReasonable && !result.pending).length;
    const pending = results.filter(result => result.pending).length;
    const rejected = results.filter(result => !result.acceptedAsReasonable).length;

    state.flags.annotationCounts = { accepted, pending, rejected };
    saveState();

    const rejectedCopy = rejected === 1 ? 'مهمة واحدة مرفوضة' : `${rejected} مهام مرفوضة`;
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مراجعة الجودة</strong><span>اكتملت الوردية</span></div><div class="annotation-body"><h1 class="annotation-review-title">${rejected ? `المراجع رفض ${rejected === 1 ? 'مهمة واحدة' : `${rejected} مهام`}.` : 'لم يرفض المراجع أي مهمة في هذه الجولة.'}</h1><p>«التوافق مع معيار المشروع» يقيس مدى توافق اختياراتك مع معيار هذه اللعبة، وليس حقيقة مطلقة عن كل حالة غامضة.</p><div class="annotation-stats"><span>مقبولة: ${accepted}</span><span>قيد المراجعة: ${pending}</span><span>مرفوضة: ${rejected}</span><span>الدخل المؤكد: ${currentEarnings()} وحدة</span></div>${rejected ? `<div class="alert annotation-rejected"><strong>${rejectedCopy} — الدفع عنها: صفر</strong><span>يمكنك الاعتراض على قرار المراجعة، لكن وقت الاعتراض غير مدفوع.</span></div><div class="choice-grid"><button id="appeal" class="choice-btn annotation-light-choice"><strong>اعترض</strong><small>يحتاج إلى وقت إضافي غير مدفوع.</small></button><button id="skipAppeal" class="choice-btn annotation-light-choice"><strong>لا تعترض</strong><small>استمر وأغلق الوردية.</small></button></div>` : '<div class="action-row"><button id="closeShift" class="primary-btn">أغلق الوردية</button></div>'}</div></div>`);

    $('#appeal')?.addEventListener('click', () => {
      addDecision(
        'annotation-appeal',
        `اعترضت على ${rejectedCopy}`,
        'استخدمت مسار الاعتراض لكن وقت المراجعة لا يدخل دخل الوردية.',
        { burden: 2, cost: 1 }
      );
      go('annotationEnd');
    });
    $('#skipAppeal')?.addEventListener('click', () => {
      addDecision(
        'annotation-noappeal',
        `لم تعترض على ${rejectedCopy}`,
        'وفرت الوقت لكن قرارات الرفض ظلت قائمة بلا مراجعة إضافية.',
        { pressure: 1, cost: -1, burden: 1 }
      );
      go('annotationEnd');
    });
    $('#closeShift')?.addEventListener('click', () => go('annotationEnd'));
  }

  function annotationEnd() {
    addLedger(
      4,
      'أماني — عاملة بيانات',
      'تصنيف متكرر، حالات غامضة، محتوى حساس، تقييم جودة واعتراض',
      'أمثلة صنفها البشر',
      'المرحلة التالية ترى أمثلة مصنفة، لا تفاصيل الأجر والاستراحة والرفض.'
    );

    html(`<div><span class="eyebrow">وردية مكتملة</span><h1 class="scene-title">ماذا أنتج عمل أماني؟</h1><div class="stage-output"><strong>${state.flags.annotationAnswered} أمثلة صُنفت أو أُرسلت للمراجعة</strong>يمكن أن تستخدم هذه الأمثلة في تجهيز البيانات أو ضبط النموذج أو تقييمه.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>مدفوعة بعد المراجعة</span><strong>${paidTasks()}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${state.flags.annotationCounts.pending}</strong></div><div class="hud-item"><span>مرفوضة</span><strong>${state.flags.annotationCounts.rejected}</strong></div><div class="hud-item"><span>التوافق مع المعيار</span><strong>${currentAgreement()}%</strong></div><div class="hud-item"><span>دخل الوردية</span><strong>${currentEarnings()} وحدة</strong></div></div><p class="muted">عند انتقال الناتج إلى فريق التطوير، لا تظهر حالة الدفع أو الاستراحة أو الاعتراض بجوار كل مثال.</p></div><div class="action-row"><button id="annotAbstract" class="primary-btn">شاهد كيف يختصر النظام هذا العمل</button></div></div>`);
    $('#annotAbstract').addEventListener('click', () => go('abstract5'));
  }

  function abstract5() {
    abstraction(
      [['أماني', 'عاملة بيانات', '⌨']],
      `${state.flags.annotationAnswered} أمثلة مصنفة`,
      'وقت العمل والقراءة والقرارات الغامضة والأجر أصبحت في النظام مجموعة من الأمثلة المصنفة.',
      'ch6Intro'
    );
  }

  return {
    ch5Intro,
    annotationIntro,
    annotationTask,
    annotationReview,
    annotationEnd,
    abstract5
  };
}
