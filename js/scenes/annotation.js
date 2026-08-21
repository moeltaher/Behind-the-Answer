import { ANNOTATION_TASKS, ANNOTATION_LABELS } from '../data/content-tasks.js';

const PAY_PER_ACCEPTED_TASK = 0.08;

export function createAnnotationRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch5Intro() { chapterIntro(4, 'annotationIntro'); }

  function annotationIntro() {
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>منصة «مهمة»</strong><span>مشروع تصنيف بيانات</span></div><div class="annotation-body"><span class="eyebrow annotation-eyebrow">عاملة تصنيف بيانات</span><h1 class="annotation-title">مرحبًا أماني.</h1><div class="reality-note annotation-reality"><strong>ما وظيفة هذا العمل؟</strong> ستقرئين ستة أمثلة قصيرة وتضعين لكل منها تصنيفًا. في الواقع قد يحدث هذا النوع من العمل قبل التدريب أو أثناء الضبط أو في التقييم.</div><p>الدفع هنا افتراضي: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} وحدة لعب لكل مهمة يقبلها المراجع. الاستراحة غير مدفوعة، والقبول النهائي لا يُحسم إلا بعد المراجعة.</p><div class="annotation-stats"><span>الدفع: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} لكل مهمة مقبولة</span><span>الاستراحة: غير مدفوعة</span><span>المراجعة: بعد الوردية</span></div><div class="action-row"><button id="startAnnot" class="primary-btn">ابدأ الوردية</button></div></div></div>`);
    $('#startAnnot').addEventListener('click',()=>go('annotationTask'));
  }

  function annotationSummary() {
    const results=state.flags.annotationResults;
    const accepted=results.filter(r=>r.acceptedAsReasonable&&!r.pending).length;
    const pending=results.filter(r=>r.pending).length;
    const rejected=results.filter(r=>!r.acceptedAsReasonable).length;
    const reasonable=results.filter(r=>r.acceptedAsReasonable).length;
    return { answered:results.length,accepted,pending,rejected,agreement:results.length?Math.round((reasonable/results.length)*100):100 };
  }
  function currentEarnings(){ return (annotationSummary().accepted*PAY_PER_ACCEPTED_TASK).toFixed(2); }

  function annotationTask() {
    const summary=annotationSummary();
    const index=summary.answered;
    if(index>=ANNOTATION_TASKS.length){ go('annotationReview'); return; }
    const task=ANNOTATION_TASKS[index];
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مشروع تصنيف البيانات</strong><span>المهمة ${index+1} من ${ANNOTATION_TASKS.length}</span></div><div class="annotation-body">${task.sensitive?'<div class="alert annotation-sensitive"><strong>تنبيه محتوى</strong><span>وصف مقتضب لمادة حساسة من دون تفاصيل صادمة.</span></div>':''}<div class="annotation-stats"><span>المكتملة: ${summary.answered}</span><span>التوافق المؤقت: ${summary.agreement}%</span><span>الدخل المؤكد: ${currentEarnings()}</span><span>قيد المراجعة: ${summary.pending}</span></div><div class="annotation-copy">${ctx.h(task.text)}</div><div class="annotation-tags">${ANNOTATION_LABELS.map(label=>`<button data-tag="${ctx.h(label)}">${ctx.h(label)}</button>`).join('')}</div>${index===3&&!state.flags.tookBreak?'<div class="action-row"><button id="takeBreak" class="choice-btn break-btn"><strong>خذ استراحة</strong><small>تتوقف المهمة مؤقتًا ولا تُحتسب كمهمة مكتملة أو مدفوعة.</small></button></div>':''}</div></div>`);
    bind('[data-tag]','click',event=>{
      const choice=event.currentTarget.dataset.tag;
      const pending=task.ambiguity&&choice==='غير واضح';
      const acceptedAsReasonable=choice===task.best||pending;
      state.flags.annotationResults.push({index,choice,acceptedAsReasonable,pending});
      if(pending) mutateMetrics({dataQuality:1,cost:1,pressure:-1});
      else if(acceptedAsReasonable) mutateMetrics({dataQuality:1});
      else mutateMetrics({dataQuality:-2,pressure:1,burden:task.ambiguity?2:0});
      saveState(); annotationTask();
    });
    $('#takeBreak')?.addEventListener('click',()=>{ state.flags.tookBreak=true; addDecision('annotation-break','أخذت استراحة غير مدفوعة','انخفض العبء الفوري، لكن الاستراحة لم تضف دخلًا أو مهمة مكتملة.',{pressure:-3,cost:1,burden:-7}); saveState(); annotationTask(); });
  }

  function annotationReview() {
    const summary=annotationSummary();
    const rejectedCopy=summary.rejected===1?'مهمة واحدة مرفوضة':`${summary.rejected} مهام مرفوضة`;
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مراجعة الجودة</strong><span>اكتملت الوردية</span></div><div class="annotation-body"><h1 class="annotation-review-title">${summary.rejected?`المراجع رفض ${summary.rejected===1?'مهمة واحدة':`${summary.rejected} مهام`}.`:'لم يرفض المراجع أي مهمة في هذه الجولة.'}</h1><p>«التوافق مع معيار المشروع» يقيس توافق الاختيارات مع معيار هذا السيناريو، وليس حقيقة مطلقة عن الحالات الغامضة.</p><div class="annotation-stats"><span>مقبولة ومؤكدة الدفع: ${summary.accepted}</span><span>قيد المراجعة ولم يُحسم دفعها: ${summary.pending}</span><span>مرفوضة: ${summary.rejected}</span><span>الدخل المؤكد: ${currentEarnings()} وحدة</span></div>${summary.rejected?`<div class="alert annotation-rejected"><strong>${rejectedCopy}</strong><span>يمكن الاعتراض، لكن نتيجة الاعتراض تقع خارج الزمن الذي تغطيه اللعبة.</span></div><div class="choice-grid"><button id="appeal" class="choice-btn annotation-light-choice"><strong>أرسل اعتراضًا</strong><small>وقت إضافي غير مدفوع، والنتيجة غير محسومة هنا.</small></button><button id="skipAppeal" class="choice-btn annotation-light-choice"><strong>لا تعترض</strong><small>أغلق الوردية مع بقاء الرفض كما هو.</small></button></div>`:'<div class="action-row"><button id="closeShift" class="primary-btn">أغلق الوردية</button></div>'}</div></div>`);
    $('#appeal')?.addEventListener('click',()=>{ addDecision('annotation-appeal',`اعترضت على ${rejectedCopy}`,'أرسلت الاعتراض من دون افتراض أن نتيجته ستغير قرار المراجعة فورًا.',{burden:2,cost:1}); go('annotationEnd'); });
    $('#skipAppeal')?.addEventListener('click',()=>{ addDecision('annotation-noappeal',`لم تعترض على ${rejectedCopy}`,'وفرت وقت الاعتراض وبقيت قرارات الرفض كما هي.',{pressure:1,cost:-1,burden:1}); go('annotationEnd'); });
    $('#closeShift')?.addEventListener('click',()=>go('annotationEnd'));
  }

  function annotationEnd() {
    const summary=annotationSummary();
    addLedger(4,'أماني — عاملة بيانات','تصنيف متكرر، حالات غامضة، محتوى حساس، تقييم جودة واعتراض','أمثلة صنفها البشر','المرحلة التالية ترى أمثلة مصنفة، لا تفاصيل الأجر والاستراحة والرفض.');
    html(`<div><span class="eyebrow">وردية مكتملة</span><h1 class="scene-title">ماذا أنتج عمل أماني؟</h1><div class="stage-output"><strong>${summary.answered} أمثلة صُنفت أو أُرسلت للمراجعة</strong>يمكن استخدام هذه الأمثلة في تجهيز البيانات أو الضبط أو التقييم بحسب الغرض.</div><div class="hud-grid"><div class="hud-item"><span>مدفوعة مؤكدة</span><strong>${summary.accepted}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${summary.pending}</strong></div><div class="hud-item"><span>مرفوضة</span><strong>${summary.rejected}</strong></div><div class="hud-item"><span>التوافق مع المعيار</span><strong>${summary.agreement}%</strong></div><div class="hud-item"><span>الدخل المؤكد</span><strong>${currentEarnings()} وحدة</strong></div></div><p class="muted">المهام المعلقة لا تُحتسب في الدخل المؤكد حتى تُحسم مراجعتها.</p><div class="action-row"><button id="annotAbstract" class="primary-btn">انتقل إلى التدريب</button></div></div>`);
    $('#annotAbstract').addEventListener('click',()=>go('abstract5'));
  }

  function abstract5(){ abstraction([['أماني','عاملة بيانات','⌨']],`${annotationSummary().answered} أمثلة مصنفة`,'وقت العمل والقراءة والقرارات الغامضة والأجر أصبحت في النظام مجموعة من الأمثلة المصنفة.','ch6Intro'); }
  return { ch5Intro,annotationIntro,annotationTask,annotationReview,annotationEnd,abstract5 };
}
