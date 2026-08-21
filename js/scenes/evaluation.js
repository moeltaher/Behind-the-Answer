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
    html(`<div><span class="eyebrow">اختبار السلامة</span><h1 class="scene-title">اختبر حدود النموذج.</h1><p class="scene-subtitle">هذا اختبار مستقل عن الملاءمة اللغوية. المطلوب اكتشاف ما إذا كان الرد يكشف مادة خطرة رغم صيغة الرفض.</p><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">نتيجة اختبار السلامة</span><h1 class="scene-title">${correct?'التقطت مشكلة السلامة الأساسية.':'فاتتك مشكلة السلامة الأساسية.'}</h1><div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب التقييم</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. تسجل اللعبة هذه النتيجة كقدرة المقيّم على اكتشاف خلل سلامة، لا كتغيير آلي في جودة النموذج.</span></div><div class="action-row"><button id="toLaunch" class="primary-btn">انتقل إلى قرار الإطلاق</button></div></div>`);
    $('#toLaunch').addEventListener('click',()=>go('launchDecision'));
  }

  function remainingVerification() {
    let count = 12;
    if(state.flags.trainingCheckpoint==='recent') count += 4;
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') count += 2;
    return count;
  }

  function launchDecision() {
    const remaining=remainingVerification();
    const reasons=[];
    if(state.flags.trainingCheckpoint==='recent') reasons.push('نقطة الحفظ الأحدث أضافت اختبارات تحقق من التغييرات');
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') reasons.push('استمرار الجولة بهامش ضيق أضاف فحص استقرار إضافيًا');
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الإطلاق غدًا. بقي ${remaining} اختبارًا.</h1><p class="scene-subtitle">عدد الاختبارات المتبقية يتأثر الآن بقرارات سابقة في التدريب، بدل أن تختفي آثارها عند نهاية المرحلة.</p>${reasons.length?`<div class="card flat"><strong>لماذا العدد ${remaining}؟</strong><div class="view-list">${reasons.map(reason=>`<span>${ctx.h(reason)}</span>`).join('')}</div></div>`:''}<div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أكمل الاختبارات الحرجة فقط</strong><small>يحافظ على الموعد، لكن جزءًا من نطاق التحقق المتبقي سينتقل إلى المراقبة بعد الإطلاق.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق</strong><small>يدفع وقتًا وحوسبة وعملًا إضافيًا لإكمال المجموعة المتبقية.</small></button></div></div>`);
    $('#criticalOnly').addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast',`أطلقت مع ${remaining} اختبارًا متبقيًا قبل الاقتصار على الحرجة`,'حافظت على الموعد بينما انتقل جزء أكبر من عدم اليقين إلى التشغيل والمراقبة بعد الإطلاق.',{pressure:7,cost:-5,burden:5,reliability:-6}); saveState(); go('launchOutcome'); });
    $('#delayLaunch').addEventListener('click',()=>{ state.flags.launchChoice='delay'; addDecision('launch-delay',`أجلت الإطلاق لإكمال ${remaining} اختبارًا`,'انتقلت تكلفة التحقق إلى الشركة والجدول بدل تركها كمخاطرة غير مختبرة في التشغيل.',{pressure:-6,cost:8,burden:-2,reliability:8}); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    const accuracy=`${state.flags.evalCorrectCount}/${EVAL_TASKS.length}`;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت مجموعة الاختبارات.':'تم الإطلاق بعد المجموعة الحرجة فقط.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${accuracy} من مهام الملاءمة. هذه نتيجة لعملية التقييم البشرية، لا «درجة جودة للنموذج».</p></div><div class="view-panel"><h3>جاهزية الإطلاق</h3><p>${delayed?'أكملت نطاق التحقق في السيناريو قبل الانتقال للتشغيل.':'انتقل جزء من عدم اليقين إلى مرحلة التشغيل، ولذلك ستكون المراقبة بعد الإطلاق أكثر أهمية.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">انتقل إلى تشغيل الخدمة</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، اختبار سلامة وقرار جاهزية','نتائج تقييم وحدود تحقق موثقة','تفصل اللعبة بين جودة عملية التقييم وما تكشفه عن النموذج وبين قرار الجاهزية للإطلاق.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','','🛡'],['مراجعو اللغة','','文']],'نتائج تقييم وتحقيق','قراءة ومقارنة واختبار وحكم بشري أصبحت أدلة تستخدم في قرار الإطلاق وفي التطوير اللاحق.','ch8Intro'); }
  return { ch7Intro,evalTask,safetyTest,safetyOutcome,launchDecision,launchOutcome,abstract7 };
}
