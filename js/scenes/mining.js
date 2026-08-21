const SHIFT_LIMIT = 72;
const INSPECTION_MINUTES = 12;
const SECTORS = {
  a: { yield: 1, minutes: 7, label: 'القطاع أ' },
  b: { yield: 2, minutes: 7, label: 'القطاع ب' },
  c: { yield: 1, minutes: 7, label: 'القطاع ج' }
};

export function createMiningRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch1Intro() { chapterIntro(0, 'mineOrientation'); }

  function mineOrientation() {
    html(`<div><span class="eyebrow">موقع استخراج افتراضي</span><h1 class="scene-title">أنت الآن موسى، عامل استخراج وفرز.</h1><div class="reality-note"><strong>لماذا أنت هنا؟</strong> الأجهزة قد تعتمد على سلاسل تبدأ بخامات النحاس، والبوكسيت الذي يُنتج منه الألومنيوم، والسيليكا أو الكوارتز التي تدخل لاحقًا في إنتاج السيليكون، إضافة إلى مواد أخرى تختلف باختلاف الجهاز والمكونات.</div><p class="scene-subtitle">المطلوب تسليم 12 وحدة قبل مغادرة الشاحنة بعد ${SHIFT_LIMIT} دقيقة افتراضية. القطاع ب ينتج وحدتين في الوقت نفسه الذي تنتج فيه القطاعات الأخرى وحدة واحدة، لكنه يدخل حالة تحذير بعد تكرار استخدامه.</p><div class="hud-grid"><div class="hud-item"><span>الحصة</span><strong>12 وحدة</strong></div><div class="hud-item"><span>نافذة التسليم</span><strong>${SHIFT_LIMIT} دقيقة</strong></div><div class="hud-item"><span>الدخل الكامل</span><strong>100 وحدة لعب</strong></div></div><div class="reality-note"><strong>قواعد الأجر في السيناريو</strong> تجاوز نافذة التسليم يخفض الجزء المتغير 10 وحدات. إغلاق القطاع للفحص يخفضه 8 وحدات إضافية بسبب وقت التوقف. هذه أرقام لعب معلنة وليست بيانات عن موقع حقيقي.</div><div class="action-row"><button id="startMine" class="primary-btn">ابدأ العمل</button></div></div>`);
    $('#startMine').addEventListener('click', () => go('mineTask'));
  }

  function mineTask() {
    const { miningCount: count, miningMinutes: minutes, miningWarning: warning, miningIncidentChoice: incident } = state.flags;
    const riskLabel = warning ? 'قرار مطلوب' : incident === 'stop' ? 'عولج' : incident === 'continue' ? 'غير محسوم' : 'لا تحذير';
    const late = minutes > SHIFT_LIMIT;
    const riskNote = incident === 'continue' && !warning ? '<div class="alert dangerish"><strong>القطاع ب ما زال بلا فحص.</strong><span>يمكنك إكمال الحصة من قطاعات أخرى، لكن قرار إبقائه مفتوحًا يظل مسجلًا حتى نهاية الوردية.</span></div>' : '';
    html(`<div><span class="eyebrow">العمل الجاري</span><h1 class="scene-title">أكمل الحصة مع متابعة الوقت والخطر.</h1><div class="hud-grid"><div class="hud-item"><span>المستخرج</span><strong>${count}/12</strong></div><div class="hud-item"><span>الوقت</span><strong>${minutes}/${SHIFT_LIMIT} دقيقة</strong></div><div class="hud-item"><span>حالة القطاع ب</span><strong>${riskLabel}</strong></div></div>${late?'<div class="alert dangerish"><strong>فاتت نافذة الشاحنة.</strong><span>يمكنك إكمال الحصة، لكن الجزء المتغير من الدخل انخفض في هذا السيناريو.</span></div>':''}${warning?'<div class="alert dangerish"><strong>اهتزاز غير معتاد في القطاع ب</strong><span>ظهر التحذير بعد تكرار العمل في القطاع الأسرع. قرر هل تغلقه للفحص أم تبقيه مفتوحًا.</span></div>':''}${riskNote}<div class="work-area"><button class="work-node" data-sector="a"><span class="node-icon">◇</span><strong>القطاع أ</strong><span class="node-yield">+1 وحدة</span><small>7 دقائق</small></button><button class="work-node ${warning||incident==='continue'?'risky':''}" data-sector="b"><span class="node-icon">◆</span><strong>القطاع ب</strong><span class="node-yield">+2 وحدة</span><small>7 دقائق — أسرع لكنه يحمل تحذيرًا</small></button><button class="work-node" data-sector="c"><span class="node-icon">◈</span><strong>القطاع ج</strong><span class="node-yield">+1 وحدة</span><small>7 دقائق</small></button></div>${warning?'<div class="choice-grid"><button id="mineStop" class="choice-btn"><strong>أغلق القطاع ب للفحص</strong><small>يعالج الخطر ويضيف 12 دقيقة توقف ويخفض الجزء المتغير من الدخل.</small></button><button id="mineContinue" class="choice-btn"><strong>اترك القطاع مفتوحًا</strong><small>تحافظ على وقت الوردية، لكن الخطر يبقى غير محسوم.</small></button></div>':''}</div>`);
    bind('.work-node','click',event=>{
      if(state.flags.miningWarning)return;
      const sectorId=event.currentTarget.dataset.sector;
      const sector=SECTORS[sectorId];
      state.flags.miningCount=Math.min(12,state.flags.miningCount+sector.yield);
      state.flags.miningMinutes+=sector.minutes;
      if(sectorId==='b') state.flags.miningBUses+=1;
      if(!state.flags.miningIncidentChoice && state.flags.miningBUses>=2) state.flags.miningWarning=true;
      saveState();
      if(state.flags.miningWarning){ mineTask(); return; }
      if(state.flags.miningCount>=12) go('mineEnd'); else mineTask();
    });
    if(!warning)return;
    $('#mineStop').addEventListener('click',()=>{
      state.flags.miningIncidentChoice='stop';
      state.flags.miningWarning=false;
      state.flags.miningMinutes+=INSPECTION_MINUTES;
      addDecision('mine-stop','أغلقت القطاع ب للفحص','عالجت التحذير، لكن الفحص أضاف وقت توقف وخفض الجزء المتغير من دخل الوردية.');
      saveState(); go('mineInspection');
    });
    $('#mineContinue').addEventListener('click',()=>{
      state.flags.miningIncidentChoice='continue';
      state.flags.miningWarning=false;
      addDecision('mine-continue','أبقيت القطاع ب مفتوحًا بعد التحذير','حافظت على وقت الوردية، لكن الخطر بقي غير محسوم حتى نهايتها.');
      saveState();
      if(state.flags.miningCount>=12) go('mineEnd'); else mineTask();
    });
  }

  function mineInspection() {
    const quotaComplete=state.flags.miningCount>=12;
    html(`<div class="centered"><span class="eyebrow">فحص القطاع ب</span><h1 class="scene-title">تم تثبيت الدعامة والتحقق من القطاع.</h1><p class="scene-subtitle">لم تنتج مواد أثناء التوقف. أضيفت ${INSPECTION_MINUTES} دقيقة إلى وقت الوردية.${quotaComplete?' كانت الحصة مكتملة بالفعل، لذلك تنتقل الآن إلى نهاية الوردية.':' ستعود لإكمال الحصة من النقطة نفسها.'}</p><div class="card flat"><div class="hud-grid"><div class="hud-item"><span>الحصة الحالية</span><strong>${state.flags.miningCount}/12</strong></div><div class="hud-item"><span>الوقت الحالي</span><strong>${state.flags.miningMinutes} دقيقة</strong></div><div class="hud-item"><span>حالة الخطر</span><strong>عولج</strong></div></div></div><div class="action-row center"><button id="finishMine" class="primary-btn">${quotaComplete?'إنه الوردية':'عد إلى العمل'}</button></div></div>`);
    $('#finishMine').addEventListener('click',()=>go(quotaComplete?'mineEnd':'mineTask'));
  }

  function mineEnd() {
    const stopped=state.flags.miningIncidentChoice==='stop';
    const continued=state.flags.miningIncidentChoice==='continue';
    const late=state.flags.miningMinutes>SHIFT_LIMIT;
    const earnings=100-(stopped?8:0)-(late?10:0);
    const risk=stopped?'عولج قبل نهاية الوردية':continued?'ظل القطاع ب بلا فحص حتى نهاية الوردية':'لم يظهر تحذير';
    html(`<div><span class="eyebrow">نهاية وردية الاستخراج</span><h1 class="scene-title">اكتملت الحصة: 12/12.</h1><div class="stage-output"><strong>12 وحدة من المواد الخام المستخرجة</strong>هذه ليست مواد جاهزة للتصنيع بعد. يجب نقلها وتنقيتها ومعالجتها أولًا.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>وقت الوردية</span><strong>${state.flags.miningMinutes} دقيقة</strong></div><div class="hud-item"><span>دخل الوردية</span><strong>${earnings} وحدة لعب</strong></div><div class="hud-item"><span>التحذير</span><strong>${risk}</strong></div></div></div><p class="muted">${late?'وصلت الحصة بعد نافذة التسليم، لذلك خُفض الجزء المتغير من الدخل.':'وصلت الحصة داخل نافذة التسليم.'}</p><div class="action-row"><button id="mineTransport" class="primary-btn">اتبع الشحنة</button></div></div>`);
    $('#mineTransport').addEventListener('click',()=>go('transportMontage'));
  }

  function transportMontage() {
    html(`<div><span class="eyebrow">بين موقع الاستخراج والمصنع</span><h1 class="scene-title">المواد لا تنتقل ولا تُعالج وحدها.</h1><p class="scene-subtitle">تمر الشحنة بالنقل والتنقية والمعالجة والشحن. تختصر اللعبة هذه الأعمال في انتقال قصير.</p><div class="montage"><div class="montage-card"><span class="icon">→</span><strong>نقل بري</strong><span>تحميل، قيادة، مستودعات</span></div><div class="montage-card"><span class="icon">◫</span><strong>تنقية ومعالجة</strong><span>مصاهر ومصانع مواد</span></div><div class="montage-card"><span class="icon">≈</span><strong>شحن</strong><span>موانئ ولوجستيات</span></div><div class="montage-card"><span class="icon">▤</span><strong>وصول إلى المصنع</strong><span>مواد مناسبة لبدء التصنيع</span></div></div><div class="action-row"><button id="mineAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#mineAbstract').addEventListener('click',()=>go('abstract1'));
  }

  function abstract1() { addLedger(0,'موسى وعمال النقل والمعالجة','استخراج وفرز ونقل وتنقية ومعالجة مواد','مواد معالجة جاهزة للتصنيع','تختصر المرحلة أعمالًا بشرية ولوجستية متعددة في مادة تصل إلى المصنع.'); abstraction([['موسى','عامل استخراج','◇'],['عمال النقل والمعالجة','','→']],'مواد معالجة جاهزة للتصنيع','الاستخراج والنقل والتنقية والمعالجة أصبحت في المرحلة التالية مواد تدخل المصنع.','ch2Intro'); }
  return { ch1Intro,mineOrientation,mineTask,mineInspection,mineEnd,transportMontage,abstract1 };
}
