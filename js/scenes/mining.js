export function createMiningRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch1Intro(){ chapterIntro(0,'المواد','قبل أن تصبح هناك خوادم ورقائق، توجد سلسلة مادية تبدأ من الأرض، والعمل الذي يستخرج وينقل ويعالج الموارد.','mineOrientation'); }

  function mineOrientation(){
    setChapter(0);
    html(`
      <div>
        <span class="eyebrow">TerraCore Mining — وردية افتراضية</span>
        <h1 class="scene-title">أنت الآن موسى، عامل استخراج وفرز.</h1>
        <div class="role-card card flat"><div class="avatar">⛏</div><div><h3>موسى</h3><p>عامل استخراج — شخصية مركبة لا تمثل عاملًا أو شركة بعينها.</p></div></div>
        <p class="scene-subtitle">الشاحنة تغادر بعد دقائق. المطلوب تسليم 12 وحدة. عدم تحقيق الحصة يخفض أجر الوردية.</p>
        <div class="hud-grid">
          <div class="hud-item"><span>الحصة</span><strong>12 وحدة</strong></div>
          <div class="hud-item"><span>الأجر الأساسي</span><strong>100 وحدة لعب</strong></div>
          <div class="hud-item"><span>السلطة على قواعد الوردية</span><strong>محدودة</strong></div>
        </div>
        <div class="alert"><strong>المشرف</strong> نحتاج 12 وحدة قبل مغادرة الشاحنة. إذا ظهر خطر سجّله، لكن وقت التوقف يحسب على الوردية.</div>
        <div class="action-row"><button id="startMine" class="primary-btn">ابدأ العمل</button></div>
      </div>`);
    $('#startMine').addEventListener('click',()=>go('mineTask'));
  }

  function mineTask(){
    setChapter(0);
    const count=state.flags.miningCount;
    const warning=state.flags.miningWarning;
    html(`
      <div>
        <span class="eyebrow">العمل الجاري</span>
        <h1 class="scene-title">أكمل الحصة قبل مغادرة الشاحنة.</h1>
        <div class="hud-grid">
          <div class="hud-item"><span>المستخرج</span><strong id="mineCount">${count}/12</strong></div>
          <div class="hud-item"><span>الحصة المتبقية</span><strong id="mineRemain">${Math.max(0,12-count)}</strong></div>
          <div class="hud-item"><span>حالة القطاع B</span><strong id="sectorState">${warning?'يحتاج فحصًا':'مستقر'}</strong></div>
        </div>
        ${warning?`<div class="alert dangerish"><strong>اهتزاز غير معتاد في القطاع B</strong><span>زميلك يشير إلى حركة في الجدار. نظام السلامة يوصي بإيقاف العمل للفحص.</span></div>`:''}
        <div class="work-area">
          <button class="work-node" data-yield="1"><span class="node-icon">🪨</span><strong>القطاع A</strong><span class="node-yield">+1 وحدة</span><small class="muted">أبطأ وأكثر استقرارًا</small></button>
          <button class="work-node ${warning?'risky':''}" data-yield="2"><span class="node-icon">⛏</span><strong>القطاع B</strong><span class="node-yield">+2 وحدة</span><small class="muted">أعلى إنتاجًا</small>${warning?'<i class="pulse-ring"></i>':''}</button>
          <button class="work-node" data-yield="1"><span class="node-icon">🧱</span><strong>القطاع C</strong><span class="node-yield">+1 وحدة</span><small class="muted">يحتاج جهدًا أطول</small></button>
        </div>
        ${warning?`<div class="choice-grid"><button id="mineStop" class="choice-btn"><strong>أوقف العمل للفحص</strong><small>وقت توقف ودخل محتمل أقل، مع تقليل الخطر.</small></button><button id="mineContinue" class="choice-btn"><strong>أكمل الدفعة الحالية</strong><small>يزداد الإنتاج، لكن عبء الخطر يقع على الوردية.</small></button></div>`:''}
      </div>`);

    bind('.work-node','click',(e)=>{
      if(state.flags.miningWarning) return;
      state.flags.miningCount=Math.min(12,state.flags.miningCount+Number(e.currentTarget.dataset.yield));
      if(state.flags.miningCount>=6 && !state.flags.miningWarning){ state.flags.miningWarning=true; }
      saveState();
      if(state.flags.miningCount>=12) go('mineEnd'); else mineTask();
    });
    if(warning){
      $('#mineStop').addEventListener('click',()=>{
        state.flags.miningStopped=true; state.flags.miningWarning=false;
        addDecision('mine-stop','أوقفت العمل في التعدين للفحص','تحملت الوردية جزءًا من تكلفة التوقف بدل مواصلة الإنتاج تحت الخطر.',{pressure:-4,cost:6,burden:-8,quality:2,visibility:3});
        state.flags.miningCount=Math.min(12,state.flags.miningCount+3);
        saveState(); go('mineInspection');
      });
      $('#mineContinue').addEventListener('click',()=>{
        state.flags.miningStopped=false; state.flags.miningWarning=false;
        addDecision('mine-continue','واصلت العمل بعد تحذير السلامة','حافظت على الحصة، بينما ارتفع العبء والمخاطر على العامل.',{pressure:5,cost:-4,burden:10,quality:-2,visibility:1});
        state.flags.miningCount=12; saveState(); go('mineEnd');
      });
    }
  }

  function mineInspection(){
    html(`
      <div class="centered">
        <span class="eyebrow">فحص القطاع</span>
        <h1 class="scene-title">تم تثبيت الدعامة.</h1>
        <p class="scene-subtitle">مرّ وقت من الوردية. المشرف يسجل توقفًا، لكن العمل يعود بعد معالجة الخطر المباشر.</p>
        <div class="card flat" style="max-width:520px;width:100%"><div class="hud-grid"><div class="hud-item"><span>الحصة الحالية</span><strong>${state.flags.miningCount}/12</strong></div><div class="hud-item"><span>التوقف</span><strong>مسجل</strong></div><div class="hud-item"><span>الأجر المتوقع</span><strong>أقل</strong></div></div></div>
        <div class="action-row center"><button id="finishMine" class="primary-btn">أكمل ما تبقى</button></div>
      </div>`);
    $('#finishMine').addEventListener('click',()=>{state.flags.miningCount=12;saveState();go('mineEnd');});
  }

  function mineEnd(){
    addLedger(0,'موسى — عامل استخراج','استخراج وفرز وتحميل مواد تحت حصة زمنية ومخاطر سلامة','RAW MATERIALS','السلطة على الحصة محدودة، بينما يتغير الدخل والمخاطر بحسب توقف العمل.');
    html(`
      <div>
        <span class="eyebrow">نهاية الوردية</span>
        <h1 class="scene-title">وصلت الشاحنة.</h1>
        <div class="card">
          <div class="hud-grid"><div class="hud-item"><span>المواد</span><strong>12/12</strong></div><div class="hud-item"><span>التوقف</span><strong>${state.flags.miningStopped?'حدث':'لم يحدث'}</strong></div><div class="hud-item"><span>حالة الشحنة</span><strong>جاهزة</strong></div></div>
          <p class="muted">تُنقل الصناديق. يتوقف دور موسى هنا، لكن السلسلة تستمر.</p>
        </div>
        <div class="action-row"><button id="mineAbstract" class="primary-btn">اتبع الشحنة</button></div>
      </div>`);
    $('#mineAbstract').addEventListener('click',()=>go('abstract1'));
  }

  function abstract1(){ abstraction([['موسى','عامل استخراج','⛏']], 'RAW MATERIALS','قبل لحظات كنت تقوم بعمل. في النظام أصبح الآن «مواد خام».','transportMontage'); }

  function transportMontage(){
    html(`
      <div>
        <span class="eyebrow">بين الموقع والمصنع</span>
        <h1 class="scene-title">المواد لا تنتقل وحدها.</h1>
        <p class="scene-subtitle">النقل والتنقية والمعالجة واللوجستيات حلقات إضافية من العمل. اللعبة تضغطها في مونتاج قصير حتى لا يتحول المسار إلى محاكاة صناعية كاملة.</p>
        <div class="montage">
          <div class="montage-card"><span class="icon">🚚</span><strong>نقل بري</strong><span>تحميل، قيادة، مستودعات</span></div>
          <div class="montage-card"><span class="icon">🔥</span><strong>تنقية ومعالجة</strong><span>مصاهر ومصانع مواد</span></div>
          <div class="montage-card"><span class="icon">🚢</span><strong>شحن</strong><span>موانئ ولوجستيات</span></div>
          <div class="montage-card"><span class="icon">🏭</span><strong>توريد صناعي</strong><span>وصول المادة إلى المصنع</span></div>
        </div>
        <div class="action-row"><button id="toCh2" class="primary-btn">إلى المصنع</button></div>
      </div>`);
    $('#toCh2').addEventListener('click',()=>go('ch2Intro'));
  }

  return {ch1Intro,mineOrientation,mineTask,mineInspection,mineEnd,abstract1,transportMontage};
}
