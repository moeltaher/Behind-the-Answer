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
      html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">راجع سبب التقييم.</h1>${sourceContext}<div class="alert ${feedback.correct?'goodish':'dangerish'}"><strong>${feedback.correct?'تقييمك يطابق معيار هذه المهمة':'تقييمك لا يطابق معيار هذه المهمة'}</strong><span>${ctx.h(task.explanation)}</span></div><p class="muted">هذا يقيس دقة عمل المقيّم في السيناريو، ولا يغيّر جودة النموذج لمجرد الضغط على إجابة صحيحة أو خاطئة.</p><div class="action-row"><button id="nextEval" class="primary-btn">المهمة التالية</button></div></div>`);
      $('#nextEval').addEventListener('click',()=>{ state.flags.evalFeedback=null; state.flags.evalIndex+=1; saveState(); evalTask(); });
      return;
    }
    html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">قارن الإجابتين وفق الطلب.</h1><div class="reality-note"><strong>ما الذي نقيسه هنا؟</strong> أنت لا «تحسن النموذج» بالضغط على زر. أنت تختبر مدى موثوقية عملية التقييم البشري في اكتشاف الإجابة الأنسب للسياق.</div>${sourceContext}<div class="card flat"><strong>الطلب</strong><p>${ctx.h(task.prompt)}</p></div><div class="compare-card"><div class="response-card"><h4>الإجابة أ</h4><p>${ctx.h(task.a)}</p></div><div class="response-card"><h4>الإجابة ب</h4><p>${ctx.h(task.b)}</p></div></div><div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>الإجابة أ أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>الإجابة ب أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',event=>{
      const choice=event.currentTarget.dataset.eval;
      const correct=choice===task.good;
      if(correct) state.flags.evalCorrectCount+=1;
      state.flags.evalFeedback={choice,correct};
      saveState(); evalTask();
    });
  }

  function safetyTest() {
    html(`<div><span class="eyebrow">اختبار السلامة</span><h1 class="scene-title">اختبر حدود النموذج.</h1><p class="scene-subtitle">هذا اختبار مستقل عن الملاءمة اللغوية، لكنه مرتبط بقرار الجاهزية: خلل السلامة الذي يظهر هنا يجب أن يُعالج قبل الإطلاق.</p><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">بوابة السلامة</span><h1 class="scene-title">${correct?'اكتشفت خللًا يمنع المرور مباشرة إلى الإطلاق.':'لم تلتقط الخلل، لكن المراجعة الثانية أوقفته قبل الإطلاق.'}</h1><div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب الإيقاف</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. يجب إصلاح السلوك وإعادة اختباره قبل قرار الجاهزية.</span></div><div class="stage-output"><strong>${correct?'اكتشاف مبكر':'اكتشاف في مراجعة ثانية'}</strong>${correct?'ستظهر حزمة إعادة اختبار سلامة بعد الإصلاح.':'ستظهر مراجعة بشرية إضافية مع حزمة إعادة اختبار أوسع بعد الإصلاح.'}</div><div class="action-row"><button id="remediateSafety" class="primary-btn">أرسل الخلل للإصلاح وأعد اختباره</button></div></div>`);
    $('#remediateSafety').addEventListener('click',()=>{
      state.flags.safetyRemediated=true;
      addDecision(correct?'safety-caught':'safety-second-review',correct?'أوقفت خلل السلامة قبل الإطلاق':'احتاج خلل السلامة إلى مراجع ثانٍ لاكتشافه',correct?'دخل الخلل مسار إصلاح وإعادة اختبار قبل قرار الجاهزية.':'تأخر اكتشاف الخلل حتى المراجعة الثانية، ثم دخل مسار إصلاح وإعادة اختبار أوسع.');
      saveState(); go('launchDecision');
    });
  }

  function verificationBundles() {
    const bundles=[{ id:'safety', title:'إعادة اختبار السلامة', detail: state.flags.safetyChoice==='details' ? 'تحقق مخصص من السلوك الذي أُصلح.' : 'إعادة اختبار سلامة مع مراجعة بشرية ثانية بسبب تأخر اكتشاف الخلل.' }];
    if(state.flags.trainingCheckpoint==='recent') bundles.unshift({ id:'checkpoint', title:'تحقق من تغييرات نقطة الحفظ', detail:'مراجعة ما تغير في checkpoint الأحدث قبل إطلاقه.' });
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') bundles.push({ id:'stability', title:'فحص استقرار بعد عطل الحوسبة', detail:'تحقق إضافي لأن الجولة استمرت بهامش أعطال أضيق من دون تشخيص فوري.' });
    return bundles;
  }

  function launchDecision() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    const bundles=verificationBundles();
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الإطلاق غدًا. بقيت ${bundles.length===1?'حزمة تحقق واحدة':`${bundles.length} حزم تحقق`}.</h1><p class="scene-subtitle">بدل رقم اختبارات مصطنع، تعرض اللعبة الآن أعمال التحقق نفسها التي نشأت من الأحداث التي رأيتها.</p><div class="verification-bundles">${bundles.map(bundle=>`<article class="card flat"><strong>${ctx.h(bundle.title)}</strong><p>${ctx.h(bundle.detail)}</p></article>`).join('')}</div><div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أنهِ الحد الحرج وأطلق</strong><small>يحافظ على الموعد، بينما تنتقل بعض أعمال التحقق العامة إلى المراقبة بعد الإطلاق. إعادة اختبار السلامة نفسها لا تُتجاوز.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق لإكمال الحزم</strong><small>يدفع وقتًا وحوسبة وعملًا إضافيًا لإغلاق كل أعمال التحقق المعروضة قبل التشغيل.</small></button></div></div>`);
    $('#criticalOnly').addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast','أطلقت بعد إكمال الحد الحرج من التحقق','حافظت على الموعد بينما انتقل جزء من التحقق العام إلى التشغيل والمراقبة بعد الإطلاق.'); saveState(); go('launchOutcome'); });
    $('#delayLaunch').addEventListener('click',()=>{ state.flags.launchChoice='delay'; addDecision('launch-delay',`أجلت الإطلاق لإكمال ${bundles.length===1?'حزمة التحقق':'حزم التحقق'}`,'انتقلت تكلفة التحقق إلى الشركة والجدول بدل تركها كمخاطرة غير مختبرة في التشغيل.'); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    const accuracy=`${state.flags.evalCorrectCount}/${EVAL_TASKS.length}`;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت حزم التحقق.':'تم الإطلاق بعد الحد الحرج من التحقق.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${accuracy} من مهام الملاءمة. هذه نتيجة لعملية التقييم البشرية، لا «درجة جودة للنموذج».</p></div><div class="view-panel"><h3>السلامة والجاهزية</h3><p>خلل السلامة لم يُسمح له بتجاوز البوابة: أُصلح وأعيد اختباره. ${delayed?'ثم اكتملت حزم التحقق المعروضة قبل التشغيل.':'وبقي جزء من التحقق العام للمراقبة بعد الإطلاق.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">شاهد ما يختفي في التشغيل</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، اكتشاف خلل سلامة، إعادة اختبار وقرار جاهزية','نتائج تقييم وحزم تحقق موثقة','تعرض اللعبة أعمال التحقق نفسها بدل اختزالها في عدد اختبارات غير مشتق.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','','盾'],['مراجعو اللغة','','文']],'نتائج تقييم وتحقق','القراءة والمقارنة والاختبار والحكم البشري أصبحت أدلة تستخدم في قرار الإطلاق وفي التطوير اللاحق.','ch8Intro'); }
  return { ch7Intro,evalTask,safetyTest,safetyOutcome,launchDecision,launchOutcome,abstract7 };
}
