export function createTrainingRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;

  function ch6Intro() { chapterIntro(5, 'trainingSetup'); }

  function trainingSetup() {
    const checkpoint=state.flags.trainingCheckpoint;
    html(`<div><span class="eyebrow">مختبر تدريب افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما المقصود بالتدريب هنا؟</strong> هذا السيناريو يمثل جولة تطوير تستأنف من نقطة حفظ سابقة. اختيار نقطة الحفظ يؤثر في مقدار التحقق المطلوب والوقت، ولا يعني أن الأقدم أفضل أو الأحدث أسوأ.</div><div class="training-board"><div class="config-panel"><div class="form-row"><label>مواد البيانات</label><select disabled><option>الدفعة 18 + أمثلة بشرية — جاهزة</option></select></div><div class="form-row"><label for="computeSel">الخوادم المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — أسرع وأعلى تكلفة</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — أوفر وأبطأ</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>اختُبرت على نطاق أوسع — تحقق أقل مطلوبًا الآن</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تحتاج تحققًا إضافيًا من تغييراتها</option></select></div><button id="trainStart" class="primary-btn training-start">ابدأ التدريب</button></div><div class="chart-panel"><span class="kicker">أثر الإعدادات</span><div class="training-log training-config-summary">سعة أعلى: تكلفة أكبر وهامش زمني أكبر.<br>سعة أقل: تكلفة أقل وحساسية أكبر لفقد وحدة.<br>نقطة أكثر اختبارًا: تحقق أقل مطلوبًا الآن.<br>نقطة أحدث: تغييرات أحدث مع حاجة أكبر للتحقق.</div></div></div></div>`);
    $('#trainStart').addEventListener('click',()=>{
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      if(state.flags.trainingCompute==='12') addDecision('training-compute-12','خصصت 12 مجموعة خوادم للتدريب','ارتفعت التكلفة وأصبح هامش السعة أكبر.',{cost:5,pressure:-2});
      else addDecision('training-compute-8','خصصت 8 مجموعات خوادم للتدريب','خفضت تكلفة الحوسبة وزادت حساسية الجولة لفقد وحدة.',{cost:-4,pressure:4,burden:2});
      if(state.flags.trainingCheckpoint==='validated') addDecision('training-checkpoint-validated','بدأت من نقطة حفظ اختُبرت أكثر','احتاجت نقطة البداية إلى تحقق أقل في هذه الجولة مقابل الابتعاد عن أحدث التغييرات.',{pressure:1,cost:2,reliability:2});
      else addDecision('training-checkpoint-recent','بدأت من نقطة حفظ أحدث','استخدمت تغييرات أحدث مع حاجة أكبر للتحقق أثناء الجولة وبعدها.',{pressure:-1,cost:-1,reliability:-1});
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute); const available=Math.max(1,total-1);
    html(`<div><span class="eyebrow">جولة التدريب</span><h1 class="scene-title">بدأ التدريب على ${total} مجموعة خوادم.</h1><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>مؤشر الخطأ</span><strong>ينخفض ↓</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div></div><div class="alert dangerish"><strong>إحدى وحدات الحوسبة غير متاحة</strong><span>العطل لم ينتج عن اختيار السعة، لكن السعة تحدد مقدار الهامش المتبقي.</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تأخير أعلى وتشخيص أوضح.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بقدرة أقل</strong><small>يحافظ على الجولة مع ضغط أكبر على الموارد المتبقية.</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{ state.flags.trainingIncidentChoice='pause'; addDecision('train-pause','أوقفت جولة التدريب لتشخيص عطل','تحملت تأخيرًا مقابل استقرار وتشخيص أوضح.',{pressure:-3,cost:5,burden:-2,reliability:4}); saveState(); go('trainingEval'); });
    $('#trainContinue').addEventListener('click',()=>{ state.flags.trainingIncidentChoice='continue'; addDecision('train-continue','واصلت التدريب بقدرة أقل','حافظت على الجولة مع ضغط أكبر على الموارد.',{pressure:4,cost:-1,burden:3,reliability:-2}); saveState(); go('trainingEval'); });
  }

  function trainingEval() {
    addLedger(5,'ديفيد وفرق التدريب','إعداد وتشغيل ومراقبة جولات التدريب وحل أعطال الخوادم','نسخة مدرَّبة من النموذج','هذا السيناريو يمثل جولة تطوير مبسطة؛ مسارات التدريب تختلف بين النماذج.');
    const paused=state.flags.trainingIncidentChoice==='pause';
    html(`<div><span class="eyebrow">نتيجة جولة التدريب</span><h1 class="scene-title">انتهى التدريب، لكن النموذج ليس جاهزًا للإطلاق.</h1><div class="stage-output"><strong>أثر قرارك</strong>${paused?'توقفت الجولة مؤقتًا، عولج العطل، ثم استؤنف التدريب.':'اكتملت الجولة بسعة أقل وضغط أكبر على الموارد.'}</div><div class="stage-output"><strong>ناتج المرحلة</strong>نسخة من النموذج تستطيع إنتاج إجابات، لكنها تحتاج إلى تقييم الملاءمة والسلامة والجاهزية.</div><div class="action-row"><button id="sendHuman" class="primary-btn">أرسل النموذج للمراجعة البشرية</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('ch7Intro'));
  }
  return { ch6Intro,trainingSetup,trainingRun,trainingEval };
}
