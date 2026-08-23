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
    html(`<div><span class="eyebrow">تنبيه جودة</span><h1 class="scene-title">مؤشر الجسيمات تجاوز الحد التحذيري.</h1>${supportingRoleStrip(['maintenance','qualityInspector'],'من يدخل القرار مع ليلى الآن؟')}<div class="monitor">${monitorTile('درجة الحرارة','21.6° م',57)}<div class="monitor-tile"><span>مؤشر الجسيمات</span><strong class="numeric-value" dir="auto">49 / 40 ↑</strong><div class="bar"><i class="meter-fill meter-fill--warning" style="width:86%"></i></div></div>${monitorTile('فرق الضغط إلى المنطقة المجاورة','+12 Pa',58)}${monitorTile('نتيجة الفحص النهائي','لم تُحسم',10)}</div><div class="alert dangerish"><strong>الدفعة مطلوبة للشحن اليوم.</strong><span>إيقاف الخط يضيف وقتًا وتكلفة تشغيلية. الاستمرار يسمح بإكمال الدفعة لكنه ينقل مخاطرة أكبر إلى الفحص النهائي ويترك سبب ارتفاع الجسيمات دين صيانة مفتوحًا.</span></div><div class="choice-grid"><button id="fabStop" class="choice-btn"><strong>أوقف الخط وابدأ التحقيق</strong><small>لن تكتمل الدفعة قبل التشخيص والإصلاح وإعادة القياس ثم استئناف الإنتاج والفحص النهائي.</small></button><button id="fabContinue" class="choice-btn"><strong>أكمل الدفعة ثم شدد الفحص النهائي</strong><small>تنتهي الدفعة الآن، لكن سبب التنبيه يبقى دين صيانة يحتاج قرارًا مستقلًا.</small></button></div></div>`);
    $('#fabStop').addEventListener('click', () => {
      Object.assign(state.flags,{factoryChoice:'stop',factoryMaintenanceDebt:true,factoryRemediationStage:'none',factoryDisposition:'repair',factoryProductionComplete:false});
      addDecision('factory-stop','أوقفت خط المكونات للتحقيق','أوقفت الإنتاج؛ لم تُكمل الدفعة ولم يُشخّص السبب أو يُصلح بعد.');
      saveState(); go('factoryOutcome');
    });
    $('#fabContinue').addEventListener('click', () => {
      Object.assign(state.flags,{factoryChoice:'continue',factoryMaintenanceDebt:true,factoryRemediationStage:'none',factoryDisposition:null,factoryProductionComplete:true});
      addDecision('factory-continue','أكملت الدفعة ثم شددت الفحص النهائي','اكتملت الدفعة واجتازت الفحص المشدد، لكن سبب ارتفاع الجسيمات بقي دين صيانة مفتوحًا.');
      saveState(); go('factoryOutcome');
    });
  }

  function remediationMarkup(stopped){
    const stage=state.flags.factoryRemediationStage;
    if(state.flags.factoryDisposition!=='repair'||stage==='verified')return'';
    if(stage==='none')return `<section class="card"><span class="kicker">${stopped?'الخط متوقف':'نافذة صيانة بعد الدفعة'}</span><h2>حدّد السبب قبل الإصلاح.</h2>${supportingRoleStrip(['maintenance','qualityInspector'],'من ينفذ التشخيص؟')}<p>ارتفاع المؤشر لا يحدد سببه وحده. افحص الترشيح والوصلات ومصادر الجسيمات المحتملة.</p><div class="action-row"><button id="diagnoseFactory" class="primary-btn">نفّذ التشخيص وسجل السبب</button></div></section>`;
    if(stage==='diagnosed')return `<section class="card"><span class="kicker">التشخيص مكتمل</span><h2>وُجد تسرب عند وصلة في مسار الترشيح.</h2><p>أصلح الوصلة أولًا. الإصلاح نفسه لا يثبت عودة المؤشر إلى النطاق.</p><div class="action-row"><button id="repairFactory" class="primary-btn">أصلح الوصلة</button></div></section>`;
    return `<section class="card"><span class="kicker">الإصلاح نُفذ</span><h2>تحقق بالقياس قبل إغلاق الدين.</h2><p>أُصلحت الوصلة، لكن إغلاق التنبيه ينتظر قياسًا جديدًا لمؤشر الجسيمات.</p><div class="action-row"><button id="verifyFactoryRepair" class="primary-btn">أعد القياس وثبّت النتيجة</button></div></section>`;
  }

  function finishFactory(){
    addLedger(1,'ليلى وفرق التصنيع والصيانة والفحص','تشغيل وفحص وصيانة تصنيع المكونات','مكونات إلكترونية اجتازت الفحص',state.flags.factoryMaintenanceDebt?'اكتملت الدفعة مع دين صيانة منقول صراحة إلى الوردية التالية.':'أُغلق سبب تنبيه الجسيمات عبر تشخيص ثم إصلاح ثم إعادة قياس قبل اكتمال المسار.');
    go('abstract2');
  }

  function factoryOutcome() {
    const f=state.flags,stopped=f.factoryChoice==='stop';
    if(!f.factoryChoice){go('factoryIncident');return;}
    const verified=f.factoryRemediationStage==='verified';
    const carried=f.factoryDisposition==='carry';
    const chooseDisposition=!stopped&&f.factoryDisposition===null;
    const disposition=chooseDisposition?`<div class="choice-grid"><button id="startFactoryMaintenance" class="choice-btn"><strong>ابدأ نافذة الصيانة الآن</strong><small>شخّص السبب ثم أصلحه ثم أعد القياس.</small></button><button id="carryFactoryDebt" class="choice-btn"><strong>انقل الدين إلى الوردية التالية</strong><small>تبقى الدفعة مكتملة، لكن سبب التنبيه يظل مفتوحًا ويظهر في النتائج.</small></button></div>`:'';
    const production=stopped&&!f.factoryProductionComplete&&verified?`<section class="card"><span class="kicker">الإصلاح متحقق</span><h2>استأنف الإنتاج ثم نفّذ الفحص النهائي.</h2><p>الآن فقط يمكن إكمال الدفعة التي توقفت عند التنبيه.</p><div class="action-row"><button id="resumeFactory" class="primary-btn">استأنف الدفعة ونفّذ الفحص النهائي</button></div></section>`:'';
    const output=f.factoryProductionComplete?`<div class="stage-output"><strong>ناتج الدفعة</strong>مكونات إلكترونية اجتازت الفحص ويمكن أن تدخل مع أجزاء أخرى في تجميع الخوادم.</div>`:`<div class="alert"><strong>الدفعة لم تكتمل بعد</strong><span>الإيقاف منع استمرار الإنتاج؛ لا يظهر ناتج نهائي قبل الإصلاح والتحقق والاستئناف.</span></div>`;
    const maintenance=verified?'<div class="alert goodish"><strong>دين الصيانة مغلق</strong><span>شُخّص التسرب، أُصلحت الوصلة، ثم أكد القياس عودة المؤشر إلى النطاق.</span></div>':carried?'<div class="alert dangerish"><strong>دين صيانة منقول</strong><span>الفحص النهائي للدفعة لا يغلق سبب ارتفاع الجسيمات؛ نُقل العمل المفتوح صراحة إلى الوردية التالية.</span></div>':'';
    const canFinish=f.factoryProductionComplete&&(verified||carried);
    html(`<div><span class="eyebrow">الفحص النهائي والصيانة</span><h1 class="scene-title">${stopped&&!f.factoryProductionComplete?'الخط متوقف؛ أغلق السبب قبل إكمال الدفعة.':'نتيجة الدفعة وحالة الصيانة مساران منفصلان.'}</h1>${supportingRoleStrip(['maintenance','qualityInspector'],'من ينفذ التحقيق والفحص؟')}${output}<div class="hud-grid"><div class="hud-item"><span>اكتمال الدفعة</span><strong>${f.factoryProductionComplete?'مكتملة':'متوقفة'}</strong></div><div class="hud-item"><span>الشحن</span><strong>${stopped?'متأخر':'في الموعد'}</strong></div><div class="hud-item"><span>دين الصيانة</span><strong>${f.factoryMaintenanceDebt?'مفتوح':'مغلق'}</strong></div><div class="hud-item"><span>المعالجة</span><strong>${f.factoryRemediationStage==='none'?'لم تبدأ':f.factoryRemediationStage==='diagnosed'?'شُخّص السبب':f.factoryRemediationStage==='repaired'?'نُفذ الإصلاح':'تحقق القياس'}</strong></div></div>${maintenance}${disposition}${remediationMarkup(stopped)}${production}<p class="muted">لا تفترض اللعبة نسبة عيوب يمكن حسابها من قراءة الجسيمات وحدها؛ النتيجة النوعية هنا توضح اتجاه المفاضلة فقط.</p>${canFinish?'<div class="action-row"><button id="toFactoryAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div>':''}</div>`);
    $('#startFactoryMaintenance')?.addEventListener('click',()=>{f.factoryDisposition='repair';addDecision('factory-maintenance-started','بدأت نافذة صيانة مستقلة بعد الشحن','نجاح الدفعة لم يُستخدم بديلًا عن تشخيص سبب التنبيه.');saveState();factoryOutcome();});
    $('#carryFactoryDebt')?.addEventListener('click',()=>{f.factoryDisposition='carry';addDecision('factory-debt-carried','نقلت دين الصيانة إلى الوردية التالية','بقي سبب ارتفاع الجسيمات غير مغلق رغم اجتياز المكونات للفحص النهائي.');saveState();factoryOutcome();});
    $('#diagnoseFactory')?.addEventListener('click',()=>{f.factoryRemediationStage='diagnosed';addDecision('factory-maintenance-diagnosed','شخّصت مصدر ارتفاع الجسيمات','حددت فرق الصيانة والجودة تسربًا عند وصلة في مسار الترشيح.');saveState();factoryOutcome();});
    $('#repairFactory')?.addEventListener('click',()=>{f.factoryRemediationStage='repaired';addDecision('factory-maintenance-repaired','أصلحت وصلة مسار الترشيح','نُفذ الإصلاح؛ ما زال القياس الجديد مطلوبًا قبل إغلاق الدين.');saveState();factoryOutcome();});
    $('#verifyFactoryRepair')?.addEventListener('click',()=>{f.factoryRemediationStage='verified';f.factoryMaintenanceDebt=false;addDecision('factory-maintenance-verified','أكد القياس عودة مؤشر الجسيمات إلى النطاق','جاء إغلاق الدين من قياس جديد بعد الإصلاح، لا من فعل الإصلاح وحده.');saveState();factoryOutcome();});
    $('#resumeFactory')?.addEventListener('click',()=>{f.factoryProductionComplete=true;addDecision('factory-production-resumed','استأنفت الإنتاج وأكملت الفحص النهائي بعد إغلاق السبب','لم تُحسب الدفعة مكتملة أثناء توقف الخط؛ اكتملت فقط بعد الإصلاح والتحقق والاستئناف.');saveState();factoryOutcome();});
    $('#toFactoryAbstract')?.addEventListener('click',finishFactory);
  }

  function abstract2() { abstraction([['ليلى','فنية تشغيل','▤'],['فريق الصيانة','','◇'],['فريق الفحص','','⌕']],'مكونات اجتازت الفحص','التصنيع والصيانة والفحص أصبحت مكونات مقبولة تنتقل إلى التجميع، مع بقاء دين الصيانة ظاهرًا إذا قررت حمله بدل إغلاقه.','ch3Intro'); }
  return { ch2Intro, factoryOrientation, factoryMonitor, factoryIncident, factoryOutcome, abstract2 };
}
