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
    html(`<div><span class="eyebrow">موقع استخراج افتراضي</span><h1 class="scene-title">أنت الآن موسى، عامل استخراج وفرز.</h1><div class="reality-note"><strong>لماذا أنت هنا؟</strong> الأجهزة قد تعتمد على سلاسل تبدأ بخامات النحاس، والبوكسيت الذي يُنتج منه الألومنيوم، والسيليكا أو الكوارتز التي تدخل لاحقًا في إنتاج السيليكون، إضافة إلى مواد أخرى تختلف باختلاف الجهاز والمكونات.</div><p class="scene-subtitle">المطلوب تسليم 12 وحدة قبل مغادرة الشاحنة بعد ${SHIFT_LIMIT} دقيقة افتراضية. القطاع ب ينتج وحدتين في الوقت نفسه الذي تنتج فيه القطاعات الأخرى وحدة واحدة، لكنه يدخل حالة تحذير بعد تكرار استخدامه.</p><div class="hud-grid"><div class="hud-item"><span>الحصة</span><strong>12 وحدة</strong></div><div class="hud-item"><span>نافذة التسليم</span><strong>${SHIFT_LIMIT} دقيقة</strong></div><div class="hud-item"><span>الدخل الكامل</span><strong>100 وحدة لعب</strong></div></div><div class="reality-note"><strong>قواعد الأجر في السيناريو</strong> تجاوز نافذة التسليم يخفض الجزء المتغير 10 وحدات. كل توقف فحص يضيف ${INSPECTION_MINUTES} دقيقة ويخفض الجزء المتغير 8 وحدات. يمكن تأجيل الفحص أول مرة، لكن الاستمرار في استخدام القطاع بعد التحذير يراكم تدهورًا تشغيليًا وينتهي بفحص إلزامي؛ لا تفترض اللعبة وقوع إصابة عشوائية لتصنع العقوبة.</div><div class="action-row"><button id="startMine" class="primary-btn">ابدأ العمل</button></div></div>`);
    $('#startMine').addEventListener('click', () => go('mineTask'));
  }

  function mineTask() {
    const { miningCount: count, miningMinutes: minutes, miningWarning: warning, miningIncidentChoice: incident, miningForcedInspection: forced, miningInspectionCount: inspections, miningRiskLevel: riskLevel } = state.flags;
    const riskLabel = warning ? (forced ? 'فحص إلزامي' : 'قرار مطلوب') : inspections ? 'عولج' : incident === 'continue' ? 'تدهور مؤجل' : 'لا تحذير';
    const late = minutes > SHIFT_LIMIT;
    const riskNote = incident === 'continue' && !warning && !inspections ? `<div class="alert dangerish"><strong>الفحص مؤجل، وليس ملغيًا.</strong><span>كل استخدام إضافي للقطاع ب بعد التحذير يرفع حالة التدهور. المستوى الحالي في ميكانيكا السيناريو: ${riskLevel}/2؛ عند 2 يصبح الفحص إلزاميًا قبل استمرار العمل.</span></div>` : '';
    const warningCopy = forced
      ? '<div class="alert dangerish"><strong>استمرار الاهتزاز جعل الفحص إلزاميًا.</strong><span>أجّلت الفحص سابقًا وواصلت استخدام القطاع ب. لا تفترض اللعبة أن حادثًا وقع، لكنها تحول الصيانة المؤجلة إلى توقف لا يمكن تجاوزه.</span></div>'
      : '<div class="alert dangerish"><strong>اهتزاز غير معتاد في القطاع ب</strong><span>ظهر التحذير بعد تكرار العمل في القطاع الأسرع. قرر هل تغلقه للفحص أم تؤجل الفحص وتبقيه مفتوحًا.</span></div>';
    const choices = warning ? (forced
      ? `<div class="choice-grid"><button id="mineStop" class="choice-btn"><strong>أغلق القطاع ب للفحص الإلزامي</strong><small>يعالج التدهور ويضيف ${INSPECTION_MINUTES} دقيقة توقف ويخفض الجزء المتغير من الدخل.</small></button></div>`
      : `<div class="choice-grid"><button id="mineStop" class="choice-btn"><strong>أغلق القطاع ب للفحص الآن</strong><small>يعالج الخطر ويضيف ${INSPECTION_MINUTES} دقيقة توقف ويخفض الجزء المتغير من الدخل.</small></button><button id="mineContinue" class="choice-btn"><strong>أجّل الفحص واترك القطاع مفتوحًا</strong><small>تحافظ على الوقت الآن، لكن الاستخدام الإضافي يراكم تدهورًا ينتهي بفحص إلزامي.</small></button></div>`) : '';
    html(`<div><span class="eyebrow">العمل الجاري</span><h1 class="scene-title">أكمل الحصة مع متابعة الوقت والخطر.</h1><div class="hud-grid"><div class="hud-item"><span>المستخرج</span><strong>${count}/12</strong></div><div class="hud-item"><span>الوقت</span><strong>${minutes}/${SHIFT_LIMIT} دقيقة</strong></div><div class="hud-item"><span>حالة القطاع ب</span><strong>${riskLabel}</strong></div></div>${late?'<div class="alert dangerish"><strong>فاتت نافذة الشاحنة.</strong><span>يمكنك إكمال الحصة، لكن الجزء المتغير من الدخل انخفض في هذا السيناريو.</span></div>':''}${warning?warningCopy:''}${riskNote}<div class="work-area"><button class="work-node" data-sector="a"><span class="node-icon">◇</span><strong>القطاع أ</strong><span class="node-yield">+1 وحدة</span><small>7 دقائق</small></button><button class="work-node ${warning||incident==='continue'&&!inspections?'risky':''}" data-sector="b"><span class="node-icon">◆</span><strong>القطاع ب</strong><span class="node-yield">+2 وحدة</span><small>7 دقائق — أسرع لكنه يحمل تحذيرًا</small></button><button class="work-node" data-sector="c"><span class="node-icon">◈</span><strong>القطاع ج</strong><span class="node-yield">+1 وحدة</span><small>7 دقائق</small></button></div>${choices}</div>`);
    bind('.work-node','click',event=>{
      if(state.flags.miningWarning)return;
      const sectorId=event.currentTarget.dataset.sector;
      const sector=SECTORS[sectorId];
      state.flags.miningCount=Math.min(12,state.flags.miningCount+sector.yield);
      state.flags.miningMinutes+=sector.minutes;
      if(sectorId==='b') {
        state.flags.miningBUses+=1;
        if(!state.flags.miningIncidentChoice && state.flags.miningBUses>=2) state.flags.miningWarning=true;
        else if(state.flags.miningIncidentChoice==='continue' && state.flags.miningInspectionCount===0) {
          state.flags.miningRiskLevel+=1;
          if(state.flags.miningRiskLevel>=2) {
            state.flags.miningWarning=true;
            state.flags.miningForcedInspection=true;
          }
        }
      }
      saveState();
      if(state.flags.miningWarning){ mineTask(); return; }
      if(state.flags.miningCount>=12) go('mineEnd'); else mineTask();
    });
    if(!warning)return;
    $('#mineStop').addEventListener('click',()=>{
      const wasForced=state.flags.miningForcedInspection;
      if(!state.flags.miningIncidentChoice) state.flags.miningIncidentChoice='stop';
      state.flags.miningWarning=false;
      state.flags.miningForcedInspection=false;
      state.flags.miningInspectionCount+=1;
      state.flags.miningMinutes+=INSPECTION_MINUTES;
      state.flags.miningRiskLevel=0;
      if(wasForced) addDecision('mine-forced-inspection','حوّلت الصيانة المؤجلة إلى فحص إلزامي','واصلت استخدام القطاع ب بعد التحذير حتى وصل التدهور التشغيلي إلى حد فرض توقف للفحص؛ لم تفترض اللعبة وقوع إصابة عشوائية.');
      else addDecision('mine-stop','أغلقت القطاع ب للفحص','عالجت التحذير مبكرًا، لكن الفحص أضاف وقت توقف وخفض الجزء المتغير من دخل الوردية.');
      saveState(); go('mineInspection');
    });
    $('#mineContinue')?.addEventListener('click',()=>{
      state.flags.miningIncidentChoice='continue';
      state.flags.miningWarning=false;
      state.flags.miningRiskLevel=0;
      addDecision('mine-continue','أجلت فحص القطاع ب بعد التحذير','حافظت على وقت الوردية في اللحظة الحالية، لكن الاستخدام الإضافي للقطاع صار يراكم تدهورًا يمكن أن يفرض توقفًا لاحقًا.');
      saveState();
      if(state.flags.miningCount>=12) go('mineEnd'); else mineTask();
    });
  }

  function mineInspection() {
    const quotaComplete=state.flags.miningCount>=12;
    const forced=state.decisions.some(decision=>decision.id==='mine-forced-inspection');
    html(`<div class="centered"><span class="eyebrow">فحص القطاع ب</span><h1 class="scene-title">تم تثبيت الدعامة والتحقق من القطاع.</h1><p class="scene-subtitle">${forced?'تحولت الصيانة المؤجلة إلى توقف إلزامي قبل استمرار العمل. ':'لم تنتج مواد أثناء التوقف. '}أضيفت ${INSPECTION_MINUTES} دقيقة إلى وقت الوردية.${quotaComplete?' كانت الحصة مكتملة بالفعل، لذلك تنتقل الآن إلى نهاية الوردية.':' ستعود لإكمال الحصة من النقطة نفسها.'}</p><div class="card flat"><div class="hud-grid"><div class="hud-item"><span>الحصة الحالية</span><strong>${state.flags.miningCount}/12</strong></div><div class="hud-item"><span>الوقت الحالي</span><strong>${state.flags.miningMinutes} دقيقة</strong></div><div class="hud-item"><span>حالة الخطر</span><strong>عولج</strong></div></div></div><div class="action-row center"><button id="finishMine" class="primary-btn">${quotaComplete?'إنه الوردية':'عد إلى العمل'}</button></div></div>`);
    $('#finishMine').addEventListener('click',()=>go(quotaComplete?'mineEnd':'mineTask'));
  }

  function mineEnd() {
    const continued=state.flags.miningIncidentChoice==='continue';
    const inspected=state.flags.miningInspectionCount>0;
    const late=state.flags.miningMinutes>SHIFT_LIMIT;
    const earnings=100-(state.flags.miningInspectionCount*8)-(late?10:0);
    const risk=inspected?'عولج بالفحص قبل نهاية الوردية':continued?'ظل القطاع ب بلا فحص حتى نهاية الوردية':'لم يظهر تحذير';
    const incentiveNote=continued?`<div class="alert dangerish"><strong>ما الذي صنعه نظام الأجر؟</strong><span>${inspected?'تأجيل الفحص حافظ على الوقت مؤقتًا، لكن مواصلة استخدام القطاع حوّلت الصيانة المؤجلة إلى توقف إلزامي لاحق.':'إنهاء الحصة قبل تراكم تدهور إضافي أبقى الفحص مؤجلًا، ولذلك ظل الخطر غير محسوم عند نهاية الوردية.'} في الحالتين يظهر الحافز الاقتصادي بدل تحويل القرار إلى اختبار أخلاقي بسيط.</span></div>`:'';
    html(`<div><span class="eyebrow">نهاية وردية الاستخراج</span><h1 class="scene-title">اكتملت الحصة: 12/12.</h1><div class="stage-output"><strong>12 وحدة من المواد الخام المستخرجة</strong>هذه ليست مواد جاهزة للتصنيع بعد. يجب نقلها وتنقيتها ومعالجتها أولًا.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>وقت الوردية</span><strong>${state.flags.miningMinutes} دقيقة</strong></div><div class="hud-item"><span>دخل الوردية</span><strong>${earnings} وحدة لعب</strong></div><div class="hud-item"><span>التحذير</span><strong>${risk}</strong></div></div></div>${incentiveNote}<p class="muted">${late?'وصلت الحصة بعد نافذة التسليم، لذلك خُفض الجزء المتغير من الدخل.':'وصلت الحصة داخل نافذة التسليم.'}</p><details class="transition-details" open><summary>كيف تصل المادة إلى المصنع؟</summary><div class="montage"><div class="montage-card"><span class="icon">→</span><strong>نقل بري</strong><span>تحميل، قيادة، مستودعات</span></div><div class="montage-card"><span class="icon">◫</span><strong>تنقية ومعالجة</strong><span>مصاهر ومصانع مواد</span></div><div class="montage-card"><span class="icon">≈</span><strong>شحن</strong><span>موانئ ولوجستيات</span></div><div class="montage-card"><span class="icon">▤</span><strong>وصول إلى المصنع</strong><span>مواد مناسبة لبدء التصنيع</span></div></div></details><div class="action-row"><button id="mineAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#mineAbstract').addEventListener('click',()=>go('abstract1'));
  }

  function abstract1() { addLedger(0,'موسى وعمال النقل والمعالجة','استخراج وفرز ونقل وتنقية ومعالجة مواد','مواد معالجة جاهزة للتصنيع','تختصر المرحلة أعمالًا بشرية ولوجستية متعددة في مادة تصل إلى المصنع.'); abstraction([['موسى','عامل استخراج','◇'],['عمال النقل والمعالجة','','→']],'مواد معالجة جاهزة للتصنيع','الاستخراج والنقل والتنقية والمعالجة أصبحت في المرحلة التالية مواد تدخل المصنع.','ch2Intro'); }
  return { ch1Intro,mineOrientation,mineTask,mineInspection,mineEnd,abstract1 };
}
