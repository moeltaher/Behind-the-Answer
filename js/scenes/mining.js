export function createMiningRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { setChapter, chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) =>
    ctx.abstraction(humans, word, line, next);

  function ch1Intro() {
    chapterIntro(0, 'mineOrientation');
  }

  function mineOrientation() {
    setChapter(0);
    html(`<div><span class="eyebrow">موقع استخراج افتراضي</span><h1 class="scene-title">أنت الآن موسى، عامل استخراج وفرز.</h1><div class="role-card card flat"><div class="avatar">⛏</div><div><h3>موسى</h3><p>شخصية مركبة تمثل نوعًا من العمل في بداية السلسلة، ولا تشير إلى عامل أو شركة بعينها.</p></div></div><div class="reality-note"><strong>لماذا أنت هنا؟</strong> المواد التي تستخرجها لن تصبح أجهزة مباشرة. بعد الاستخراج ستنتقل عبر النقل والتنقية والمعالجة قبل أن تصل إلى المصنع.</div><p class="scene-subtitle">الشاحنة تغادر بعد دقائق. المطلوب تسليم 12 وحدة. توقف العمل قد يخفض دخل الوردية.</p><div class="hud-grid"><div class="hud-item"><span>الحصة</span><strong>12 وحدة</strong></div><div class="hud-item"><span>الأجر الأساسي</span><strong>100 وحدة لعب</strong></div><div class="hud-item"><span>السلطة على قواعد الوردية</span><strong>محدودة</strong></div></div><div class="alert"><strong>المشرف</strong> نحتاج 12 وحدة قبل مغادرة الشاحنة. إذا ظهر خطر سجّله، لكن وقت التوقف يحسب على الوردية.</div><div class="action-row"><button id="startMine" class="primary-btn">ابدأ العمل</button></div></div>`);
    $('#startMine').addEventListener('click', () => go('mineTask'));
  }

  function mineTask() {
    setChapter(0);
    const count = state.flags.miningCount;
    const warning = state.flags.miningWarning;

    html(`<div><span class="eyebrow">العمل الجاري</span><h1 class="scene-title">أكمل الحصة قبل مغادرة الشاحنة.</h1><div class="hud-grid"><div class="hud-item"><span>المستخرج</span><strong>${count}/12</strong></div><div class="hud-item"><span>الحصة المتبقية</span><strong>${Math.max(0, 12 - count)}</strong></div><div class="hud-item"><span>حالة القطاع ب</span><strong>${warning ? 'يحتاج فحصًا' : 'مستقر'}</strong></div></div>${warning ? '<div class="alert dangerish"><strong>اهتزاز غير معتاد في القطاع ب</strong><span>زميلك يشير إلى حركة في الجدار. يوصى بإيقاف العمل حتى فحص الدعامة.</span></div>' : ''}<div class="work-area"><button class="work-node" data-yield="1"><span class="node-icon">🪨</span><strong>القطاع أ</strong><span class="node-yield">+1 وحدة</span><small class="muted">أبطأ وأكثر استقرارًا</small></button><button class="work-node ${warning ? 'risky' : ''}" data-yield="2"><span class="node-icon">⛏</span><strong>القطاع ب</strong><span class="node-yield">+2 وحدة</span><small class="muted">أعلى إنتاجًا</small>${warning ? '<i class="pulse-ring"></i>' : ''}</button><button class="work-node" data-yield="1"><span class="node-icon">🧱</span><strong>القطاع ج</strong><span class="node-yield">+1 وحدة</span><small class="muted">يحتاج جهدًا أطول</small></button></div>${warning ? '<div class="choice-grid"><button id="mineStop" class="choice-btn"><strong>أوقف العمل للفحص</strong><small>وقت توقف ودخل محتمل أقل، مع تقليل الخطر.</small></button><button id="mineContinue" class="choice-btn"><strong>أكمل الدفعة الحالية</strong><small>يزداد الإنتاج، لكن عبء الخطر يقع على الوردية.</small></button></div>' : ''}</div>`);

    bind('.work-node', 'click', event => {
      if (state.flags.miningWarning) return;

      state.flags.miningCount = Math.min(
        12,
        state.flags.miningCount + Number(event.currentTarget.dataset.yield)
      );
      if (state.flags.miningCount >= 6) state.flags.miningWarning = true;
      saveState();

      if (state.flags.miningCount >= 12) go('mineEnd');
      else mineTask();
    });

    if (!warning) return;

    $('#mineStop').addEventListener('click', () => {
      state.flags.miningStopped = true;
      state.flags.miningWarning = false;
      addDecision(
        'mine-stop',
        'أوقفت العمل في التعدين للفحص',
        'تحملت الوردية جزءًا من تكلفة التوقف بدل مواصلة الإنتاج تحت الخطر.',
        { pressure: -4, cost: 6, burden: -8 }
      );
      state.flags.miningCount = Math.min(12, state.flags.miningCount + 3);
      saveState();
      go('mineInspection');
    });

    $('#mineContinue').addEventListener('click', () => {
      state.flags.miningStopped = false;
      state.flags.miningWarning = false;
      addDecision(
        'mine-continue',
        'واصلت العمل بعد تحذير السلامة',
        'حافظت على الحصة، بينما ارتفع العبء والمخاطر على العامل.',
        { pressure: 5, cost: -4, burden: 10 }
      );
      state.flags.miningCount = 12;
      saveState();
      go('mineEnd');
    });
  }

  function mineInspection() {
    html(`<div class="centered"><span class="eyebrow">فحص القطاع</span><h1 class="scene-title">تم تثبيت الدعامة.</h1><p class="scene-subtitle">مرّ وقت من الوردية. المشرف يسجل توقفًا، لكن العمل يعود بعد معالجة الخطر المباشر.</p><div class="card flat"><div class="hud-grid"><div class="hud-item"><span>الحصة الحالية</span><strong>${state.flags.miningCount}/12</strong></div><div class="hud-item"><span>التوقف</span><strong>مسجل</strong></div><div class="hud-item"><span>الأجر المتوقع</span><strong>أقل</strong></div></div></div><div class="action-row center"><button id="finishMine" class="primary-btn">أكمل ما تبقى</button></div></div>`);
    $('#finishMine').addEventListener('click', () => {
      state.flags.miningCount = 12;
      saveState();
      go('mineEnd');
    });
  }

  function mineEnd() {
    html(`<div><span class="eyebrow">نهاية وردية الاستخراج</span><h1 class="scene-title">ما الموجود الآن؟</h1><div class="stage-output"><strong>12 وحدة من المواد الخام المستخرجة</strong>هذه ليست بعد «مواد جاهزة للتصنيع». يجب نقلها وتنقيتها ومعالجتها أولًا.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>المواد</span><strong>12/12</strong></div><div class="hud-item"><span>التوقف</span><strong>${state.flags.miningStopped ? 'حدث' : 'لم يحدث'}</strong></div><div class="hud-item"><span>حالة الشحنة</span><strong>جاهزة للنقل</strong></div></div></div><div class="action-row"><button id="mineTransport" class="primary-btn">اتبع الشحنة بعد المنجم</button></div></div>`);
    $('#mineTransport').addEventListener('click', () => go('transportMontage'));
  }

  function transportMontage() {
    html(`<div><span class="eyebrow">بين موقع الاستخراج والمصنع</span><h1 class="scene-title">المواد لا تنتقل ولا تُعالج وحدها.</h1><p class="scene-subtitle">تمر الشحنة بالنقل والتنقية والمعالجة والشحن. تختصر اللعبة هذه الأعمال في مونتاج قصير، لكنها جزء من السلسلة المادية والبشرية.</p><div class="montage"><div class="montage-card"><span class="icon">🚚</span><strong>نقل بري</strong><span>تحميل، قيادة، مستودعات</span></div><div class="montage-card"><span class="icon">🔥</span><strong>تنقية ومعالجة</strong><span>مصاهر ومصانع مواد</span></div><div class="montage-card"><span class="icon">🚢</span><strong>شحن</strong><span>موانئ ولوجستيات</span></div><div class="montage-card"><span class="icon">🏭</span><strong>وصول إلى المصنع</strong><span>المواد أصبحت مناسبة لبدء التصنيع</span></div></div><div class="action-row"><button id="mineAbstract" class="primary-btn">شاهد كيف يظهر هذا العمل في السلسلة</button></div></div>`);
    $('#mineAbstract').addEventListener('click', () => go('abstract1'));
  }

  function abstract1() {
    addLedger(
      0,
      'موسى وعمال النقل والمعالجة',
      'استخراج وفرز ونقل وتنقية ومعالجة مواد تحت ضغوط زمنية ومخاطر مختلفة',
      'مواد معالجة جاهزة للتصنيع',
      'تختصر المرحلة عدة أعمال بشرية ولوجستية في مادة تصل إلى المصنع.'
    );
    abstraction(
      [['موسى', 'عامل استخراج', '⛏'], ['عمال النقل والمعالجة', '', '🚚']],
      'مواد معالجة جاهزة للتصنيع',
      'الاستخراج والنقل والتنقية والمعالجة أصبحت في المرحلة التالية مواد تدخل المصنع.',
      'ch2Intro'
    );
  }

  return {
    ch1Intro,
    mineOrientation,
    mineTask,
    mineInspection,
    mineEnd,
    transportMontage,
    abstract1
  };
}
