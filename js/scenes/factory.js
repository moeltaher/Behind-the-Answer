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
    html(`<div><span class="eyebrow">تنبيه جودة</span><h1 class="scene-title">مؤشر الجسيمات تجاوز الحد التحذيري.</h1>${supportingRoleStrip(['maintenance','qualityInspector'],'من يدخل القرار مع ليلى الآن؟')}<div class="monitor">${monitorTile('درجة الحرارة','21.6° م',57)}<div class="monitor-tile"><span>مؤشر الجسيمات</span><strong class="numeric-value" dir="auto">49 / 40 ↑</strong><div class="bar"><i class="meter-fill meter-fill--warning" style="width:86%"></i></div></div>${monitorTile('فرق الضغط إلى المنطقة المجاورة','+12 Pa',58)}${monitorTile('نتيجة الفحص النهائي','لم تُحسم',10)}</div><div class="alert dangerish"><strong>الدفعة مطلوبة للشحن اليوم.</strong><span>إيقاف الخط يضيف وقتًا وتكلفة تشغيلية. الاستمرار يسمح بإكمال الدفعة لكنه ينقل مخاطرة أكبر إلى الفحص النهائي ويترك سبب ارتفاع الجسيمات دين صيانة مفتوحًا.</span></div><div class="choice-grid"><button id="fabStop" class="choice-btn"><strong>أوقف الخط وابدأ التحقيق</strong><small>القرار يوقف الإنتاج فقط؛ التشخيص والإصلاح وإعادة القياس ستظل خطوات مستقلة.</small></button><button id="fabContinue" class="choice-btn"><strong>أكمل الدفعة ثم شدد الفحص النهائي</strong><small>يحافظ على زمن الإنتاج، ويزيد عمل فاحص الجودة، لكنه لا يغلق سبب التنبيه نفسه.</small></button></div></div>`);
    $('#fabStop').addEventListener('click', () => {
      state.flags.factoryChoice='stop';
      state.flags.factoryMaintenanceDebt=true;
      state.flags.factoryRemediationStage='none';
      addDecision('factory-stop','أوقفت خط المكونات للتحقيق','أوقفت الإنتاج؛ لم يُشخّص السبب ولم يُصلح بعد.');
      saveState(); go('factoryOutcome');
    });
    $('#fabContinue').addEventListener('click', () => {
      state.flags.factoryChoice='continue';
      state.flags.factoryMaintenanceDebt=true;
      state.flags.factoryRemediationStage='none';
      addDecision('factory-continue','أكملت الدفعة ثم شددت الفحص','حافظت على زمن الإنتاج وانتقلت مخاطرة أكبر إلى الفحص النهائي، وبقي سبب ارتفاع الجسيمات دين صيانة مفتوحًا.');
      saveState(); go('factoryOutcome');
    });
  }

  function remediationRequired(){return state.flags.factoryMaintenanceDebt&&state.flags.factoryRemediationStage!=='verified';}
  function remediationMarkup(stopped){
    if(!remediationRequired()) return '';
    if(state.flags.factoryRemediationStage==='none') return `<section class="card"><span class="kicker">${stopped?'الخط متوقف':'نافذة صيانة بعد الدفعة'}</span><h2>حدّد السبب قبل الإصلاح.</h2>${supportingRoleStrip(['maintenance','qualityInspector'],'من ينفذ التشخيص؟')}<p>ارتفاع المؤشر لا يحدد سببه وحده. افحص الترشيح والوصلات ومصادر الجسيمات المحتملة.</p><div class="action-row"><button id="diagnoseFactory" class="primary-btn">نفّذ التشخيص وسجل السبب</button></div></section>`;
    return `<section class="card"><span class="kicker">التشخيص مكتمل</span><h2>وُجد تسرب عند وصلة في مسار الترشيح.</h2><p>التشخيص لا يغلق التنبيه. أصلح الوصلة ثم أعد قياس مؤشر الجسيمات قبل اعتبار دين الصيانة مغلقًا.</p><div class="action-row"><button id="verifyFactoryRepair" class="primary-btn">أصلح الوصلة وأعد القياس</button></div></section>`;
  }
  function maintenanceDispositionDecided(){return !state.flags.factoryMaintenanceDebt||state.decisions.some(decision=>decision.id==='factory-debt-carried');}
  function finishFactory(){
    addLedger(1,'ليلى وفرق التصنيع والصيانة والفحص','تشغيل وفحص وصيانة تصنيع المكونات','مكونات إلكترونية اجتازت الفحص',state.flags.factoryMaintenanceDebt?'اجتازت المكونات الفحص مع بقاء تحقيق صيانة مفتوحًا؛ جودة المنتج ودين الصيانة حالتان منفصلتان.':'اجتازت المكونات الفحص وأُغلق سبب تنبيه الجسيمات عبر تشخيص ثم إصلاح ثم إعادة قياس.');
    go('abstract2');
  }

  function factoryOutcome() {
    const stopped=state.flags.factoryChoice==='stop';
    if(!state.flags.factoryChoice){go('factoryIncident');return;}
    const verified=!state.flags.factoryMaintenanceDebt&&state.flags.factoryRemediationStage==='verified';
    const investigation=verified?'<div class="alert goodish"><strong>أُغلق سبب التنبيه</strong><span>شُخّص التسرب، أُصلحت الوصلة، ثم أُعيد القياس وعاد المؤشر إلى النطاق. الإغلاق جاء من سلسلة تحقق، لا من اختيار زر الإيقاف وحده.</span></div>':state.decisions.some(decision=>decision.id==='factory-debt-carried')?'<div class="alert dangerish"><strong>دين صيانة باقٍ</strong><span>مرور الدفعة بالفحص النهائي لا يغلق سبب ارتفاع الجسيمات.</span></div>':'';
    const canCarry=!stopped&&state.flags.factoryMaintenanceDebt&&state.flags.factoryRemediationStage==='none'&&!state.decisions.some(decision=>decision.id==='factory-debt-carried');
    const carry=canCarry?'<div class="choice-grid"><button id="startFactoryMaintenance" class="choice-btn"><strong>ابدأ نافذة الصيانة الآن</strong><small>شخّص السبب ثم أصلحه وأعد القياس.</small></button><button id="carryFactoryDebt" class="choice-btn"><strong>انقل الدين إلى الوردية التالية</strong><small>يبقى السبب غير مغلق ويظهر في النتيجة النهائية.</small></button></div>':'';
    const remediation=(stopped||state.decisions.some(d=>d.id==='factory-maintenance-started'))?remediationMarkup(stopped):'';
    const transition=maintenanceDispositionDecided()?'<div class="action-row"><button id="toFactoryAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div>':'';
    html(`<div><span class="eyebrow">الفحص النهائي والصيانة</span><h1 class="scene-title">${stopped?'الخط متوقف حتى يثبت إغلاق السبب.':'اكتملت الدفعة؛ نتيجة الجودة منفصلة عن دين الصيانة.'}</h1>${supportingRoleStrip(['maintenance','qualityInspector'],'من ينفذ التحقيق والفحص؟')}<div class="stage-output"><strong>ناتج الدفعة</strong>مكونات إلكترونية اجتازت الفحص ويمكن أن تدخل مع أجزاء أخرى في تجميع الخوادم.</div><div class="hud-grid"><div class="hud-item"><span>نتيجة الجودة</span><strong>${stopped?'رفض محدود':'رفض أعلى'}</strong></div><div class="hud-item"><span>توقف الخط أثناء الدفعة</span><strong>${stopped?'20 دقيقة افتراضية':'0'}</strong></div><div class="hud-item"><span>الشحن</span><strong>${stopped?'متأخر':'في الموعد'}</strong></div><div class="hud-item"><span>دين الصيانة</span><strong>${state.flags.factoryMaintenanceDebt?'مفتوح':'مغلق'}</strong></div></div>${investigation}${carry}${remediation}<p class="muted">لا تفترض اللعبة نسبة عيوب يمكن حسابها من قراءة الجسيمات وحدها؛ النتيجة النوعية هنا توضح اتجاه المفاضلة فقط.</p>${transition}</div>`);
    $('#startFactoryMaintenance')?.addEventListener('click',()=>{addDecision('factory-maintenance-started','بدأت نافذة صيانة مستقلة بعد الشحن','نجاح الدفعة لم يُستخدم بديلًا عن تشخيص سبب التنبيه.');saveState();factoryOutcome();});
    $('#diagnoseFactory')?.addEventListener('click',()=>{state.flags.factoryRemediationStage='diagnosed';addDecision('factory-maintenance-diagnosed','شخّصت مصدر ارتفاع الجسيمات','فحصت فرق الصيانة والجودة المصادر المحتملة وحددت تسربًا عند وصلة في مسار الترشيح.');saveState();factoryOutcome();});
    $('#verifyFactoryRepair')?.addEventListener('click',()=>{state.flags.factoryRemediationStage='verified';state.flags.factoryMaintenanceDebt=false;addDecision('factory-maintenance-verified','أصلحت السبب وأعدت القياس','أُصلحت الوصلة وعاد مؤشر الجسيمات إلى النطاق بعد إعادة القياس.');saveState();factoryOutcome();});
    $('#carryFactoryDebt')?.addEventListener('click',()=>{addDecision('factory-debt-carried','نقلت دين الصيانة إلى الوردية التالية','بقي سبب ارتفاع الجسيمات غير مغلق رغم اجتياز المكونات للفحص النهائي.');saveState();factoryOutcome();});
    $('#toFactoryAbstract')?.addEventListener('click',()=>finishFactory());
  }

  function abstract2() { abstraction([['ليلى','فنية تشغيل','▤'],['فريق الصيانة','','◇'],['فريق الفحص','','⌕']],'مكونات اجتازت الفحص','التصنيع والصيانة والفحص أصبحت مكونات مقبولة تنتقل إلى التجميع، مع بقاء دين الصيانة ظاهرًا إذا قررت حمله بدل إغلاقه.','ch3Intro'); }

  return { ch2Intro,factoryOrientation,factoryMonitor,factoryIncident,factoryOutcome,abstract2 };
}
