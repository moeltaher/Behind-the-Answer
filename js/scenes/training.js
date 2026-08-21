import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const MIN_COMPUTE_TO_CONTINUE = 7;

function hasUnresolved(check) {
  return check && Object.values(check).includes('unresolved');
}

export function createTrainingRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch6Intro() { chapterIntro(5, 'trainingSetup'); }

  function annotationInputs() {
    const results=state.flags.annotationResults;
    const confirmed=results.filter(result=>result.acceptedAsReasonable&&!result.pending&&!result.reviewRejected).length;
    const pending=results.filter(result=>result.pending&&!result.reviewRejected).length;
    const rejected=results.filter(result=>result.reviewRejected||!result.acceptedAsReasonable).length;
    return { confirmed, pending, rejected };
  }

  function dataInputs() {
    const statuses=state.flags.dataStatuses;
    let unresolved=0;
    let clear=0;
    statuses.forEach((status,index)=>{
      if(status!=='ready') return;
      if(hasUnresolved(state.flags.dataChecks[index])) unresolved+=1;
      else clear+=1;
    });
    return {
      passed: statuses.filter(status=>status==='ready').length,
      clear,
      unresolved,
      pending: statuses.filter(status=>status==='pending').length,
      excluded: statuses.filter(status=>status==='excluded').length
    };
  }

  function confirmedExamplesLabel(count) {
    if(count===0) return 'لا أمثلة بشرية مؤكدة';
    if(count===1) return 'مثال بشري مؤكد واحد';
    if(count===2) return 'مثالان بشريان مؤكدان';
    return `${count} أمثلة بشرية مؤكدة`;
  }

  function pendingCasesLabel(count) {
    if(count===0) return 'لا حالات معلقة';
    if(count===1) return 'حالة معلقة واحدة';
    if(count===2) return 'حالتان معلقتان';
    return `${count} حالات معلقة`;
  }

  function computeDescription(total) {
    const initialMargin=total-MIN_COMPUTE_TO_CONTINUE;
    const afterFailure=total-1;
    const remainingMargin=afterFailure-MIN_COMPUTE_TO_CONTINUE;
    return { initialMargin, afterFailure, remainingMargin };
  }

  function trainingSetup() {
    const checkpoint=state.flags.trainingCheckpoint;
    const annotation=annotationInputs();
    const data=dataInputs();
    const confirmedLabel=confirmedExamplesLabel(annotation.confirmed);
    const pendingLabel=pendingCasesLabel(annotation.pending);
    const dataIssueCopy=data.unresolved?`${data.unresolved} من المواد التي مرّت تحمل مسائل حقوق/خصوصية/ملاءمة غير محسومة. ستدخل المسار كما سمحت بها قراراتك، لكن هذه المسائل لا تختفي وستضيف تحققًا قبل الإطلاق.`:'كل المواد التي مرّت في هذا المسار حُسمت مسائلها المعروضة.';
    html(`<div><span class="eyebrow">مختبر تطوير نموذج افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما الذي نحاكيه تحديدًا؟</strong> هذه ليست عملية تدريب نموذج من الصفر. السيناريو يمثل جولة post-training مبسطة تبدأ من نقطة حفظ سابقة. من الدفعة 18 مرّت ${data.passed} مواد: ${data.clear} محسومة و${data.unresolved} تحمل مسائل غير محسومة، بينما تبقى ${data.pending} معلقة. ومن عمل التصنيف يدخل ${confirmedLabel}، بينما تبقى ${pendingLabel} و${annotation.rejected} مرفوضة خارج المدخل المؤكد.</div>${data.unresolved?`<div class="alert dangerish"><strong>مرور المادة لا يساوي حسمها</strong><span>${dataIssueCopy}</span></div>`:''}<div class="training-board"><div class="config-panel"><div class="form-row"><label>مواد التطوير التي مرّت إلى الجولة</label><select disabled><option>${data.passed} مواد من الدفعة 18 (${data.clear} محسومة / ${data.unresolved} غير محسومة) + ${confirmedLabel}</option></select></div><div class="form-row"><label for="computeSel">مجموعات الحوسبة المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — 5 فوق الحد الأدنى قبل العطل</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — 1 فوق الحد الأدنى قبل العطل</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>أكثر اختبارًا — تحقق إضافي أقل، من دون تغيير النبرة الأحدث</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تتضمن تغييرًا مستهدفًا للنبرة العربية وتحتاج تحققًا إضافيًا</option></select></div><button id="trainStart" class="primary-btn training-start">ابدأ الجولة</button></div><div class="chart-panel"><span class="kicker">المفاضلات قبل البدء</span><div class="training-log training-config-summary"><strong>الحوسبة</strong><br>يفترض السيناريو أن الجولة تحتاج إلى ${MIN_COMPUTE_TO_CONTINUE} مجموعات متاحة على الأقل للاستمرار ضمن نافذة الأداء المبسطة.<br>12 مجموعة: تكلفة 12 وحدة لعب وهامش سعة أولي 5 مجموعات فوق الحد الأدنى.<br>8 مجموعات: تكلفة 8 وحدات لعب وهامش سعة أولي مجموعة واحدة فقط.<br><br><strong>نقطة الحفظ</strong><br>الأكثر اختبارًا: مخاطرة تحقق إضافي أقل، لكنها لا تتضمن التغيير الأحدث المستهدف لنبرة الرسائل العربية القصيرة.<br>الأحدث: تحمل هذا التغيير المقصود، لكن فائدته لا تُفترض مسبقًا ويجب التحقق منه قبل الإطلاق.</div></div></div></div>`);
    $('#trainStart').addEventListener('click',()=>{
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      const total=Number(state.flags.trainingCompute);
      const margin=computeDescription(total).initialMargin;
      addDecision(`training-compute-${total}`,`خصصت ${total} مجموعة حوسبة لجولة التطوير`,`تكلفة التخصيص ${total} وحدة لعب، مع هامش سعة أولي ${margin} فوق الحد الأدنى المفترض (${MIN_COMPUTE_TO_CONTINUE}) في هذا السيناريو.`);
      if(state.flags.trainingCheckpoint==='validated') addDecision('training-checkpoint-validated','بدأت من نقطة حفظ اختُبرت أكثر','قللت نطاق التحقق الإضافي، لكن الجولة لا تتضمن تغيير النبرة العربية الأحدث.');
      else addDecision('training-checkpoint-recent','بدأت من نقطة حفظ أحدث','اخترت تغييرًا حديثًا مستهدفًا لتحسين نبرة الرسائل العربية القصيرة، مع حاجة إلى تحقق إضافي قبل الإطلاق بدل افتراض نجاحه.');
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute);
    const { afterFailure:available, remainingMargin }=computeDescription(total);
    const tight=remainingMargin===0;
    const cost=total;
    html(`<div><span class="eyebrow">جولة التدريب الإضافي</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1>${supportingRoleStrip(['infraTeam'],'من يعمل مع ديفيد أثناء العطل؟')}<div class="reality-note"><strong>افتراض السيناريو</strong> نحتاج إلى ${MIN_COMPUTE_TO_CONTINUE} مجموعات متاحة على الأقل للاستمرار. هذا حد تعليمي خاص بالسيناريو، وليس خاصية تلقائية لكل تدريب موزع أو وصفًا عامًا لتحمل الأعطال.</div><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>الحد الأدنى المفترض</span><strong>${MIN_COMPUTE_TO_CONTINUE}</strong></div><div class="hud-item"><span>هامش السعة بعد العطل</span><strong>${remainingMargin} مجموعة</strong></div><div class="hud-item"><span>تكلفة التخصيص</span><strong>${cost} وحدة لعب</strong></div></div><div class="alert dangerish"><strong>العطل نفسه، لكن أثره قابل للحساب الآن.</strong><span>${tight?`مع ${total} مجموعات، وفرت التكلفة لكن خروج وحدة ترك ${available} متاحة: أي عند الحد الأدنى نفسه ومن دون هامش إضافي.`:`مع ${total} مجموعات، تبقى ${available} متاحة بعد العطل، أي ${remainingMargin} فوق الحد الأدنى المفترض.`}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تدفع وقتًا إضافيًا للحصول على تشخيص أوضح قبل الاستمرار.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بالسعة المتبقية</strong><small>${tight?'تتجنب التوقف، لكنك تعمل عند الحد الأدنى المفترض من دون هامش سعة إضافي.':'تستخدم هامش السعة المتبقي وتؤجل التشخيص إلى ما بعد الجولة.'}</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='pause';
      addDecision('train-pause','أوقفت جولة التطوير لتشخيص العطل','تحملت تأخيرًا، عزلت المجموعة المعطلة، ثم استأنفت الجولة بعد التحقق.');
      saveState(); go('trainingEval');
    });
    $('#trainContinue').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='continue';
      addDecision('train-continue',`واصلت الجولة مع ${available} من ${total} مجموعات متاحة`,tight?'أكملت الجولة عند الحد الأدنى المفترض ومن دون هامش سعة إضافي، ورحّلت التشخيص إلى ما بعدها.':`استخدمت هامش السعة المتبقي (${remainingMargin} فوق الحد الأدنى) لإكمال الجولة ثم رحّلت التشخيص إلى ما بعدها.`);
      saveState(); go('trainingEval');
    });
  }

  function trainingEval() {
    const data=dataInputs();
    addLedger(5,'ديفيد وفرق التطوير','إعداد وتشغيل ومراقبة جولة post-training وحل أعطال الحوسبة','نسخة مطورة من النموذج',data.unresolved?`دخلت ${data.unresolved} مواد مرّت مع مسائل غير محسومة؛ لم تختف هذه المسائل وستولد تحققًا إضافيًا.`:'لم تدخل المواد المعلقة، وكل المواد المارة حُسمت مسائلها المعروضة.');
    const paused=state.flags.trainingIncidentChoice==='pause';
    const total=Number(state.flags.trainingCompute);
    const checkpoint=state.flags.trainingCheckpoint;
    const compute=computeDescription(total);
    html(`<div><span class="eyebrow">نتيجة جولة التطوير</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار السعة والعطل</strong>${paused?`توقفت الجولة، عُزلت المجموعة المعطلة، ثم استؤنف العمل بعد الإصلاح مع ${total} مجموعة متاحة. تكلفة التخصيص: ${total} وحدة لعب.`:`اكتملت الجولة بعد خروج مجموعة من الخدمة مع ${compute.afterFailure} متاحة و${compute.remainingMargin} فوق الحد الأدنى المفترض.`}</div><div class="stage-output"><strong>أثر اختيار نقطة الحفظ</strong>${checkpoint==='recent'?'الجولة تضمنت التغيير الأحدث المستهدف لتحسين نبرة الرسائل العربية القصيرة؛ لا تفترض اللعبة نجاحه، ولذلك يضيف حزمة تحقق قبل الإطلاق.':'اخترت نقطة أكثر اختبارًا؛ نطاق التحقق الإضافي أقل، لكن التغيير الأحدث المستهدف للنبرة لم يدخل هذه الجولة.'}</div>${data.unresolved?`<div class="alert dangerish"><strong>دين تحقق من مرحلة البيانات</strong><span>${data.unresolved} مواد دخلت الجولة رغم بقاء مسائل غير محسومة. هذا ليس «تحسنًا» ولا «فشلًا» تلقائيًا؛ إنه قرار حوكمة يجب أن يظهر في الجاهزية بدل أن يمحوه الانتقال التقني.</span></div>`:''}<div class="action-row"><button id="sendHuman" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('abstract6'));
  }

  function abstract6() {
    abstraction([['ديفيد','مهندس تعلم آلي','⌁'],['فرق البنية والتشغيل','','▥']],'نسخة مطورة من النموذج','إعدادات الجولة والحوسبة ومراقبة الأعطال والعمل الهندسي أصبحت في المرحلة التالية نسخة من النموذج تحتاج إلى تقييم، مع بقاء أي مسائل بيانات غير محسومة ظاهرة كدين تحقق.','ch7Intro');
  }

  return { ch6Intro,trainingSetup,trainingRun,trainingEval,abstract6 };
}
