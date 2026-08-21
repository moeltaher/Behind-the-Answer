import { EVAL_TASKS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const BASELINE_GATES = [
  ['اختبارات الانحدار', 'تحقق من أن التغيير لم يكسر سلوكًا كان يعمل في النسخة السابقة.'],
  ['الأداء والسعة', 'تحقق من أن الخدمة تعمل ضمن حدود الأداء والسعة التي يعتمد عليها التشغيل.'],
  ['السلامة والأمن والخصوصية', 'بوابات أساسية تناسب مخاطر النظام؛ اختبار السلامة التفاعلي في اللعبة يمثل جزءًا واحدًا منها.'],
  ['المراقبة وخطة التراجع', 'تأكد من وجود مؤشرات تشغيل وخطة لاستعادة نسخة سابقة إذا ظهرت مشكلة بعد الإطلاق.']
];

function hasUnresolved(check) {
  return check && Object.values(check).includes('unresolved');
}

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
    const journeyContext=task.journeyPrompt?'<div class="journey-prompt-note"><strong>هذا هو الطلب الذي بدأت به اللعبة.</strong><span>تعود إليه هنا حتى تظل مرحلة التقييم مرتبطة بالإجابة التي ستراها في النهاية.</span></div>':'';
    if(state.flags.evalFeedback){
      const feedback=state.flags.evalFeedback;
      html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">راجع سبب التقييم.</h1>${journeyContext}${sourceContext}<div class="alert ${feedback.correct?'goodish':'dangerish'}"><strong>${feedback.correct?'تقييمك يطابق معيار هذه المهمة':'تقييمك لا يطابق معيار هذه المهمة'}</strong><span>${ctx.h(task.explanation)}</span></div><p class="muted">هذا يقيس دقة عمل المقيّم في السيناريو، ولا يغيّر جودة النموذج لمجرد الضغط على إجابة صحيحة أو خاطئة.</p><div class="action-row"><button id="nextEval" class="primary-btn">المهمة التالية</button></div></div>`);
      $('#nextEval').addEventListener('click',()=>{ state.flags.evalFeedback=null; state.flags.evalIndex+=1; saveState(); evalTask(); });
      return;
    }
    html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">قارن الإجابتين وفق الطلب.</h1><div class="reality-note"><strong>ما الذي نقيسه هنا؟</strong> أنت لا «تحسن النموذج» بالضغط على زر. أنت تختبر مدى موثوقية عملية التقييم البشري في اكتشاف الإجابة الأنسب للسياق.</div>${journeyContext}${sourceContext}<div class="card flat"><strong>الطلب</strong><p>${ctx.h(task.prompt)}</p></div><div class="compare-card"><div class="response-card"><h4>الإجابة أ</h4><p>${ctx.h(task.a)}</p></div><div class="response-card"><h4>الإجابة ب</h4><p>${ctx.h(task.b)}</p></div></div><div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>الإجابة أ أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>الإجابة ب أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',event=>{
      const choice=event.currentTarget.dataset.eval;
      const correct=choice===task.good;
      if(correct) state.flags.evalCorrectCount+=1;
      state.flags.evalFeedback={choice,correct};
      saveState(); evalTask();
    });
  }

  function safetyTest() {
    html(`<div><span class="eyebrow">اختبار السلامة</span><h1 class="scene-title">اختبر حدود النموذج.</h1>${supportingRoleStrip(['safetyTester'],'من يعمل مع ريم الآن؟')}<p class="scene-subtitle">هذا اختبار مستقل عن الملاءمة اللغوية، لكنه مرتبط بقرار الجاهزية: خلل السلامة الذي يظهر هنا يجب أن يُعالج ثم يجتاز إعادة اختبار إلزامية قبل الوصول إلى قرار الإطلاق.</p><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    const roles=correct?['safetyTester']:['safetyTester','languageReviewer'];
    html(`<div><span class="eyebrow">بوابة السلامة</span><h1 class="scene-title">${correct?'اكتشفت خللًا يمنع المرور مباشرة إلى الإطلاق.':'لم تلتقط الخلل، لكن مراجعة ثانية أوقفته قبل الإطلاق.'}</h1>${supportingRoleStrip(roles,'من شارك في اكتشاف الخلل؟')}<div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب الإيقاف</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. الإصلاح وحده لا يكفي؛ يجب أن يعقبه إعادة اختبار إلزامية قبل قرار الجاهزية.</span></div><div class="stage-output"><strong>${correct?'اكتشاف مبكر':'اكتشاف في مراجعة ثانية'}</strong>${correct?'سيُرسل الخلل الآن للإصلاح ثم إلى إعادة اختبار سلامة مخصصة.':'تأخر الاكتشاف، لذلك يمر الإصلاح بإعادة اختبار أوسع مع مراجعة بشرية ثانية.'}</div><div class="action-row"><button id="remediateSafety" class="primary-btn">أرسل الخلل للإصلاح</button></div></div>`);
    $('#remediateSafety').addEventListener('click',()=>{
      state.flags.safetyRemediated=true;
      state.flags.safetyRetested=false;
      saveState(); go('safetyRetest');
    });
  }

  function safetyRetest() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    const caughtEarly=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">إعادة اختبار السلامة — إلزامية</span><h1 class="scene-title">أُصلح السلوك وأصبحت النسخة أمام اختبار البوابة من جديد.</h1>${supportingRoleStrip(['safetyTester'],'من ينفذ إعادة الاختبار؟')}<div class="card flat"><p><strong>النطاق:</strong> ${caughtEarly?'إعادة اختبار مخصصة للسلوك الذي ظهر في الاختبار الأول.':'إعادة اختبار أوسع مع مراجعة بشرية ثانية لأن الخلل لم يُكتشف في المحاولة الأولى.'}</p><p><strong>النتيجة في سيناريو اللعب:</strong> لم تعد الاستجابة تعطي التفاصيل التشغيلية التي أوقفت الإطلاق.</p></div><div class="stage-output"><strong>اجتازت بوابة السلامة التفاعلية</strong>هذه الخطوة تنهي إعادة اختبار الخلل الذي رأيته. لكنها لا تمثل وحدها كل شروط الإصدار الأساسية؛ ستظهر بوابات الإصدار الأساسية منفصلة عن أي أعمال تحقق إضافية أنشأتها اختيارات الرحلة.</div><div class="action-row"><button id="confirmSafetyRetest" class="primary-btn">ثبّت النتيجة وانتقل للجاهزية</button></div></div>`);
    $('#confirmSafetyRetest').addEventListener('click',()=>{
      state.flags.safetyRetested=true;
      addDecision(caughtEarly?'safety-caught':'safety-second-review',caughtEarly?'أوقفت خلل السلامة وأعدت اختباره':'احتاج خلل السلامة إلى مراجع ثانٍ ثم أُعيد اختباره',caughtEarly?'دخل الخلل مسار إصلاح ثم اجتاز إعادة اختبار إلزامية قبل قرار الجاهزية.':'تأخر اكتشاف الخلل، ثم دخل إصلاحًا وإعادة اختبار أوسع قبل قرار الجاهزية.');
      saveState(); go('launchDecision');
    });
  }

  function unresolvedPassedData() {
    let count=0;
    state.flags.dataStatuses.forEach((status,index)=>{ if(status==='ready'&&hasUnresolved(state.flags.dataChecks[index])) count+=1; });
    return count;
  }

  function verificationBundles() {
    const bundles=[];
    if(state.flags.trainingCheckpoint==='recent') bundles.push({ id:'checkpoint', title:'تحقق من تغيير نقطة الحفظ الأحدث', detail:'اختبر التغيير المستهدف لنبرة الرسائل العربية القصيرة بدل افتراض أنه حسّن السلوك لمجرد أنه أحدث.' });
    if(state.flags.trainingCompute==='8' && state.flags.trainingIncidentChoice==='continue') bundles.push({ id:'stability', title:'فحص استقرار بعد عطل الحوسبة', detail:'تحقق إضافي لأن الجولة استمرت عند الحد الأدنى المفترض من دون هامش سعة إضافي ومن دون تشخيص فوري.' });
    const unresolved=unresolvedPassedData();
    if(unresolved) bundles.push({ id:'data-governance', title:'حسم مسائل بيانات مرّت إلى التطوير', detail:`هناك ${unresolved} مواد دخلت الجولة رغم بقاء حقوق أو خصوصية أو ملاءمة غير محسومة. يجب حسم الاستخدام أو الاستبعاد/المعالجة بدل اعتبار المرور موافقة ضمنية.` });
    return bundles;
  }

  function baselineMarkup() {
    return `<div class="verification-bundles baseline-gates">${BASELINE_GATES.map(([title,detail])=>`<article class="card flat"><strong>${ctx.h(title)}</strong><p>${ctx.h(detail)}</p></article>`).join('')}</div>`;
  }

  function launchDecision() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    if(!state.flags.safetyRetested){ go('safetyRetest'); return; }
    const bundles=verificationBundles();
    const extraCopy=bundles.length===0?'لم تنشئ اختيارات الرحلة أعمال تحقق إضافية فوق البوابات الأساسية.':bundles.length===1?'أنشأت اختياراتك حزمة تحقق إضافية واحدة.':`أنشأت اختياراتك ${bundles.length} حزم تحقق إضافية.`;
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الجاهزية ليست مرادفًا لاجتياز اختبار السلامة وحده.</h1>${supportingRoleStrip(['releaseManager'],'من يملك قرار الموعد؟')}<div class="reality-note"><strong>بوابات إصدار أساسية</strong> هذه موجودة في السيناريو حتى لو لم يقع حدث خاص أثناء الرحلة. لا تمنحك نقاطًا ولا تنشأ من قرار سابق؛ هي الحد الأدنى الذي يمنع رسالة «لا توجد حزم» من أن تعني «لا يوجد شيء آخر للتحقق».</div>${baselineMarkup()}<div class="alert ${bundles.length?'dangerish':'goodish'}"><strong>أعمال إضافية سببية</strong><span>${extraCopy}</span></div>${bundles.length?`<div class="verification-bundles additional-bundles">${bundles.map(bundle=>`<article class="card flat"><strong>${ctx.h(bundle.title)}</strong><p>${ctx.h(bundle.detail)}</p></article>`).join('')}</div><div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أطلق بعد البوابات الأساسية وانقل الإضافي للمراقبة</strong><small>يحافظ على الموعد، لكنه يبدأ التشغيل مع بقاء الأعمال الإضافية المعروضة غير مكتملة.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق لإكمال الأعمال الإضافية</strong><small>يدفع وقتًا وحوسبة وعملًا إضافيًا لإغلاقها قبل التشغيل.</small></button></div>`:`<div class="action-row"><button id="launchReady" class="primary-btn">اعتمد البوابات الأساسية وأطلق</button></div>`}</div>`);
    $('#launchReady')?.addEventListener('click',()=>{ state.flags.launchChoice='ready'; addDecision('launch-ready','أطلقت بعد البوابات الأساسية','اكتملت بوابات الإصدار الأساسية ولم تكن هناك أعمال تحقق إضافية سببية من أحداث الرحلة.'); saveState(); go('launchOutcome'); });
    $('#criticalOnly')?.addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast','أطلقت مع بقاء تحقق إضافي','اكتملت البوابات الأساسية، لكن بعض أعمال التحقق الإضافية الناتجة عن اختيارات الرحلة انتقلت إلى التشغيل والمراقبة بعد الإطلاق.'); saveState(); go('launchOutcome'); });
    $('#delayLaunch')?.addEventListener('click',()=>{ state.flags.launchChoice='delay'; addDecision('launch-delay',`أجلت الإطلاق لإكمال ${bundles.length===1?'العمل الإضافي':'الأعمال الإضافية'}`,'اكتملت البوابات الأساسية ثم تحملت الشركة تكلفة إغلاق أعمال التحقق الإضافية قبل التشغيل.'); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    const ready=state.flags.launchChoice==='ready';
    const accuracy=`${state.flags.evalCorrectCount}/${EVAL_TASKS.length}`;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت الأعمال الإضافية بعد البوابات الأساسية.':ready?'تم الإطلاق بعد اكتمال البوابات الأساسية.':'تم الإطلاق بعد البوابات الأساسية مع نقل التحقق الإضافي غير المكتمل إلى المراقبة.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${accuracy} من مهام الملاءمة. هذه نتيجة لعملية التقييم البشرية، لا «درجة جودة للنموذج».</p></div><div class="view-panel"><h3>السلامة والجاهزية</h3><p>خلل السلامة أُصلح ثم اجتاز إعادة الاختبار. البوابات الأساسية للإصدار ظلت منفصلة عن هذا الخلل وعن الحزم الإضافية. ${delayed?'واكتملت الأعمال الإضافية قبل التشغيل.':ready?'ولم ينشأ من مسارك عمل إضافي فوقها.':'أما الأعمال الإضافية فانتقلت إلى المراقبة بعد الإطلاق.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">شاهد ما يختفي في التشغيل</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، اختبار سلامة، بوابات إصدار أساسية، وحزم تحقق إضافية عند الحاجة','نتائج تقييم وقرار جاهزية موثق','فصلت المرحلة بين بوابات الإصدار الأساسية وبين أعمال تحقق إضافية نشأت سببيًا من اختيارات الرحلة.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','اختبار بوابة السلامة',''],['مراجعو اللغة','مراجعة سياق ولغة','']],'نتائج تقييم وتحقق','القراءة والمقارنة والاختبار والحكم البشري أصبحت أدلة تستخدم في قرار الإطلاق وفي التطوير اللاحق، بينما تبقى الجاهزية عملية متعددة البوابات.','ch8Intro'); }

  return { ch7Intro,evalTask,safetyTest,safetyOutcome,safetyRetest,launchDecision,launchOutcome,abstract7 };
}
