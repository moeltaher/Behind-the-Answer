import { ANNOTATION_TASKS, ANNOTATION_LABELS } from '../data/content-tasks.js';

const PAY_PER_ACCEPTED_TASK = 0.08;
const TASK_MINUTES = 4;
const BREAK_MINUTES = 5;

export function createAnnotationRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch5Intro() { chapterIntro(4, 'annotationIntro'); }

  function annotationIntro() {
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>منصة «مهمة»</strong><span>مشروع تصنيف بيانات</span></div><div class="annotation-body"><span class="eyebrow annotation-eyebrow">عاملة تصنيف بيانات</span><h1 class="annotation-title">مرحبًا أماني.</h1><div class="reality-note annotation-reality"><strong>ما وظيفة هذا العمل؟</strong> ستقرئين ستة أمثلة قصيرة وتضعين لكل منها تصنيفًا. في الواقع قد يحدث هذا النوع من العمل قبل التدريب أو أثناء الضبط أو في التقييم.</div><p>الدفع هنا افتراضي: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} وحدة لعب لكل مهمة يقبلها المراجع. لا تدفع المنصة وقت الاستراحة في هذا السيناريو؛ لذلك لا ينخفض عدد المهام فقط، بل قد ينخفض العائد بالنسبة للوقت الذي تقضينه متصلة بالعمل.</p><div class="annotation-stats"><span>الدفع: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} لكل مهمة مقبولة</span><span>المهمة: ${TASK_MINUTES} دقائق افتراضية</span><span>الاستراحة: ${BREAK_MINUTES} دقائق غير مدفوعة</span></div><div class="action-row"><button id="startAnnot" class="primary-btn">ابدأ الوردية</button></div></div></div>`);
    $('#startAnnot').addEventListener('click',()=>go('annotationTask'));
  }

  function annotationSummary() {
    const results=state.flags.annotationResults;
    const accepted=results.filter(r=>r.acceptedAsReasonable&&!r.pending).length;
    const pending=results.filter(r=>r.pending).length;
    const rejected=results.filter(r=>!r.acceptedAsReasonable).length;
    const reasonable=results.filter(r=>r.acceptedAsReasonable).length;
    const minutes=results.length*TASK_MINUTES+(state.flags.tookBreak?BREAK_MINUTES:0);
    return { answered:results.length,accepted,pending,rejected,reasonable,minutes,agreement:results.length?Math.round((reasonable/results.length)*100):100 };
  }
  function confirmedEarnings(){ return (annotationSummary().accepted*PAY_PER_ACCEPTED_TASK).toFixed(2); }
  function provisionalEarnings(){ return (annotationSummary().reasonable*PAY_PER_ACCEPTED_TASK).toFixed(2); }
  function hourlyEquivalent(){
    const summary=annotationSummary();
    if(!summary.minutes) return '0.00';
    return ((Number(confirmedEarnings())/summary.minutes)*60).toFixed(2);
  }

  function annotationTask() {
    const summary=annotationSummary();
    const index=summary.answered;
    if(index>=ANNOTATION_TASKS.length){ go('annotationReview'); return; }
    const task=ANNOTATION_TASKS[index];
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مشروع تصنيف البيانات</strong><span>المهمة ${index+1} من ${ANNOTATION_TASKS.length}</span></div><div class="annotation-body">${task.sensitive?'<div class="alert annotation-sensitive"><strong>تنبيه محتوى</strong><span>وصف مقتضب لمادة حساسة من دون تفاصيل صادمة.</span></div>':''}<div class="annotation-stats"><span>المكتملة: ${summary.answered}</span><span>الوقت المتصل: ${summary.minutes} دقيقة</span><span>المبلغ المبدئي: ${provisionalEarnings()}</span><span>الدفع: لم يُحسم بعد</span></div><div class="annotation-copy">${ctx.h(task.text)}</div><div class="annotation-tags">${ANNOTATION_LABELS.map(label=>`<button data-tag="${ctx.h(label)}">${ctx.h(label)}</button>`).join('')}</div>${index===3&&!state.flags.tookBreak?'<div class="action-row"><button id="takeBreak" class="choice-btn break-btn"><strong>خذ استراحة 5 دقائق</strong><small>لا تضيف مهمة أو أجرًا، لكنها تزيد الوقت الذي تقضيه متصلًا بالعمل.</small></button></div>':''}</div></div>`);
    bind('[data-tag]','click',event=>{
      const choice=event.currentTarget.dataset.tag;
      const pending=task.ambiguity&&choice==='غير واضح';
      const acceptedAsReasonable=choice===task.best||pending;
      state.flags.annotationResults.push({index,choice,acceptedAsReasonable,pending});
      saveState(); annotationTask();
    });
    $('#takeBreak')?.addEventListener('click',()=>{
      state.flags.tookBreak=true;
      state.flags.annotationShiftMinutes+=BREAK_MINUTES;
      addDecision('annotation-break','أخذت استراحة غير مدفوعة','أضافت الاستراحة خمس دقائق إلى الوقت المتصل بالعمل من دون أن تضيف مهمة أو أجرًا، فخفضت العائد مقابل الوقت في هذا السيناريو.');
      saveState(); annotationTask();
    });
  }

  function annotationReview() {
    const summary=annotationSummary();
    const rejectedCopy=summary.rejected===1?'مهمة واحدة مرفوضة':`${summary.rejected} مهام مرفوضة`;
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مراجعة الجودة</strong><span>هنا فقط يُحسم جزء من الدفع</span></div><div class="annotation-body"><h1 class="annotation-review-title">${summary.rejected?`المراجع رفض ${summary.rejected===1?'مهمة واحدة':`${summary.rejected} مهام`}.`:'لم يرفض المراجع أي مهمة في هذه الجولة.'}</h1><p>«التوافق مع معيار المشروع» يقيس توافق الاختيارات مع معيار هذا السيناريو، وليس حقيقة مطلقة عن الحالات الغامضة.</p><div class="annotation-stats"><span>مقبولة ومؤكدة الدفع: ${summary.accepted}</span><span>قيد المراجعة: ${summary.pending}</span><span>مرفوضة: ${summary.rejected}</span><span>الدخل المؤكد: ${confirmedEarnings()} وحدة</span><span>الوقت المتصل: ${summary.minutes} دقيقة</span></div>${summary.rejected?`<div class="alert annotation-rejected"><strong>${rejectedCopy}</strong><span>يمكن الاعتراض، لكن نتيجة الاعتراض تقع خارج الزمن الذي تغطيه اللعبة.</span></div><div class="choice-grid"><button id="appeal" class="choice-btn annotation-light-choice"><strong>أرسل اعتراضًا</strong><small>وقت إضافي غير مدفوع، والنتيجة غير محسومة هنا.</small></button><button id="skipAppeal" class="choice-btn annotation-light-choice"><strong>لا تعترض</strong><small>أغلق الوردية مع بقاء الرفض كما هو.</small></button></div>`:'<div class="action-row"><button id="closeShift" class="primary-btn">أغلق الوردية</button></div>'}</div></div>`);
    $('#appeal')?.addEventListener('click',()=>{ addDecision('annotation-appeal',`اعترضت على ${rejectedCopy}`,'أرسلت الاعتراض من دون افتراض نجاحه، وأضفت وقتًا غير مدفوع إلى العمل.'); go('annotationEnd'); });
    $('#skipAppeal')?.addEventListener('click',()=>{ addDecision('annotation-noappeal',`لم تعترض على ${rejectedCopy}`,'وفرت وقت الاعتراض وبقيت قرارات الرفض كما هي.'); go('annotationEnd'); });
    $('#closeShift')?.addEventListener('click',()=>go('annotationEnd'));
  }

  function annotationEnd() {
    const summary=annotationSummary();
    addLedger(4,'أماني — عاملة بيانات','تصنيف متكرر، حالات غامضة، محتوى حساس، مراجعة جودة ووقت غير مدفوع','أمثلة صنفها البشر','المرحلة التالية ترى أمثلة مصنفة، لا وقت العمل أو الاستراحة أو الرفض.');
    html(`<div><span class="eyebrow">وردية مكتملة</span><h1 class="scene-title">ماذا أنتج عمل أماني؟</h1><div class="stage-output"><strong>${summary.answered} أمثلة صُنفت أو أُرسلت للمراجعة</strong>يمكن استخدام هذه الأمثلة في تجهيز البيانات أو الضبط أو التقييم بحسب الغرض.</div><div class="hud-grid"><div class="hud-item"><span>مدفوعة مؤكدة</span><strong>${summary.accepted}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${summary.pending}</strong></div><div class="hud-item"><span>الدخل المؤكد</span><strong>${confirmedEarnings()} وحدة</strong></div><div class="hud-item"><span>الوقت المتصل</span><strong>${summary.minutes} دقيقة</strong></div><div class="hud-item"><span>عائد مكافئ للساعة</span><strong>${hourlyEquivalent()} وحدة</strong></div></div><p class="muted">إذا أخذت الاستراحة، لم تُخصم مهمة منك، لكنك قضيت وقتًا أطول للحصول على الدخل نفسه. هذا هو الأثر الاقتصادي المقصود هنا.</p><div class="action-row"><button id="annotAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#annotAbstract').addEventListener('click',()=>go('abstract5'));
  }

  function abstract5(){ abstraction([['أماني','عاملة بيانات','⌨']],`${annotationSummary().answered} أمثلة مصنفة`,'وقت القراءة والاستراحة والقرارات الغامضة والأجر أصبحت في النظام مجموعة من الأمثلة المصنفة.','ch6Intro'); }
  return { ch5Intro,annotationIntro,annotationTask,annotationReview,annotationEnd,abstract5 };
}
