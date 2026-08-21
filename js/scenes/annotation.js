import { ANNOTATION_TASKS } from '../data/game-data.js';
export function createAnnotationRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch5Intro(){ chapterIntro(4,'عمل البيانات','بعض الأعمال لا تبني الجهاز ولا تكتب كود النموذج. إنها تجعل البيانات قابلة للاستخدام عبر الوسم والتقييم والمراجعة.','annotationIntro'); }

  function annotationIntro(){
    setChapter(4);
    html(`
      <div class="annotation-shell">
        <div class="annotation-head"><strong>HumanTask</strong><span>Project HT-2091</span></div>
        <div class="annotation-body"><span class="eyebrow" style="color:#237b67">AI Data Worker</span><h1 style="margin:6px 0 12px">مرحبًا أماني.</h1><p>صنّفي المحتوى بحسب الفئة الأقرب. الدفع مقابل المهام المقبولة. يجب الحفاظ على دقة أعلى من 90%، والسرعة تؤثر في إتاحة مهام إضافية.</p>
        <div class="annotation-stats"><span>الدفع: لكل مهمة مقبولة</span><span>الاستراحة: غير مدفوعة</span><span>التقييم: مستمر</span></div>
        <div class="action-row"><button id="startAnnot" class="primary-btn">ابدأ الوردية</button></div></div>
      </div>`);
    $('#startAnnot').addEventListener('click',()=>go('annotationTask'));
  }

  function annotationTask(){
    const i=state.flags.annotationIndex;
    if(i>=ANNOTATION_TASKS.length){go('annotationReview');return;}
    const task=ANNOTATION_TASKS[i];
    const tags=['Safe','Violence','Harassment','Hate','Sexual','Self-harm','Unclear'];
    html(`
      <div class="annotation-shell">
        <div class="annotation-head"><strong>HT-2091</strong><span>Task ${i+1}/${ANNOTATION_TASKS.length}</span></div>
        <div class="annotation-body">
          ${task.sensitive?'<div class="alert" style="color:#4b3a10;background:#fff6df;border-color:#d7b563"><strong>تنبيه محتوى</strong><span>وصف مقتضب وغير تفصيلي لمادة حساسة.</span></div>':''}
          <div class="annotation-stats"><span>Completed: ${i}</span><span>Accepted: ${state.flags.annotationCounts.accepted}</span><span>Quality: ${Math.max(72,96-i)}%</span>${i>=4?'<span>أبطأ من 61% من الفريق</span>':''}</div>
          <div class="annotation-copy">${task.text}</div>
          <div class="annotation-tags">${tags.map(t=>`<button data-tag="${t}">${t}</button>`).join('')}</div>
          ${i===5?'<div class="action-row"><button id="takeBreak" class="choice-btn break-btn"><strong>Take a break</strong><small>الاستراحة غير مدفوعة.</small></button></div>':''}
        </div>
      </div>`);
    bind('[data-tag]','click',(e)=>{
      const choice=e.currentTarget.dataset.tag;
      if(choice===task.best){state.flags.annotationCounts.accepted++;mutateMetrics({quality:1});}
      else if(choice==='Unclear'){state.flags.annotationCounts.pending++;mutateMetrics({quality:1,cost:1,pressure:-1});}
      else {state.flags.annotationCounts.accepted++;mutateMetrics({quality:-2,pressure:1});}
      if(task.ambiguity && choice!=='Unclear') mutateMetrics({burden:2,pressure:1});
      state.flags.annotationIndex++; saveState(); annotationTask();
    });
    $('#takeBreak')?.addEventListener('click',()=>{
      state.flags.tookBreak=true;
      addDecision('annotation-break','أخذت استراحة غير مدفوعة','انخفض العبء الفوري لكن الدخل المتوقع والسرعة تراجعا.',{pressure:-3,cost:1,burden:-7,quality:2,visibility:3});
      state.flags.annotationIndex++; saveState(); annotationTask();
    });
  }

  function annotationReview(){
    state.flags.annotationCounts.rejected = 1;
    html(`
      <div class="annotation-shell"><div class="annotation-head"><strong>Quality review</strong><span>Completed</span></div><div class="annotation-body">
      <h1 style="margin-top:0">Reviewer disagreed with one label.</h1><div class="alert" style="color:#4c1820;background:#feecee;border-color:#e8abb3"><strong>Task rejected — Payment: 0</strong><span>يمكنك الاعتراض، لكن المراجعة قد تستغرق حتى 48 ساعة.</span></div>
      <div class="choice-grid"><button id="appeal" class="choice-btn" style="color:#18212d;background:white"><strong>اعترض</strong><small>أضف وقتًا غير مدفوع لإجراء المراجعة.</small></button><button id="skipAppeal" class="choice-btn" style="color:#18212d;background:white"><strong>لا تعترض</strong><small>استمر وأغلق الوردية.</small></button></div></div></div>`);
    $('#appeal').addEventListener('click',()=>{addDecision('annotation-appeal','اعترضت على مهمة مرفوضة','استخدمت مسار الاعتراض لكن وقت المراجعة لا يدخل دخل الوردية.',{burden:2,cost:1,visibility:3});go('annotationEnd');});
    $('#skipAppeal').addEventListener('click',()=>{addDecision('annotation-noappeal','لم تعترض على المهمة المرفوضة','وفرت الوقت لكن قرار المنصة ظل قائمًا بلا مراجعة.',{pressure:1,cost:-1,burden:1,visibility:1});go('annotationEnd');});
  }

  function annotationEnd(){
    addLedger(4,'أماني — عاملة بيانات','تصنيف متكرر، حالات غامضة، محتوى حساس، تقييم جودة واعتراض','LABELS','المنصة التالية ترى عدد أمثلة موسومة لا تفاصيل الأجر والاستراحة والرفض.');
    html(`
      <div><span class="eyebrow">وردية مكتملة</span><h1 class="scene-title">${ANNOTATION_TASKS.length} مهام أُرسلت.</h1>
      <div class="card"><div class="hud-grid"><div class="hud-item"><span>Accepted</span><strong>${state.flags.annotationCounts.accepted}</strong></div><div class="hud-item"><span>Pending</span><strong>${state.flags.annotationCounts.pending}</strong></div><div class="hud-item"><span>Rejected</span><strong>1</strong></div></div><p class="muted">عند انتقال البيانات إلى شركة النموذج، لن تظهر حالة الدفع أو الاستراحة أو الاعتراض.</p></div>
      <div class="action-row"><button id="annotAbstract" class="primary-btn">أرسل الدفعة</button></div></div>`);
    $('#annotAbstract').addEventListener('click',()=>go('abstract5'));
  }

  function abstract5(){ abstraction([['أماني','عاملة بيانات','⌨']], 'LABELS','27 دقيقة عمل — في اللوحة التالية تصبح «أمثلة موسومة».','ch6Intro'); }

  return {ch5Intro,annotationIntro,annotationTask,annotationReview,annotationEnd,abstract5};
}
