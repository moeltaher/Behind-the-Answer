import { supportingRoleStrip } from '../components/supporting-role-strip.js';

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
    return {
      ready: statuses.filter(status=>status==='ready').length,
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

  function trainingSetup() {
    const checkpoint=state.flags.trainingCheckpoint;
    const annotation=annotationInputs();
    const data=dataInputs();
    const confirmedLabel=confirmedExamplesLabel(annotation.confirmed);
    const pendingLabel=pendingCasesLabel(annotation.pending);
    html(`<div><span class="eyebrow">مختبر تطوير نموذج افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما الذي نحاكيه تحديدًا؟</strong> هذه ليست عملية تدريب نموذج من الصفر. السيناريو يمثل جولة post-training مبسطة تبدأ من نقطة حفظ سابقة. من الدفعة 18 يدخل ${data.ready} من ${state.flags.dataStatuses.length||5} عناصر باعتبارها جاهزة، بينما تبقى ${data.pending} معلقة. ومن عمل التصنيف يدخل ${confirmedLabel}، بينما تبقى ${pendingLabel} و${annotation.rejected} مرفوضة خارج المدخل المؤكد.</div><div class="training-board"><div class="config-panel"><div class="form-row"><label>مواد التطوير الجاهزة</label><select disabled><option>${data.ready} مواد جاهزة من الدفعة 18 + ${confirmedLabel}</option></select></div><div class="form-row"><label for="computeSel">مجموعات الحوسبة المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — تكلفة لعب أعلى وهامش أعطال أكبر</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — تكلفة لعب أقل وهامش أعطال أضيق</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>أكثر اختبارًا — تحقق أقل، من دون تغيير النبرة الأحدث</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تتضمن تغييرًا مستهدفًا للنبرة العربية وتحتاج تحققًا إضافيًا</option></select></div><button id="trainStart" class="primary-btn training-start">ابدأ الجولة</button></div><div class="chart-panel"><span class="kicker">المفاضلات قبل البدء</span><div class="training-log training-config-summary"><strong>الحوسبة</strong><br>12 مجموعة: تكلفة 12 وحدة لعب للحوسبة، وفقد مجموعة يترك 11 متاحة.<br>8 مجموعات: تكلفة 8 وحدات لعب للحوسبة، وتوفر 4 وحدات مقابل هامش أضيق.<br><br><strong>نقطة الحفظ</strong><br>الأكثر اختبارًا: مخاطرة تحقق أقل، لكنها لا تتضمن التغيير الأحدث المستهدف لنبرة الرسائل العربية القصيرة.<br>الأحدث: تحمل هذا التغيير المقصود، لكن فائدته لا تُفترض مسبقًا ويجب التحقق منه قبل الإطلاق.</div></div></div></div>`);
    $('#trainStart').addEventListener('click',()=>{
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      if(state.flags.trainingCompute==='12') addDecision('training-compute-12','خصصت 12 مجموعة حوسبة لجولة التطوير','أنفقت 12 وحدة لعب للحوسبة في السيناريو مقابل هامش أكبر إذا خرجت مجموعة من الخدمة.');
      else addDecision('training-compute-8','خصصت 8 مجموعات حوسبة لجولة التطوير','أنفقت 8 وحدات لعب للحوسبة فقط، موفرًا 4 وحدات مقابل هامش أعطال أضيق.');
      if(state.flags.trainingCheckpoint==='validated') addDecision('training-checkpoint-validated','بدأت من نقطة حفظ اختُبرت أكثر','قللت نطاق التحقق الإضافي، لكن الجولة لا تتضمن تغيير النبرة العربية الأحدث.');
      else addDecision('training-checkpoint-recent','بدأت من نقطة حفظ أحدث','اخترت تغييرًا حديثًا مستهدفًا لتحسين نبرة الرسائل العربية القصيرة، مع حاجة إلى تحقق إضافي قبل الإطلاق بدل افتراض نجاحه.');
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute);
    const available=Math.max(1,total-1);
    const tight=total===8;
    const cost=total;
    html(`<div><span class="eyebrow">جولة التدريب الإضافي</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1>${supportingRoleStrip(['infraTeam'],'من يعمل مع ديفيد أثناء العطل؟')}<div class="reality-note"><strong>افتراض السيناريو</strong> نفترض هنا بنية تستطيع الاستمرار بعد فقد مجموعة واحدة. هذا ليس سلوكًا تلقائيًا في كل تدريب موزع.</div><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>تكلفة التخصيص</span><strong>${cost} وحدة لعب للحوسبة</strong></div><div class="hud-item"><span>هامش الأعطال</span><strong>${tight?'أضيق':'أوسع'}</strong></div></div><div class="alert dangerish"><strong>العطل نفسه، لكن أثره ليس نفسه.</strong><span>${tight?'مع 8 مجموعات، وفرت 4 وحدات لعب للحوسبة لكن خروج وحدة يترك موارد أقل إذا حدث عطل ثانٍ أو ارتفع الحمل.':'مع 12 مجموعة، دفعت تكلفة لعب أعلى وتبقى وحدات أكثر متاحة بعد العطل، مع استمرار الحاجة إلى فهم سببه.'}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تدفع وقتًا إضافيًا للحصول على تشخيص أوضح قبل الاستمرار.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بالسعة المتبقية</strong><small>${tight?'توفر وقت التوقف مقابل هامش أعطال أضيق.':'تستفيد من الهامش الأكبر وتؤجل التشخيص إلى ما بعد الجولة.'}</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='pause';
      addDecision('train-pause','أوقفت جولة التطوير لتشخيص العطل','تحملت تأخيرًا، عزلت المجموعة المعطلة، ثم استأنفت الجولة بعد التحقق.');
      saveState(); go('trainingEval');
    });
    $('#trainContinue').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='continue';
      addDecision('train-continue',`واصلت الجولة مع ${available} من ${total} مجموعات متاحة`,tight?'أكملت الجولة بهامش أعطال أضيق ورحّلت التشخيص إلى ما بعدها.':'استخدمت الهامش الأكبر لإكمال الجولة ثم رحّلت التشخيص إلى ما بعدها.');
      saveState(); go('trainingEval');
    });
  }

  function trainingEval() {
    addLedger(5,'ديفيد وفرق التطوير','إعداد وتشغيل ومراقبة جولة post-training وحل أعطال الحوسبة','نسخة مطورة من النموذج','دخلت فقط مواد البيانات والأمثلة البشرية المؤكدة، وبقيت الحالات المعلقة والمرفوضة خارج الجولة.');
    const paused=state.flags.trainingIncidentChoice==='pause';
    const total=Number(state.flags.trainingCompute);
    const checkpoint=state.flags.trainingCheckpoint;
    html(`<div><span class="eyebrow">نتيجة جولة التطوير</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار السعة والعطل</strong>${paused?`توقفت الجولة، عُزلت المجموعة المعطلة، ثم استؤنف العمل بعد الإصلاح مع ${total} مجموعة متاحة. تكلفة التخصيص في السيناريو: ${total} وحدة لعب للحوسبة.`:`اكتملت الجولة بعد خروج مجموعة من الخدمة؛ كان هامش الأعطال ${total===8?'أضيق مع توفير 4 وحدات لعب للحوسبة':'أوسع مقابل تكلفة لعب أعلى للحوسبة'}.`}</div><div class="stage-output"><strong>أثر اختيار نقطة الحفظ</strong>${checkpoint==='recent'?'الجولة تضمنت التغيير الأحدث المستهدف لتحسين نبرة الرسائل العربية القصيرة؛ لا تفترض اللعبة نجاحه، ولذلك يضيف حزمة تحقق قبل الإطلاق.':'اخترت نقطة أكثر اختبارًا؛ نطاق التحقق الإضافي أقل، لكن التغيير الأحدث المستهدف للنبرة لم يدخل هذه الجولة.'}</div><div class="action-row"><button id="sendHuman" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('abstract6'));
  }

  function abstract6() {
    abstraction([['ديفيد','مهندس تعلم آلي','⌁'],['فرق البنية والتشغيل','','▥']],'نسخة مطورة من النموذج','إعدادات الجولة والحوسبة ومراقبة الأعطال والعمل الهندسي أصبحت في المرحلة التالية نسخة من النموذج تحتاج إلى تقييم.','ch7Intro');
  }

  return { ch6Intro,trainingSetup,trainingRun,trainingEval,abstract6 };
}
