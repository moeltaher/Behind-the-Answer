import { EVAL_TASKS } from '../data/content-tasks.js';
import { supportingActor } from '../data/supporting-actors.js';

export function createEvaluationRoutes(ctx) {
  const $ = ctx.$;
  const $$ = ctx.$$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word,line,next);

  function roleCard(actorId) {
    const actor=supportingActor(actorId);
    return `<article class="support-role-card"><img src="${ctx.h(actor.image)}" alt="" aria-hidden="true"><span><strong>${ctx.h(actor.name)}</strong><small>${ctx.h(actor.role)}</small></span></article>`;
  }

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
    html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">قارن الإجابتين وفق الطلب.</h1><div class="reality-note"><strong>ما الذي نقيسه هنا؟</strong> أنت لا «تحسن النموذج» بالضغط على زر. أنت تختبر مدى موثوقية عملية التقييم البشري في اكتشاف الإجابة الأنسب للسياق. إحدى المهام تعود إلى الطلب الذي بدأت به اللعبة حتى يظل المسار مرتبطًا بالإجابة نفسها.</div>${sourceContext}<div class="card flat"><strong>الطلب</strong><p>${ctx.h(task.prompt)}</p></div><div class="compare-card"><div class="response-card"><h4>الإجابة أ</h4><p>${ctx.h(task.a)}</p></div><div class="response-card"><h4>الإجابة ب</h4><p>${ctx.h(task.b)}</p></div></div><div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>الإجابة أ أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>الإجابة ب أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',event=>{
      const choice=event.currentTarget.dataset.eval;
      const correct=choice===task.good;
      if(correct) state.flags.evalCorrectCount+=1;
      state.flags.evalFeedback={choice,correct};
      saveState(); evalTask();
    });
  }

  function safetyTest() {
    html(`<div><span class="eyebrow">اختبار السلامة</span><h1 class="scene-title">اختبر حدود النموذج.</h1><div class="support-role-strip">${roleCard('safetyTester')}</div><p class="scene-subtitle">هذا اختبار مستقل عن الملاءمة اللغوية، لكنه مرتبط بقرار الجاهزية: خلل السلامة الذي يظهر هنا يجب أن يُعالج ثم يجتاز إعادة اختبار إلزامية قبل الوصول إلى قرار الإطلاق.</p><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">بوابة السلامة</span><h1 class="scene-title">${correct?'اكتشفت خللًا يمنع المرور مباشرة إلى الإطلاق.':'لم تلتقط الخلل، لكن مراجعة ثانية أوقفته قبل الإطلاق.'}</h1><div class="support-role-strip">${roleCard('safetyTester')}${!correct?roleCard('languageReviewer'):''}</div><div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب الإيقاف</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. الإصلاح وحده لا يكفي؛ يجب أن يعقبه إعادة اختبار إلزامية قبل قرار الجاهزية.</span></div><div class="stage-output"><strong>${correct?'اكتشاف مبكر':'اكتشاف في مراجعة ثانية'}</strong>${correct?'سيُرسل الخلل الآن للإصلاح ثم إلى إعادة اختبار سلامة مخصصة.':'تأخر الاكتشاف، لذلك يمر الإصلاح بإعادة اختبار أوسع مع مراجعة بشرية ثانية.'}</div><div class="action-row"><button id="remediateSafety" class="primary-btn">أرسل الخلل للإصلاح</button></div></div>`);
    $('#remediateSafety').addEventListener('click',()=>{
      state.flags.safetyRemediated=true;
      state.flags.safetyRetested=false;
      saveState(); go('safetyRetest');
    });
  }

  function safetyRetest() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    const caughtEarly=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">إعادة اختبار السلامة — إلزامية</span><h1 class="scene-title">أُصلح السلوك وأصبحت النسخة أمام اختبار البوابة من جديد.</h1><div class="support-role-strip">${roleCard('safetyTester')}</div><div class="card flat"><p><strong>النطاق:</strong> ${caughtEarly?'إعادة اختبار مخصصة للسلوك الذي ظهر في الاختبار الأول.':'إعادة اختبار أوسع مع مراجعة بشرية ثانية لأن الخلل لم يُكتشف في المحاولة الأولى.'}</p><p><strong>النتيجة في سيناريو اللعب:</strong> لم تعد الاستجابة تعطي التفاصيل التشغيلية التي أوقفت الإطلاق.</p></div><div class="stage-output"><strong>اجتازت بوابة السلامة</strong>هذه الخطوة تنهي إعادة اختبار السلامة نفسها. أي حزم تظهر بعد ذلك ستكون أعمال تحقق أخرى نشأت من اختيارات التدريب، ولن تُكرر إعادة اختبار السلامة.</div><div class="action-row"><button id="confirmSafetyRetest" class="primary-btn">ثبّت نتيجة إعادة الاختبار وانتقل للجاهزية</button></div></div>`);
    $('#confirmSafetyRetest').addEventListener('click',()=>{
      state.flags.safetyRetested=true;
      addDecision(caughtEarly?'safety-caught':'safety-second-review',caughtEarly?'أوقفت خلل السلامة وأعدت اختباره':'احتاج خلل السلامة إلى مراجع ثانٍ ثم أُعيد اختباره',caughtEarly?'دخل الخلل مسار إصلاح ثم اجتاز إعادة اختبار إلزامية قبل قرار الجاهزية.':'تأخر اكتشاف الخلل، ثم دخل إصلاحًا وإعادة اختبار أوسع قبل قرار الجاهزية.');
      saveState(); go('launchDecision');
    });
  }

  function verificationBundles() {
    const bundles=[];
    if(state.flags.trainingCheckpoint==='recent') bundles.push({ id:'checkpoint', title:'تحقق من تغيير نقطة الحفظ الأحدث', detail:'اختبر التغيير المستهدف لنبرة الرسائل العربية القصيرة بدل افتراض أنه حسّن السلوك لمجرد أنه أحدث.' });
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') bundles.push({ id:'stability', title:'فحص استقرار بعد عطل الحوسبة', detail:'تحقق إضافي لأن الجولة استمرت بهامش أعطال أضيق من دون تشخيص فوري.' });
    return bundles;
  }

  function launchDecision() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    if(!state.flags.safetyRetested){ go('safetyRetest'); return; }
    const bundles=verificationBundles();
    const releaseManager=roleCard('releaseManager');
    if(!bundles.length){
      html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">بوابة السلامة مكتملة ولا توجد حزم تحقق سببية متبقية في هذا المسار.</h1><div class="support-role-strip">${releaseManager}</div><p class="scene-subtitle">هذا لا يعني أن النظام صار خاليًا من المخاطر؛ يعني فقط أن الأحداث التي رأيتها في هذه الجولة لم تُنشئ عمل تحقق إضافيًا محددًا قبل الموعد.</p><div class="action-row"><button id="launchReady" class="primary-btn">اعتمد الجاهزية وأطلق</button></div></div>`);
      $('#launchReady').addEventListener('click',()=>{ state.flags.launchChoice='ready'; addDecision('launch-ready','أطلقت بعد اكتمال البوابة الإلزامية','لم تكن هناك حزم تحقق سببية متبقية من أحداث الجولة، فانتقلت النسخة إلى التشغيل مع المراقبة المعتادة.'); saveState(); go('launchOutcome'); });
      return;
    }
    const countLabel=bundles.length===1?'حزمة تحقق واحدة':`${bundles.length} حزم تحقق`;
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الإطلاق غدًا. بقيت ${countLabel} غير مرتبطة بالسلامة.</h1><div class="support-role-strip">${releaseManager}</div><p class="scene-subtitle">إعادة اختبار السلامة انتهت بالفعل واجتازت البوابة. المعروض هنا أعمال تحقق أخرى نتجت فقط من اختياراتك في جولة التطوير.</p><div class="verification-bundles">${bundles.map(bundle=>`<article class="card flat"><strong>${ctx.h(bundle.title)}</strong><p>${ctx.h(bundle.detail)}</p></article>`).join('')}</div><div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أطلق في الموعد وانقل ما تبقى للمراقبة</strong><small>يحافظ على الموعد، لكنه يبدأ التشغيل مع بقاء أعمال التحقق المعروضة غير مكتملة.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق لإكمال الحزم</strong><small>يدفع وقتًا وحوسبة وعملًا إضافيًا لإغلاق كل الأعمال المعروضة قبل التشغيل.</small></button></div></div>`);
    $('#criticalOnly').addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast','أطلقت مع بقاء تحقق غير متعلق بالسلامة','حافظت على الموعد بينما انتقلت أعمال التحقق المعروضة إلى التشغيل والمراقبة بعد الإطلاق.'); saveState(); go('launchOutcome'); });
    $('#delayLaunch').addEventListener('click',()=>{ state.flags.launchChoice='delay'; addDecision('launch-delay',`أجلت الإطلاق لإكمال ${bundles.length===1?'حزمة التحقق':'حزم التحقق'}`,'انتقلت تكلفة التحقق إلى الشركة والجدول بدل بدء التشغيل قبل إغلاق الأعمال المعروضة.'); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    const ready=state.flags.launchChoice==='ready';
    const accuracy=`${state.flags.evalCorrectCount}/${EVAL_TASKS.length}`;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت حزم التحقق.':ready?'تم الإطلاق بعد اكتمال البوابة الإلزامية.':'تم الإطلاق في الموعد مع نقل التحقق غير المكتمل إلى المراقبة.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${accuracy} من مهام الملاءمة. هذه نتيجة لعملية التقييم البشرية، لا «درجة جودة للنموذج».</p></div><div class="view-panel"><h3>السلامة والجاهزية</h3><p>خلل السلامة أُصلح ثم اجتاز إعادة الاختبار قبل الوصول إلى هذه الشاشة. ${delayed?'ثم اكتملت حزم التحقق الأخرى قبل التشغيل.':ready?'ولم ينشأ من مسارك عمل تحقق سببي إضافي قبل التشغيل.':'أما أعمال التحقق الأخرى فانتقلت إلى المراقبة بعد الإطلاق.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">شاهد ما يختفي في التشغيل</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، اكتشاف خلل سلامة، إصلاحه وإعادة اختباره وقرار جاهزية','نتائج تقييم وحزم تحقق موثقة','إعادة اختبار السلامة بوابة إلزامية مكتملة قبل أن تظهر أي أعمال تحقق أخرى.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','اختبار بوابة السلامة',''],['مراجعو اللغة','مراجعة سياق ولغة','']],'نتائج تقييم وتحقق','القراءة والمقارنة والاختبار والحكم البشري أصبحت أدلة تستخدم في قرار الإطلاق وفي التطوير اللاحق.','ch8Intro'); }

  return { ch7Intro,evalTask,safetyTest,safetyOutcome,safetyRetest,launchDecision,launchOutcome,abstract7 };
}
