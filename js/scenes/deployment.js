import { SUPPORT_TASKS } from '../data/game-data.js';
export function createDeploymentRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch8Intro(){ chapterIntro(7,'التشغيل','إطلاق النموذج لا ينهي العمل. الخدمة تحتاج إلى مراقبة وصيانة واستجابة للأعطال ودعم للمستخدمين.','deployLoad'); }

  function deployLoad(){
    setChapter(7);
    html(`
      <div><span class="eyebrow">هانا — Site Reliability Engineer</span><h1 class="scene-title">Lumina Assistant is live.</h1><p class="scene-subtitle">وزّع الحمل بين ثلاثة مراكز بيانات. مجموع القيم لا يحتاج أن يكون مثاليًا؛ الهدف أن ترى القيود المختلفة.</p>
      <div class="load-grid">${['A','B','C'].map((x,i)=>`<div class="load-card"><span>Data Center ${x}</span><strong id="load${x}">${[34,33,33][i]}%</strong><input id="range${x}" type="range" min="0" max="100" value="${[34,33,33][i]}" /></div>`).join('')}</div>
      <div id="loadFeedback" class="alert"><strong>الحالة</strong><span>حرّك الأحمال ثم شغّل الاختبار.</span></div><div class="action-row"><button id="testLoad" class="primary-btn">اختبر التوزيع</button></div></div>`);
    ['A','B','C'].forEach(x=>$('#range'+x).addEventListener('input',e=>$('#load'+x).textContent=e.target.value+'%'));
    $('#testLoad').addEventListener('click',()=>{
      const vals=['A','B','C'].map(x=>Number($('#range'+x).value)); const total=vals.reduce((a,b)=>a+b,0); const max=Math.max(...vals);
      if(total<90 || total>110){$('#loadFeedback').innerHTML='<strong>التوزيع غير متوازن</strong><span>حاول إبقاء مجموع الأحمال قريبًا من 100%.</span>';tone(170,.08,'square');return;}
      if(max>60){mutateMetrics({burden:3,quality:-2,pressure:2});} else mutateMetrics({quality:2});
      go('deployIncident');
    });
  }

  function deployIncident(){
    const tabs=[['network','Network','الشبكة مستقرة، لا توجد زيادة فقد حزم.'],['compute','Compute','السعة متاحة، لكن بعض العمليات تُعاد تشغيلها.'],['model','Model service','استهلاك الذاكرة يرتفع تدريجيًا في الإصدار الجديد.']];
    html(`
      <div><span class="eyebrow">Incident</span><h1 class="scene-title">ERROR RATE 12%</h1><div class="alert dangerish"><strong>12,417 مستخدمًا متأثرًا — رقم افتراضي داخل اللعبة</strong><span>افتح التبويبات الثلاثة لتحديد مكان المشكلة.</span></div>
      <div class="incident-tabs">${tabs.map(([id,label])=>`<button data-tab="${id}" class="${state.flags.deployTabs.includes(id)?'active':''}">${label}</button>`).join('')}</div><div id="tabReadout" class="card flat">افتح Network وCompute وModel service.</div>
      ${state.flags.deployTabs.length===3?'<div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>Restart affected instances</strong><small>عودة أسرع مع احتمال تكرار المشكلة.</small></button><button id="rollback" class="choice-btn"><strong>Rollback release</strong><small>وقت أطول لكن العودة إلى إصدار أكثر استقرارًا.</small></button></div>':''}</div>`);
    bind('[data-tab]','click',(e)=>{const id=e.currentTarget.dataset.tab;const t=tabs.find(x=>x[0]===id);$('#tabReadout').textContent=t[2];if(!state.flags.deployTabs.includes(id)){state.flags.deployTabs.push(id);saveState();deployIncident();}});
    $('#restartInst')?.addEventListener('click',()=>{addDecision('deploy-restart','أعدت تشغيل الوحدات المتأثرة','عادت الخدمة أسرع مع احتمال بقاء سبب العطل.',{pressure:5,cost:-3,burden:5,quality:-3,visibility:1});go('onCall');});
    $('#rollback')?.addEventListener('click',()=>{addDecision('deploy-rollback','عدت إلى الإصدار السابق','تحملت وقت استعادة أطول مقابل استقرار أعلى.',{pressure:-3,cost:4,burden:1,quality:5,visibility:2});go('onCall');});
  }

  function onCall(){
    html(`
      <div><span class="eyebrow">بعد استعادة الخدمة</span><h1 class="scene-title">المنتج يعمل. الوردية لم تنتهِ.</h1><div class="role-card card flat"><div class="avatar">◉</div><div><h3>هانا</h3><p>مهندسة تشغيل ومناوبة On-call.</p></div></div><div class="card"><p>تجلس هانا للاستراحة. يهتز الهاتف.</p><div class="alert dangerish"><strong>On-call alert</strong><span>تحذير جديد يحتاج إلى مراجعة.</span></div></div><div class="action-row"><button id="toSupport" class="primary-btn">استمر إلى دعم المستخدمين</button></div></div>`);
    $('#toSupport').addEventListener('click',()=>go('supportTask'));
  }

  function supportTask(){
    const i=state.flags.supportIndex;
    if(i>=SUPPORT_TASKS.length){go('deployEnd');return;}
    const t=SUPPORT_TASKS[i];
    html(`
      <div><span class="eyebrow">سامر — Customer Support</span><h1 class="scene-title">رسالة مستخدم ${i+1}/${SUPPORT_TASKS.length}</h1><div class="card"><div class="message user">${t.q}</div><div class="choice-grid"><button id="supportGood" class="choice-btn"><strong>${t.a}</strong></button><button id="supportGeneric" class="choice-btn"><strong>أرسل ردًا عامًا وأغلق الحالة</strong><small>أسرع، لكنه قد لا يحل المشكلة.</small></button></div></div></div>`);
    $('#supportGood').addEventListener('click',()=>{mutateMetrics({quality:2,visibility:1});state.flags.supportIndex++;saveState();supportTask();});
    $('#supportGeneric').addEventListener('click',()=>{mutateMetrics({pressure:2,quality:-2});state.flags.supportIndex++;saveState();supportTask();});
  }

  function deployEnd(){
    addLedger(7,'هانا وسامر وفرق العمليات','مراقبة الخدمة، الاستجابة للأعطال، المناوبات والدعم','UPTIME','تظهر نتيجة هذا العمل للمستخدم كخدمة سريعة ومتاحة، لا كوردية تشغيل.');
    html(`
      <div><span class="eyebrow">لوحة التسويق</span><h1 class="scene-title">Fast. Reliable. Always available.</h1><div class="card"><div class="hud-grid"><div class="hud-item"><span>Uptime</span><strong>99.9%</strong></div><div class="hud-item"><span>Service</span><strong>Online</strong></div><div class="hud-item"><span>Human work</span><strong>—</strong></div></div><p class="muted">اختفت المناوبة والعطل ورسائل الدعم من وصف المنتج.</p></div><div class="action-row"><button id="uptimeAbstract" class="primary-btn">حوّل العمل إلى Uptime</button></div></div>`);
    $('#uptimeAbstract').addEventListener('click',()=>go('abstract8'));
  }

  function abstract8(){ abstraction([['هانا','التشغيل','◉'],['سامر','الدعم','☏'],['فرق الشبكات','','≋']], 'UPTIME','العمل المستمر أصبح رقم توافر في صفحة المنتج.','ch9Intro'); }

  return {ch8Intro,deployLoad,deployIncident,onCall,supportTask,deployEnd,abstract8};
}
