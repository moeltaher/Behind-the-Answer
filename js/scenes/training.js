export function createTrainingRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch6Intro() { chapterIntro(5, 'trainingSetup'); }

  function annotationInputs() {
    const results=state.flags.annotationResults;
    const confirmed=results.filter(result=>result.acceptedAsReasonable&&!result.pending).length;
    const pending=results.filter(result=>result.pending).length;
    return { confirmed, pending };
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
    const inputs=annotationInputs();
    const confirmedLabel=confirmedExamplesLabel(inputs.confirmed);
    const pendingLabel=pendingCasesLabel(inputs.pending);
    html(`<div><span class="eyebrow">مختبر تطوير نموذج افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما الذي نحاكيه تحديدًا؟</strong> هذه ليست عملية تدريب نموذج من الصفر. السيناريو يمثل جولة post-training مبسطة تبدأ من نقطة حفظ سابقة. المدخل المؤكد من عمل التصنيف: ${confirmedLabel}. خارج الجولة حتى الحسم: ${pendingLabel}.</div><div class="training-board"><div class="config-panel"><div class="form-row"><label>مواد التطوير</label><select disabled><option>الدفعة 18 + ${confirmedLabel}</option></select></div><div class="form-row"><label for="computeSel">مجموعات الحوسبة المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — تكلفة أعلى وهامش أعطال أكبر</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — تكلفة أقل وهامش أعطال أضيق</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>اختُبرت على نطاق أوسع — تحقق أقل مطلوبًا الآن</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تحتاج تحققًا إضافيًا من تغييراتها</option></select></div><button id="trainStart" class="primary-btn training-start">ابدأ الجولة</button></div><div class="chart-panel"><span class="kicker">ما الذي سيتغير فعلًا؟</span><div class="training-log training-config-summary">12 مجموعة: فقد وحدة يترك 11 مجموعة متاحة، أي هامش أعطال أكبر.<br>8 مجموعات: فقد وحدة يترك 7 مجموعات متاحة، أي هامش أضيق.<br>نقطة أكثر اختبارًا: نطاق تحقق إضافي أقل.<br>نقطة أحدث: نطاق تحقق إضافي أكبر قبل الإطلاق.</div></div></div></div>`);
    $('#trainStart').addEventListener('click',()=>{
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      if(state.flags.trainingCompute==='12') addDecision('training-compute-12','خصصت 12 مجموعة حوسبة لجولة التطوير','دفعت تكلفة حوسبة أعلى مقابل هامش أكبر إذا خرجت مجموعة من الخدمة.');
      else addDecision('training-compute-8','خصصت 8 مجموعات حوسبة لجولة التطوير','خفضت تكلفة الحوسبة، لكن فقد مجموعة واحدة ترك هامشًا أضيق.');
      if(state.flags.trainingCheckpoint==='validated') addDecision('training-checkpoint-validated','بدأت من نقطة حفظ اختُبرت أكثر','احتاجت نقطة البداية إلى نطاق تحقق إضافي أقل في هذه الجولة، من دون افتراض أنها أفضل لغويًا.');
      else addDecision('training-checkpoint-recent','بدأت من نقطة حفظ أحدث','استخدمت تغييرات أحدث مع حاجة إلى تحقق إضافي قبل الإطلاق.');
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute);
    const available=Math.max(1,total-1);
    const tight=total===8;
    html(`<div><span class="eyebrow">جولة التدريب الإضافي</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>هامش الأعطال</span><strong>${tight?'أضيق':'أوسع'}</strong></div></div><div class="alert dangerish"><strong>العطل نفسه، لكن أثره ليس نفسه.</strong><span>${tight?'مع 8 مجموعات، خروج وحدة يترك موارد أقل متاحة إذا حدث عطل ثانٍ أو ارتفع الحمل.':'مع 12 مجموعة، تبقى وحدات أكثر متاحة بعد العطل، مع استمرار الحاجة إلى فهم سببه.'}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تدفع وقتًا إضافيًا للحصول على تشخيص أوضح قبل الاستمرار.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بالسعة المتبقية</strong><small>${tight?'توفر وقت التوقف مقابل هامش أعطال أضيق.':'تستفيد من الهامش الأكبر وتؤجل التشخيص إلى ما بعد الجولة.'}</small></button></div></div>`);
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
    addLedger(5,'ديفيد وفرق التطوير','إعداد وتشغيل ومراقبة جولة post-training وحل أعطال الحوسبة','نسخة مطورة من النموذج','يمثل السيناريو جولة post-training مبسطة، ويستبعد الحالات البشرية المعلقة من المدخل المؤكد.');
    const paused=state.flags.trainingIncidentChoice==='pause';
    const total=Number(state.flags.trainingCompute);
    const checkpoint=state.flags.trainingCheckpoint;
    html(`<div><span class="eyebrow">نتيجة جولة التطوير</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار السعة والعطل</strong>${paused?`توقفت الجولة، عُزلت المجموعة المعطلة، ثم استؤنف العمل بعد الإصلاح مع ${total} مجموعة متاحة.`:`اكتملت الجولة بعد خروج مجموعة من الخدمة؛ كان هامش الأعطال ${total===8?'أضيق':'أوسع'}.`}</div><div class="stage-output"><strong>ما بقي قبل الإطلاق</strong>${checkpoint==='recent'?'تغييرات نقطة الحفظ الأحدث تحتاج إلى حزمة تحقق إضافية قبل قرار الإطلاق.':'نقطة البداية كانت أكثر اختبارًا، لذلك لا تضيف حزمة تحقق خاصة بتغييرات checkpoint في هذا السيناريو.'}</div><div class="action-row"><button id="sendHuman" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('abstract6'));
  }

  function abstract6() {
    abstraction([['ديفيد','مهندس تعلم آلي','⌁'],['فرق البنية والتشغيل','','▥']],'نسخة مطورة من النموذج','إعدادات الجولة والحوسبة ومراقبة الأعطال والعمل الهندسي أصبحت في المرحلة التالية نسخة من النموذج تحتاج إلى تقييم.','ch7Intro');
  }

  return { ch6Intro,trainingSetup,trainingRun,trainingEval,abstract6 };
}
