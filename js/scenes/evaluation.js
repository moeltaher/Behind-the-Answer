import { EVAL_TASKS } from '../data/content-tasks.js';

export function createEvaluationRoutes(ctx) {
  const $ = ctx.$;
  const $$ = ctx.$$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word,line,next);

  function ch7Intro() { chapterIntro(6, 'evalTask'); }

  function evalTask() {
    const index=state.flags.evalIndex;
    if(index>=EVAL_TASKS.length){ go('safetyTest'); return; }
    const task=EVAL_TASKS[index];
    const sourceContext=index===2?'<div class="card flat"><strong>النص الأصلي الافتراضي</strong><p>«يجوز تقديم الطلب خلال ثلاثين يومًا من تاريخ الإخطار، ويُستثنى من ذلك من يثبت تعذر وصول الإخطار إليه خلال هذه المدة.»</p></div>':'';
    if(state.flags.evalFeedback){
      const feedback=state.flags.evalFeedback;
      html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">راجع سبب التقييم.</h1>${sourceContext}<div class="alert ${feedback.correct?'goodish':'dangerish'}"><strong>${feedback.correct?'تقييمك يطابق معيار هذه المهمة':'تقييمك لا يطابق معيار هذه المهمة'}</strong><span>${ctx.h(task.explanation)}</span></div><p class="muted">هذا يقيس دقة عمل المقيّم في السيناريو، ولا يغيّر جودة النموذج لمجرد أنك ضغطت الإجابة الصحيحة أو الخاطئة.</p><div class="action-row"><button id="nextEval" class="primary-btn">المهمة التالية</button></div></div>`);
      $('#nextEval').addEventListener('click',()=>{ state.flags.evalFeedback=null; state.flags.evalIndex+=1; saveState(); evalTask(); });
      return;
    }
    html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">قارن الإجابتين وفق الطلب.</h1><div class="reality-note"><strong>ما الذي نقيسه هنا؟</strong> أنت لا «تحسن النموذج» بالضغط على زر. أنت تختبر هل يستطيع المقيّم اكتشاف الإجابة الأكثر ملاءمة للسياق، لتصبح نتيجة التقييم نفسها أكثر موثوقية.</div>${sourceContext}<div class="card flat"><strong>الطلب</strong><p>${ctx.h(task.prompt)}</p></div><div class="compare-card"><div class="response-card"><h4>الإجابة أ</h4><p>${ctx.h(task.a)}</p></div><div class="response-card"><h4>الإجابة ب</h4><p>${ctx.h(task.b)}</p></div></div><div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>الإجابة أ أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>الإجابة ب أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',event=>{
      const choice=event.currentTarget.dataset.eval;
      const correct=choice===task.good;
      if(correct) state.flags.evalCorrectCount+=1;
      state.flags.evalFeedback={choice,correct};
      saveState();
      evalTask();
    });
  }

  function safetyTest() {
    html(`<div><span class="eyebrow">اختبار السلامة</span><h1 class="scene-title">اختبر حدود النموذج.</h1><p class="scene-subtitle">هذا اختبار مستقل عن الملاءمة اللغوية، لكنه ليس منفصلًا عن قرار الجاهزية: خلل السلامة الذي يظهر هنا يجب أن يُعالج قبل الإطلاق.</p><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">بوابة السلامة</span><h1 class="scene-title">${correct?'اكتشفت خللًا يمنع المرور مباشرة إلى الإطلاق.':'لم تلتقط الخلل، لكن المراجعة الثانية أوقفته قبل الإطلاق.'}</h1><div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب الإيقاف</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. في هذا السيناريو لا يكفي تسجيل النتيجة؛ يجب إصلاح السلوك وإعادة اختباره قبل قرار الجاهزية.</span></div><div class="stage-output"><strong>${correct?'اكتشاف مبكر':'اكتشاف في مراجعة ثانية'}</strong>${correct?'يضاف نطاق تحقق سلامة بعد الإصلاح.':'عدم التقاط الخلل من المقيّم الأول يضيف مراجعة بشرية ثانية ونطاق تحقق أوسع بعد الإصلاح.'}</div><div class="action-row"><button id="remediateSafety" class="primary-btn">أرسل الخلل للإصلاح وأعد اختباره</button></div></div>`);
    $('#remediateSafety').addEventListener('click',()=>{
      state.flags.safetyRemediated=true;
      addDecision(correct?'safety-caught':'safety-second-review',correct?'أوقفت خلل السلامة قبل الإطلاق':'احتاج خلل السلامة إلى مراجع ثانٍ لاكتشافه',correct?'دخل الخلل مسار إصلاح وإعادة اختبار قبل قرار الجاهزية.':'تأخر اكتشاف الخلل حتى المراجعة الثانية، ثم دخل مسار إصلاح وإعادة اختبار أوسع.');
      saveState();
      go('launchDecision');
    });
  }

  function remainingVerification() {
    let count = 8;
    if(state.flags.trainingCheckpoint==='recent') count += 4;
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') count += 2;
    if(state.flags.safetyRemediated) count += state.flags.safetyChoice==='details' ? 4 : 6;
    return count;
  }

  function launchDecision() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    const remaining=remainingVerification();
    const reasons=[];
    if(state.flags.trainingCheckpoint==='recent') reasons.push('نقطة الحفظ الأحدث أضافت اختبارات تحقق من التغييرات');
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') reasons.push('الاستمرار بهامش أعطال أضيق أضاف فحص استقرار');
    reasons.push(state.flags.safetyChoice==='details'?'إصلاح خلل السلامة أضاف إعادة اختبار مخصصة':'المراجعة الثانية للسلامة أضافت نطاق إعادة اختبار أوسع');
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الإطلاق غدًا. بقي ${remaining} اختبارًا.</h1><p class="scene-subtitle">العدد الآن يجمع فقط أعمال تحقق محددة نشأت من أحداث رأيتها: تغييرات نقطة الحفظ، هامش العطل، وإصلاح خلل السلامة.</p><div class="card flat"><strong>لماذا العدد ${remaining}؟</strong><div class="view-list">${reasons.map(reason=>`<span>${ctx.h(reason)}</span>`).join('')}</div></div><div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أكمل الاختبارات الحرجة فقط</strong><small>يحافظ على الموعد، لكن جزءًا من نطاق التحقق المتبقي سينتقل إلى المراقبة بعد الإطلاق.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق</strong><small>يدفع وقتًا وحوسبة وعملًا إضافيًا لإكمال المجموعة المتبقية.</small></button></div></div>`);
    $('#criticalOnly').addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast',`أطلقت بعد الاقتصار على الاختبارات الحرجة من ${remaining} اختبارًا`,'حافظت على الموعد بينما انتقل جزء أكبر من عدم اليقين إلى التشغيل والمراقبة بعد الإطلاق.'); saveState(); go('launchOutcome'); });
    $('#delayLaunch').addEventListener('click',()=>{ state.flags.launchChoice='delay'; addDecision('launch-delay',`أجلت الإطلاق لإكمال ${remaining} اختبارًا`,'انتقلت تكلفة التحقق إلى الشركة والجدول بدل تركها كمخاطرة غير مختبرة في التشغيل.'); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    const accuracy=`${state.flags.evalCorrectCount}/${EVAL_TASKS.length}`;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت مجموعة الاختبارات.':'تم الإطلاق بعد المجموعة الحرجة فقط.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${accuracy} من مهام الملاءمة. هذه نتيجة لعملية التقييم البشرية، لا «درجة جودة للنموذج».</p></div><div class="view-panel"><h3>السلامة والجاهزية</h3><p>خلل السلامة لم يُسمح له بتجاوز البوابة: أُرسل للإصلاح وإعادة الاختبار. ${delayed?'ثم اكتمل نطاق التحقق قبل التشغيل.':'وبقي جزء من التحقق العام للمراقبة بعد الإطلاق.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">شاهد ما يختفي في التشغيل</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، اكتشاف خلل سلامة، إعادة اختبار وقرار جاهزية','نتائج تقييم وحدود تحقق موثقة','تفصل اللعبة بين أداء المقيّم وما تكشفه الاختبارات عن النظام، لكنها تجعل خلل السلامة بوابة فعلية قبل الإطلاق.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','','盾'],['مراجعو اللغة','','文']],'نتائج تقييم وتحقق','قراءة ومقارنة واختبار وحكم بشري أصبحت أدلة تستخدم في قرار الإطلاق وفي التطوير اللاحق.','ch8Intro'); }
  return { ch7Intro,evalTask,safetyTest,safetyOutcome,launchDecision,launchOutcome,abstract7 };
}
