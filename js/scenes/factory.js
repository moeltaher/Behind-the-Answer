import { supportingRoleStrip } from '../components/supporting-role-strip.js';

export function createFactoryRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line,next);
  const monitorTile = ctx.monitorTile;

  function ch2Intro() { chapterIntro(1, 'factoryOrientation'); }

  function factoryOrientation() {
    html(`<div><span class="eyebrow">مصنع مكونات إلكترونية افتراضي</span><h1 class="scene-title">أنت الآن ليلى، فنية تشغيل.</h1><p class="scene-subtitle">لن نحاكي كل خطوات صناعة أشباه الموصلات. سترين بصورة مبسطة كيف تمر الرقاقة بالمعالجة ثم التقطيع والتغليف والاختبار قبل أن تدخل في أجهزة أكبر.</p><div class="process-strip"><div class="process-step"><span>1</span><strong>معالجة الرقاقة</strong><small>تُبنى أنماط وطبقات دقيقة على الرقاقة عبر سلسلة عمليات صناعية.</small></div><div class="process-step"><span>2</span><strong>تقطيع وتغليف واختبار</strong><small>تُفصل الشرائح وتُغلف وتُختبر كهربائيًا وجوديًا.</small></div><div class="process-step"><span>3</span><strong>تجميع المكونات</strong><small>تدخل الشرائح مع الذاكرة والطاقة والشبكات في أجهزة وخوادم.</small></div></div><div class="reality-note"><strong>دور ليلى في هذا السيناريو</strong> مراقبة دفعة مكونات داخل بيئة تصنيع حساسة للجسيمات. الحدود التالية تعليمية لتوضيح قرار جودة وليست معيارًا صناعيًا عامًا.</div><div class="action-row"><button id="enterFab" class="primary-btn">ابدأ مراقبة الدفعة</button></div></div>`);
    $('#enterFab').addEventListener('click', () => go('factoryMonitor'));
  }

  function factoryMonitor() {
    html(`<div><span class="eyebrow">خط المكونات</span><h1 class="scene-title">راقب مؤشرات الدفعة.</h1><p class="scene-subtitle">في هذا السيناريو الحد التحذيري لمؤشر الجسيمات هو 40. تجاوز الحد لا يخبرك وحده بعدد القطع المعيبة ولا بسبب الجسيمات، لكنه يستدعي تحقيقًا قبل تمرير الدفعة.</p><div class="monitor">${monitorTile('درجة الحرارة','21.4° م',55)}${monitorTile('مؤشر الجسيمات','18 / 40',35)}${monitorTile('فرق الضغط إلى المنطقة المجاورة','+12 Pa',58)}${monitorTile('فحص العينة الأولي','ضمن النطاق',82)}</div><div class="action-row"><button id="observeFab" class="primary-btn">راقب الدفعة التالية</button></div></div>`);
    $('#observeFab').addEventListener('click', () => go('factoryIncident'));
  }

  function factoryIncident() {
    html(`<div><span class="eyebrow">تنبيه جودة</span><h1 class="scene-title">مؤشر الجسيمات تجاوز الحد التحذيري.</h1>${supportingRoleStrip(['maintenance','qualityInspector'],'من يدخل القرار مع ليلى الآن؟')}<div class="monitor">${monitorTile('درجة الحرارة','21.6° م',57)}<div class="monitor-tile"><span>مؤشر الجسيمات</span><strong class="numeric-value" dir="auto">49 / 40 ↑</strong><div class="bar"><i class="meter-fill meter-fill--warning" style="width:86%"></i></div></div>${monitorTile('فرق الضغط إلى المنطقة المجاورة','+12 Pa',58)}${monitorTile('نتيجة الفحص النهائي','لم تُحسم',10)}</div><div class="alert dangerish"><strong>الدفعة مطلوبة للشحن اليوم.</strong><span>إيقاف الخط يضيف وقتًا وتكلفة تشغيلية. الاستمرار يسمح بإكمال الدفعة لكنه ينقل مخاطرة أكبر إلى الفحص النهائي ويترك سبب ارتفاع الجسيمات دين صيانة مفتوحًا.</span></div><div class="choice-grid"><button id="fabStop" class="choice-btn"><strong>أوقف الخط وابحث عن مصدر الجسيمات</strong><small>يعمل فني الصيانة مع فريق الجودة على فحص الترشيح ومصادر أخرى محتملة قبل استكمال الدفعة.</small></button><button id="fabContinue" class="choice-btn"><strong>أكمل الدفعة ثم شدد الفحص النهائي</strong><small>يحافظ على زمن الإنتاج، ويزيد عمل فاحص الجودة، لكنه لا يغلق سبب التنبيه نفسه.</small></button></div></div>`);
    $('#fabStop').addEventListener('click', () => {
      state.flags.factoryChoice='stop';
      state.flags.factoryMaintenanceDebt=false;
      addDecision('factory-stop','أوقفت خط المكونات للتحقيق','تحملت الشركة توقفًا وعملت فرق الصيانة والجودة على البحث عن مصدر ارتفاع الجسيمات قبل إكمال الدفعة.');
      saveState(); go('factoryOutcome');
    });
    $('#fabContinue').addEventListener('click', () => {
      state.flags.factoryChoice='continue';
      state.flags.factoryMaintenanceDebt=true;
      addDecision('factory-continue','أكملت الدفعة ثم شددت الفحص','حافظت على زمن الإنتاج وانتقلت مخاطرة أكبر إلى الفحص النهائي، وبقي سبب ارتفاع الجسيمات دين صيانة مفتوحًا.');
      saveState(); go('factoryOutcome');
    });
  }

  function maintenanceDispositionDecided(){ return state.flags.factoryChoice==='stop' || state.decisions.some(decision=>decision.id==='factory-debt-closed'||decision.id==='factory-debt-carried'); }
  function finishFactory(stopped){
    if(stopped) addDecision('factory-maintenance-closed','أغلقت تحقيق الصيانة قبل انتقال الدفعة','دفع القرار تكلفة تأخير لكنه أغلق سبب التنبيه وأعاد المؤشر إلى النطاق قبل الانتقال.');
    addLedger(1,'ليلى وفرق التصنيع والصيانة والفحص','تشغيل وفحص وصيانة تصنيع المكونات','مكونات إلكترونية اجتازت الفحص',state.flags.factoryMaintenanceDebt?'اجتازت المكونات الفحص مع بقاء تحقيق صيانة مفتوحًا؛ جودة المنتج ودين الصيانة حالتان منفصلتان.':'اجتازت المكونات الفحص وأُغلق سبب تنبيه الجسيمات قبل مغادرة المرحلة، سواء أثناء الدفعة أو في نافذة صيانة لاحقة.');
    go('abstract2');
  }

  function factoryOutcome() {
    const stopped = state.flags.factoryChoice === 'stop';
    const closedAfter = state.decisions.some(decision=>decision.id==='factory-debt-closed');
    const investigation = stopped
      ? '<div class="alert goodish"><strong>أُغلق سبب التنبيه داخل المرحلة</strong><span>فحص فريق الصيانة مع الجودة أكثر من مصدر محتمل، وحدد تسربًا عند وصلة في مسار الترشيح، أصلحه ثم تحقق من عودة المؤشر إلى النطاق. هذه نتيجة افتراضية للسيناريو وليست قاعدة بأن كل ارتفاع للجسيمات سببه المرشح.</span></div>'
      : closedAfter
        ? '<div class="alert goodish"><strong>أُغلق دين الصيانة بعد انتهاء الدفعة</strong><span>بعد الحفاظ على موعد الشحن، أوقف فريق الصيانة المعدة في نافذة منفصلة، حدد مصدر التسرب وأصلحه ثم تحقق مع فريق الجودة من عودة المؤشر إلى النطاق. نجاح الفحص النهائي وحده لم يكن كافيًا؛ الإغلاق احتاج عمل صيانة مستقلًا.</span></div>'
        : '<div class="alert dangerish"><strong>دين صيانة باقٍ بعد الدفعة</strong><span>شدّد فريق الجودة الفحص النهائي ورفض وحدات أكثر، لكن سبب ارتفاع الجسيمات نفسه لم يُغلق. مرور المكونات بالفحص لا يمحو تحقيق الصيانة المطلوب.</span></div>';
    const debtChoice=!stopped&&!maintenanceDispositionDecided()?`<section class="card"><span class="kicker">قرار ظهر بسبب اختيارك الاستمرار في الإنتاج</span><h2>الفحص أغلق قرار الدفعة، لكنه لم يغلق سبب تنبيه الجسيمات.</h2><p>اختر الآن مصير دين الصيانة الذي أنشأه قرارك السابق.</p><div class="choice-grid"><button id="closeMaintenance" class="choice-btn"><strong>نفّذ نافذة صيانة بعد الشحن وأغلق السبب</strong><small>يحافظ على نتيجة الشحن، لكنه يضيف عمل صيانة مستقلًا بعد الدفعة.</small></button><button id="toFactoryAbstract" class="choice-btn"><strong>انقل دين الصيانة إلى الوردية التالية وانتقل</strong><small>يبقى السبب غير مغلق ويظهر في السجل النهائي بدل أن يختفي مع انتهاء الدفعة.</small></button></div></section>`:'';
    const transition=maintenanceDispositionDecided()?'<div class="action-row"><button id="toFactoryAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div>':'';
    html(`<div><span class="eyebrow">الفحص النهائي</span><h1 class="scene-title">${stopped ? 'عاد مؤشر الجسيمات إلى النطاق بعد التحقيق والمعالجة.' : 'اكتملت الدفعة، لكن قرار الصيانة ما زال منفصلًا عن نتيجة الفحص.'}</h1>${supportingRoleStrip(['maintenance','qualityInspector'],'من نفذ التحقيق والفحص؟')}<div class="stage-output"><strong>ناتج المرحلة</strong>مكونات إلكترونية اجتازت الفحص ويمكن أن تدخل مع أجزاء أخرى في تجميع الخوادم.</div><div class="hud-grid"><div class="hud-item"><span>نتيجة الجودة في السيناريو</span><strong>${stopped ? 'رفض محدود' : 'رفض أعلى'}</strong></div><div class="hud-item"><span>توقف الخط أثناء الدفعة</span><strong>${stopped ? '20 دقيقة افتراضية' : '0'}</strong></div><div class="hud-item"><span>الشحن</span><strong>${stopped ? 'متأخر' : 'في الموعد'}</strong></div><div class="hud-item"><span>دين الصيانة</span><strong>${state.flags.factoryMaintenanceDebt?'مفتوح':'مغلق'}</strong></div></div>${investigation}${debtChoice}<p class="muted">لا تفترض اللعبة نسبة عيوب يمكن حسابها من قراءة الجسيمات وحدها؛ النتيجة النوعية هنا توضح اتجاه المفاضلة فقط.</p><details class="transition-details" open><summary>كيف تصبح المكونات خادمًا؟</summary><p>الخادم ليس «رقاقة كبيرة»؛ يدخل في تجميعه المعالج والمسرع والذاكرة والتخزين والطاقة والشبكات والتبريد، ثم يمر باختبارات قبل النقل.</p><div class="montage"><div class="montage-card"><span class="icon">▤</span><strong>معالجة وذاكرة</strong><span>شرائح ووحدات ذاكرة</span></div><div class="montage-card"><span class="icon">ϟ</span><strong>طاقة</strong><span>مزودات ووحدات احتياطية</span></div><div class="montage-card"><span class="icon">≋</span><strong>شبكات</strong><span>اتصال بين الأجهزة</span></div><div class="montage-card"><span class="icon">◫</span><strong>تبريد</strong><span>إدارة الحرارة داخل الجهاز</span></div></div></details>${transition}</div>`);
    $('#closeMaintenance')?.addEventListener('click',()=>{state.flags.factoryMaintenanceDebt=false;addDecision('factory-debt-closed','أغلقت دين الصيانة في نافذة منفصلة بعد الشحن','فصلت بين نجاح الدفعة وبين إصلاح سبب التنبيه، ونفذت عمل صيانة مستقلًا أغلق السبب بعد الشحن.');saveState();factoryOutcome();});
    $('#toFactoryAbstract')?.addEventListener('click', () => {
      if(!stopped&&!maintenanceDispositionDecided()) addDecision('factory-debt-carried','نقلت دين الصيانة إلى الوردية التالية','بقي سبب ارتفاع الجسيمات غير مغلق رغم اجتياز المكونات للفحص النهائي.');
      saveState(); finishFactory(stopped);
    });
  }

  function abstract2() { abstraction([['ليلى','فنية تشغيل','▤'],['فريق الصيانة','','◇'],['فريق الفحص','','⌕']],'مكونات اجتازت الفحص','التصنيع والصيانة والفحص أصبحت مكونات مقبولة تنتقل إلى التجميع، مع بقاء دين الصيانة ظاهرًا إذا قررت حمله بدل إغلاقه.','ch3Intro'); }

  return { ch2Intro,factoryOrientation,factoryMonitor,factoryIncident,factoryOutcome,abstract2 };
}
