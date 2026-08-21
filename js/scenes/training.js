export function createTrainingRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { setChapter, chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;

  function ch6Intro() { chapterIntro(5, '', '', 'trainingSetup'); }

  function trainingSetup() {
    setChapter(5);
    html(`<div><span class="eyebrow">مختبر تدريب افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما المقصود بتدريب النموذج؟</strong> النموذج برنامج رياضي يحتوي على عدد كبير من القيم الداخلية. أثناء التدريب تُعرض عليه أمثلة كثيرة، وتُعدَّل هذه القيم تدريجيًا حتى يتحسن في توقع النص وإنتاجه. هذه العملية تحتاج إلى البيانات والخوادم معًا.</div><div class="training-board"><div class="config-panel"><div class="form-row"><label>مجموعة البيانات</label><select id="datasetSel" disabled><option>الإصدار 18 — جاهز</option></select></div><div class="form-row"><label for="computeSel">الخوادم المخصصة للتدريب</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute === '12' ? 'selected' : ''}>12 مجموعة — أسرع وأعلى تكلفة</option><option value="8" ${state.flags.trainingCompute === '8' ? 'selected' : ''}>8 مجموعات — أوفر وأبطأ</option></select></div><div class="form-row"><label for="checkpointSel">النسخة التي يبدأ منها التدريب</label><select id="checkpointSel"><option value="latest" ${state.flags.trainingCheckpoint === 'latest' ? 'selected' : ''}>نسخة الأساس الأحدث — أقرب لما اختُبر مؤخرًا</option><option value="older" ${state.flags.trainingCheckpoint === 'older' ? 'selected' : ''}>نسخة أقدم — أكثر استقرارًا لكنها تحتاج تحديثات أكثر</option></select><small class="term-note">اختياراتك هنا ستؤثر في تكلفة التدريب وضغط الوقت وجودة البداية.</small></div><button id="trainStart" class="primary-btn training-start">ابدأ التدريب بهذه الإعدادات</button></div><div class="chart-panel"><span class="kicker">ما الذي سيتغير؟</span><div class="training-log training-config-summary" dir="rtl">12 مجموعة: تكلفة أعلى وضغط وقت أقل.<br>8 مجموعات: تكلفة أقل لكن الجولة أبطأ.<br>النسخة الأحدث: بداية أفضل لكن أقل تحفظًا.<br>النسخة الأقدم: بداية أبطأ مع استقرار أكبر.</div></div></div></div>`);

    $('#trainStart').addEventListener('click', () => {
      state.flags.trainingCompute = $('#computeSel').value;
      state.flags.trainingCheckpoint = $('#checkpointSel').value;
      state.flags.trainingConfigured = true;

      if (state.flags.trainingCompute === '12') {
        addDecision('training-compute-12', 'خصصت 12 مجموعة خوادم للتدريب', 'ارتفعت التكلفة، لكن الجولة تملك هامشًا زمنيًا أكبر.', { cost: 5, pressure: -2, quality: 1 });
      } else {
        addDecision('training-compute-8', 'خصصت 8 مجموعات خوادم للتدريب', 'خفضت تكلفة الحوسبة، لكن الجولة أصبحت أبطأ وأكثر حساسية للأعطال.', { cost: -4, pressure: 4, burden: 2 });
      }

      if (state.flags.trainingCheckpoint === 'older') {
        addDecision('training-checkpoint-older', 'بدأت من نسخة أقدم وأكثر استقرارًا', 'اخترت أساسًا أكثر تحفظًا لكنه يحتاج وقتًا أكبر للوصول إلى الأداء المطلوب.', { pressure: 2, cost: 2, quality: 2 });
      } else {
        addDecision('training-checkpoint-latest', 'بدأت من أحدث نسخة متاحة', 'وفرت وقتًا في البداية مقابل الاعتماد على نسخة أقل نضجًا نسبيًا.', { pressure: -2, cost: -1, quality: -1 });
      }

      saveState();
      go('trainingRun');
    });
  }

  function trainingRun() {
    const total = Number(state.flags.trainingCompute || 12);
    const available = Math.max(1, total - 1);
    html(`<div><span class="eyebrow">جولة التدريب</span><h1 class="scene-title">بدأ التدريب على ${total} مجموعة خوادم.</h1><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>مؤشر الخطأ</span><strong>ينخفض ↓</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div></div><div class="training-graph"><div class="training-line"><svg viewBox="0 0 400 200" preserveAspectRatio="none"><polyline fill="none" stroke="rgba(124,164,255,.95)" stroke-width="4" points="0,25 50,60 100,83 150,112 200,125 245,138 270,100 295,145 350,157 400,166"/></svg></div></div><div class="alert dangerish"><strong>إحدى وحدات الحوسبة غير متاحة</strong><span>${total === 8 ? 'بما أنك اخترت سعة أقل، فإن فقد وحدة واحدة يؤثر نسبيًا أكثر في الجولة.' : 'ما زالت هناك سعة احتياطية أكبر، لكن العطل يحتاج إلى قرار.'}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف التدريب وافحص العطل</strong><small>تأخير أعلى مع تشخيص أوضح.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بقدرة أقل</strong><small>يحافظ على الجولة مع ضغط أعلى على الموارد المتبقية.</small></button></div></div>`);

    $('#trainPause').addEventListener('click', () => {
      state.flags.trainingIncidentChoice = 'pause';
      addDecision('train-pause', 'أوقفت جولة التدريب لتشخيص عطل', 'تحملت تكلفة تأخير بدل الاستمرار بحالة غير مستقرة.', { pressure: -3, cost: 5, burden: -2, quality: 5, visibility: 2 });
      saveState();
      go('trainingEval');
    });
    $('#trainContinue').addEventListener('click', () => {
      state.flags.trainingIncidentChoice = 'continue';
      addDecision('train-continue', 'واصلت التدريب بقدرة أقل', 'حافظت على الجولة لكنها أصبحت أبطأ وارتفع الضغط على البنية.', { pressure: 4, cost: -1, burden: 3, quality: -2, visibility: 1 });
      saveState();
      go('trainingEval');
    });
  }

  function trainingEval() {
    addLedger(5, 'ديفيد وفرق التدريب', 'إعداد وتشغيل ومراقبة جولات التدريب وحل أعطال الخوادم', 'نسخة مدرَّبة من النموذج', 'التدريب لا يلغي الحاجة إلى تقييم بشري لاحق لجودة وسلوك النموذج.');
    const outcome = state.flags.trainingIncidentChoice === 'pause'
      ? 'توقفت الجولة مؤقتًا، عولج العطل، ثم استؤنف التدريب حتى النهاية.'
      : 'استمرت الجولة بسعة أقل حتى النهاية، مع ضغط أكبر على الموارد المتبقية.';
    html(`<div><span class="eyebrow">نتيجة جولة التدريب</span><h1 class="scene-title">انتهى التدريب، لكن النموذج ليس جاهزًا للإطلاق.</h1><div class="stage-output"><strong>أثر قرارك</strong>${outcome}</div><div class="stage-output"><strong>ماذا أنتجت هذه المرحلة؟</strong>نسخة من النموذج تستطيع إنتاج إجابات، لكنها ما زالت تحتاج إلى تقييم الدقة واللغة والسلامة.</div><div class="card"><div class="message ai">س: ما عاصمة فرنسا؟<br><strong>باريس.</strong></div><div class="message ai">س: اكتب رسالة رسمية.<br><strong>إجابة مقبولة.</strong></div><div class="message ai">س: رد بالمصرية على طلب بسيط.<br><strong>«أتشرف بإحاطة سيادتكم علمًا...»</strong></div><div class="alert"><strong>المشكلة</strong> بعض الاختبارات ناجحة، وبعضها يكشف ضعفًا في اللغة والسياق والسلوك.</div></div><div class="action-row"><button id="sendHuman" class="primary-btn">أرسل النموذج للمراجعة البشرية</button></div></div>`);
    $('#sendHuman').addEventListener('click', () => go('ch7Intro'));
  }

  return { ch6Intro, trainingSetup, trainingRun, trainingEval };
}
