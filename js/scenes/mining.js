export function createMiningRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch1Intro() { chapterIntro(0, 'mineOrientation'); }

  function mineOrientation() {
    html(`<div><span class="eyebrow">موقع استخراج افتراضي</span><h1 class="scene-title">أنت الآن موسى، عامل استخراج وفرز.</h1><div class="reality-note"><strong>لماذا أنت هنا؟</strong> الأجهزة قد تعتمد على سلاسل تبدأ بخامات النحاس، والبوكسيت الذي يُنتج منه الألومنيوم، والسيليكا أو الكوارتز التي تدخل لاحقًا في إنتاج السيليكون، إضافة إلى مواد أخرى تختلف باختلاف الجهاز والمكونات.</div><p class="scene-subtitle">المطلوب تسليم 12 وحدة. القطاعات تختلف في وتيرة الإنتاج؛ القطاع ب أسرع، لكن التحذير لا يظهر إلا إذا عملت فيه بعد ارتفاع وتيرة الاستخراج.</p><div class="hud-grid"><div class="hud-item"><span>الحصة</span><strong>12 وحدة</strong></div><div class="hud-item"><span>دخل الوردية دون توقف</span><strong>100 وحدة لعب</strong></div><div class="hud-item"><span>السلطة على قواعد الوردية</span><strong>محدودة</strong></div></div><div class="action-row"><button id="startMine" class="primary-btn">ابدأ العمل</button></div></div>`);
    $('#startMine').addEventListener('click', () => go('mineTask'));
  }

  function mineTask() {
    const count = state.flags.miningCount;
    const warning = state.flags.miningWarning;
    const incident = state.flags.miningIncidentChoice;
    const riskLabel = warning ? 'قرار مطلوب' : incident === 'stop' ? 'عولج' : incident === 'continue' ? 'غير محسوم' : 'لا تحذير';
    const riskNote = incident === 'continue' && !warning ? '<div class="alert dangerish"><strong>القطاع ب ما زال بلا فحص.</strong><span>يمكنك إكمال الحصة من القطاعات الأخرى أو استخدام ب مع قبول استمرار الخطر؛ اللعبة لا تفترض أنك بقيت في القطاع نفسه.</span></div>' : '';
    html(`<div><span class="eyebrow">العمل الجاري</span><h1 class="scene-title">أكمل الحصة قبل مغادرة الشاحنة.</h1><div class="hud-grid"><div class="hud-item"><span>المستخرج</span><strong>${count}/12</strong></div><div class="hud-item"><span>المتبقي</span><strong>${Math.max(0,12-count)}</strong></div><div class="hud-item"><span>حالة القطاع ب</span><strong>${riskLabel}</strong></div></div>${warning?'<div class="alert dangerish"><strong>اهتزاز غير معتاد في القطاع ب</strong><span>ظهر التحذير أثناء العمل في هذا القطاع. قرر هل تغلقه للفحص أم تبقيه مفتوحًا وتواصل الوردية.</span></div>':''}${riskNote}<div class="work-area"><button class="work-node" data-sector="a" data-yield="1"><span class="node-icon">◇</span><strong>القطاع أ</strong><span class="node-yield">+1 وحدة</span><small>وتيرة إنتاج منخفضة</small></button><button class="work-node ${warning||incident==='continue'?'risky':''}" data-sector="b" data-yield="2"><span class="node-icon">◆</span><strong>القطاع ب</strong><span class="node-yield">+2 وحدة</span><small>وتيرة إنتاج أعلى</small></button><button class="work-node" data-sector="c" data-yield="1"><span class="node-icon">◈</span><strong>القطاع ج</strong><span class="node-yield">+1 وحدة</span><small>وتيرة إنتاج منخفضة</small></button></div>${warning?'<div class="choice-grid"><button id="mineStop" class="choice-btn"><strong>أغلق القطاع ب للفحص</strong><small>وقت توقف ودخل أقل، ثم يعود القطاع بعد معالجة الخطر.</small></button><button id="mineContinue" class="choice-btn"><strong>اترك القطاع مفتوحًا</strong><small>تحافظ على وقت الوردية، لكن الخطر يبقى غير محسوم.</small></button></div>':''}</div>`);
    bind('.work-node','click',event=>{
      if(state.flags.miningWarning)return;
      const sector=event.currentTarget.dataset.sector;
      state.flags.miningCount=Math.min(12,state.flags.miningCount+Number(event.currentTarget.dataset.yield));
      if(!state.flags.miningIncidentChoice && sector==='b' && state.flags.miningCount>=6 && state.flags.miningCount<12) state.flags.miningWarning=true;
      saveState();
      if(state.flags.miningCount>=12)go('mineEnd'); else mineTask();
    });
    if(!warning)return;
    $('#mineStop').addEventListener('click',()=>{ state.flags.miningIncidentChoice='stop'; state.flags.miningWarning=false; addDecision('mine-stop','أغلقت القطاع ب للفحص','خسر موسى وقتًا من الوردية وجزءًا من الدخل المتغير، ثم عاد القطاع بعد تثبيت الدعامة والتحقق.'); saveState(); go('mineInspection'); });
    $('#mineContinue').addEventListener('click',()=>{ state.flags.miningIncidentChoice='continue'; state.flags.miningWarning=false; addDecision('mine-continue','أبقيت القطاع ب مفتوحًا بعد التحذير','حافظت على وقت الوردية، لكن الخطر بقي غير محسوم حتى نهايتها.'); saveState(); mineTask(); });
  }

  function mineInspection() {
    html(`<div class="centered"><span class="eyebrow">فحص القطاع ب</span><h1 class="scene-title">تم تثبيت الدعامة والتحقق من القطاع.</h1><p class="scene-subtitle">مرّ وقت من الوردية. لم تنتج مواد أثناء التوقف؛ ستعود الآن لإكمال الحصة من النقطة نفسها.</p><div class="card flat"><div class="hud-grid"><div class="hud-item"><span>الحصة الحالية</span><strong>${state.flags.miningCount}/12</strong></div><div class="hud-item"><span>زمن التوقف</span><strong>35 دقيقة افتراضية</strong></div><div class="hud-item"><span>حالة الخطر</span><strong>عولج</strong></div></div></div><div class="action-row center"><button id="finishMine" class="primary-btn">عد إلى العمل</button></div></div>`);
    $('#finishMine').addEventListener('click',()=>go('mineTask'));
  }

  function mineEnd() {
    const stopped=state.flags.miningIncidentChoice==='stop';
    const continued=state.flags.miningIncidentChoice==='continue';
    const earnings=stopped?92:100;
    const risk=stopped?'عولج قبل استكمال العمل':continued?'ظل القطاع ب بلا فحص حتى نهاية الوردية':'لم يظهر تحذير خلال المسار الذي اخترته';
    html(`<div><span class="eyebrow">نهاية وردية الاستخراج</span><h1 class="scene-title">اكتملت الحصة: 12/12.</h1><div class="stage-output"><strong>12 وحدة من المواد الخام المستخرجة</strong>هذه ليست مواد جاهزة للتصنيع بعد. يجب نقلها وتنقيتها ومعالجتها أولًا.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>المواد</span><strong>12/12</strong></div><div class="hud-item"><span>دخل الوردية</span><strong>${earnings} وحدة لعب</strong></div><div class="hud-item"><span>التحذير</span><strong>${risk}</strong></div></div></div><div class="action-row"><button id="mineTransport" class="primary-btn">اتبع الشحنة</button></div></div>`);
    $('#mineTransport').addEventListener('click',()=>go('transportMontage'));
  }

  function transportMontage() {
    html(`<div><span class="eyebrow">بين موقع الاستخراج والمصنع</span><h1 class="scene-title">المواد لا تنتقل ولا تُعالج وحدها.</h1><p class="scene-subtitle">تمر الشحنة بالنقل والتنقية والمعالجة والشحن. تختصر اللعبة هذه الأعمال في انتقال قصير.</p><div class="montage"><div class="montage-card"><span class="icon">→</span><strong>نقل بري</strong><span>تحميل، قيادة، مستودعات</span></div><div class="montage-card"><span class="icon">◫</span><strong>تنقية ومعالجة</strong><span>مصاهر ومصانع مواد</span></div><div class="montage-card"><span class="icon">≈</span><strong>شحن</strong><span>موانئ ولوجستيات</span></div><div class="montage-card"><span class="icon">▤</span><strong>وصول إلى المصنع</strong><span>مواد مناسبة لبدء التصنيع</span></div></div><div class="action-row"><button id="mineAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#mineAbstract').addEventListener('click',()=>go('abstract1'));
  }

  function abstract1() { addLedger(0,'موسى وعمال النقل والمعالجة','استخراج وفرز ونقل وتنقية ومعالجة مواد','مواد معالجة جاهزة للتصنيع','تختصر المرحلة أعمالًا بشرية ولوجستية متعددة في مادة تصل إلى المصنع.'); abstraction([['موسى','عامل استخراج','◇'],['عمال النقل والمعالجة','','→']],'مواد معالجة جاهزة للتصنيع','الاستخراج والنقل والتنقية والمعالجة أصبحت في المرحلة التالية مواد تدخل المصنع.','ch2Intro'); }
  return { ch1Intro,mineOrientation,mineTask,mineInspection,mineEnd,transportMontage,abstract1 };
}
