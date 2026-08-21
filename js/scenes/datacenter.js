export function createDatacenterRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch3Intro(){ chapterIntro(2,'الحوسبة','ما نسميه «السحابة» مكان مادي: مبانٍ وخوادم وكهرباء وتبريد وشبكات وعمل مستمر.','dcInstall'); }

  function dcInstall(){
    setChapter(2);
    const steps=[['rack','أدخل الخادم في الخزانة'],['power','وصّل الطاقة'],['network','وصّل الشبكة'],['register','سجّل الجهاز']];
    html(`
      <div><span class="eyebrow">CloudAxis Data Center</span><h1 class="scene-title">أنت الآن كارلوس، فني بنية تحتية.</h1>
      <div class="role-card card flat"><div class="avatar">▥</div><div><h3>كارلوس</h3><p>تركيب وتشغيل الخوادم داخل مركز بيانات.</p></div></div>
      <div class="rack-board"><div class="server-rack">${Array.from({length:8},(_,i)=>`<div class="server-unit"><span>U${i+1}</span><span class="server-lights"><i></i><i></i><i></i></span></div>`).join('')}</div>
      <div class="connect-panel">${steps.map(([id,label],i)=>`<button class="connect-step ${state.flags.serverSteps.includes(id)?'done':''}" data-server-step="${id}" data-index="${i}"><span>${label}</span><span>${state.flags.serverSteps.includes(id)?'✓':'→'}</span></button>`).join('')}</div></div>
      ${state.flags.serverSteps.length===4?'<div class="action-row"><button id="bootServer" class="primary-btn">شغّل الاختبار</button></div>':''}
      </div>`);
    bind('[data-server-step]','click',(e)=>{
      const idx=Number(e.currentTarget.dataset.index), id=e.currentTarget.dataset.serverStep;
      if(idx!==state.flags.serverSteps.length) {tone(170,.06,'square');return;}
      state.flags.serverSteps.push(id); saveState(); dcInstall();
    });
    $('#bootServer')?.addEventListener('click',()=>go('dcCooling'));
  }

  function dcCooling(){
    html(`
      <div><span class="eyebrow">Cooling alarm</span><h1 class="scene-title">وحدة التبريد رقم 3 لا تستجيب.</h1>
      <div class="monitor"><div class="monitor-tile"><span>Hall temperature</span><strong>33°C ↑</strong><div class="bar"><i style="width:88%;background:var(--danger)"></i></div></div>${monitorTile('Available Compute','92%',72)}${monitorTile('Network','Stable',70)}${monitorTile('Requests','Waiting',66)}</div>
      <div class="alert"><strong>الإدارة تنتظر تشغيل المجموعة الجديدة.</strong><span>يمكن الحفاظ على الخدمة بنقل الحمل، أو إيقاف المجموعة المتأثرة حتى إصلاح التبريد.</span></div>
      <div class="choice-grid"><button id="dcMove" class="choice-btn"><strong>انقل الحمل إلى قاعة أخرى</strong><small>يحافظ على الطلبات لكنه يرفع الضغط الحراري في مكان آخر.</small></button><button id="dcStop" class="choice-btn"><strong>أوقف المجموعة المتأثرة</strong><small>تقل الحوسبة المتاحة ويصبح وقت التوقف ظاهرًا.</small></button></div></div>`);
    $('#dcMove').addEventListener('click',()=>{addDecision('dc-move','نقلت حمل مركز البيانات','حافظت على الخدمة عبر نقل الضغط إلى بنية أخرى.',{pressure:5,cost:-2,burden:5,quality:-2,visibility:1});go('dcWorkers');});
    $('#dcStop').addEventListener('click',()=>{addDecision('dc-stop','أوقفت مجموعة خوادم بسبب التبريد','أصبحت تكلفة التوقف مرئية بدل دفع البنية للعمل عند حدها.',{pressure:-3,cost:6,burden:-5,quality:4,visibility:3});go('dcWorkers');});
  }

  function dcWorkers(){
    const workers=[['clean','عامل نظافة','يحافظ على بيئة التشغيل','🧹'],['electric','مهندسة كهرباء','تدير الطاقة والأنظمة الاحتياطية','⚡'],['security','عامل أمن','يدير الوصول المادي','🛡'],['cool','فني تبريد','يصون الأنظمة الحرارية','❄'],['cable','فني كابلات','يوصل الشبكات والأجهزة','≋'],['network','مشغل شبكة','يراقب الاتصال','◫']];
    html(`
      <div><span class="eyebrow">العمل المحيط بالخادم</span><h1 class="scene-title">اضغط على العاملين الذين تلاحظهم.</h1><p class="scene-subtitle">لا يلزم كشف الجميع للمتابعة. لكن ما لا تضغط عليه سيظل خارج دفترك.</p>
      <div class="worker-map">${workers.map(([id,name,job,icon])=>`<button class="worker-person ${state.flags.revealedWorkers.includes(id)?'revealed':''}" data-worker="${id}"><span class="person-icon">${icon}</span><strong>${name}</strong><small>${state.flags.revealedWorkers.includes(id)?job:'اضغط للكشف عن الدور'}</small></button>`).join('')}</div>
      <div class="action-row"><button id="dcReady" class="primary-btn">المجموعة جاهزة</button></div></div>`);
    bind('[data-worker]','click',(e)=>{const id=e.currentTarget.dataset.worker;if(!state.flags.revealedWorkers.includes(id)){state.flags.revealedWorkers.push(id);mutateMetrics({visibility:2});saveState();dcWorkers();}});
    $('#dcReady').addEventListener('click',()=>{addLedger(2,'كارلوس وفرق المرافق','تركيب وطاقة وتبريد وشبكات وصيانة مستمرة','COMPUTE',`كشفت ${state.flags.revealedWorkers.length} من 6 أدوار جانبية داخل مركز البيانات.`);go('abstract3');});
  }

  function abstract3(){ abstraction([['كارلوس','فني بنية تحتية','▥'],['التبريد','','❄'],['الكهرباء','','⚡'],['الشبكات','','≋']], 'COMPUTE','الغرفة والخوادم والمرافق والورديات تُختصر في لوحة الشركة إلى «حوسبة متاحة».','ch4Intro'); }

  return {ch3Intro,dcInstall,dcCooling,dcWorkers,abstract3};
}
