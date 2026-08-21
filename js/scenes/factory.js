export function createFactoryRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);
  const monitorTile = ctx.monitorTile;

  function ch2Intro() { chapterIntro(1, 'factoryOrientation'); }

  function factoryOrientation() {
    html(`<div><span class="eyebrow">مصنع مكونات إلكترونية افتراضي</span><h1 class="scene-title">أنت الآن ليلى، فنية تشغيل.</h1><p class="scene-subtitle">لن نحاكي كل خطوات صناعة أشباه الموصلات. سترين بصورة مبسطة كيف تمر الرقاقة بالمعالجة ثم التقطيع والتغليف والاختبار قبل أن تدخل في أجهزة أكبر.</p><div class="process-strip"><div class="process-step"><span>1</span><strong>معالجة الرقاقة</strong><small>تُبنى أنماط وطبقات دقيقة على wafer عبر سلسلة عمليات صناعية.</small></div><div class="process-step"><span>2</span><strong>تقطيع وتغليف واختبار</strong><small>تُفصل الشرائح وتُغلف وتُختبر كهربائيًا وجوديًا.</small></div><div class="process-step"><span>3</span><strong>تجميع المكونات</strong><small>تدخل الشرائح مع الذاكرة والطاقة والشبكات في أجهزة وخوادم.</small></div></div><div class="reality-note"><strong>دور ليلى في هذا السيناريو</strong> مراقبة دفعة مكونات داخل بيئة تصنيع حساسة للجسيمات. الأرقام والحدود التالية تعليمية وليست معيارًا صناعيًا عامًا.</div><div class="action-row"><button id="enterFab" class="primary-btn">ابدأ مراقبة الدفعة</button></div></div>`);
    $('#enterFab').addEventListener('click', () => go('factoryMonitor'));
  }

  function factoryMonitor() {
    html(`<div><span class="eyebrow">خط المكونات</span><h1 class="scene-title">راقب مؤشرات الدفعة.</h1><p class="scene-subtitle">في هذا السيناريو الحد التحذيري لمؤشر الجسيمات هو 40. تجاوز الحد لا يخبرك وحده بعدد القطع المعيبة، لكنه يستدعي فحصًا قبل تمرير الدفعة.</p><div class="monitor">${monitorTile('درجة الحرارة','21.4° م',55)}${monitorTile('مؤشر الجسيمات','18 / 40',35)}${monitorTile('فرق ضغط الغرفة','+12 Pa',58)}${monitorTile('العينة السليمة مبدئيًا','96%',82)}</div><div class="action-row"><button id="observeFab" class="primary-btn">راقب الدفعة التالية</button></div></div>`);
    $('#observeFab').addEventListener('click', () => go('factoryIncident'));
  }

  function factoryIncident() {
    html(`<div><span class="eyebrow">تنبيه جودة</span><h1 class="scene-title">مؤشر الجسيمات تجاوز الحد التحذيري.</h1><div class="monitor">${monitorTile('درجة الحرارة','21.6° م',57)}<div class="monitor-tile"><span>مؤشر الجسيمات</span><strong class="numeric-value">49 / 40 ↑</strong><div class="bar"><i class="meter-fill meter-fill--warning" style="width:86%"></i></div></div>${monitorTile('فرق ضغط الغرفة','+12 Pa',58)}${monitorTile('نتيجة الفحص النهائي','لم تُحسم',10)}</div><div class="alert dangerish"><strong>الدفعة مطلوبة للشحن اليوم.</strong><span>إيقاف الخط يضيف وقتًا وتكلفة. الاستمرار يسمح بإكمال الدفعة لكنه يرفع العبء على الفحص ويزيد احتمال رفض وحدات لاحقًا.</span></div><div class="choice-grid"><button id="fabStop" class="choice-btn"><strong>أوقف الخط وافحص منظومة الترشيح</strong><small>تأخير وتكلفة أعلى، مع خفض احتمال استمرار التلوث.</small></button><button id="fabContinue" class="choice-btn"><strong>أكمل الدفعة ثم شدد الفحص النهائي</strong><small>يحافظ على زمن الإنتاج، لكنه ينقل جزءًا أكبر من المخاطرة إلى الفحص والرفض.</small></button></div></div>`);
    $('#fabStop').addEventListener('click', () => { state.flags.factoryChoice='stop'; addDecision('factory-stop','أوقفت خط المكونات للفحص','تحملت الشركة توقفًا وفحصًا إضافيًا قبل إكمال الدفعة.'); saveState(); go('factoryOutcome'); });
    $('#fabContinue').addEventListener('click', () => { state.flags.factoryChoice='continue'; addDecision('factory-continue','أكملت الدفعة ثم شددت الفحص','حافظت على زمن الإنتاج، وانتقلت مخاطرة أكبر إلى الفحص النهائي ونسبة الرفض.'); saveState(); go('factoryOutcome'); });
  }

  function factoryOutcome() {
    const stopped = state.flags.factoryChoice === 'stop';
    html(`<div><span class="eyebrow">الفحص النهائي</span><h1 class="scene-title">${stopped ? 'عاد المؤشر إلى النطاق بعد فحص الترشيح.' : 'اكتملت الدفعة، لكن الفحص رفض وحدات أكثر.'}</h1><div class="stage-output"><strong>ناتج المرحلة</strong>مكونات إلكترونية اجتازت الفحص ويمكن أن تدخل مع أجزاء أخرى في تجميع الخوادم.</div><div class="hud-grid"><div class="hud-item"><span>الوحدات المقبولة في السيناريو</span><strong>${stopped ? '96%' : '88%'}</strong></div><div class="hud-item"><span>توقف الخط</span><strong>${stopped ? '20 دقيقة افتراضية' : '0'}</strong></div><div class="hud-item"><span>الشحن</span><strong>${stopped ? 'متأخر' : 'في الموعد'}</strong></div></div><p class="muted">هذه النسب افتراضية لتوضيح المفاضلة، وليست نموذجًا لجودة مصنع حقيقي.</p><div class="action-row"><button id="chipsDone" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#chipsDone').addEventListener('click', () => { addLedger(1,'ليلى وفرق التصنيع والفحص','تشغيل وفحص وصيانة تصنيع المكونات','مكونات إلكترونية اجتازت الفحص','اختصرت المرحلة سلسلة تصنيع معقدة في مراقبة دفعة وجودتها قبل التجميع.'); go('abstract2'); });
  }

  function abstract2() { abstraction([['ليلى','فنية تشغيل','⚙'],['فريق الصيانة','','◇'],['فريق الفحص','','⌕']],'مكونات اجتازت الفحص','التصنيع والصيانة والفحص أصبحت مكونات مقبولة تنتقل إلى التجميع.','hardwareMontage'); }

  function hardwareMontage() {
    html(`<div><span class="eyebrow">جسر إلى مركز البيانات</span><h1 class="scene-title">الخادم ليس «رقاقة كبيرة»؛ هو نظام من أجزاء كثيرة.</h1><p class="scene-subtitle">تدخل المعالجات والمسرعات والذاكرة والتخزين والطاقة والشبكات والتبريد في جهاز واحد، ثم يُختبر قبل نقله إلى مركز البيانات.</p><div class="montage"><div class="montage-card"><span class="icon">▤</span><strong>معالجة وذاكرة</strong><span>شرائح ووحدات ذاكرة</span></div><div class="montage-card"><span class="icon">ϟ</span><strong>طاقة</strong><span>مزودات ووحدات احتياطية</span></div><div class="montage-card"><span class="icon">≋</span><strong>شبكات</strong><span>اتصال بين الأجهزة</span></div><div class="montage-card"><span class="icon">◫</span><strong>تبريد</strong><span>إدارة الحرارة داخل الجهاز</span></div></div><div class="action-row"><button id="toCh3" class="primary-btn">اتبع الخادم إلى مركز البيانات</button></div></div>`);
    $('#toCh3').addEventListener('click', () => go('ch3Intro'));
  }

  return { ch2Intro,factoryOrientation,factoryMonitor,factoryIncident,factoryOutcome,abstract2,hardwareMontage };
}
