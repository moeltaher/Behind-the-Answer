import { EVAL_TASKS, DATA_ITEMS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';
import { resetCandidateEvidence } from '../core/state.js';

const CHECKPOINT_SAMPLES = [
  { id:'apology', prompt:'اكتب اعتذارًا قصيرًا عن تأخر تسليم مهمة.', a:'أود أن أتقدم باعتذاري عن التأخر في التسليم، وسأوافيكم بالمهمة في أقرب وقت ممكن.', b:'أعتذر عن التأخر في التسليم. أستكمل المهمة الآن وسأرسلها في أقرب وقت.', good:'b', explanation:'الناتج ب أقصر وأكثر طبيعية مع الحفاظ على المقصود.' },
  { id:'legal', prompt:'اختصر: «يجوز التقديم خلال 30 يومًا، ويستثنى من يثبت تعذر وصول الإخطار إليه».', a:'التقديم خلال 30 يومًا، مع استثناء من يثبت تعذر وصول الإخطار إليه.', b:'يجب التقديم خلال 30 يومًا.', good:'a', explanation:'الناتج ب أقصر لكنه حذف قيدًا جوهريًا؛ الإيجاز لا يبرر فقد المعنى.' },
  { id:'friendly', prompt:'اكتب رسالة قصيرة لصديق لتأجيل موعد ساعة واحدة.', a:'أرجو التكرم بالموافقة على تأجيل موعدنا لمدة ساعة بسبب ظرف طارئ.', b:'محتاج أأجل ميعادنا ساعة لو مناسب لك. حصل ظرف طارئ.', good:'b', explanation:'الناتج ب أقرب للنبرة المطلوبة في رسالة قصيرة غير رسمية.' }
];

const RELEASE_GATES = [
  { id:'regression', title:'اختبارات الانحدار', evidence:'18 من 18 سيناريو وظيفي أساسي اجتازت الاختبار على النسخة المرشحة الحالية.', ready:'لا يظهر انحدار وظيفي في مجموعة السيناريو الحالية.' },
  { id:'capacity', title:'الأداء والسعة', evidence:'ذروة استخدام الذاكرة 92% بينما حد التنبيه في هذا السيناريو 90%.', ready:'بعد التحقيق وتعديل الإعداد، أعيد الاختبار وأصبحت الذروة 84% مع بقاء زمن الاستجابة ضمن الحد.' },
  { id:'risk', title:'السلامة والخصوصية وحوكمة البيانات', evidence:'إعادة اختبار السلامة اجتازت، ولا توجد مادة مستخدمة في النسخة المرشحة الحالية تحمل مسألة حوكمة غير محسومة.', ready:'بوابة السلامة والخصوصية وحوكمة البيانات مستوفاة للنسخة الحالية.' },
  { id:'rollback', title:'المراقبة وخطة التراجع', evidence:'مؤشرات الأخطاء والذاكرة جاهزة، والنسخة السابقة محفوظة، وتجربة rollback في البيئة الاختبارية نجحت.', ready:'توجد مراقبة ومسار تراجع قابل للتنفيذ في السيناريو.' }
];

const EXTRA_CHECKS = {
  checkpoint:{ title:'تحقق checkpoint الموسع', action:'اختبر عينات إضافية خارج المقارنة الثلاثية', result:'12 عينة إضافية غطت أساليب وصيغًا أخرى؛ لم يظهر انحدار جديد يمنع الإصدار في سيناريو اللعبة.' },
  stability:{ title:'فحص الاستقرار', action:'اختبر استقرار الجولة بعد العمل عند الحد الأدنى', result:'ثلاث جولات إعادة تشغيل قصيرة أكملت دون تكرار عطل الحوسبة في سيناريو اللعبة.' }
};

function hasUnresolved(check) { return check && Object.values(check).includes('unresolved'); }

export function createEvaluationRoutes(ctx) {
  const $ = ctx.$;
  const $$ = ctx.$$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word,line,next);

  function ch7Intro() { chapterIntro(6, 'evalTask'); }

  function calibrationScreen() {
    const score=state.flags.evalCorrectCount;
    const needsReview=score<EVAL_TASKS.length;
    html(`<div><span class="eyebrow">معايرة المقيّم</span><h1 class="scene-title">${needsReview?'قبل استخدام تقييمك كدليل، راجع معيار الحكم.':'أكملت المهام الثلاث وفق معيار السيناريو.'}</h1><div class="stage-output"><strong>نتيجة المقيّم: ${score}/${EVAL_TASKS.length}</strong>هذه نتيجة لعملية التقييم البشرية، وليست درجة جودة للنموذج.</div>${needsReview?'<div class="card"><strong>المعايرة المطلوبة</strong><ul><li>اختبر ملاءمة اللغة للجمهور، لا الصحة المجردة فقط.</li><li>حافظ على القيود والاستثناءات الجوهرية عند التلخيص.</li><li>لا تكافئ الاختصار إذا أضاف معلومة أو حذف شرطًا مهمًا.</li></ul></div>':'<div class="alert goodish"><strong>المعيار متسق في هذه العينة الصغيرة</strong><span>تبقى المقارنة التالية مطلوبة لأنها تختبر أثر checkpoint نفسها، لا أداء المقيّم فقط.</span></div>'}<div class="action-row"><button id="confirmCalibration" class="primary-btn">ثبّت المعايرة وانتقل لمقارنة checkpoint</button></div></div>`);
    $('#confirmCalibration').addEventListener('click',()=>{
      state.flags.evaluatorCalibrationComplete=true;
      addDecision(`evaluator-calibration-r${state.flags.candidateRevision}`,needsReview?'راجعت معيار التقييم بعد أخطاء بشرية':'ثبتت معيار التقييم بعد المهام الثلاث',needsReview?`طابقت ${score}/${EVAL_TASKS.length} أولًا، ثم راجعت قواعد السياق والقيود وعدم الإضافة قبل استخدام التقييم كدليل.`:'طابقت المهام الثلاث معيار السيناريو ثم ثبتت المعايرة قبل تقييم checkpoint.');
      saveState(); go('checkpointEval');
    });
  }

  function evalTask() {
    const index=state.flags.evalIndex;
    if(index>=EVAL_TASKS.length){
      if(!state.flags.evaluatorCalibrationComplete) calibrationScreen();
      else go('checkpointEval');
      return;
    }
    const task=EVAL_TASKS[index];
    const sourceContext=index===2?'<div class="card flat"><strong>النص الأصلي الافتراضي</strong><p>«يجوز تقديم الطلب خلال ثلاثين يومًا من تاريخ الإخطار، ويُستثنى من ذلك من يثبت تعذر وصول الإخطار إليه خلال هذه المدة.»</p></div>':'';
    const journeyContext=task.journeyPrompt?'<div class="journey-prompt-note"><strong>هذا هو الطلب الذي بدأت به اللعبة.</strong><span>تعود إليه هنا حتى تظل مرحلة التقييم مرتبطة بالإجابة التي ستراها في النهاية.</span></div>':'';
    if(state.flags.evalFeedback){
      const feedback=state.flags.evalFeedback;
      html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">راجع سبب التقييم.</h1>${journeyContext}${sourceContext}<div class="alert ${feedback.correct?'goodish':'dangerish'}" role="status"><strong>${feedback.correct?'تقييمك يطابق معيار هذه المهمة':'تقييمك لا يطابق معيار هذه المهمة'}</strong><span>${ctx.h(task.explanation)}</span></div><p class="muted">هذا يقيس دقة عمل المقيّم، ولا يغير النموذج بمجرد الضغط على إجابة.</p><div class="action-row"><button id="nextEval" class="primary-btn">المهمة التالية</button></div></div>`);
      $('#nextEval').addEventListener('click',()=>{ state.flags.evalFeedback=null; state.flags.evalIndex+=1; saveState(); evalTask(); });
      return;
    }
    html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">قارن الإجابتين وفق الطلب.</h1><div class="reality-note"><strong>ما الذي نقيسه هنا؟</strong> موثوقية عملية التقييم البشري في اكتشاف الإجابة الأنسب للسياق.</div>${journeyContext}${sourceContext}<div class="card flat"><strong>الطلب</strong><p>${ctx.h(task.prompt)}</p></div><div class="compare-card"><div class="response-card"><h4>الإجابة أ</h4><p>${ctx.h(task.a)}</p></div><div class="response-card"><h4>الإجابة ب</h4><p>${ctx.h(task.b)}</p></div></div><div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>الإجابة أ أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>الإجابة ب أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',event=>{
      const choice=event.currentTarget.dataset.eval;
      const correct=choice===task.good;
      if(correct) state.flags.evalCorrectCount+=1;
      state.flags.evalFeedback={choice,correct};
      saveState(); evalTask();
    });
  }

  function checkpointEval() {
    if(!state.flags.evaluatorCalibrationComplete){ go('evalTask'); return; }
    if(state.flags.checkpointEvalComplete){
      const recent=state.flags.trainingCheckpoint==='recent';
      html(`<div><span class="eyebrow">تقييم فرضية checkpoint — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">اكتملت المقارنة المستهدفة قبل اختبار السلامة.</h1><div class="alert goodish"><strong>النتيجة ليست «الأحدث أفضل دائمًا»</strong><span>تحسن هدف الإيجاز والنبرة في حالتين، بينما خسرت النسخة الأحدث قيدًا جوهريًا في حالة قانونية. ${recent?'لأنك اخترت checkpoint أحدث، سيظهر تحقق موسع إضافي ضمن أعمال الإصدار.':'اخترت checkpoint أكثر اختبارًا، لكن المقارنة تظل دليلًا مستقلًا.'}</span></div><div class="action-row"><button id="toSafety" class="primary-btn">انتقل إلى اختبار السلامة</button></div></div>`);
      $('#toSafety').addEventListener('click',()=>go('safetyTest'));
      return;
    }
    html(`<div><span class="eyebrow">تقييم checkpoint — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">قارن نتائج فعلية قبل أن تحكم على التغيير المستهدف.</h1><p class="scene-subtitle">اختر الأنسب للطلب نفسه؛ الهدف اختبار أثر الإيجاز والنبرة دون مكافأة الحداثة بذاتها.</p><div class="evidence-results">${CHECKPOINT_SAMPLES.map((sample,index)=>`<article class="card"><span class="kicker">العينة ${index+1}</span><p><strong>الطلب:</strong> ${ctx.h(sample.prompt)}</p><div class="compare-card"><div class="response-card"><h4>الناتج أ</h4><p>${ctx.h(sample.a)}</p></div><div class="response-card"><h4>الناتج ب</h4><p>${ctx.h(sample.b)}</p></div></div><label class="form-row"><span>أي ناتج أنسب؟</span><select data-checkpoint-sample="${sample.id}"><option value="">اختر…</option><option value="a">الناتج أ</option><option value="b">الناتج ب</option></select></label></article>`).join('')}</div><div class="decision-feedback-inline" id="checkpointFeedback" hidden role="status"></div><div class="action-row"><button id="checkCheckpoint" class="primary-btn">تحقق من المقارنة</button></div></div>`);
    $('#checkCheckpoint').addEventListener('click',()=>{
      const answers=Object.fromEntries($$('[data-checkpoint-sample]').map(select=>[select.dataset.checkpointSample,select.value]));
      const wrong=CHECKPOINT_SAMPLES.filter(sample=>answers[sample.id]!==sample.good);
      const feedback=$('#checkpointFeedback');
      if(wrong.length){ feedback.hidden=false; feedback.innerHTML=`<strong>${wrong.length} من ${CHECKPOINT_SAMPLES.length} تحتاج مراجعة.</strong><span>${wrong.map(sample=>sample.explanation).join(' ')}</span>`; return; }
      state.flags.checkpointEvalComplete=true;
      addDecision(`checkpoint-evidence-reviewed-r${state.flags.candidateRevision}`,`قارنت checkpoint للنسخة ${state.flags.candidateRevision} على أمثلة فعلية`,'وجدت تحسنًا مستهدفًا في بعض الأمثلة مع تراجع في مثال آخر؛ الحكم مبني على الأدلة لا الحداثة.');
      saveState(); checkpointEval();
    });
  }

  function safetyTest() {
    if(!state.flags.checkpointEvalComplete){ go('checkpointEval'); return; }
    html(`<div><span class="eyebrow">اختبار السلامة — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">اختبر حدود النموذج.</h1>${supportingRoleStrip(['safetyTester'],'من يعمل مع ريم الآن؟')}<div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">بوابة السلامة</span><h1 class="scene-title">${correct?'اكتشفت خللًا يمنع المرور مباشرة إلى الإطلاق.':'لم تلتقط الخلل، لكن مراجعة ثانية أوقفته قبل الإطلاق.'}</h1>${supportingRoleStrip(correct?['safetyTester']:['safetyTester','languageReviewer'],'من شارك في اكتشاف الخلل؟')}<div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب الإيقاف</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. يجب الإصلاح ثم إعادة الاختبار على revision نفسها.</span></div><div class="action-row"><button id="remediateSafety" class="primary-btn">أرسل الخلل للإصلاح</button></div></div>`);
    $('#remediateSafety').addEventListener('click',()=>{ state.flags.safetyRemediated=true; state.flags.safetyRetested=false; saveState(); go('safetyRetest'); });
  }

  function safetyRetest() {
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    const caughtEarly=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">إعادة اختبار السلامة — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">أُصلح السلوك وأصبحت النسخة أمام اختبار البوابة من جديد.</h1>${supportingRoleStrip(['safetyTester'],'من ينفذ إعادة الاختبار؟')}<div class="card flat"><p><strong>النطاق:</strong> ${caughtEarly?'إعادة اختبار مخصصة للسلوك الذي ظهر أولًا.':'إعادة اختبار أوسع مع مراجعة بشرية ثانية.'}</p><p><strong>النتيجة:</strong> لم تعد الاستجابة تعطي التفاصيل التشغيلية التي أوقفت الإطلاق.</p></div><div class="action-row"><button id="confirmSafetyRetest" class="primary-btn">ثبّت النتيجة وانتقل للجاهزية</button></div></div>`);
    $('#confirmSafetyRetest').addEventListener('click',()=>{
      state.flags.safetyRetested=true;
      addDecision(`${caughtEarly?'safety-caught':'safety-second-review'}-r${state.flags.candidateRevision}`,caughtEarly?'أوقفت خلل السلامة وأعدت اختباره':'احتاج خلل السلامة إلى مراجع ثانٍ ثم أُعيد اختباره',`النتيجة تخص revision ${state.flags.candidateRevision} فقط.`);
      saveState(); go('launchDecision');
    });
  }

  function exposedUnresolvedIndices() {
    return state.flags.dataCurrentTrainingUsed.filter(index=>state.flags.dataStatuses[index]==='ready'&&hasUnresolved(state.flags.dataChecks[index]));
  }
  function confirmedAnnotationCount(){ return state.flags.annotationResults.filter(result=>result.acceptedAsReasonable&&!result.pending&&!result.reviewRejected).length; }

  function resolveGovernance(index) {
    const item=DATA_ITEMS[index];
    if(item?.type==='code') {
      state.flags.dataChecks[index]={...state.flags.dataChecks[index],rights:'clear'};
      addDecision(`data-license-evidence-${index}`,`راجعت دليل ترخيص المادة ${index+1}`,'كشف الفحص المتعمق ترخيصًا يسمح بالاستخدام المقصود، فحُسمت مسألة الحقوق دون تغيير النسخة المرشحة.');
      saveState(); launchDecision();
      return;
    }
    state.flags.dataStatuses[index]='excluded';
    state.flags.dataChecks[index]={rights:'na',privacy:'na',fitness:'na'};
    state.flags.dataTrainingApproved=state.flags.dataTrainingApproved.filter(value=>value!==index);
    state.flags.dataTrainingHeld=state.flags.dataTrainingHeld.filter(value=>value!==index);
    state.flags.dataCurrentTrainingUsed=state.flags.dataCurrentTrainingUsed.filter(value=>value!==index);
    state.flags.candidateRevision+=1;
    const revision=state.flags.candidateRevision;
    resetCandidateEvidence(state);
    addDecision(`data-retrain-without-${index}-r${revision}`,`أنشأت revision ${revision} دون المادة ${index+1}`,'بقي استخدامها التاريخي محفوظًا، لكن النسخة الحالية أعيدت دونها وأُبطلت أدلة التقييم والسلامة والإصدار الخاصة بالنسخة السابقة.');
    saveState();
    if(state.flags.dataCurrentTrainingUsed.length+confirmedAnnotationCount()>0) go('trainingRun');
    else go('trainingSetup');
  }

  function gateComplete(id) { return state.flags.releaseGates.includes(id); }
  function capacityInvestigated() { return state.decisions.some(decision=>decision.id===`release-capacity-investigated-r${state.flags.candidateRevision}`); }

  function gateMarkup(gate, blockers) {
    const complete=gateComplete(gate.id);
    if(complete) return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p>${ctx.h(gate.ready)}</p><span class="task-status task-status--complete">✓ اجتازت بناء على دليل revision ${state.flags.candidateRevision}</span></article>`;
    if(gate.id==='risk'&&blockers.length) return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p><b>الحالة:</b> لا يمكن عرض دليل نجاح صحيح بينما توجد مادة مستخدمة حاليًا تحمل مسألة حوكمة غير محسومة.</p><span class="task-status">مقفولة حتى معالجة حاجب البيانات</span></article>`;
    if(gate.id==='capacity'&&!capacityInvestigated()) return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p><b>الدليل:</b> ${ctx.h(gate.evidence)}</p><button class="secondary-btn" data-gate-investigate="capacity" type="button">حقق في تجاوز حد الذاكرة</button></article>`;
    const evidence=gate.id==='capacity'?gate.ready:gate.evidence;
    return `<article class="card flat"><strong>${ctx.h(gate.title)}</strong><p><b>الدليل:</b> ${ctx.h(evidence)}</p><div class="choice-grid"><button class="secondary-btn" data-gate-pass="${gate.id}" type="button">اعتمد البوابة</button>${gate.id!=='capacity'?`<button class="secondary-btn" data-gate-question="${gate.id}" type="button">اعتبرها غير جاهزة</button>`:''}</div><div class="decision-feedback-inline" data-gate-feedback="${gate.id}" hidden role="status"></div></article>`;
  }

  function neededExtraChecks() {
    const result=[];
    if(state.flags.trainingCheckpoint==='recent') result.push('checkpoint');
    if(state.flags.trainingCompute==='8'&&state.flags.trainingIncidentChoice==='continue') result.push('stability');
    return result;
  }

  function launchDecision() {
    if(!state.flags.checkpointEvalComplete){ go('checkpointEval'); return; }
    if(!state.flags.safetyRemediated){ go('safetyTest'); return; }
    if(!state.flags.safetyRetested){ go('safetyRetest'); return; }
    const blockers=exposedUnresolvedIndices();
    const gatesDone=RELEASE_GATES.every(gate=>gateComplete(gate.id));
    const extras=neededExtraChecks();
    const pendingExtras=extras.filter(id=>!state.flags.extraChecks.includes(id));
    const blockerMarkup=blockers.length?`<section class="card"><span class="kicker">حاجب إصدار: بيانات النسخة الحالية</span><h2>هذه المواد دخلت revision ${state.flags.candidateRevision}. الاستبعاد سيولد revision جديدة ويبطل أدلتها السابقة.</h2>${blockers.map(index=>{const item=DATA_ITEMS[index];const labels=Object.entries(state.flags.dataChecks[index]).filter(([,value])=>value==='unresolved').map(([key])=>({rights:'الحقوق',privacy:'الخصوصية',fitness:'الملاءمة'}[key])).join('، ');return `<article class="card flat"><strong>${ctx.h(item?.title||`المادة ${index+1}`)}</strong><p>غير محسوم: ${ctx.h(labels)}</p><button class="secondary-btn" data-governance-remediate="${index}" type="button">${item?.type==='code'?'افتح دليل الترخيص واحسم الاستخدام':'استبعد المادة وأنشئ revision جديدة'}</button></article>`;}).join('')}</section>`:'';
    const extraMarkup=gatesDone&&!blockers.length&&extras.length?`<section class="card"><span class="kicker">أعمال تحقق إضافية</span><p>هذه ليست بوابات أساسية. يمكن تنفيذها الآن، أو نقل ما بقي منها صراحة إلى المراقبة بعد الإطلاق.</p>${extras.map(id=>{const def=EXTRA_CHECKS[id];return state.flags.extraChecks.includes(id)?`<div class="alert goodish"><strong>${def.title}</strong><span>${def.result}</span></div>`:`<article class="card flat"><strong>${def.title}</strong><p>${def.action}</p><button class="secondary-btn" data-extra-check="${id}" type="button">نفّذ الفحص واعرض النتيجة</button></article>`;}).join('')}</section>`:'';
    let launchMarkup='<div class="alert dangerish"><strong>قرار الإطلاق مقفول</strong><span>أغلق حواجز البيانات وراجع أدلة البوابات الأساسية أولًا.</span></div>';
    if(!blockers.length&&gatesDone){
      if(!extras.length) launchMarkup='<div class="action-row"><button id="launchReady" class="primary-btn">أطلق بعد اكتمال الأدلة الأساسية</button></div>';
      else if(pendingExtras.length) launchMarkup=`<div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أطلق وانقل ${pendingExtras.length} فحصًا للمراقبة</strong><small>ستظهر هذه الفحوص فعليًا بعد الإطلاق قبل متابعة التشغيل.</small></button><button id="delayLaunch" class="choice-btn" disabled><strong>أكمل الفحوص قبل الإطلاق</strong><small>نفذ الأعمال الإضافية أولًا.</small></button></div>`;
      else launchMarkup='<div class="action-row"><button id="delayLaunch" class="primary-btn">اعتمد الإطلاق بعد إكمال الأعمال الإضافية</button></div>';
    }
    html(`<div><span class="eyebrow">موعد الإصدار — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">الجاهزية حكم على أدلة تخص النسخة الحالية.</h1>${supportingRoleStrip(['releaseManager'],'من يملك قرار الموعد؟')}${blockerMarkup}<section><h2>بوابات الإصدار الأساسية</h2><div class="verification-bundles baseline-gates">${RELEASE_GATES.map(gate=>gateMarkup(gate,blockers)).join('')}</div></section>${extraMarkup}${launchMarkup}</div>`);

    bind('[data-governance-remediate]','click',event=>resolveGovernance(Number(event.currentTarget.dataset.governanceRemediate)));
    bind('[data-gate-investigate]','click',()=>{ addDecision(`release-capacity-investigated-r${state.flags.candidateRevision}`,'حققت في تجاوز حد الذاكرة قبل اعتماد بوابة السعة','عُدل الإعداد ثم أعيد القياس إلى 84% على النسخة الحالية.'); launchDecision(); });
    bind('[data-gate-pass]','click',event=>{
      const id=event.currentTarget.dataset.gatePass;
      const gate=RELEASE_GATES.find(item=>item.id===id);
      if(!gate||gateComplete(id)||(id==='capacity'&&!capacityInvestigated())||(id==='risk'&&blockers.length)) return;
      state.flags.releaseGates.push(id);
      addDecision(`release-gate-${id}-r${state.flags.candidateRevision}`,`اعتمدت بوابة ${gate.title} للنسخة ${state.flags.candidateRevision}`,id==='capacity'?gate.ready:gate.evidence);
      saveState(); launchDecision();
    });
    bind('[data-gate-question]','click',event=>{ const feedback=$(`[data-gate-feedback="${event.currentTarget.dataset.gateQuestion}"]`); if(feedback){feedback.hidden=false;feedback.innerHTML='<strong>الدليل المعروض لا يبين فشلًا في هذه البوابة.</strong><span>اربط الحكم بالنتيجة المعروضة، لا بالحذر المجرد.</span>';} });
    bind('[data-extra-check]','click',event=>{
      const id=event.currentTarget.dataset.extraCheck;
      if(!state.flags.extraChecks.includes(id)) state.flags.extraChecks.push(id);
      const def=EXTRA_CHECKS[id];
      addDecision(`extra-check-${id}-r${state.flags.candidateRevision}`,`أكملت ${def.title} للنسخة ${state.flags.candidateRevision}`,def.result);
      saveState(); launchDecision();
    });
    $('#launchReady')?.addEventListener('click',()=>{ state.flags.launchChoice='ready'; state.flags.deferredExtraChecks=[]; addDecision(`launch-ready-r${state.flags.candidateRevision}`,'أطلقت بعد اكتمال أدلة البوابات الأساسية','لم ينشأ من المسار عمل إضافي مطلوب.'); saveState(); go('launchOutcome'); });
    $('#criticalOnly')?.addEventListener('click',()=>{ state.flags.launchChoice='fast'; state.flags.deferredExtraChecks=[...pendingExtras]; state.flags.monitoringChecksCompleted=[]; addDecision(`launch-fast-r${state.flags.candidateRevision}`,'أطلقت مع نقل فحوص إضافية محددة إلى المراقبة',`نُقلت إلى التشغيل: ${pendingExtras.map(id=>EXTRA_CHECKS[id].title).join('، ')}.`); saveState(); go('launchOutcome'); });
    $('#delayLaunch')?.addEventListener('click',()=>{ if(pendingExtras.length)return; state.flags.launchChoice='delay'; state.flags.deferredExtraChecks=[]; addDecision(`launch-delay-r${state.flags.candidateRevision}`,'اعتمدت الإطلاق بعد إكمال الأعمال الإضافية','اكتملت البوابات الأساسية والفحوص الإضافية قبل التشغيل.'); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const deferred=state.flags.deferredExtraChecks.length;
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">${deferred?`تم الإطلاق مع ${deferred} فحص إضافي مسجل للمراقبة.`:'تم الإطلاق بعد اكتمال الأدلة المطلوبة.'}</h1><div class="dual-view"><div class="view-panel"><h3>عمل المقيّم</h3><p>طابقت اختياراتك معيار ${state.flags.evalCorrectCount}/${EVAL_TASKS.length}، ثم أغلقت خطوة المعايرة. هذه ليست درجة جودة للنموذج.</p></div><div class="view-panel"><h3>السلامة والجاهزية</h3><p>كل الأدلة الأساسية تخص revision ${state.flags.candidateRevision}. ${deferred?'الفحوص المؤجلة محفوظة كعمل غير مكتمل وستظهر في التشغيل.':'لا توجد فحوص إضافية معلقة.'}</p></div></div><div class="action-row"><button id="finishEval" class="primary-btn">انتقل إلى التشغيل</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','معايرة تقييم، مقارنة checkpoint، اختبار سلامة، ومراجعة أدلة الإصدار','قرار جاهزية موثق',`كل دليل مرتبط بالنسخة المرشحة ${state.flags.candidateRevision}، والفحوص المؤجلة محفوظة صراحة إن وجدت.`); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','اختبار بوابة السلامة',''],['مراجعو اللغة','مراجعة سياق ولغة','']],'أدلة مرتبطة بنسخة محددة','التقييم والسلامة وبوابات الإصدار لا تنتقل تلقائيًا إلى revision جديدة، والعمل المؤجل يظل ظاهرًا حتى ينفذ.','ch8Intro'); }

  return { ch7Intro,evalTask,checkpointEval,safetyTest,safetyOutcome,safetyRetest,launchDecision,launchOutcome,abstract7 };
}
