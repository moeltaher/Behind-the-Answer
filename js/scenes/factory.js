export function createFactoryRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, tone, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);
  const monitorTile = ctx.monitorTile;

  function ch2Intro() { chapterIntro(1, 'factoryOrientation'); }

  function factoryOrientation() {
    html(`<div><span class="eyebrow">مصنع مكونات إلكترونية افتراضي</span><h1 class="scene-title">أنت الآن ليلى، فنية تشغيل.</h1><div class="role-card card flat"><div class="avatar">⚙</div><div><h3>ليلى</h3><p>شخصية خيالية مركبة تمثل العمل الفني داخل بيئة تصنيع حساسة.</p></div></div><div class="reality-note"><strong>قاعدة السيناريو</strong> ترتيب معدات الحماية هنا هو بروتوكول هذا المصنع الافتراضي، وليس قاعدة موحدة لكل مصنع أو غرفة نظيفة.</div><p class="scene-subtitle">أكمل خطوات التجهيز بالترتيب قبل دخول منطقة الإنتاج.</p><div id="ppeList" class="checklist"></div><div id="ppeHelp" class="small muted">ابدأ بغطاء الشعر ثم أكمل بقية الخطوات وفق بروتوكول هذا السيناريو.</div></div>`);
    renderPPE();
  }

  function renderPPE() {
    const items = [['hair','غطاء الشعر'],['mask','القناع'],['gloves','القفازات'],['suit','البدلة']];
    $('#ppeList').innerHTML = items.map(([id,label],index) => {
      const done = state.flags.factoryPPE.includes(id);
      return `<button class="check-row ${done ? 'done' : ''}" data-ppe="${id}" data-index="${index}" type="button"><span class="check-mark">${done ? '✓' : ''}</span><span>${label}</span></button>`;
    }).join('') + (state.flags.factoryPPE.length === items.length ? '<div class="action-row"><button id="enterFab" class="primary-btn">ادخل خط الإنتاج</button></div>' : '');
    bind('[data-ppe]','click',event => {
      const index = Number(event.currentTarget.dataset.index);
      if (index !== state.flags.factoryPPE.length) {
        $('#ppeHelp').textContent = `هذه ليست الخطوة التالية في بروتوكول السيناريو. نفّذ الخطوة ${state.flags.factoryPPE.length + 1} أولًا.`;
        tone(160,.08,'square'); return;
      }
      state.flags.factoryPPE.push(event.currentTarget.dataset.ppe); saveState(); renderPPE();
    });
    $('#enterFab')?.addEventListener('click', () => go('factoryMonitor'));
  }

  function factoryMonitor() {
    html(`<div><span class="eyebrow">خط الإنتاج</span><h1 class="scene-title">راقب مؤشرات الدفعة.</h1><p class="scene-subtitle">في هذا السيناريو الحد التحذيري لمؤشر الجسيمات هو 40. الرقم تعليمي ولا يمثل معيارًا صناعيًا عامًا.</p><div class="monitor">${monitorTile('درجة الحرارة','21.4° م',55)}${monitorTile('مؤشر الجسيمات','18 / 40',35)}${monitorTile('الضغط','0.9 بار',58)}${monitorTile('نسبة الوحدات السليمة','96%',82)}</div><div class="action-row"><button id="observeFab" class="primary-btn">راقب الدفعة</button></div></div>`);
    $('#observeFab').addEventListener('click', () => go('factoryIncident'));
  }

  function factoryIncident() {
    html(`<div><span class="eyebrow">تنبيه جودة</span><h1 class="scene-title">مؤشر الجسيمات تجاوز الحد التحذيري.</h1><div class="monitor">${monitorTile('درجة الحرارة','21.6° م',57)}<div class="monitor-tile"><span>مؤشر الجسيمات</span><strong>49 / 40 ↑</strong><div class="bar"><i class="meter-fill meter-fill--warning" style="width:86%"></i></div></div>${monitorTile('الضغط','0.9 بار',58)}${monitorTile('نسبة الوحدات السليمة','—',10)}</div><div class="alert dangerish"><strong>الدفعة مطلوبة للشحن اليوم.</strong><span>إيقاف الخط يعني تأخيرًا. الاستمرار قد يرفع نسبة الوحدات المعيبة.</span></div><div class="choice-grid"><button id="fabStop" class="choice-btn"><strong>أوقف الخط وافحص المرشح</strong><small>وقت وتكلفة أعلى، مع حماية أفضل لجودة المكونات.</small></button><button id="fabContinue" class="choice-btn"><strong>استمر حتى نهاية الدفعة</strong><small>يحافظ على الجدول لكنه ينقل المخاطرة إلى الفحص وجودة الأجهزة.</small></button></div></div>`);
    $('#fabStop').addEventListener('click', () => { state.flags.factoryChoice='stop'; addDecision('factory-stop','أوقفت خط التصنيع للفحص','ارتفعت تكلفة التوقف وانخفض خطر تمرير دفعة منخفضة الجودة.',{pressure:-3,cost:7,burden:-3,reliability:9}); saveState(); go('factoryOutcome'); });
    $('#fabContinue').addEventListener('click', () => { state.flags.factoryChoice='continue'; addDecision('factory-continue','واصلت تشغيل خط التصنيع','حافظت على الموعد مع ارتفاع عبء الفحص ومخاطر موثوقية المكونات.',{pressure:5,cost:-3,burden:4,reliability:-8}); saveState(); go('factoryOutcome'); });
  }

  function factoryOutcome() {
    const stopped = state.flags.factoryChoice === 'stop';
    html(`<div><span class="eyebrow">الفحص النهائي</span><h1 class="scene-title">${stopped ? 'تأخرت الدفعة، وعادت المؤشرات إلى النطاق.' : 'وصلت الدفعة في الموعد، وارتفعت نسبة الرفض.'}</h1><div class="stage-output"><strong>ناتج المرحلة</strong>مكونات إلكترونية اجتازت الفحص ويمكن أن تدخل مع أجزاء أخرى في صناعة الخوادم.</div><div class="hud-grid"><div class="hud-item"><span>الوحدات السليمة</span><strong>${stopped ? '96%' : '88%'}</strong></div><div class="hud-item"><span>التوقف</span><strong>${stopped ? '20 دقيقة' : '0'}</strong></div><div class="hud-item"><span>الشحن</span><strong>${stopped ? 'متأخر' : 'في الموعد'}</strong></div></div><p class="muted">هذا القرار يؤثر في موثوقية المكونات والبنية، لا في جودة لغة النموذج مباشرة.</p><div class="action-row"><button id="chipsDone" class="primary-btn">انتقل إلى تركيب الخادم</button></div></div>`);
    $('#chipsDone').addEventListener('click', () => { addLedger(1,'ليلى — فنية تشغيل','تشغيل وفحص وصيانة خط تصنيع حساس','مكونات إلكترونية اجتازت الفحص','يتحول وقت التوقف والجودة والعمل الفني إلى مكونات تمر إلى المرحلة التالية.'); go('abstract2'); });
  }

  function abstract2() { abstraction([['ليلى','فنية تشغيل','⚙'],['فريق الصيانة','','🧰'],['فريق الفحص','','⌕']],'مكونات اجتازت الفحص','تشغيل وصيانة وفحص وقرارات جودة أصبحت مكونات مقبولة تنتقل إلى التجميع.','hardwareMontage'); }
  function hardwareMontage() {
    html(`<div><span class="eyebrow">من المكونات إلى الخادم</span><h1 class="scene-title">الخادم حاسوب قوي مكوّن من أجزاء كثيرة.</h1><p class="scene-subtitle">المكونات التي صنعتها ليلى تدخل في أجهزة أكبر مع الطاقة والذاكرة والتخزين والشبكات والتبريد.</p><div class="montage"><div class="montage-card"><span class="icon">▤</span><strong>لوحات ومكونات</strong><span>تجميع وفحص</span></div><div class="montage-card"><span class="icon">⚡</span><strong>طاقة</strong><span>مزودات ووحدات احتياطية</span></div><div class="montage-card"><span class="icon">≋</span><strong>شبكات</strong><span>اتصال بين الأجهزة</span></div><div class="montage-card"><span class="icon">❄</span><strong>تبريد</strong><span>منع ارتفاع الحرارة</span></div></div><div class="action-row"><button id="toCh3" class="primary-btn">اتبع الخادم إلى مركز البيانات</button></div></div>`);
    $('#toCh3').addEventListener('click', () => go('ch3Intro'));
  }
  return { ch2Intro,factoryOrientation,factoryMonitor,factoryIncident,factoryOutcome,abstract2,hardwareMontage };
}
