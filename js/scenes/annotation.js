import { ANNOTATION_TASKS, ANNOTATION_LABELS, ANNOTATION_POLICY } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const PAY_PER_ACCEPTED_TASK = 0.08;
const TASK_MINUTES = 4;
const BREAK_MINUTES = 5;
const APPEAL_MINUTES = 4;

function policyList() {
  return ANNOTATION_POLICY.map(([label, definition]) => `<li><strong>${label}</strong><span>${definition}</span></li>`).join('');
}

export function createAnnotationRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch5Intro() { chapterIntro(4, 'annotationIntro'); }

  function annotationIntro() {
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>منصة «مهمة»</strong><span>مشروع تصنيف بيانات</span></div><div class="annotation-body"><span class="eyebrow annotation-eyebrow">عاملة تصنيف بيانات</span><h1 class="annotation-title">مرحبًا أماني.</h1><div class="reality-note annotation-reality"><strong>ما وظيفة هذا العمل؟</strong> ستقرئين ستة أمثلة قصيرة وتضعين لكل منها تصنيفًا وفق سياسة المشروع أدناه. هذه الفئات ليست حقائق طبيعية ثابتة؛ هي تعليمات عمل يجب أن يعرفها العامل قبل أن يحاسبه المراجع عليها.</div><details class="annotation-policy" open><summary>دليل التصنيف في هذا المشروع</summary><ul>${policyList()}</ul></details><p>الدفع هنا افتراضي: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} وحدة لعب لكل مهمة يقبلها المراجع. الاستراحة والاعتراض، إذا استخدمتهما، يضيفان وقتًا غير مدفوع في هذا السيناريو.</p><div class="annotation-stats"><span>الدفع: ${PAY_PER_ACCEPTED_TASK.toFixed(2)} لكل مهمة مقبولة</span><span>المهمة: ${TASK_MINUTES} دقائق</span><span>الاستراحة: ${BREAK_MINUTES} دقائق غير مدفوعة</span><span>الاعتراض: ${APPEAL_MINUTES} دقائق غير مدفوعة</span></div><div class="action-row"><button id="startAnnot" class="primary-btn">ابدأ الوردية</button></div></div></div>`);
    $('#startAnnot').addEventListener('click',()=>go('annotationTask'));
  }

  function annotationSummary() {
    const results=state.flags.annotationResults;
    const accepted=results.filter(r=>r.acceptedAsReasonable&&!r.pending&&!r.reviewRejected).length;
    const pending=results.filter(r=>r.pending&&!r.reviewRejected).length;
    const rejected=results.filter(r=>r.reviewRejected||!r.acceptedAsReasonable).length;
    const disputed=results.filter(r=>r.reviewRejected&&r.acceptedAsReasonable).length;
    const reasonable=results.filter(r=>r.acceptedAsReasonable&&!r.reviewRejected).length;
    const paidTaskMinutes=results.length*TASK_MINUTES;
    const unpaidMinutes=state.flags.annotationUnpaidMinutes;
    const minutes=paidTaskMinutes+unpaidMinutes;
    return { answered:results.length,accepted,pending,rejected,disputed,reasonable,paidTaskMinutes,unpaidMinutes,minutes };
  }

  function confirmedEarnings(){ return (annotationSummary().accepted*PAY_PER_ACCEPTED_TASK).toFixed(2); }
  function provisionalEarnings(){ return (annotationSummary().reasonable*PAY_PER_ACCEPTED_TASK).toFixed(2); }
  function hourlyEquivalent(){
    const summary=annotationSummary();
    if(!summary.minutes) return '0.00';
    return ((Number(confirmedEarnings())/summary.minutes)*60).toFixed(2);
  }

  function breakDecision() {
    const summary=annotationSummary();
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مشروع تصنيف البيانات</strong><span>قبل المهمة 4 من ${ANNOTATION_TASKS.length}</span></div><div class="annotation-body"><span class="eyebrow annotation-eyebrow">قرار وقت العمل</span><h1 class="annotation-review-title">وصلت إلى نقطة الاستراحة.</h1><p>أنجزتِ ثلاث مهام. يمكنك أخذ خمس دقائق الآن أو مواصلة العمل. القرار ظاهر قبل عرض المهمة التالية، لذلك لا يختفي بمجرد اختيار التصنيف.</p><div class="annotation-stats"><span>المكتملة: ${summary.answered}</span><span>الوقت المتصل: ${summary.minutes} دقيقة</span><span>منه غير مدفوع: ${summary.unpaidMinutes} دقيقة</span></div><div class="choice-grid"><button id="takeBreak" class="choice-btn break-btn"><strong>خذ استراحة 5 دقائق</strong><small>تضاف إلى الوقت المتصل بالعمل من دون أجر.</small></button><button id="skipBreak" class="choice-btn annotation-light-choice"><strong>واصل من دون استراحة</strong><small>لا يضاف وقت الآن، وتبدأ المهمة الرابعة مباشرة.</small></button></div></div></div>`);
    $('#takeBreak').addEventListener('click',()=>{
      state.flags.breakDecisionMade=true;
      state.flags.tookBreak=true;
      state.flags.annotationUnpaidMinutes+=BREAK_MINUTES;
      addDecision('annotation-break','أخذت استراحة غير مدفوعة','أضافت الاستراحة خمس دقائق إلى الوقت المتصل بالعمل من دون إضافة مهمة أو أجر.');
      saveState(); annotationTask();
    });
    $('#skipBreak').addEventListener('click',()=>{
      state.flags.breakDecisionMade=true;
      state.flags.tookBreak=false;
      addDecision('annotation-no-break','واصلت الوردية من دون استراحة','بدأت المهمة التالية فورًا ولم يضف السيناريو وقت استراحة غير مدفوع.');
      saveState(); annotationTask();
    });
  }

  function annotationTask() {
    const summary=annotationSummary();
    const index=summary.answered;
    if(index>=ANNOTATION_TASKS.length){ go('annotationReview'); return; }
    if(index===3&&!state.flags.breakDecisionMade){ breakDecision(); return; }
    const task=ANNOTATION_TASKS[index];
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مشروع تصنيف البيانات</strong><span>المهمة ${index+1} من ${ANNOTATION_TASKS.length}</span></div><div class="annotation-body">${task.sensitive?'<div class="alert annotation-sensitive"><strong>تنبيه محتوى</strong><span>وصف مقتضب لمادة حساسة من دون تفاصيل صادمة.</span></div>':''}<div class="annotation-stats"><span>المكتملة: ${summary.answered}</span><span>الوقت المتصل: ${summary.minutes} دقيقة</span><span>منه غير مدفوع: ${summary.unpaidMinutes} دقيقة</span><span>المبلغ المبدئي: ${provisionalEarnings()}</span></div><div class="annotation-copy">${ctx.h(task.text)}</div><details class="annotation-policy annotation-policy--compact"><summary>راجع دليل التصنيف</summary><ul>${policyList()}</ul></details><div class="annotation-tags">${ANNOTATION_LABELS.map(label=>`<button data-tag="${ctx.h(label)}">${ctx.h(label)}</button>`).join('')}</div></div></div>`);
    bind('[data-tag]','click',event=>{
      const choice=event.currentTarget.dataset.tag;
      const pending=task.ambiguity&&choice==='غير واضح';
      const acceptedAsReasonable=choice===task.best||pending;
      const disputed=Boolean(task.reviewDispute&&choice===task.best);
      const reviewRejected=disputed||!acceptedAsReasonable;
      state.flags.annotationResults.push({index,choice,acceptedAsReasonable,pending:pending&&!reviewRejected,reviewRejected,disputed});
      saveState(); annotationTask();
    });
  }

  function annotationReview() {
    const summary=annotationSummary();
    const rejectedCopy=summary.rejected===1?'مهمة واحدة مرفوضة':`${summary.rejected} مهام مرفوضة`;
    const disputeNote=summary.disputed?`<div class="alert annotation-rejected"><strong>رفض قابل للنزاع</strong><span>${summary.disputed===1?'إحدى المهام رُفضت رغم أن التصنيف اتبع دليل المشروع المعروض.':'بعض المهام رُفضت رغم أن التصنيف اتبع دليل المشروع المعروض.'} هذا يوضح أن سلطة المراجعة نفسها قد تكون محل خلاف، وليست مجرد كشف آلي لخطأ العامل.</span></div><div class="reality-note"><strong>من أين قد يأتي النزاع؟</strong> في منصات العمل قد ينشأ اختلاف المراجعة من نسخة أخرى من الدليل، أو gold label سابق، أو سياق لا يراه أحد الطرفين، أو قرار جودة بشري غير متسق. السيناريو لا يختار سببًا واحدًا من دون دليل؛ المهم أن الرفض ليس برهانًا تلقائيًا على خطأ العامل.</div>`:'';
    html(`<div class="annotation-shell"><div class="annotation-head"><strong>مراجعة الجودة</strong><span>هنا يُحسم جزء من الدفع</span></div><div class="annotation-body"><h1 class="annotation-review-title">${summary.rejected?`المراجع رفض ${summary.rejected===1?'مهمة واحدة':`${summary.rejected} مهام`}.`:'لم يرفض المراجع أي مهمة في هذه الجولة.'}</h1>${supportingRoleStrip(['dataReviewer'],'من دخل القرار الآن؟')}<p>الحالات «قيد المراجعة» لا تصبح مواد جاهزة تلقائيًا. كما أن قرار المراجع منفصل عن كون تصنيف العامل قابلًا للدفاع وفق الدليل الذي رأيته.</p><div class="annotation-stats"><span>مقبولة ومؤكدة: ${summary.accepted}</span><span>قيد المراجعة: ${summary.pending}</span><span>مرفوضة: ${summary.rejected}</span><span>الدخل المؤكد: ${confirmedEarnings()} وحدة</span><span>الوقت المتصل: ${summary.minutes} دقيقة</span></div>${disputeNote}${summary.rejected?`<div class="alert annotation-rejected"><strong>${rejectedCopy}</strong><span>يمكن الاعتراض، لكن نتيجة الاعتراض تقع خارج الزمن الذي تغطيه اللعبة.</span></div><div class="choice-grid"><button id="appeal" class="choice-btn annotation-light-choice"><strong>أرسل اعتراضًا</strong><small>يضيف ${APPEAL_MINUTES} دقائق غير مدفوعة، والنتيجة غير محسومة هنا.</small></button><button id="skipAppeal" class="choice-btn annotation-light-choice"><strong>لا تعترض</strong><small>أغلق الوردية مع بقاء الرفض كما هو.</small></button></div>`:'<div class="action-row"><button id="closeShift" class="primary-btn">أغلق الوردية</button></div>'}</div></div>`);
    $('#appeal')?.addEventListener('click',()=>{
      state.flags.annotationUnpaidMinutes+=APPEAL_MINUTES;
      addDecision('annotation-appeal',summary.disputed?'اعترضت على قرار مراجعة قابل للنزاع':`اعترضت على ${rejectedCopy}`,`أضاف الاعتراض ${APPEAL_MINUTES} دقائق غير مدفوعة من دون افتراض نجاحه.`);
      saveState(); go('annotationEnd');
    });
    $('#skipAppeal')?.addEventListener('click',()=>{
      addDecision('annotation-noappeal',`لم تعترض على ${rejectedCopy}`,'وفرت وقت الاعتراض وبقيت قرارات الرفض كما هي.');
      saveState(); go('annotationEnd');
    });
    $('#closeShift')?.addEventListener('click',()=>go('annotationEnd'));
  }

  function annotationEnd() {
    const summary=annotationSummary();
    addLedger(4,'أماني — عاملة بيانات','تصنيف وفق سياسة مكتوبة، حالات غامضة، مراجعة قابلة للنزاع ووقت غير مدفوع','أمثلة بشرية مؤكدة + حالات معلقة','المواد المعلقة والمرفوضة لا تصبح جاهزة تلقائيًا لمجرد انتهاء الوردية.');
    html(`<div><span class="eyebrow">وردية مكتملة</span><h1 class="scene-title">ماذا أنتج عمل أماني؟</h1><div class="stage-output"><strong>${summary.accepted} أمثلة مؤكدة، ${summary.pending} قيد المراجعة، ${summary.rejected} مرفوضة</strong>فقط الأمثلة المؤكدة يمكن اعتبارها جاهزة للانتقال في هذا السيناريو؛ الحالات المعلقة والمرفوضة تبقى خارجه.</div><div class="hud-grid"><div class="hud-item"><span>مؤكدة</span><strong>${summary.accepted}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${summary.pending}</strong></div><div class="hud-item"><span>مرفوضة</span><strong>${summary.rejected}</strong></div><div class="hud-item"><span>الدخل المؤكد</span><strong>${confirmedEarnings()} وحدة</strong></div><div class="hud-item"><span>وقت المهام</span><strong>${summary.paidTaskMinutes} دقيقة</strong></div><div class="hud-item"><span>وقت غير مدفوع</span><strong>${summary.unpaidMinutes} دقيقة</strong></div><div class="hud-item"><span>عائد مكافئ للساعة</span><strong>${hourlyEquivalent()} وحدة</strong></div></div><div class="action-row"><button id="annotAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#annotAbstract').addEventListener('click',()=>go('abstract5'));
  }

  function abstract5(){
    const summary=annotationSummary();
    abstraction([['أماني','عاملة بيانات','⌨']],`${summary.accepted} أمثلة مؤكدة + ${summary.pending} معلقة`,'وقت القراءة والاستراحة والاعتراض والمراجعة لا يظهر في المدخل التقني؛ والحالات المعلقة والمرفوضة تبقى منفصلة عن الأمثلة المؤكدة.','ch6Intro');
  }
  return { ch5Intro,annotationIntro,annotationTask,annotationReview,annotationEnd,abstract5 };
}
