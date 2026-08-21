export function createTrainingRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;

  function ch6Intro() { chapterIntro(5, 'trainingSetup'); }

  function trainingSetup() {
    const checkpoint=state.flags.trainingCheckpoint;
    html(`<div><span class="eyebrow">مختبر تدريب افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما المقصود بالتدريب هنا؟</strong> هذا السيناريو يمثل جولة تطوير تستأنف من نقطة حفظ سابقة. اختيار نقطة الحفظ يؤثر في مقدار التحقق المطلوب، واختيار السعة يغير هامش الموارد إذا تعطلت وحدة.</div><div class="training-board"><div class="config-panel"><div class="form-row"><label>مواد البيانات</label><select disabled><option>الدفعة 18 + أمثلة بشرية — جاهزة</option></select></div><div class="form-row"><label for="computeSel">الخوادم المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — أعلى تكلفة وهامش أكبر</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — أوفر وهامش أقل</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>اختُبرت على نطاق أوسع — تحقق أقل مطلوبًا الآن</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تحتاج تحققًا إضافيًا من تغييراتها</option></select></div><button id="trainStart" class="primary-btn training-start">ابدأ التدريب</button></div><div class="chart-panel"><span class="kicker">ما الذي سيتغير فعلًا؟</span><div class="training-log training-config-summary">12 مجموعة: إذا فقدت وحدة يبقى 11/12 من السعة.<br>8 مجموعات: فقد وحدة يترك 7/8 ويجعل الهامش أضيق.<br>نقطة أكثر اختبارًا: وقت تحقق أقل بعد الجولة.<br>نقطة أحدث: وقت تحقق إضافي قبل الإطلاق.</div></div></div></div>`);
    $('#trainStart').addEventListener('click',()=>{
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      if(state.flags.trainingCompute==='12') addDecision('training-compute-12','خصصت 12 مجموعة خوادم للتدريب','دفعت تكلفة حوسبة أعلى مقابل هامش أكبر إذا خرجت وحدة من الخدمة.',{cost:5,pressure:-2,reliability:1});
      else addDecision('training-compute-8','خصصت 8 مجموعات خوادم للتدريب','خفضت تكلفة الحوسبة، لكن فقد وحدة واحدة جعل الهامش المتبقي أضيق.',{cost:-4,pressure:4,burden:2,reliability:-1});
      if(state.flags.trainingCheckpoint==='validated') addDecision('training-checkpoint-validated','بدأت من نقطة حفظ اختُبرت أكثر','احتاجت نقطة البداية إلى تحقق أقل في هذه الجولة، من دون افتراض أنها أفضل لغويًا.',{pressure:-1,cost:-1,reliability:2});
      else addDecision('training-checkpoint-recent','بدأت من نقطة حفظ أحدث','استخدمت تغييرات أحدث مع حاجة إلى وقت واختبارات إضافية للتحقق منها.',{pressure:2,cost:2,reliability:-1});
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute);
    const available=Math.max(1,total-1);
    const tight=total===8;
    html(`<div><span class="eyebrow">جولة التدريب</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>هامش الموارد</span><strong>${tight?'ضيق — الحمل على الباقي 97%':'أوسع — الحمل على الباقي 84%'}</strong></div></div><div class="alert dangerish"><strong>العطل نفسه، لكن أثره ليس نفسه.</strong><span>${tight?'مع 8 مجموعات، الاستمرار يضع الموارد المتبقية قرب الحد ويزيد احتمال توقف الجولة إذا حدث عطل ثانٍ.':'مع 12 مجموعة، توجد سعة أكبر لاستمرار الجولة، مع بقاء ضرورة فهم سبب العطل.'}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تحافظ على تشخيص واضح وتدفع تكلفة وقت إضافي.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بالسعة المتبقية</strong><small>${tight?'يوفر وقت التوقف لكنه يعمل بهامش ضيق جدًا.':'يستفيد من الهامش الأكبر ويؤجل التشخيص إلى ما بعد الجولة.'}</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='pause';
      addDecision('train-pause','أوقفت جولة التدريب لتشخيص العطل','تحملت تأخيرًا، عزلت الوحدة المعطلة، ثم استأنفت الجولة بعد التحقق.',{pressure:-3,cost:5,burden:-2,reliability:4});
      saveState(); go('trainingEval');
    });
    $('#trainContinue').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='continue';
      addDecision('train-continue',`واصلت التدريب بقدرة ${available}/${total}`,tight?'أكملت الجولة بهامش ضيق جدًا؛ أي عطل ثانٍ كان سيجعل الاستمرار أصعب.':'استخدمت هامش السعة الأكبر لإكمال الجولة ثم رحّلت التشخيص إلى ما بعدها.',tight?{pressure:6,cost:-2,burden:5,reliability:-4}:{pressure:2,cost:-1,burden:2,reliability:-1});
      saveState(); go('trainingEval');
    });
  }

  function trainingEval() {
    addLedger(5,'ديفيد وفرق التدريب','إعداد وتشغيل ومراقبة جولات التدريب وحل أعطال الخوادم','نسخة مدرَّبة من النموذج','هذا السيناريو يمثل جولة تطوير مبسطة؛ مسارات التدريب الفعلية تختلف بين النماذج والفرق.');
    const paused=state.flags.trainingIncidentChoice==='pause';
    const total=Number(state.flags.trainingCompute);
    const checkpoint=state.flags.trainingCheckpoint;
    html(`<div><span class="eyebrow">نتيجة جولة التدريب</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار السعة والعطل</strong>${paused?`توقفت الجولة، عُزلت الوحدة المعطلة، ثم استؤنف التدريب على ${total} مجموعة بعد الإصلاح.`:`اكتملت الجولة بعد خروج وحدة من الخدمة؛ كان هامش السعة ${total===8?'ضيقًا':'أوسع'}.`}</div><div class="stage-output"><strong>ما بقي قبل الإطلاق</strong>${checkpoint==='recent'?'لأنك بدأت من نقطة حفظ أحدث، يتطلب السيناريو مجموعة تحقق إضافية من التغييرات قبل قرار الإطلاق.':'نقطة البداية كانت أكثر اختبارًا، لذلك نطاق التحقق الإضافي أقل في هذا السيناريو.'}</div><div class="action-row"><button id="sendHuman" class="primary-btn">أرسل النسخة للمراجعة البشرية</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('ch7Intro'));
  }
  return { ch6Intro,trainingSetup,trainingRun,trainingEval };
}
