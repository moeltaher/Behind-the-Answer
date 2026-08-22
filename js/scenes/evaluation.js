import { EVAL_TASKS, DATA_ITEMS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const CHECKPOINT_SAMPLES = [
  {
    id:'apology',
    prompt:'اكتب اعتذارًا قصيرًا عن تأخر تسليم مهمة.',
    a:'أود أن أتقدم باعتذاري عن التأخر في التسليم، وسأوافيكم بالمهمة في أقرب وقت ممكن.',
    b:'أعتذر عن التأخر في التسليم. أستكمل المهمة الآن وسأرسلها في أقرب وقت.',
    good:'b',
    explanation:'الناتج ب أقصر وأكثر طبيعية مع الحفاظ على المقصود؛ وهو السلوك الذي استهدفه التغيير الأحدث.'
  },
  {
    id:'legal',
    prompt:'اختصر: «يجوز التقديم خلال 30 يومًا، ويستثنى من يثبت تعذر وصول الإخطار إليه».',
    a:'التقديم خلال 30 يومًا، مع استثناء من يثبت تعذر وصول الإخطار إليه.',
    b:'يجب التقديم خلال 30 يومًا.',
    good:'a',
    explanation:'الناتج ب أقصر لكنه حذف قيدًا جوهريًا. التحسين المستهدف في الإيجاز لا يبرر فقد المعنى.'
  },
  {
    id:'friendly',
    prompt:'اكتب رسالة قصيرة لصديق لتأجيل موعد ساعة واحدة.',
    a:'أرجو التكرم بالموافقة على تأجيل موعدنا لمدة ساعة بسبب ظرف طارئ.',
    b:'محتاج أأجل ميعادنا ساعة لو مناسب لك. حصل ظرف طارئ.',
    good:'b',
    explanation:'الناتج ب أقرب للنبرة المطلوبة في رسالة قصيرة غير رسمية.'
  }
];

const RELEASE_GATES = [
  {
    id:'regression',
    title:'اختبارات الانحدار',
    evidence:'18 من 18 سيناريو وظيفي أساسي اجتازت الاختبار بعد تثبيت النسخة المرشحة.',
    ready:'لا يظهر انحدار وظيفي في مجموعة السيناريو الحالية.'
  },
  {
    id:'capacity',
    title:'الأداء والسعة',
    evidence:'زمن الاستجابة ضمن الحد الافتراضي، لكن ذروة استخدام الذاكرة 92% بينما حد التنبيه في هذا السيناريو 90%.',
    ready:'بعد التحقيق وتعديل الإعداد، أعيد الاختبار وأصبحت الذروة 84% مع بقاء زمن الاستجابة ضمن الحد.'
  },
  {
    id:'risk',
    title:'السلامة والخصوصية وحوكمة البيانات',
    evidence:'إعادة اختبار السلامة اجتازت، ولا توجد مادة مستخدمة في النسخة المرشحة تحمل مسألة حوكمة غير محسومة.',
    ready:'بوابة المخاطر المعروضة في السيناريو مستوفاة.'
  },
  {
    id:'rollback',
    title:'المراقبة وخطة التراجع',
    evidence:'مؤشرات الأخطاء والذاكرة جاهزة، والنسخة السابقة محفوظة، وتجربة rollback في البيئة الاختبارية نجحت.',
    ready:'توجد مراقبة ومسار تراجع قابل للتنفيذ في السيناريو.'
  }
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
    if(index>=EVAL_TASKS.length){ go('checkpointEval'); return; }
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

  function checkpointEval() {
    if(state.flags.checkpointEvalComplete){
      const recent=state.flags.trainingCheckpoint==='recent';
      html(`<div><span class="eyebrow">تقييم فرضية checkpoint</span><h1 class="scene-title">اكتملت المقارنة المستهدفة قبل اختبار السلامة.</h1><div class="alert goodish"><strong>النتيجة ليست «الأحدث أفضل دائمًا»</strong><span>تحسن هدف الإيجاز والنبرة في حالتين، بينما خسرت النسخة الأحدث قيدًا جوهريًا في حالة قانونية. ${recent?'اخترت النسخة الأحدث، لذلك سيبقى تحقق أوسع من هذا التغيير ضمن أعمال الإصدار الإضافية.':'اخترت النسخة الأكثر اختبارًا، فالمقارنة تظل دليلًا على سبب عدم إعلان تفوق عام للنسخة الأحدث.'}</span></div><div class="action-row"><button id="toSafety" class="primary-btn">انتقل إلى اختبار السلامة</button></div></div>`);
      $('#toSafety').addEventListener('click',()=>go('safetyTest'));
      return;
    }
    html(`<div><span class="eyebrow">تقييم فرضية checkpoint</span><h1 class="scene-title">قارن نتائج فعلية قبل أن تحكم على التغيير المستهدف.</h1><p class="scene-subtitle">كل صف يعرض ناتجين من نقطتي حفظ مختلفتين بترتيب لا تعتمد عليه في الحكم. اختر الأنسب للطلب نفسه؛ الهدف هو اختبار أثر الإيجاز والنبرة من دون مكافأة الحداثة بذاتها.</p><div class="evidence-results">${CHECKPOINT_SAMPLES.map((sample,index)=>`<article class="card"><span class="kicker">العينة ${index+1}</span><p><strong>الطلب:</strong> ${ctx.h(sample.prompt)}</p><div class="compare-card"><div class="response-card"><h4>الناتج أ</h4><p>${ctx.h(sample.a)}</p></div><div class="response-card"><h4>الناتج ب</h4><p>${ctx.h(sample.b)}</p></div></div><label class="form-row"><span>أي ناتج أنسب؟</span><select data-checkpoint-sample="${sample.id}"><option value="">اختر…</option><option value="a">الناتج أ</option><option value="b">الناتج ب</option></select></label></article>`).join('')}</div><div class="decision-feedback-inline" id="checkpointFeedback" hidden role="status"></div><div class="action-row"><button id="checkCheckpoint" class="primary-btn">تحقق من المقارنة</button></div></div>`);
    $('#checkCheckpoint').addEventListener('click',()=>{
      const answers=Object.fromEntries($$('[data-checkpoint-sample]').map(select=>[select.dataset.checkpointSample,select.value]));
      const wrong=CHECKPOINT_SAMPLES.filter(sample=>answers[sample.id]!==sample.good);
      const feedback=$('#checkpointFeedback');
      if(wrong.length){
        feedback.hidden=false;
        feedback.innerHTML=`<strong>${wrong.length} من ${CHECKPOINT_SAMPLES.length} تحتاج مراجعة.</strong><span>${wrong.map(sample=>sample.explanation).join(' ')}</span>`;
        return;
      }
      state.flags.checkpointEvalComplete=true;
      addDecision('checkpoint-evidence-reviewed','قارنت checkpoint على أمثلة مرتبطة بهدف التغيير','وجدت تحسنًا مستهدفًا في بعض الأمثلة مع تراجع في مثال آخر؛ لذلك بنيت الحكم على الأدلة لا على كون النسخة أحدث.');
      saveState(); checkpointEval();
    });
  }

  function safetyTest() {
    if(!state.flags.checkpointEvalComplete){ go('checkpointEval'); return; }
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
    html(`<div><span class="eyebrow">إعادة اختبار السلامة — إلزامية</span><h1 class="scene-title">أُصلح السلوك وأصبحت النسخة أمام اختبار البوابة من جديد.</h1>${supportingRoleStrip(['safetyTester'],'من ينفذ إعادة الاختبار؟')}<div class="card flat"><p><strong>النطاق:</strong> ${caughtEarly?'إعادة اختبار مخصصة للسلوك الذي ظهر في الاختبار الأول.':'إعادة اختبار أوسع مع مراجعة بشرية ثانية لأن الخلل لم يُكتشف في المحاولة الأولى.'}</p><p><strong>النتيجة في سيناريو اللعب:</strong> لم تعد الاستجابة تعطي التفاصيل التشغيلية التي أوقفت الإطلاق.</p></div><div class="stage-output"><strong>اجتازت بوابة السلامة التفاعلية</strong>هذه الخطوة تنهي إعادة اختبار الخلل الذي رأيته. لكنها لا تمثل وحدها كل شروط الإصدار الأساسية؛ ستراجع بعد ذلك أدلة بوابات إصدار مستقلة.</div><div class="action-row"><button id="confirmSafetyRetest" class="primary-btn">ثبّت النتيجة وانتقل للجاهزية</button></div></div>`);
    $('#confirmSafetyRetest').addEventListener('click',()=>{
      state.flags.safetyRetested=true;
      addDecision(caughtEarly?'safety-caught':'safety-second-review',caughtEarly?'أوقفت خلل السلامة وأعدت اختباره':'احتاج خلل السلامة إلى مراجع ثانٍ ثم أُعيد اختباره',caughtEarly?'دخل الخلل مسار إصلاح ثم اجتاز إعادة اختبار إلزامية قبل قرار الجاهزية.':'تأخر اكتشاف الخلل، ثم دخل إصلاحًا وإعادة اختبار أوسع قبل قرار الجاهزية.');
      saveState(); go('launchDecision');
    });
  }

  function exposedUnresolvedIndices() {
    return state.flags.dataTrainingUsed.filter(index=>state.flags.dataStatuses[index]==='ready'&&hasUnresolved(state.flags.dataChecks[index]));
  }

  function resolveGovernance(index) {
    const item=DATA_ITEMS[index];
    if(item?.type==='code') {
      state.flags.dataChecks[index]={...state.flags.dataChecks[index],rights:'clear'};
      addDecision(`data-license-evidence-${index}`,`راجعت دليل ترخيص المادة ${index+1}`,'كشف الفحص المتعمق في سيناريو اللعبة ترخيصًا يسمح بالاستخدام المقصود، ولذلك حُسمت مسألة الحقوق بدليل محدد بدل تحويل unresolved إلى clear بلا سبب.');
    } else {
      state.flags.dataStatuses[index]='excluded';
      state.flags.dataChecks[index]={rights:'na',privacy:'na',fitness:'na'};
      addDecision(`data-retrain-without-${index}`,`تخلصت من النسخة وأعدت الجولة دون المادة ${index+1}`,'لأن المادة كانت قد دخلت post-training بالفعل ولم يكن الحاجب قابلًا للحسم بمجرد نقرة، بقي تاريخ استخدامها محفوظًا وتطلب العلاج إعادة الجولة من نقطة سابقة من دونها.');
    }
    saveState(); launchDecision();
  }

  function gateComplete(id) { return state.flags.releaseGates.includes(id); }
  function capacityInvestigated() { return state.decisions.some(decision=>decision.id==='release-capacity-investigated'); }

  function gateMarkup(gate) {
    const complete=gateComplete(gate.id);
    if(complete) return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p>${ctx.h(gate.ready)}</p><span class="task-status task-status--complete">✓ اجتازت بناء على الدليل</span></article>`;
    if(gate.id==='capacity'&&!capacityInvestigated()) return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p><b>الدليل:</b> ${ctx.h(gate.evidence)}</p><button class="secondary-btn" data-gate-investigate="capacity" type="button">حقق في تجاوز حد الذاكرة</button></article>`;
    const evidence=gate.id==='capacity'?gate.ready:gate.evidence;
    return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p><b>الدليل:</b> ${ctx.h(evidence)}</p><div class="choice-grid"><button class="secondary-btn" data-gate-pass="${gate.id}" type="button">اعتمد البوابة</button>${gate.id!=='capacity'?`<button class="secondary-btn" data-gate-question="${gate.id}" type="button">اعتبرها غير جاهزة</button>`:''}</div><div class="decision-feedback-inline" data-gate-feedback="${gate.id}" hidden role="status"></div></article>`;
  }

  function neededExtraChecks() {
    const result=[];
    if(state.flags.trainingCheckpoint==='recent') result.push(['checkpoint','شغّل مجموعة أوسع للتحقق من أن تحسن النبرة لا يخفي انحدارات خارج العينات الثلاث.']);
    if(state.flags.trainingCompute==='8'&&state.flags.trainingIncidentChoice==='continue') result.push(['stability','افحص استقرار الجولة التي استمرت عند الحد الأدنى من السعة من دون هامش إضافي.']);
    return result;
  }

  function launchDecision() {
    if(!state.flags.checkpointEvalComplete){ go('checkpointEval'); return; }
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    if(!state.flags.safetyRetested){ go('safetyRetest'); return; }
    const blockers=exposedUnresolvedIndices();
    const gatesDone=RELEASE_GATES.every(gate=>gateComplete(gate.id));
    const extras=neededExtraChecks();
    const pendingExtras=extras.filter(([id])=>!state.flags.extraChecks.includes(id));
    const blockerMarkup=blockers.length?`<section class="card"><span class="kicker">حاجب إصدار: تاريخ استخدام البيانات</span><h2>هذه المواد دخلت post-training بالفعل؛ الاستبعاد البسيط لا يمحو ما حدث.</h2>${blockers.map(index=>{const item=DATA_ITEMS[index];const labels=Object.entries(state.flags.dataChecks[index]).filter(([,value])=>value==='unresolved').map(([key])=>({rights:'الحقوق',privacy:'الخصوصية',fitness:'الملاءمة'}[key])).join('، ');const code=item?.type==='code';return `<article class="card flat"><strong>${ctx.h(item?.title||`المادة ${index+1}`)}</strong><p>غير محسوم بعد المعالجة: ${ctx.h(labels)}</p><button class="secondary-btn" data-governance-remediate="${index}" type="button">${code?'افتح دليل الترخيص واحسم الاستخدام':'تخلص من النسخة وأعد الجولة دون المادة'}</button></article>`;}).join('')}</section>`:'';
    const extraMarkup=gatesDone&&!blockers.length&&extras.length?`<section class="card"><span class="kicker">أعمال إضافية قابلة للمراقبة</span><p>يمكن نقلها إلى المراقبة بعد الإطلاق، أو تنفيذها الآن. التأجيل لا يحسبها مكتملة حتى تنفذها فعلًا.</p>${extras.map(([id,detail])=>state.flags.extraChecks.includes(id)?`<div class="alert goodish"><strong>${id==='checkpoint'?'تحقق checkpoint الموسع':'فحص الاستقرار'}</strong><span>اكتمل قبل الإطلاق.</span></div>`:`<button class="secondary-btn" data-extra-check="${id}" type="button">نفّذ: ${ctx.h(detail)}</button>`).join('')}</section>`:'';
    const launchMarkup=!blockers.length&&gatesDone?(extras.length?`<div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أطلق وانقل المتبقي للمراقبة</strong><small>متاح فقط للأعمال الإضافية القابلة للمراقبة، لا لحواجز البيانات أو البوابات الأساسية.</small></button><button id="delayLaunch" class="choice-btn" ${pendingExtras.length?'disabled':''}><strong>أجّل الإطلاق حتى تكتمل الأعمال الإضافية</strong><small>${pendingExtras.length?'نفذ الأعمال الإضافية أولًا؛ الزر لا يدعي اكتمالها تلقائيًا.':'كل الأعمال الإضافية اكتملت ويمكن اعتماد التأجيل.'}</small></button></div>`:`<div class="action-row"><button id="launchReady" class="primary-btn">أطلق بعد اكتمال الأدلة الأساسية</button></div>`):'<div class="alert dangerish"><strong>قرار الإطلاق مقفول</strong><span>أغلق حواجز البيانات وراجع أدلة البوابات الأساسية قبل اتخاذ القرار.</span></div>';
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الجاهزية حكم على أدلة، وليست قائمة أسماء.</h1>${supportingRoleStrip(['releaseManager'],'من يملك قرار الموعد؟')}${blockerMarkup}<section><h2>بوابات الإصدار الأساسية</h2><p class="muted">اقرأ النتيجة داخل كل بوابة. بوابة الأداء تبدأ بمؤشر يتجاوز الحد، لذلك لا يمكن اعتمادها قبل التحقيق وإعادة القياس.</p><div class="verification-bundles baseline-gates">${RELEASE_GATES.map(gateMarkup).join('')}</div></section>${extraMarkup}${launchMarkup}</div>`);

    bind('[data-governance-remediate]','click',event=>resolveGovernance(Number(event.currentTarget.dataset.governanceRemediate)));
    bind('[data-gate-investigate]','click',()=>{
      addDecision('release-capacity-investigated','حققت في تجاوز حد الذاكرة قبل اعتماد بوابة السعة','أظهر التحقيق إعدادًا يرفع الذاكرة تحت الحمل؛ عُدّل الإعداد ثم أعيد القياس إلى 84% بدل اعتماد نتيجة 92%.' );
      launchDecision();
    });
    bind('[data-gate-pass]','click',event=>{
      const id=event.currentTarget.dataset.gatePass;
      const gate=RELEASE_GATES.find(item=>item.id===id);
      if(!gate||gateComplete(id)) return;
      if(id==='capacity'&&!capacityInvestigated()) return;
      state.flags.releaseGates.push(id);
      addDecision(`release-gate-${id}`,`اعتمدت بوابة ${gate.title}`,id==='capacity'?gate.ready:gate.evidence);
      saveState(); launchDecision();
    });
    bind('[data-gate-question]','click',event=>{
      const id=event.currentTarget.dataset.gateQuestion;
      const feedback=$(`[data-gate-feedback="${id}"]`);
      if(feedback){feedback.hidden=false;feedback.innerHTML='<strong>الدليل المعروض لا يبين فشلًا في هذه البوابة.</strong><span>يمكنك رفض الإطلاق عند وجود سبب، لكن هنا المطلوب ربط الحكم بالنتيجة المعروضة لا الحذر المجرد.</span>';}
    });
    bind('[data-extra-check]','click',event=>{
      const id=event.currentTarget.dataset.extraCheck;
      if(!state.flags.extraChecks.includes(id)) state.flags.extraChecks.push(id);
      addDecision(`extra-check-${id}`,id==='checkpoint'?'أكملت تحقق checkpoint الموسع':'أكملت فحص الاستقرار بعد عطل الحوسبة','نفذت العمل الإضافي الذي أنشأه مسار اللعب قبل اعتماد الإطلاق المؤجل.');
      saveState(); launchDecision();
    });
    $('#launchReady')?.addEventListener('click',()=>{ state.flags.launchChoice='ready'; addDecision('launch-ready','أطلقت بعد اكتمال أدلة البوابات الأساسية','راجعت الأدلة الأربع ولم تكن هناك أعمال إضافية سببية مطلوبة من المسار.'); saveState(); go('launchOutcome'); });
    $('#criticalOnly')?.addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast','أطلقت مع بقاء تحقق إضافي قابل للمراقبة','اكتملت الحواجز والبوابات الأساسية، ونُقلت أعمال إضافية غير حاجبة إلى المراقبة بعد الإطلاق.'); saveState(); go('launchOutcome'); });
    $('#delayLaunch')?.addEventListener('click',()=>{ if(pendingExtras.length)return; state.flags.launchChoice='delay'; addDecision('launch-delay','أجلت الإطلاق حتى اكتملت الأعمال الإضافية','اكتملت البوابات الأساسية ثم نفذت الأعمال الإضافية السببية قبل التشغيل بدل اعتبار التأجيل وحده إنجازًا لها.'); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    const ready=state.flags.launchChoice==='ready';
    const accuracy=`${state.flags.evalCorrectCount}/${EVAL_TASKS.length}`;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت الأعمال الإضافية بعد البوابات الأساسية.':ready?'تم الإطلاق بعد اكتمال الأدلة الأساسية.':'تم الإطلاق بعد البوابات الأساسية مع نقل أعمال غير حاجبة إلى المراقبة.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${accuracy} من مهام الملاءمة. هذه نتيجة لعملية التقييم البشرية، لا «درجة جودة للنموذج».</p></div><div class="view-panel"><h3>السلامة والجاهزية</h3><p>خلل السلامة أُصلح وأعيد اختباره، ومراجعة checkpoint سبقت السلامة، وكل بوابة إصدار أساسية اعتُمدت من دليل معروض. ${delayed?'واكتملت الأعمال الإضافية قبل التشغيل.':ready?'ولم ينشأ من مسارك عمل إضافي فوقها.':'أما الأعمال الإضافية غير الحاجبة فانتقلت إلى المراقبة.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">شاهد ما يختفي في التشغيل</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، تقييم checkpoint، اختبار سلامة، ومراجعة أدلة الإصدار','نتائج تقييم وقرار جاهزية موثق','فصلت المرحلة بين حواجز البيانات، وأدلة البوابات الأساسية، وأعمال إضافية يمكن مراقبتها بعد الإطلاق.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','اختبار بوابة السلامة',''],['مراجعو اللغة','مراجعة سياق ولغة','']],'نتائج تقييم وتحقق','المقارنة والاختبار ومراجعة الأدلة أصبحت مدخلات قرار الإصدار، بدل تحويل الجاهزية إلى علامة صح بلا دليل.','ch8Intro'); }

  return { ch7Intro,evalTask,checkpointEval,safetyTest,safetyOutcome,safetyRetest,launchDecision,launchOutcome,abstract7 };
}
